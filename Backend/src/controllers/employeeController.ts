import { Request, Response } from "express";
import { db, pool, supabase } from "../db.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import { ApiResponse, Employee, Booking } from "../types.js";
import { createNotification } from "./notificationsController.js";
import {
  cleanupExpiredBookingRequests,
  getBookingRequestExpiryStatus,
} from "../services/bookingRequestExpiry.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getPreferredPaymentMode = (booking: {
  customer_choices?: Record<string, string>;
}) =>
  booking.customer_choices?.payment_method ||
  booking.customer_choices?.["Preferred Payment Mode"] ||
  booking.customer_choices?.["Payment Method"] ||
  null;

export const employeeController = {
  async getDashboard(req: Request, res: Response) {
    const userId = req.user?.id;
    const [profile, todayTasks, taskStats, earnings] = await Promise.all([
      getEmployeeProfile(userId!),
      getEmployeeTodayBookings(userId!),
      getEmployeeBookingStats(userId!),
      getEmployeeEarningsSummary(userId!),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        profile,
        today_tasks: todayTasks,
        earnings,
        stats: {
          today_tasks: todayTasks.length,
          pending_tasks: Number(taskStats?.pending_tasks || 0),
          completed_tasks: Number(taskStats?.completed_tasks || 0),
          ratings: Number(profile?.rating || 0),
        },
      },
    };

    res.status(200).json(response);
  },

  async getProfile(req: Request, res: Response) {
    const userId = req.user?.id;
    const employee = await getEmployeeProfile(userId!);

    if (!employee) {
      throw new NotFoundError("Employee profile not found");
    }

    const response: ApiResponse<Employee> = {
      success: true,
      data: employee,
    };

    res.status(200).json(response);
  },

  async updateAvailability(req: Request, res: Response) {
    const userId = req.user?.id;
    const { is_available } = req.body;

    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select("id, verification_status")
      .eq("user_id", userId)
      .single();

    if (fetchError || !employee) {
      throw new NotFoundError("Employee profile not found");
    }

    if (employee.verification_status !== "approved") {
      throw new ValidationError(
        "Admin approval is required before going online",
      );
    }

    const { data: updatedEmployee, error } = await supabase
      .from("employees")
      .update({ is_available })
      .eq("id", employee.id)
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<Employee> = {
      success: true,
      data: updatedEmployee,
      message: "Availability updated successfully",
    };

    res.status(200).json(response);
  },

  async getAssignedTasks(req: Request, res: Response) {
    const userId = req.user?.id;
    const { status } = req.query;

    // Get employee record
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, verification_status")
      .eq("user_id", userId)
      .single();

    if (empError || !employee) {
      throw new NotFoundError("Employee profile not found");
    }

    if (employee.verification_status !== "approved") {
      const response: ApiResponse<Booking[]> = {
        success: true,
        data: [],
        message: "Awaiting admin approval",
      };

      res.status(200).json(response);
      return;
    }

    const response: ApiResponse<Booking[]> = {
      success: true,
      data: await getEmployeeBookingsDetailed(
        employee.id,
        status as string | undefined,
      ),
    };

    res.status(200).json(response);
  },

  async getTodaysTasks(req: Request, res: Response) {
    const userId = req.user?.id;
    const employee = await getApprovedEmployeeOrNull(userId!);

    if (!employee) {
      const response: ApiResponse<Booking[]> = {
        success: true,
        data: [],
        message: "Awaiting admin approval",
      };

      res.status(200).json(response);
      return;
    }

    const response: ApiResponse<Booking[]> = {
      success: true,
      data: await getEmployeeTodayBookings(userId!),
    };

    res.status(200).json(response);
  },

  async getEarnings(req: Request, res: Response) {
    const userId = req.user?.id;
    const response: ApiResponse<any> = {
      success: true,
      data: await getEmployeeEarningsSummary(userId!),
    };

    res.status(200).json(response);
  },

  async completeTask(req: Request, res: Response) {
    const userId = req.user?.id;
    const { booking_id } = req.params;

    // Get employee record
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, verification_status")
      .eq("user_id", userId)
      .single();

    if (empError || !employee) {
      throw new NotFoundError("Employee profile not found");
    }

    if (employee.verification_status !== "approved") {
      throw new ValidationError(
        "Admin approval is required before starting service",
      );
    }

    // Verify booking belongs to this employee
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq("employee_id", employee.id)
      .single();

    if (bookingError || !booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.status !== "in-progress") {
      throw new ValidationError("Only in-progress bookings can be completed");
    }

    const preferredPaymentMode = getPreferredPaymentMode(booking);
    const paymentCollectedInCash =
      booking.payment_timing === "after_service" &&
      booking.payment_status !== "completed" &&
      preferredPaymentMode === "cash";

    const { data: completedBooking, error } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        ...(paymentCollectedInCash ? { payment_status: "completed" } : {}),
      })
      .eq("id", booking_id)
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    // If payment timing is "after_service", create payment request
    if (
      booking.payment_timing === "after_service" &&
      booking.payment_status !== "completed" &&
      preferredPaymentMode !== "cash"
    ) {
      try {
        const { paymentController } = await import("./paymentController.js");

        // Create payment request for client
        const mockReq = {
          user: { id: userId },
          body: { booking_id },
        } as any;

        const mockRes = {} as any;

        // This will send notification to client for payment
        await supabase.from("payments").insert({
          booking_id,
          user_id: booking.user_id,
          amount: booking.total_price,
          razorpay_order_id: `payment_request_${booking_id}`,
          status: "pending",
        });

        // Create notification for client
        await createNotification(
          booking.user_id,
          "payment_completed",
          "Payment Request",
          `Your service has been completed. Please complete the payment of ₹${booking.total_price}`,
          booking_id,
          `/client/payment/${booking_id}`,
        );
      } catch (error) {
        console.error("Error creating payment request:", error);
        // Don't fail the task completion if payment request creation fails
      }
    }

    if (paymentCollectedInCash) {
      await createNotification(
        booking.user_id,
        "payment_completed",
        "Cash Payment Recorded",
        `Cash payment of ₹${booking.total_price} has been recorded for your completed service.`,
        booking_id,
        `/client/booking-history`,
      );
    }

    const response: ApiResponse<Booking> = {
      success: true,
      data: completedBooking,
      message:
        paymentCollectedInCash
          ? "Task completed successfully. Cash payment recorded."
          : booking.payment_timing === "after_service"
          ? "Task completed successfully. Payment request sent to client."
          : "Task completed successfully",
    };

    res.status(200).json(response);
  },

  async updateHourlyRate(req: Request, res: Response) {
    const userId = req.user?.id;
    const { hourly_rate } = req.body;

    if (hourly_rate <= 0) {
      throw new ValidationError("Hourly rate must be positive");
    }

    const { data: employee, error: fetchError } = await supabase
      .from("employees")
      .select("id, verification_status")
      .eq("user_id", userId)
      .single();

    if (fetchError || !employee) {
      throw new NotFoundError("Employee profile not found");
    }

    if (employee.verification_status !== "approved") {
      throw new ValidationError(
        "Admin approval is required before updating service settings",
      );
    }

    const { data: updatedEmployee, error } = await supabase
      .from("employees")
      .update({ hourly_rate })
      .eq("id", employee.id)
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<Employee> = {
      success: true,
      data: updatedEmployee,
      message: "Hourly rate updated successfully",
    };

    res.status(200).json(response);
  },

  async updateProfile(req: Request, res: Response) {
    const userId = req.user?.id;
    const { hourly_rate, document_url, request_approval, service_ids } =
      req.body;

    const employee = await db.queryOne(
      `
        SELECT id, verification_status, pending_service_ids
        FROM employees
        WHERE user_id = $1
      `,
      [userId],
    );

    if (!employee) {
      throw new NotFoundError("Employee profile not found");
    }

    const nextHourlyRate =
      hourly_rate === undefined || hourly_rate === null
        ? null
        : Number(hourly_rate);

    if (
      nextHourlyRate !== null &&
      (!Number.isFinite(nextHourlyRate) || nextHourlyRate <= 0)
    ) {
      throw new ValidationError("Hourly rate must be positive");
    }

    if (
      document_url !== undefined &&
      document_url !== null &&
      String(document_url).trim() !== ""
    ) {
      try {
        new URL(String(document_url));
      } catch {
        throw new ValidationError("Document URL must be valid");
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

    if (nextServiceIds) {
      if (nextServiceIds.some((serviceId) => !UUID_PATTERN.test(serviceId))) {
        throw new ValidationError(
          "One or more selected task types are invalid",
        );
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
        throw new ValidationError(
          "One or more selected task types are invalid",
        );
      }
    }

    if (request_approval) {
      if (!document_url || !String(document_url).trim()) {
        throw new ValidationError(
          "Document URL is required before requesting approval",
        );
      }

      if (nextHourlyRate === null) {
        throw new ValidationError(
          "Hourly rate is required before requesting approval",
        );
      }

      if (nextServiceIds !== undefined && nextServiceIds.length === 0) {
        throw new ValidationError(
          "Select at least one task type before requesting approval",
        );
      }

      if (nextServiceIds === undefined) {
        const existingAssignments = await db.queryOne(
          `
            SELECT COUNT(*)::int AS count
            FROM employee_services
            WHERE employee_id = $1
          `,
          [employee.id],
        );

        if (
          !existingAssignments ||
          Number(existingAssignments.count || 0) === 0
        ) {
          throw new ValidationError(
            "Select at least one task type before requesting approval",
          );
        }
      }
    }

    const currentServiceRows = await db.query(
      `
        SELECT service_id::text AS service_id
        FROM employee_services
        WHERE employee_id = $1
        ORDER BY service_id::text ASC
      `,
      [employee.id],
    );

    const currentServiceIds = currentServiceRows.map(
      (row: { service_id: string }) => row.service_id,
    );
    const normalizedNextServiceIds =
      nextServiceIds?.slice().sort() || undefined;
    const hasApprovedServiceChanges =
      employee.verification_status === "approved" &&
      normalizedNextServiceIds !== undefined &&
      JSON.stringify(normalizedNextServiceIds) !==
        JSON.stringify(currentServiceIds);

    const client = await pool.connect();
    let responseMessage = "Employee profile updated successfully";

    try {
      await client.query("BEGIN");

      const updateResult = await client.query(
        `
          UPDATE employees
          SET
            hourly_rate = COALESCE($1, hourly_rate),
            document_url = COALESCE($2, document_url),
            verification_status = CASE
              WHEN $3::boolean AND verification_status <> 'approved' THEN 'pending'
              ELSE verification_status
            END,
            pending_service_ids = CASE
              WHEN $4::boolean THEN $5
              WHEN $6::boolean THEN '{}'
              ELSE pending_service_ids
            END,
            review_notes = CASE
              WHEN $3::boolean OR $4::boolean THEN NULL
              ELSE review_notes
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $7
          RETURNING *
        `,
        [
          nextHourlyRate,
          document_url ? String(document_url).trim() : null,
          Boolean(request_approval),
          hasApprovedServiceChanges,
          (normalizedNextServiceIds || []).map((serviceId) => String(serviceId)),
          employee.verification_status !== "approved" &&
            nextServiceIds !== undefined,
          userId,
        ],
      );

      if (
        employee.verification_status !== "approved" &&
        nextServiceIds !== undefined
      ) {
        await client.query(
          `
            DELETE FROM employee_services
            WHERE employee_id = $1
          `,
          [employee.id],
        );

        if (nextServiceIds.length > 0) {
          await client.query(
            `
              INSERT INTO employee_services (employee_id, service_id)
              SELECT $1, UNNEST($2::uuid[])
            `,
            [employee.id, nextServiceIds],
          );
        }
      }

      if (hasApprovedServiceChanges) {
        responseMessage =
          "New services submitted for admin approval. Your current approved services remain active until review.";
      } else if (request_approval) {
        responseMessage = "Approval request submitted successfully";
      }

      await client.query("COMMIT");

      const updatedEmployee = updateResult.rows[0] || null;

      if (!updatedEmployee) {
        throw new ValidationError("Failed to update employee profile");
      }

      const response: ApiResponse<Employee> = {
        success: true,
        data: updatedEmployee,
        message: responseMessage,
      };

      res.status(200).json(response);
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Get pending booking requests for the employee
  async getPendingBookingRequests(req: Request, res: Response) {
    await cleanupExpiredBookingRequests();

    const userId = req.user?.id;

    // Get employee id for this user
    const employee = await db.queryOne(
      "SELECT id FROM employees WHERE user_id = $1",
      [userId],
    );

    if (!employee) {
      throw new NotFoundError("Employee profile not found");
    }

    // Get all pending bookings for services this employee provides
    const pendingBookings = await db.query(
      `
        SELECT 
          b.id,
          b.service_id,
          s.name as service_name,
          b.total_price,
          b.status,
          b.payment_status,
          b.booking_date,
          b.time_slot,
          b.customer_choices,
          b.notes,
          COALESCE(NULLIF(b.client_name_override, ''), u.name) as client_name,
          u.email as client_email,
          u.phone as client_phone,
          b.address_line1,
          b.address_line2,
          b.country,
          b.city,
          b.state,
          b.postal_code,
          b.created_at
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        JOIN users u ON u.id = b.user_id
        WHERE b.employee_id IS NULL
          AND b.status = 'pending'
          AND EXISTS (
            SELECT 1 FROM employee_services es
            WHERE es.employee_id = $1 AND es.service_id = b.service_id
          )
        ORDER BY b.created_at DESC
      `,
      [employee.id],
    );

    const response: ApiResponse<any> = {
      success: true,
      data: pendingBookings.map((booking: any) => ({
        ...booking,
        request_expiry_status: getBookingRequestExpiryStatus(booking.created_at),
      })),
      message: "Pending booking requests retrieved successfully",
    };

    res.status(200).json(response);
  },

  // Accept a booking request
  async acceptBookingRequest(req: Request, res: Response) {
    await cleanupExpiredBookingRequests();

    const userId = req.user?.id;
    const { booking_id } = req.params;

    if (!booking_id) {
      throw new ValidationError("booking_id is required");
    }

    const client = await pool.connect();
    let booking: Booking | null = null;
    let updatedBooking: Booking | null = null;
    let employeeId: string | null = null;

    try {
      await client.query("BEGIN");

      const employeeResult = await client.query(
        "SELECT id FROM employees WHERE user_id = $1",
        [userId],
      );
      const employee = employeeResult.rows[0] || null;

      if (!employee) {
        throw new NotFoundError("Employee profile not found");
      }

      employeeId = employee.id;

      const bookingResult = await client.query(
        `
          SELECT *
          FROM bookings
          WHERE id = $1
          FOR UPDATE
        `,
        [booking_id],
      );

      booking = (bookingResult.rows[0] as Booking | undefined) || null;

      if (!booking) {
        throw new NotFoundError("Booking not found");
      }

      if (booking.employee_id !== null || booking.status !== "pending") {
        throw new ValidationError(
          "This booking has already been accepted by another employee",
        );
      }

      const serviceCheckResult = await client.query(
        `
          SELECT 1
          FROM employee_services
          WHERE employee_id = $1 AND service_id = $2
        `,
        [employee.id, booking.service_id],
      );

      if (serviceCheckResult.rowCount === 0) {
        throw new ValidationError(
          "You are not authorized to accept this booking",
        );
      }

      const conflictingBookingsResult = await client.query(
        `
          SELECT id, time_slot
          FROM bookings
          WHERE employee_id = $1
            AND booking_date = $2
            AND status IN ('accepted', 'in-progress')
            AND id <> $3
        `,
        [employee.id, booking.booking_date, booking.id],
      );

      const hasConflict = conflictingBookingsResult.rows.some(
        (existingBooking) =>
          areTimeSlotsOverlapping(
            booking!.time_slot?.start_time,
            booking!.time_slot?.end_time,
            existingBooking.time_slot,
          ),
      );

      if (hasConflict) {
        throw new ConflictError(
          "You already have another accepted booking at this time",
        );
      }

      const updateResult = await client.query(
        `
          UPDATE bookings
          SET employee_id = $1, status = 'accepted'
          WHERE id = $2
          RETURNING *
        `,
        [employee.id, booking_id],
      );

      updatedBooking = (updateResult.rows[0] as Booking | undefined) || null;

      if (!updatedBooking) {
        throw new ValidationError("Failed to accept booking");
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Notify client that employee accepted
    await createNotification(
      booking!.user_id,
      "booking_accepted",
      "Your Booking Accepted",
      `An employee has accepted your booking (ID: ${booking_id})`,
      booking_id,
      `/client/booking-history`,
    );

    // Notify other employees that booking was accepted
    const otherEmployees = await db.query(
      `
        SELECT DISTINCT u.id as user_id
        FROM employee_services es
        JOIN employees e ON e.id = es.employee_id
        JOIN users u ON u.id = e.user_id
        WHERE es.service_id = $1 AND e.id != $2
      `,
      [booking!.service_id, employeeId],
    );

    for (const emp of otherEmployees) {
      await createNotification(
        emp.user_id,
        "booking_taken",
        "Booking Accepted",
        `A booking request you received was accepted by another employee`,
        booking_id,
        `/employee/tasks`,
      );
    }

    const response: ApiResponse<Booking> = {
      success: true,
      data: updatedBooking!,
      message: "Booking accepted successfully",
    };

    res.status(200).json(response);
  },

  // Decline a booking request
  async declineBookingRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    const { booking_id } = req.params;
    const { reason } = req.body;

    if (!booking_id) {
      throw new ValidationError("booking_id is required");
    }

    // Get employee id for this user
    const employee = await db.queryOne(
      "SELECT id FROM employees WHERE user_id = $1",
      [userId],
    );

    if (!employee) {
      throw new NotFoundError("Employee profile not found");
    }

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new NotFoundError("Booking not found");
    }

    // Check if employee provides this service
    const serviceCheck = await db.queryOne(
      `
        SELECT 1 FROM employee_services
        WHERE employee_id = $1 AND service_id = $2
      `,
      [employee.id, booking.service_id],
    );

    if (!serviceCheck) {
      throw new ValidationError(
        "You are not authorized to decline this booking",
      );
    }

    // Just create a notification for the employee declining (booking stays pending for others)
    // In a more advanced system, you might track declined bookings per employee
    const declineReason = reason ? `: ${reason}` : "";
    await createNotification(
      booking.user_id,
      "booking_declined",
      "Booking Declined",
      `An employee declined your booking${declineReason}. Other employees may still accept it.`,
      booking_id,
      `/client/booking-history`,
    );

    const response: ApiResponse<any> = {
      success: true,
      data: { booking_id, declined_by: employee.id },
      message: "Booking declined successfully",
    };

    res.status(200).json(response);
  },
};

function areTimeSlotsOverlapping(
  startTime1?: string,
  endTime1?: string,
  timeSlot?: any,
): boolean {
  if (!startTime1 || !endTime1 || !timeSlot?.start_time || !timeSlot?.end_time) {
    return false;
  }

  try {
    const start1 = new Date(`2000-01-01 ${startTime1}`);
    const end1 = new Date(`2000-01-01 ${endTime1}`);
    const start2 = new Date(`2000-01-01 ${timeSlot.start_time}`);
    const end2 = new Date(`2000-01-01 ${timeSlot.end_time}`);

    return start1 < end2 && end1 > start2;
  } catch (error) {
    console.error("Error checking employee booking overlap:", error, timeSlot);
    return false;
  }
}

async function getEmployeeProfile(userId: string) {
  return db.queryOne(
    `
      SELECT
        e.*,
        u.name,
        u.email,
        u.phone,
        u.image,
        u.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', s.id, 'name', s.name)
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::json
        ) AS assigned_services,
        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT('id', pending_service.id, 'name', pending_service.name)
              ORDER BY pending_service.name ASC
            )
            FROM services pending_service
            WHERE pending_service.id::text = ANY(
              COALESCE(e.pending_service_ids::text[], ARRAY[]::text[])
            )
          ),
          '[]'::json
        ) AS pending_assigned_services
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN employee_services es ON es.employee_id = e.id
      LEFT JOIN services s ON s.id = es.service_id
      WHERE e.user_id = $1
      GROUP BY e.id, u.id
    `,
    [userId],
  );
}

async function getApprovedEmployeeOrNull(userId: string) {
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, verification_status")
    .eq("user_id", userId)
    .single();

  if (error || !employee || employee.verification_status !== "approved") {
    return null;
  }

  return employee;
}

async function getEmployeeTodayBookings(userId: string) {
  const employee = await getApprovedEmployeeOrNull(userId);

  if (!employee) {
    return [];
  }

  const today = new Date().toISOString().split("T")[0];

  return db.query(
    `
      SELECT
        b.*,
        s.name AS service_name,
        COALESCE(NULLIF(b.client_name_override, ''), client.name) AS client_name,
        client.phone AS client_phone,
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
      WHERE (
        b.employee_id = $1
        OR (
          b.employee_id IS NULL
          AND b.service_id IN (
            SELECT service_id
            FROM employee_services
            WHERE employee_id = $1
          )
        )
      )
        AND b.booking_date = $2
        AND b.status <> 'cancelled'
      ORDER BY b.booking_date ASC, (b.time_slot->>'start_time') ASC
    `,
    [employee.id, today],
  );
}

async function getEmployeeBookingStats(userId: string) {
  const employee = await db.queryOne(
    `
      SELECT id
      FROM employees
      WHERE user_id = $1
    `,
    [userId],
  );

  if (!employee) {
    return [];
  }

  return db.query(
    `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('pending', 'accepted', 'in-progress'))::int AS pending_tasks,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_tasks
      FROM bookings
      WHERE (
        employee_id = $1
        OR (
          employee_id IS NULL
          AND service_id IN (
            SELECT service_id
            FROM employee_services
            WHERE employee_id = $1
          )
        )
      )
        AND status <> 'cancelled'
    `,
    [employee.id],
  ).then((rows) => rows[0] || { pending_tasks: 0, completed_tasks: 0 });
}

async function getEmployeeEarningsSummary(userId: string) {
  const payments = await db.query(
    `
      SELECT
        b.id,
        b.booking_date,
        b.completed_at,
        b.updated_at,
        COALESCE(b.completed_at, b.updated_at, b.created_at) AS created_at,
        b.total_price AS amount,
        b.payment_status,
        s.name AS service_name,
        COALESCE(NULLIF(b.client_name_override, ''), client.name) AS client_name
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN users client ON client.id = b.user_id
      JOIN employees e ON e.id = b.employee_id
      WHERE e.user_id = $1
        AND b.payment_status = 'completed'
      ORDER BY COALESCE(b.completed_at, b.updated_at, b.created_at) DESC
    `,
    [userId],
  );

  return {
    total_earnings:
      payments?.reduce(
        (sum: number, payment: any) => sum + Number(payment.amount || 0),
        0,
      ) || 0,
    total_transactions: payments?.length || 0,
    recent_payments: payments || [],
  };
}

async function getEmployeeBookingsDetailed(
  employeeId: string,
  status?: string,
) {
  const values: any[] = [employeeId];
  let statusFilter = "";

  if (status) {
    values.push(status);
    statusFilter = ` AND b.status = $${values.length}`;
  }

  const rows = await db.query(
    `
      SELECT
        b.*,
        s.name AS service_name,
        s.description AS service_description,
        COALESCE(NULLIF(b.client_name_override, ''), client.name) AS client_name,
        client.phone AS client_phone,
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
      WHERE (
        b.employee_id = $1
        OR (
          b.employee_id IS NULL
          AND b.service_id IN (
            SELECT service_id
            FROM employee_services
            WHERE employee_id = $1
          )
        )
      )
        AND b.status <> 'cancelled'
        ${statusFilter}
      ORDER BY b.booking_date ASC, (b.time_slot->>'start_time') ASC
    `,
    values,
  );

  return rows.map((row: any) => ({
    ...row,
    total_price: Number(row.total_price || 0),
  }));
}
