import { Request, Response } from "express";
import { db, supabase } from "../db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { ApiResponse, LandingStats, Service } from "../types.js";

const normalizeCustomerChoiceFields = (fields: any[] | undefined) =>
  (fields || []).map((field) => ({
    key: String(field.key || "").trim(),
    label: String(field.label || "").trim(),
    type: field.type,
    required: Boolean(field.required),
    options:
      field.type === "select"
        ? (field.options || [])
            .map((option: unknown) => String(option || "").trim())
            .filter(Boolean)
        : [],
  }));

export const servicesController = {
  async getLandingStats(req: Request, res: Response) {
    const stats = await db.queryOne(
      `
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE role = 'client') AS happy_users,
          (
            SELECT COUNT(*)::int
            FROM employees
            WHERE verification_status = 'approved'
          ) AS verified_professionals,
          (
            SELECT COUNT(*)::int
            FROM bookings
            WHERE status = 'completed'
          ) AS services_completed,
          (SELECT COALESCE(AVG(rating), 0)::float FROM reviews) AS average_rating
      `,
    );

    const response: ApiResponse<LandingStats> = {
      success: true,
      data: {
        happy_users: Number(stats?.happy_users || 0),
        verified_professionals: Number(stats?.verified_professionals || 0),
        services_completed: Number(stats?.services_completed || 0),
        average_rating: Number(stats?.average_rating || 0),
      },
    };

    res.status(200).json(response);
  },

  async getServices(req: Request, res: Response) {
    const { category_id, search } = req.query;
    const values: any[] = [];
    const filters = req.user?.role === "admin" ? [] : ["s.is_available = true"];

    if (category_id) {
      values.push(category_id);
      filters.push(`s.category_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${String(search)}%`);
      filters.push(`s.name ILIKE $${values.length}`);
    }

    const userId = req.user?.role === "client" ? req.user.id : null;
    values.push(userId);

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const services = await db.query(
      `
        SELECT
          s.*,
          sc.name AS category_name,
          EXISTS (
            SELECT 1
            FROM saved_services ss
            WHERE ss.service_id = s.id
              AND ss.user_id = $${values.length}
          ) AS is_saved
        FROM services s
        LEFT JOIN service_categories sc ON sc.id = s.category_id
        ${whereClause}
        ORDER BY s.rating DESC, s.total_reviews DESC, s.created_at DESC
      `,
      values,
    );

    const response: ApiResponse<Service[]> = {
      success: true,
      data: services || [],
    };

    res.status(200).json(response);
  },

  async getServiceById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.role === "client" ? req.user.id : null;

    let query = `
      SELECT
        s.*,
        sc.name AS category_name,
        EXISTS (
          SELECT 1
          FROM saved_services ss
          WHERE ss.service_id = s.id
            AND ss.user_id = $2
        ) AS is_saved
      FROM services s
      LEFT JOIN service_categories sc ON sc.id = s.category_id
      WHERE s.id = $1
    `;
    const queryParams = [id, userId];

    const service = await db.queryOne(query, queryParams);

    if (!service) {
      throw new NotFoundError("Service not found");
    }

    const response: ApiResponse<Service> = {
      success: true,
      data: service,
    };

    res.status(200).json(response);
  },

  async createService(req: Request, res: Response) {
    const {
      name,
      category_id,
      description,
      price,
      duration,
      image,
      payment_timing,
      customer_choice_fields,
    } = req.body;

    // Validate required fields
    if (!category_id || String(category_id).trim() === "") {
      throw new ValidationError("Category is required");
    }

    // Validate payment_timing
    if (
      payment_timing &&
      !["at_booking", "after_service"].includes(payment_timing)
    ) {
      throw new ValidationError(
        "Invalid payment_timing. Must be: at_booking or after_service",
      );
    }

    // Verify category exists
    const { data: category, error: categoryError } = await supabase
      .from("service_categories")
      .select("id, name")
      .eq("id", category_id)
      .single();

    if (categoryError || !category) {
      throw new ValidationError("Selected category does not exist");
    }

    const normalizedCustomerChoiceFields = normalizeCustomerChoiceFields(
      customer_choice_fields,
    );

    const { data: newService, error } = await supabase
      .from("services")
      .insert({
        name,
        category_id,
        description,
        price,
        duration,
        image,
        is_available: true,
        payment_timing: payment_timing || "at_booking",
        customer_choice_fields: normalizedCustomerChoiceFields,
      })
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    // Add category_name to the response
    const responseData = {
      ...newService,
      category_name: category.name,
    };

    const response: ApiResponse<Service> = {
      success: true,
      data: responseData,
      message: "Service created successfully",
    };

    res.status(201).json(response);
  },

  async updateService(req: Request, res: Response) {
    const { id } = req.params;
    let updates = req.body;

    // Validate payment_timing if provided
    if (
      updates.payment_timing &&
      !["at_booking", "after_service"].includes(updates.payment_timing)
    ) {
      throw new ValidationError(
        "Invalid payment_timing. Must be: at_booking or after_service",
      );
    }

    if (updates.customer_choice_fields) {
      updates = {
        ...updates,
        customer_choice_fields: normalizeCustomerChoiceFields(
          updates.customer_choice_fields,
        ),
      };
    }

    const { data: service, error: fetchError } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !service) {
      throw new NotFoundError("Service not found");
    }

    const { data: updatedService, error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<Service> = {
      success: true,
      data: updatedService,
      message: "Service updated successfully",
    };

    res.status(200).json(response);
  },

  async deleteService(req: Request, res: Response) {
    const { id } = req.params;

    const { data: service, error: fetchError } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !service) {
      throw new NotFoundError("Service not found");
    }

    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: "Service deleted successfully",
    };

    res.status(200).json(response);
  },

  async getCategories(req: Request, res: Response) {
    const categories = await db.query(
      `
        SELECT
          sc.*,
          COUNT(s.id)::int AS service_count
        FROM service_categories sc
        LEFT JOIN services s ON s.category_id = sc.id AND s.is_available = true
        GROUP BY sc.id
        ORDER BY sc.name ASC
      `,
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: categories || [],
    };

    res.status(200).json(response);
  },

  async getCategoryById(req: Request, res: Response) {
    const { id } = req.params;

    const { data: category, error } = await supabase
      .from("service_categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !category) {
      throw new NotFoundError("Category not found");
    }

    const response: ApiResponse<any> = {
      success: true,
      data: category,
    };

    res.status(200).json(response);
  },

  async createCategory(req: Request, res: Response) {
    const { name, description, image } = req.body;

    // Check if category already exists
    const existingCategory = await db.queryOne(
      "SELECT id FROM service_categories WHERE name ILIKE $1",
      [name],
    );

    if (existingCategory) {
      throw new ValidationError("Category with this name already exists");
    }

    const { data: newCategory, error } = await supabase
      .from("service_categories")
      .insert({
        name,
        description: description || null,
        image: image || null,
      })
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: newCategory,
      message: "Category created successfully",
    };

    res.status(201).json(response);
  },

  async deleteCategory(req: Request, res: Response) {
    const { id } = req.params;

    // Check if category exists
    const category = await db.queryOne(
      "SELECT id FROM service_categories WHERE id = $1",
      [id],
    );

    if (!category) {
      throw new NotFoundError("Category not found");
    }

    // Delete the category (services will be orphaned but not deleted due to ON DELETE SET NULL)
    const { error } = await supabase
      .from("service_categories")
      .delete()
      .eq("id", id);

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<any> = {
      success: true,
      message: "Category deleted successfully",
    };

    res.status(200).json(response);
  },

  async getServiceEmployees(req: Request, res: Response) {
    const { id } = req.params;
    const { booking_date } = req.query;

    const service = await db.queryOne("SELECT id FROM services WHERE id = $1", [
      id,
    ]);

    if (!service) {
      throw new NotFoundError("Service not found");
    }

    const employees = await db.query(
      `
        SELECT
          e.id,
          e.user_id,
          u.name,
          u.email,
          u.phone,
          u.image,
          COALESCE(e.hourly_rate, 0)::float AS hourly_rate,
          COALESCE(e.rating, 0)::float AS rating,
          COALESCE(e.total_reviews, 0)::int AS total_reviews,
          e.is_available,
          e.verification_status,
          COUNT(b.id)::int AS bookings_on_date
        FROM employee_services es
        JOIN employees e ON e.id = es.employee_id
        JOIN users u ON u.id = e.user_id
        LEFT JOIN bookings b
          ON b.employee_id = e.id
          AND ($2::date IS NULL OR b.booking_date = $2::date)
          AND b.status <> 'cancelled'
        WHERE es.service_id = $1
          AND e.verification_status = 'approved'
          AND e.is_available = true
        GROUP BY e.id, u.id
        ORDER BY e.rating DESC, bookings_on_date ASC, u.name ASC
      `,
      [id, booking_date || null],
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: employees || [],
    };

    res.status(200).json(response);
  },
};
