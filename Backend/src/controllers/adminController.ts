import { Request, Response } from "express";
import { db, pool, supabase } from "../db.js";
import { ValidationError, ConflictError } from "../utils/errors.js";
import { ApiResponse } from "../types.js";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const adminController = {
  async getDashboardStats(req: Request, res: Response) {
    try {
      const [totals, bookingStatuses, serviceDistribution] = await Promise.all([
        db.queryOne(
          `
            SELECT
              (SELECT COUNT(*)::int FROM bookings) AS total_bookings,
              (SELECT COUNT(*)::int FROM users) AS total_users,
              (SELECT COUNT(*)::int FROM services) AS total_services,
              (SELECT COUNT(*)::int FROM employees WHERE is_available = true) AS active_employees,
              (SELECT COALESCE(SUM(total_price), 0)::float FROM bookings WHERE payment_status = 'completed') AS total_revenue,
              (SELECT COALESCE(AVG(rating), 0)::float FROM reviews) AS average_rating
          `,
        ),
        db.query(
          `
            SELECT status, COUNT(*)::int AS count
            FROM bookings
            GROUP BY status
            ORDER BY status
          `,
        ),
        db.query(
          `
            SELECT
              sc.name,
              COUNT(b.id)::int AS value
            FROM service_categories sc
            LEFT JOIN services s ON s.category_id = sc.id
            LEFT JOIN bookings b ON b.service_id = s.id
            GROUP BY sc.id
            ORDER BY value DESC, sc.name ASC
            LIMIT 6
          `,
        ),
      ]);

      const stats = {
        total_bookings: totals?.total_bookings || 0,
        total_revenue: totals?.total_revenue || 0,
        total_users: totals?.total_users || 0,
        total_services: totals?.total_services || 0,
        active_employees: totals?.active_employees || 0,
        average_rating: totals?.average_rating || 0,
        bookings_by_status: bookingStatuses || [],
        service_distribution: serviceDistribution || [],
      };

      const response: ApiResponse<any> = {
        success: true,
        data: stats,
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ValidationError(error.message || "Failed to fetch stats");
    }
  },

  async getAllUsers(req: Request, res: Response) {
    const { role, search } = req.query;

    const values: any[] = [];
    const filters: string[] = [];

    if (role) {
      values.push(role);
      filters.push(`u.role = $${values.length}`);
    }

    if (search) {
      values.push(`%${String(search)}%`);
      filters.push(
        `(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.phone ILIKE $${values.length})`,
      );
    }

    const users = await db.query(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.image,
          u.created_at,
          u.last_active_at,
          e.verification_status,
          COALESCE(BOOL_OR(e.is_available), false) AS is_available,
          e.document_url,
          e.pending_service_ids,
          e.review_notes,
          COUNT(DISTINCT b.id)::int AS bookings,
          CASE
            WHEN u.role = 'employee' THEN COALESCE(MAX(e.is_available::int), 0)
            ELSE 1
          END AS status_flag,
          COALESCE(
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.name), NULL),
            ARRAY[]::text[]
          ) AS assigned_services,
          COALESCE(
            (
              SELECT ARRAY_AGG(pending_service.name ORDER BY pending_service.name ASC)
              FROM services pending_service
              WHERE pending_service.id::text = ANY(
                COALESCE(e.pending_service_ids::text[], ARRAY[]::text[])
              )
            ),
            ARRAY[]::text[]
          ) AS pending_assigned_services
        FROM users u
        LEFT JOIN bookings b ON b.user_id = u.id
        LEFT JOIN employees e ON e.user_id = u.id
        LEFT JOIN employee_services es ON es.employee_id = e.id
        LEFT JOIN services s ON s.id = es.service_id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        GROUP BY
          u.id,
          e.verification_status,
          e.document_url,
          e.pending_service_ids,
          e.review_notes
        ORDER BY u.created_at DESC
      `,
      values,
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: (users || []).map((user: any) => ({
        ...user,
        bookings: Number(user.bookings || 0),
        status:
          user.role === "employee"
            ? user.verification_status === "approved"
              ? Number(user.status_flag) === 1
                ? "online"
                : "offline"
              : user.verification_status || "offline"
            : "active",
      })),
    };

    res.status(200).json(response);
  },

  async getUserDetail(req: Request, res: Response) {
    const { id } = req.params;

    const user = await getAdminUserDetail(id);

    if (!user) {
      throw new ValidationError("User not found");
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        ...user,
        bookings: Number(user.bookings || 0),
      },
    };

    res.status(200).json(response);
  },

  async updateUser(req: Request, res: Response) {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      image,
      hourly_rate,
      document_url,
      is_available,
      service_ids,
    } = req.body;

    const existingUser = await db.queryOne(
      `
        SELECT
          u.id,
          u.role,
          e.id AS employee_id
        FROM users u
        LEFT JOIN employees e ON e.user_id = u.id
        WHERE u.id = $1
      `,
      [id],
    );

    if (!existingUser) {
      throw new ValidationError("User not found");
    }

    if (email) {
      const duplicateUser = await db.queryOne(
        `
          SELECT id
          FROM users
          WHERE email = $1 AND id <> $2
        `,
        [String(email).trim().toLowerCase(), id],
      );

      if (duplicateUser) {
        throw new ConflictError("User with this email already exists");
      }
    }

    const nextServiceIds = Array.isArray(service_ids)
      ? [
          ...new Set(
            service_ids
              .map((serviceId: unknown) => String(serviceId || "").trim())
              .filter(Boolean),
          ),
        ]
      : undefined;

    if (nextServiceIds !== undefined) {
      if (existingUser.role !== "employee" || !existingUser.employee_id) {
        throw new ValidationError("Only employees can have assigned services");
      }

      if (nextServiceIds.some((serviceId) => !UUID_PATTERN.test(serviceId))) {
        throw new ValidationError("One or more selected services are invalid");
      }

      const existingServices = await db.query(
        `
          SELECT id
          FROM services
          WHERE id = ANY($1::uuid[])
        `,
        [nextServiceIds],
      );

      if (existingServices.length !== nextServiceIds.length) {
        throw new ValidationError("One or more selected services are invalid");
      }
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE users
          SET
            name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            image = COALESCE($4, image),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `,
        [
          name ? String(name).trim() : null,
          email ? String(email).trim().toLowerCase() : null,
          phone ? String(phone).trim() : null,
          image !== undefined ? image || null : null,
          id,
        ],
      );

      if (existingUser.role === "employee" && existingUser.employee_id) {
        await client.query(
          `
            UPDATE employees
            SET
              hourly_rate = COALESCE($1, hourly_rate),
              document_url = COALESCE($2, document_url),
              is_available = COALESCE($3, is_available),
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $4
          `,
          [
            hourly_rate ?? null,
            document_url !== undefined ? document_url || null : null,
            is_available ?? null,
            id,
          ],
        );

        if (nextServiceIds !== undefined) {
          await client.query(
            `
              DELETE FROM employee_services
              WHERE employee_id = $1
            `,
            [existingUser.employee_id],
          );

          if (nextServiceIds.length > 0) {
            await client.query(
              `
                INSERT INTO employee_services (employee_id, service_id)
                SELECT $1, UNNEST($2::uuid[])
              `,
              [existingUser.employee_id, nextServiceIds],
            );
          }
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const updatedUser = await getAdminUserDetail(id);

    const response: ApiResponse<any> = {
      success: true,
      data: updatedUser,
      message: "User updated successfully",
    };

    res.status(200).json(response);
  },

  async deleteUser(req: Request, res: Response) {
    const { id } = req.params;

    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: "User deleted successfully",
    };

    res.status(200).json(response);
  },

  async getAllBookings(req: Request, res: Response) {
    const { status, service_id, user_id } = req.query;
    const values: any[] = [];
    const filters: string[] = [];

    if (status) {
      values.push(status);
      filters.push(`b.status = $${values.length}`);
    }

    if (service_id) {
      values.push(service_id);
      filters.push(`b.service_id = $${values.length}`);
    }

    if (user_id) {
      values.push(user_id);
      filters.push(`b.user_id = $${values.length}`);
    }

    const bookings = await db.query(
      `
        SELECT
          b.*,
          s.name AS service_name,
          COALESCE(NULLIF(b.client_name_override, ''), client.name) AS client_name,
          employee_user.name AS employee_name,
          CONCAT_WS(
            ', ',
            NULLIF(b.address_line1, ''),
            NULLIF(b.address_line2, ''),
            NULLIF(b.city, ''),
            NULLIF(b.state, ''),
            NULLIF(b.postal_code, ''),
            NULLIF(b.country, '')
          ) AS service_address
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        JOIN users client ON client.id = b.user_id
        LEFT JOIN employees e ON e.id = b.employee_id
        LEFT JOIN users employee_user ON employee_user.id = e.user_id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY b.created_at DESC
      `,
      values,
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: bookings || [],
    };

    res.status(200).json(response);
  },

  async getRevenueStats(req: Request, res: Response) {
    const { start_date, end_date } = req.query;

    const values: any[] = [];
    const filters = [`payment_status = 'completed'`];

    if (start_date) {
      values.push(start_date);
      filters.push(
        `COALESCE(completed_at, updated_at, created_at) >= $${values.length}`,
      );
    }

    if (end_date) {
      values.push(end_date);
      filters.push(
        `COALESCE(completed_at, updated_at, created_at) <= $${values.length}`,
      );
    }

    const payments = await db.query(
      `
        SELECT total_price
        FROM bookings
        WHERE ${filters.join(" AND ")}
      `,
      values,
    );

    const total =
      payments?.reduce((sum, p: any) => sum + Number(p.total_price || 0), 0) || 0;
    const count = payments?.length || 0;

    const stats = {
      total_revenue: total,
      total_transactions: count,
      average_transaction: count > 0 ? total / count : 0,
    };

    const response: ApiResponse<any> = {
      success: true,
      data: stats,
    };

    res.status(200).json(response);
  },

  async getEmployeeStats(req: Request, res: Response) {
    const employeesWithEarnings = await db.query(
      `
        SELECT
          e.id,
          e.user_id,
          u.name,
          u.email,
          u.phone,
          e.hourly_rate::float AS hourly_rate,
          COALESCE(e.rating, 0)::float AS rating,
          COALESCE(e.total_reviews, 0)::int AS total_reviews,
          e.is_available,
          e.verification_status,
          e.document_url,
          e.review_notes,
          COALESCE(e.total_earnings, 0)::float AS total_earnings,
          COUNT(b.id)::int AS total_tasks
        FROM employees e
        JOIN users u ON u.id = e.user_id
        LEFT JOIN bookings b ON b.employee_id = e.id
        GROUP BY e.id, u.id
        ORDER BY e.rating DESC, total_tasks DESC
      `,
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: employeesWithEarnings,
    };

    res.status(200).json(response);
  },

  async reviewEmployee(req: Request, res: Response) {
    const { user_id } = req.params;
    const { verification_status, review_notes } = req.body;
    const currentEmployee = await db.queryOne(
      `
        SELECT
          e.id,
          e.user_id,
          e.verification_status,
          COALESCE(e.pending_service_ids::text[], ARRAY[]::text[]) AS pending_service_ids
        FROM employees e
        WHERE e.user_id = $1
      `,
      [user_id],
    );

    if (!currentEmployee) {
      throw new ValidationError("Employee not found");
    }

    const hasPendingServiceRequest =
      Array.isArray(currentEmployee.pending_service_ids) &&
      currentEmployee.pending_service_ids.length > 0;
    const nextVerificationStatus =
      verification_status === "rejected" &&
      currentEmployee.verification_status === "approved" &&
      hasPendingServiceRequest
        ? "approved"
        : verification_status;

    const pgClient = await pool.connect();

    let employee;

    try {
      await pgClient.query("BEGIN");

      employee = (
        await pgClient.query(
          `
            UPDATE employees
            SET
              verification_status = $1::character varying,
              review_notes = $2,
              pending_service_ids = CASE
                WHEN $3::boolean THEN '{}'
                ELSE pending_service_ids
              END,
              is_available = CASE
                WHEN $1::character varying = 'approved' THEN is_available
                ELSE false
              END,
              approved_at = CASE
                WHEN $1::character varying = 'approved' THEN CURRENT_TIMESTAMP
                ELSE approved_at
              END,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $4
            RETURNING *
          `,
          [
            nextVerificationStatus,
            review_notes || null,
            hasPendingServiceRequest,
            user_id,
          ],
        )
      ).rows[0] || null;

      if (!employee) {
        throw new ValidationError("Employee not found");
      }

      if (verification_status === "approved" && hasPendingServiceRequest) {
        await pgClient.query(
          `
            DELETE FROM employee_services
            WHERE employee_id = $1
          `,
          [currentEmployee.id],
        );

        await pgClient.query(
          `
            INSERT INTO employee_services (employee_id, service_id)
            SELECT $1, UNNEST($2::text[])::uuid
          `,
          [currentEmployee.id, currentEmployee.pending_service_ids],
        );
      }

      await pgClient.query("COMMIT");
    } catch (error) {
      await pgClient.query("ROLLBACK");
      throw error;
    } finally {
      pgClient.release();
    }

    if (!employee) {
      throw new ValidationError("Employee not found");
    }

    const response: ApiResponse<any> = {
      success: true,
      data: employee,
      message: `Employee ${verification_status} successfully`,
    };

    res.status(200).json(response);
  },

  async getEmployeeReviews(req: Request, res: Response) {
    const { employee_id } = req.query;

    try {
      // Debug: Check all reviews in database
      const allReviews = await db.query(
        `SELECT COUNT(*) as total, 
                COUNT(CASE WHEN employee_id IS NOT NULL THEN 1 END) as with_employee_id,
                COUNT(CASE WHEN employee_id IS NULL THEN 1 END) as without_employee_id
         FROM reviews`,
      );
      console.log("Review count summary:", allReviews);

      let query = `
        SELECT
          r.id,
          r.booking_id,
          r.rating,
          r.comment,
          r.created_at,
          r.employee_id,
          u.name AS client_name,
          u.email AS client_email,
          u.phone AS client_phone,
          COALESCE(e.name, 'Unassigned Service') AS employee_name,
          s.name AS service_name,
          b.booking_date,
          b.status AS booking_status
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN employees emp ON emp.id = r.employee_id
        LEFT JOIN users e ON e.id = emp.user_id
        LEFT JOIN services s ON s.id = r.service_id
        LEFT JOIN bookings b ON b.id = r.booking_id
        ORDER BY r.created_at DESC
      `;

      const params: any[] = [];

      if (employee_id) {
        params.push(employee_id);
        query += ` AND r.employee_id = $${params.length}`;
      }

      console.log("Executing query:", query, "with params:", params);
      const reviews = await db.query(query, params);
      console.log("Query result count:", reviews?.length || 0);
      console.log("First few reviews:", reviews?.slice(0, 3));

      const response: ApiResponse<any[]> = {
        success: true,
        data: reviews,
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Error in getEmployeeReviews:", error);
      throw error;
    }
  },

  async populateEmployeeIdsInReviews(req: Request, res: Response) {
    try {
      // For each review, try to find the employee from the booking
      const updated = await db.query(
        `UPDATE reviews r
         SET employee_id = b.employee_id
         FROM bookings b
         WHERE r.employee_id IS NULL 
         AND b.employee_id IS NOT NULL
         AND r.booking_id = b.id
         RETURNING r.id, r.employee_id`,
      );

      console.log("Updated reviews with employee_id:", updated?.length || 0);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          updated_count: updated?.length || 0,
          message: "Reviews have been updated with employee information",
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Error in populateEmployeeIdsInReviews:", error);
      throw error;
    }
  },

  async createAdmin(req: Request, res: Response) {
    const { name, email, phone, role } = req.body;
    const userRole = role === "employee" ? "employee" : "admin";

    // Validate inputs
    if (!name || !email || !phone) {
      throw new ValidationError("Name, email, and phone are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await db.queryOne(
      "SELECT * FROM users WHERE email = $1",
      [normalizedEmail],
    );

    if (existingUser) {
      throw new ConflictError("Email already exists");
    }

    // Generate temporary password (random UUID based)
    const passwordHash = await bcrypt.hash(randomUUID(), 10);

    const client = await pool.connect();
    let newUser: any;

    try {
      await client.query("BEGIN");

      const createdUser = await client.query(
        `
          INSERT INTO users (name, email, phone, password_hash, role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name, email, phone, role, created_at
        `,
        [name.trim(), normalizedEmail, phone.trim(), passwordHash, userRole],
      );

      newUser = createdUser.rows[0];

      if (!newUser) {
        throw new ValidationError(`Failed to create ${userRole} user`);
      }

      if (userRole === "employee") {
        const employeeProfile = await client.query(
          `
            INSERT INTO employees (user_id, is_available, verification_status)
            VALUES ($1, $2, $3)
            RETURNING id
          `,
          [newUser.id, false, "pending"],
        );

        if (!employeeProfile.rows[0]) {
          throw new ValidationError("Failed to create employee profile");
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const response: ApiResponse<any> = {
      success: true,
      data: newUser,
      message: `${userRole === "admin" ? "Admin" : "Employee"} user created successfully`,
    };

    res.status(201).json(response);
  },

  async getAddressAreas(req: Request, res: Response) {
    const { is_active } = req.query;

    let query = `SELECT * FROM address_areas`;
    const params: any[] = [];

    if (is_active !== undefined) {
      params.push(is_active === "true");
      query += ` WHERE is_active = $${params.length}`;
    }

    query += ` ORDER BY city, name`;

    const areas = await db.query(query, params);

    const response: ApiResponse<any[]> = {
      success: true,
      data: areas || [],
    };

    res.status(200).json(response);
  },

  async createAddressArea(req: Request, res: Response) {
    const { name, line2, city, state, description } = req.body;

    if (!name || !city || !state) {
      throw new ValidationError("Name, city, and state are required");
    }

    const existingArea = await db.queryOne(
      "SELECT * FROM address_areas WHERE LOWER(name) = LOWER($1)",
      [name.trim()],
    );

    if (existingArea) {
      throw new ConflictError("Address area already exists");
    }

    const newArea = await db.queryOne(
      `
        INSERT INTO address_areas (name, line2, city, state, description, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id, name, line2, city, state, description, is_active, created_at
      `,
      [
        name.trim(),
        line2?.trim() || null,
        city.trim(),
        state.trim(),
        description?.trim() || null,
      ],
    );

    if (!newArea) {
      throw new ValidationError("Failed to create address area");
    }

    const response: ApiResponse<any> = {
      success: true,
      data: newArea,
      message: "Address area created successfully",
    };

    res.status(201).json(response);
  },

  async updateAddressArea(req: Request, res: Response) {
    const { id } = req.params;
    const { name, line2, city, state, description, is_active } = req.body;

    if (!name || !city || !state) {
      throw new ValidationError("Name, city, and state are required");
    }

    const existingArea = await db.queryOne(
      "SELECT * FROM address_areas WHERE id = $1",
      [id],
    );

    if (!existingArea) {
      throw new ValidationError("Address area not found");
    }

    const duplicateArea = await db.queryOne(
      "SELECT * FROM address_areas WHERE LOWER(name) = LOWER($1) AND id != $2",
      [name.trim(), id],
    );

    if (duplicateArea) {
      throw new ConflictError("Address area name already exists");
    }

    const updatedArea = await db.queryOne(
      `
        UPDATE address_areas
        SET
          name = $1,
          line2 = $2,
          city = $3,
          state = $4,
          description = $5,
          is_active = COALESCE($6, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, name, line2, city, state, description, is_active, updated_at
      `,
      [
        name.trim(),
        line2?.trim() || null,
        city.trim(),
        state.trim(),
        description?.trim() || null,
        is_active !== undefined ? is_active : null,
        id,
      ],
    );

    if (!updatedArea) {
      throw new ValidationError("Failed to update address area");
    }

    const response: ApiResponse<any> = {
      success: true,
      data: updatedArea,
      message: "Address area updated successfully",
    };

    res.status(200).json(response);
  },

  async deleteAddressArea(req: Request, res: Response) {
    const { id } = req.params;

    const area = await db.queryOne(
      "SELECT * FROM address_areas WHERE id = $1",
      [id],
    );

    if (!area) {
      throw new ValidationError("Address area not found");
    }

    await db.query("DELETE FROM address_areas WHERE id = $1", [id]);

    const response: ApiResponse<null> = {
      success: true,
      message: "Address area deleted successfully",
    };

    res.status(200).json(response);
  },
};

async function getAdminUserDetail(id: string) {
  return db.queryOne(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.image,
        u.created_at,
        u.last_active_at,
        e.hourly_rate::float AS hourly_rate,
        e.is_available,
        e.verification_status,
        e.document_url,
        e.pending_service_ids,
        e.review_notes,
        COUNT(DISTINCT b.id)::int AS bookings,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.id::text), NULL),
          ARRAY[]::text[]
        ) AS assigned_service_ids,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.name), NULL),
          ARRAY[]::text[]
        ) AS assigned_services,
        COALESCE(
          (
            SELECT ARRAY_AGG(pending_service.name ORDER BY pending_service.name ASC)
            FROM services pending_service
            WHERE pending_service.id::text = ANY(
              COALESCE(e.pending_service_ids::text[], ARRAY[]::text[])
            )
          ),
          ARRAY[]::text[]
        ) AS pending_assigned_services
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
      LEFT JOIN employees e ON e.user_id = u.id
      LEFT JOIN employee_services es ON es.employee_id = e.id
      LEFT JOIN services s ON s.id = es.service_id
      WHERE u.id = $1
      GROUP BY
        u.id,
        e.hourly_rate,
        e.is_available,
        e.verification_status,
        e.document_url,
        e.pending_service_ids,
        e.review_notes
    `,
    [id],
  );
}
