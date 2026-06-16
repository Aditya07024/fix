import { Request, Response } from "express";
import { db } from "../db.js";
import {
  ApiResponse,
  EmployeeSupportMessage,
  SupportRequest,
} from "../types.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { createNotification } from "./notificationsController.js";

export const supportController = {
  async createClientRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    const { type, subject, message, service_id, booking_id } = req.body;

    const request = await db.queryOne(
      `
        INSERT INTO support_requests (
          user_id,
          type,
          subject,
          message,
          service_id,
          booking_id,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'open')
        RETURNING *
      `,
      [
        userId,
        type,
        subject.trim(),
        message.trim(),
        service_id || null,
        booking_id || null,
      ],
    );

    const admins = await db.query(
      `
        SELECT id
        FROM users
        WHERE role = 'admin'
      `,
    );

    await Promise.all(
      admins.map((admin: any) =>
        createNotification(
          admin.id,
          "system",
          type === "complaint" ? "New Complaint" : "New Extra Service Request",
          subject.trim(),
          booking_id || undefined,
          "/admin/support",
        ),
      ),
    );

    const response: ApiResponse<SupportRequest> = {
      success: true,
      data: request,
      message: "Support request submitted successfully",
    };

    res.status(201).json(response);
  },

  async getClientRequests(req: Request, res: Response) {
    const userId = req.user?.id;

    const requests = await db.query(
      `
        SELECT
          sr.*,
          s.name AS service_name,
          b.booking_date
        FROM support_requests sr
        LEFT JOIN services s ON s.id = sr.service_id
        LEFT JOIN bookings b ON b.id = sr.booking_id
        WHERE sr.user_id = $1
        ORDER BY sr.created_at DESC
      `,
      [userId],
    );

    const response: ApiResponse<SupportRequest[]> = {
      success: true,
      data: requests || [],
    };

    res.status(200).json(response);
  },

  async getAdminRequests(req: Request, res: Response) {
    const { status, type } = req.query;
    const filters: string[] = [];
    const values: any[] = [];

    if (status) {
      values.push(status);
      filters.push(`sr.status = $${values.length}`);
    }

    if (type) {
      values.push(type);
      filters.push(`sr.type = $${values.length}`);
    }

    const requests = await db.query(
      `
        SELECT
          sr.*,
          u.name AS client_name,
          u.email AS client_email,
          u.phone AS client_phone,
          s.name AS service_name,
          b.booking_date
        FROM support_requests sr
        JOIN users u ON u.id = sr.user_id
        LEFT JOIN services s ON s.id = sr.service_id
        LEFT JOIN bookings b ON b.id = sr.booking_id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY sr.created_at DESC
      `,
      values,
    );

    const response: ApiResponse<SupportRequest[]> = {
      success: true,
      data: requests || [],
    };

    res.status(200).json(response);
  },

  async updateAdminRequest(req: Request, res: Response) {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    const existingRequest = await db.queryOne(
      `
        SELECT id, user_id, subject
        FROM support_requests
        WHERE id = $1
      `,
      [id],
    );

    if (!existingRequest) {
      throw new NotFoundError("Support request not found");
    }

    const updatedRequest = await db.queryOne(
      `
        UPDATE support_requests
        SET
          status = $1,
          admin_response = $2,
          responded_at = CASE
            WHEN $2::text IS NOT NULL AND $2::text <> '' THEN CURRENT_TIMESTAMP
            ELSE responded_at
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `,
      [status, admin_response?.trim() || null, id],
    );

    await createNotification(
      existingRequest.user_id,
      "system",
      "Support Request Updated",
      existingRequest.subject,
      undefined,
      "/client/support",
    );

    const response: ApiResponse<SupportRequest> = {
      success: true,
      data: updatedRequest,
      message: "Support request updated successfully",
    };

    res.status(200).json(response);
  },

  async getAdminEmployeeSupportConversations(req: Request, res: Response) {
    await ensureEmployeeSupportMessagesTable();

    const conversations = await db.query(
      `
        SELECT
          u.id AS employee_user_id,
          u.name AS employee_name,
          u.email AS employee_email,
          u.phone AS employee_phone,
          last_message.message AS last_message,
          last_message.created_at AS last_message_at,
          last_message.sender_role AS last_sender_role
        FROM employees e
        JOIN users u ON u.id = e.user_id
        LEFT JOIN LATERAL (
          SELECT esm.message, esm.created_at, esm.sender_role
          FROM employee_support_messages esm
          WHERE esm.employee_user_id = u.id
          ORDER BY esm.created_at DESC
          LIMIT 1
        ) last_message ON TRUE
        ORDER BY
          last_message.created_at DESC NULLS LAST,
          u.name ASC
      `,
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: conversations || [],
    };

    res.status(200).json(response);
  },

  async getAdminEmployeeSupportMessages(req: Request, res: Response) {
    await ensureEmployeeSupportMessagesTable();

    const { employee_user_id } = req.params;

    const employee = await db.queryOne(
      `
        SELECT
          u.id AS employee_user_id,
          u.name AS employee_name,
          u.email AS employee_email,
          u.phone AS employee_phone
        FROM employees e
        JOIN users u ON u.id = e.user_id
        WHERE u.id = $1
      `,
      [employee_user_id],
    );

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const messages = await getEmployeeSupportMessages(employee_user_id);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        employee,
        messages,
      },
    };

    res.status(200).json(response);
  },

  async createAdminEmployeeSupportMessage(req: Request, res: Response) {
    await ensureEmployeeSupportMessagesTable();

    const adminUserId = req.user?.id;
    const { employee_user_id } = req.params;
    const message = String(req.body.message || "").trim();

    if (!message) {
      throw new ValidationError("Message is required");
    }

    const employee = await db.queryOne(
      `
        SELECT id
        FROM users
        WHERE id = $1 AND role = 'employee'
      `,
      [employee_user_id],
    );

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const createdMessage = await db.queryOne(
      `
        INSERT INTO employee_support_messages (
          employee_user_id,
          sender_user_id,
          sender_role,
          message
        )
        VALUES ($1, $2, 'admin', $3)
        RETURNING *
      `,
      [employee_user_id, adminUserId, message],
    );

    await createNotification(
      employee_user_id,
      "system",
      "Admin Support Message",
      message.length > 80 ? `${message.slice(0, 77)}...` : message,
      undefined,
      "/employee/admin-support",
    );

    const response: ApiResponse<EmployeeSupportMessage> = {
      success: true,
      data: createdMessage,
      message: "Message sent to employee",
    };

    res.status(201).json(response);
  },

  async getEmployeeAdminSupportMessages(req: Request, res: Response) {
    await ensureEmployeeSupportMessagesTable();

    const employeeUserId = req.user?.id;
    const employee = await db.queryOne(
      `
        SELECT id, name, email, phone
        FROM users
        WHERE id = $1 AND role = 'employee'
      `,
      [employeeUserId],
    );

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const messages = await getEmployeeSupportMessages(employeeUserId!);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        employee: {
          employee_user_id: employee.id,
          employee_name: employee.name,
          employee_email: employee.email,
          employee_phone: employee.phone,
        },
        messages,
      },
    };

    res.status(200).json(response);
  },

  async createEmployeeAdminSupportMessage(req: Request, res: Response) {
    await ensureEmployeeSupportMessagesTable();

    const employeeUserId = req.user?.id;
    const message = String(req.body.message || "").trim();

    if (!message) {
      throw new ValidationError("Message is required");
    }

    const employee = await db.queryOne(
      `
        SELECT id
        FROM users
        WHERE id = $1 AND role = 'employee'
      `,
      [employeeUserId],
    );

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const createdMessage = await db.queryOne(
      `
        INSERT INTO employee_support_messages (
          employee_user_id,
          sender_user_id,
          sender_role,
          message
        )
        VALUES ($1, $2, 'employee', $3)
        RETURNING *
      `,
      [employeeUserId, employeeUserId, message],
    );

    const admins = await db.query(
      `
        SELECT id
        FROM users
        WHERE role = 'admin'
      `,
    );

    await Promise.all(
      admins.map((admin: any) =>
        createNotification(
          admin.id,
          "system",
          "Employee Support Message",
          message.length > 80 ? `${message.slice(0, 77)}...` : message,
          undefined,
          "/admin/employee-support",
        ),
      ),
    );

    const response: ApiResponse<EmployeeSupportMessage> = {
      success: true,
      data: createdMessage,
      message: "Message sent to admin",
    };

    res.status(201).json(response);
  },
};

async function ensureEmployeeSupportMessagesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS employee_support_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'employee')),
      message TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_employee_support_messages_employee_user_id
    ON employee_support_messages(employee_user_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_employee_support_messages_created_at
    ON employee_support_messages(created_at DESC)
  `);
}

async function getEmployeeSupportMessages(employeeUserId: string) {
  return db.query(
    `
      SELECT
        esm.*,
        u.name AS sender_name,
        u.email AS sender_email
      FROM employee_support_messages esm
      JOIN users u ON u.id = esm.sender_user_id
      WHERE esm.employee_user_id = $1
      ORDER BY esm.created_at ASC
    `,
    [employeeUserId],
  );
}
