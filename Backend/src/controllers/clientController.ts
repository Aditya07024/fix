import { Request, Response } from "express";
import { db } from "../db.js";
import { ApiResponse, AddressInput } from "../types.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

const toNumber = (value: unknown) => Number(value || 0);

const getDefaultAddress = async (userId: string) =>
  db.queryOne(
    `
      SELECT id, line1, line2, city, state, postal_code, country, is_default
      FROM user_addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, updated_at DESC, created_at DESC
      LIMIT 1
    `,
    [userId],
  );

const upsertDefaultAddress = async (userId: string, address: AddressInput) => {
  await db.query("UPDATE user_addresses SET is_default = false WHERE user_id = $1", [
    userId,
  ]);

  const existingAddress = await getDefaultAddress(userId);

  if (existingAddress) {
    return db.queryOne(
      `
        UPDATE user_addresses
        SET
          line1 = $1,
          line2 = $2,
          city = $3,
          state = $4,
          postal_code = $5,
          country = $6,
          is_default = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, line1, line2, city, state, postal_code, country, is_default
      `,
      [
        address.line1,
        address.line2 || null,
        address.city,
        address.state,
        address.postal_code,
        address.country,
        existingAddress.id,
      ],
    );
  }

  return db.queryOne(
    `
      INSERT INTO user_addresses (
        user_id, line1, line2, city, state, postal_code, country, is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id, line1, line2, city, state, postal_code, country, is_default
    `,
    [
      userId,
      address.line1,
      address.line2 || null,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ],
  );
};

export const clientController = {
  async getDashboard(req: Request, res: Response) {
    const userId = req.user?.id;

    const [stats, categories, topServices, recentBookings] = await Promise.all([
      db.queryOne(
        `
          SELECT
            COUNT(*) FILTER (WHERE b.status IN ('pending', 'accepted', 'in-progress'))::int AS active_bookings,
            COUNT(*) FILTER (WHERE b.status = 'completed')::int AS completed_bookings,
            COALESCE(SUM(b.total_price) FILTER (WHERE b.payment_status = 'completed'), 0)::float AS amount_spent,
            (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = $1) AS reviews_given,
            (SELECT COUNT(*)::int FROM saved_services ss WHERE ss.user_id = $1) AS saved_services
          FROM bookings b
          WHERE b.user_id = $1
        `,
        [userId],
      ),
      db.query(
        `
          SELECT
            sc.id,
            sc.name,
            sc.description,
            sc.image,
            COUNT(s.id)::int AS service_count,
            COALESCE(
              JSON_AGG(s.name ORDER BY s.rating DESC, s.total_reviews DESC)
                FILTER (WHERE s.id IS NOT NULL),
              '[]'::json
            ) AS service_names
          FROM service_categories sc
          LEFT JOIN services s
            ON s.category_id = sc.id
            AND s.is_available = true
          GROUP BY sc.id
          ORDER BY sc.name ASC
          LIMIT 6
        `,
      ),
      db.query(
        `
          SELECT
            s.id,
            s.name,
            s.description,
            s.price::float AS price,
            s.duration::int AS duration,
            COALESCE(s.rating, 0)::float AS rating,
            COALESCE(s.total_reviews, 0)::int AS total_reviews,
            s.image,
            sc.name AS category_name,
            COALESCE(employee_user.name, 'Assigned on booking') AS employee_name,
            EXISTS (
              SELECT 1
              FROM saved_services ss
              WHERE ss.user_id = $1 AND ss.service_id = s.id
            ) AS is_saved
          FROM services s
          JOIN service_categories sc ON sc.id = s.category_id
          LEFT JOIN LATERAL (
            SELECT eu.name
            FROM bookings booking
            JOIN employees e ON e.id = booking.employee_id
            JOIN users eu ON eu.id = e.user_id
            WHERE booking.service_id = s.id
            ORDER BY booking.created_at DESC
            LIMIT 1
          ) AS employee_user ON true
          WHERE s.is_available = true
          ORDER BY s.rating DESC, s.total_reviews DESC, s.created_at DESC
          LIMIT 6
        `,
        [userId],
      ),
      db.query(
        `
          SELECT
            b.id,
            b.booking_date,
            b.status,
            b.total_price::float AS total_price,
            s.name AS service_name,
            COALESCE(employee_user.name, 'Not assigned') AS employee_name
          FROM bookings b
          JOIN services s ON s.id = b.service_id
          LEFT JOIN employees e ON e.id = b.employee_id
          LEFT JOIN users employee_user ON employee_user.id = e.user_id
          WHERE b.user_id = $1
          ORDER BY b.created_at DESC
          LIMIT 5
        `,
        [userId],
      ),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        stats: {
          active_bookings: toNumber(stats?.active_bookings),
          completed_bookings: toNumber(stats?.completed_bookings),
          reviews_given: toNumber(stats?.reviews_given),
          saved_services: toNumber(stats?.saved_services),
          amount_spent: toNumber(stats?.amount_spent),
        },
        categories: (categories || []).map((category: any) => ({
          ...category,
          service_count: toNumber(category.service_count),
          service_names: (category.service_names || []).slice(0, 3),
        })),
        top_services: topServices || [],
        recent_bookings: recentBookings || [],
      },
    };

    res.status(200).json(response);
  },

  async getProfile(req: Request, res: Response) {
    const userId = req.user?.id;

    const [user, address, paymentMethods, stats] = await Promise.all([
      db.queryOne(
        `
          SELECT id, name, email, phone, role, image, created_at
          FROM users
          WHERE id = $1
        `,
        [userId],
      ),
      getDefaultAddress(userId!),
      db.query(
        `
          SELECT
            id, type, label, provider, last_digits, upi_id, wallet_name, is_default,
            created_at
          FROM payment_methods
          WHERE user_id = $1
          ORDER BY is_default DESC, created_at DESC
        `,
        [userId],
      ),
      db.queryOne(
        `
          SELECT
            COUNT(*)::int AS total_bookings,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_bookings,
            COALESCE(SUM(total_price) FILTER (WHERE payment_status = 'completed'), 0)::float AS amount_spent,
            (SELECT COUNT(*)::int FROM reviews WHERE user_id = $1) AS reviews_given
          FROM bookings
          WHERE user_id = $1
        `,
        [userId],
      ),
    ]);

    if (!user) {
      throw new NotFoundError("Client profile not found");
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        ...user,
        address: address || null,
        payment_methods: paymentMethods || [],
        stats: {
          total_bookings: toNumber(stats?.total_bookings),
          completed_bookings: toNumber(stats?.completed_bookings),
          amount_spent: toNumber(stats?.amount_spent),
          reviews_given: toNumber(stats?.reviews_given),
        },
      },
    };

    res.status(200).json(response);
  },

  async updateProfile(req: Request, res: Response) {
    const userId = req.user?.id;
    const { name, phone, image, address } = req.body as {
      name?: string;
      phone?: string;
      image?: string;
      address?: AddressInput;
    };

    const user = await db.queryOne(
      `
        UPDATE users
        SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          image = COALESCE($3, image),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, name, email, phone, role, image, created_at
      `,
      [name ?? null, phone ?? null, image ?? null, userId],
    );

    if (!user) {
      throw new ValidationError("Failed to update client profile");
    }

    const defaultAddress = address
      ? await upsertDefaultAddress(userId!, address)
      : await getDefaultAddress(userId!);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        ...user,
        address: defaultAddress || null,
      },
      message: "Profile updated successfully",
    };

    res.status(200).json(response);
  },

  async getSavedServices(req: Request, res: Response) {
    const userId = req.user?.id;

    const services = await db.query(
      `
        SELECT
          ss.id AS saved_id,
          ss.created_at AS saved_at,
          s.id,
          s.name,
          s.description,
          s.price::float AS price,
          s.duration::int AS duration,
          COALESCE(s.rating, 0)::float AS rating,
          COALESCE(s.total_reviews, 0)::int AS total_reviews,
          s.image,
          s.is_available,
          sc.name AS category_name
        FROM saved_services ss
        JOIN services s ON s.id = ss.service_id
        JOIN service_categories sc ON sc.id = s.category_id
        WHERE ss.user_id = $1
        ORDER BY ss.created_at DESC
      `,
      [userId],
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: services || [],
    };

    res.status(200).json(response);
  },

  async toggleSavedService(req: Request, res: Response) {
    const userId = req.user?.id;
    const { service_id } = req.params;

    const existing = await db.queryOne(
      "SELECT id FROM saved_services WHERE user_id = $1 AND service_id = $2",
      [userId, service_id],
    );

    if (existing) {
      await db.query("DELETE FROM saved_services WHERE id = $1", [existing.id]);

      const response: ApiResponse<any> = {
        success: true,
        data: { saved: false },
        message: "Service removed from saved list",
      };

      res.status(200).json(response);
      return;
    }

    await db.query(
      "INSERT INTO saved_services (user_id, service_id) VALUES ($1, $2)",
      [userId, service_id],
    );

    const response: ApiResponse<any> = {
      success: true,
      data: { saved: true },
      message: "Service saved successfully",
    };

    res.status(201).json(response);
  },

  async getPaymentMethods(req: Request, res: Response) {
    const userId = req.user?.id;
    const methods = await db.query(
      `
        SELECT
          id, type, label, provider, last_digits, upi_id, wallet_name,
          is_default, created_at
        FROM payment_methods
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC
      `,
      [userId],
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: methods || [],
    };

    res.status(200).json(response);
  },

  async createPaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const {
      type,
      label,
      provider,
      last_digits,
      upi_id,
      wallet_name,
      is_default,
    } = req.body;

    if (is_default) {
      await db.query(
        "UPDATE payment_methods SET is_default = false WHERE user_id = $1",
        [userId],
      );
    }

    const method = await db.queryOne(
      `
        INSERT INTO payment_methods (
          user_id, type, label, provider, last_digits, upi_id, wallet_name, is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id, type, label, provider, last_digits, upi_id, wallet_name,
          is_default, created_at
      `,
      [
        userId,
        type,
        label,
        provider || null,
        last_digits || null,
        upi_id || null,
        wallet_name || null,
        Boolean(is_default),
      ],
    );

    const response: ApiResponse<any> = {
      success: true,
      data: method,
      message: "Payment method added successfully",
    };

    res.status(201).json(response);
  },

  async setDefaultPaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const { id } = req.params;

    const method = await db.queryOne(
      "SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2",
      [id, userId],
    );

    if (!method) {
      throw new NotFoundError("Payment method not found");
    }

    await db.query(
      "UPDATE payment_methods SET is_default = false WHERE user_id = $1",
      [userId],
    );
    await db.query(
      "UPDATE payment_methods SET is_default = true WHERE id = $1 AND user_id = $2",
      [id, userId],
    );

    const response: ApiResponse<any> = {
      success: true,
      message: "Default payment method updated",
    };

    res.status(200).json(response);
  },

  async deletePaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const { id } = req.params;

    const deleted = await db.queryOne(
      `
        DELETE FROM payment_methods
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
      [id, userId],
    );

    if (!deleted) {
      throw new NotFoundError("Payment method not found");
    }

    const response: ApiResponse<null> = {
      success: true,
      message: "Payment method deleted successfully",
    };

    res.status(200).json(response);
  },
};
