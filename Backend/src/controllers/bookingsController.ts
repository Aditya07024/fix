import { Request, Response } from "express";
import { db, pool, supabase } from "../db.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
} from "../utils/errors.js";
import { ApiResponse, Booking, BookingStatus } from "../types.js";
import { createNotification } from "./notificationsController.js";

export interface BookingCreationInput {
  service_id: string;
  employee_id?: string | null;
  client_name?: string;
  booking_date: string;
  selected_time?: string;
  time_slot?: {
    start_time: string;
    end_time: string;
  };
  notes?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  save_address?: boolean;
  customer_choices?: Record<string, string>;
}

export const createBookingRecord = async (
  userId: string,
  payload: BookingCreationInput,
  options?: {
    markPaymentCompleted?: boolean;
    isAdminBooking?: boolean;
  },
) => {
  const {
    service_id,
    employee_id,
    client_name,
    booking_date,
    selected_time,
    time_slot,
    notes,
    address,
    save_address,
    customer_choices,
  } = payload;

  // Validate service exists
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", service_id)
    .single();

  if (serviceError || !service) {
    throw new NotFoundError("Service not found");
  }

  let finalTimeSlot = time_slot;
  if (selected_time && !time_slot) {
    const [hours, minutes] = selected_time.split(":").map(Number);
    const endHour = hours + 1;
    finalTimeSlot = {
      start_time: selected_time,
      end_time: `${String(endHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    };
  }

  if (!finalTimeSlot?.start_time || !finalTimeSlot?.end_time) {
    throw new ValidationError("time_slot or selected_time is required");
  }

  let assignedEmployeeId: string | null = null;
  let assignedEmployeeUserId: string | null = null;
  let assignedEmployeeName: string | null = null;

  if (employee_id) {
    if (!options?.isAdminBooking) {
      throw new AuthorizationError(
        "Only admins can assign an employee while creating a booking",
      );
    }

    const employee = await db.queryOne(
      `
        SELECT
          e.id,
          e.user_id,
          u.name,
          e.is_available,
          e.verification_status
        FROM employees e
        JOIN users u ON u.id = e.user_id
        JOIN employee_services es ON es.employee_id = e.id
        WHERE e.id = $1
          AND es.service_id = $2
      `,
      [employee_id, service_id],
    );

    if (!employee) {
      throw new ValidationError(
        "Selected employee is not available for this service",
      );
    }

    if (employee.verification_status !== "approved") {
      throw new ValidationError("Selected employee is not approved");
    }

    if (!employee.is_available) {
      throw new ValidationError("Selected employee is currently unavailable");
    }

    const conflictingBookings = await db.query(
      `
        SELECT id, time_slot
        FROM bookings
        WHERE employee_id = $1
          AND booking_date = $2
          AND status IN ('accepted', 'in-progress')
      `,
      [employee.id, booking_date],
    );

    const hasConflict = conflictingBookings.some((existingBooking: any) =>
      areTimeSlotsOverlapping(
        finalTimeSlot.start_time,
        finalTimeSlot.end_time,
        existingBooking.time_slot,
      ),
    );

    if (hasConflict) {
      throw new ConflictError(
        "Selected employee already has another booking at this time",
      );
    }

    assignedEmployeeId = employee.id;
    assignedEmployeeUserId = employee.user_id;
    assignedEmployeeName = employee.name;
  }

  const serviceChoiceFields = Array.isArray(service.customer_choice_fields)
    ? service.customer_choice_fields
    : [];
  const normalizedCustomerChoices = Object.fromEntries(
    Object.entries(customer_choices || {}).map(([key, value]) => [
      key,
      String(value ?? "").trim(),
    ]),
  );

  for (const field of serviceChoiceFields) {
    if (!field?.key) {
      continue;
    }

    if (field.required && !normalizedCustomerChoices[field.key]) {
      throw new ValidationError(`${field.label} is required`);
    }

    if (
      field.type === "select" &&
      normalizedCustomerChoices[field.key] &&
      Array.isArray(field.options) &&
      !field.options.includes(normalizedCustomerChoices[field.key])
    ) {
      throw new ValidationError(`Invalid selection for ${field.label}`);
    }
  }

  const { data: newBooking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: userId,
      service_id,
      employee_id: assignedEmployeeId,
      client_name_override:
        options?.isAdminBooking && client_name
          ? String(client_name).trim()
          : null,
      booking_date,
      time_slot: finalTimeSlot,
      notes,
      total_price: service.price,
      status: assignedEmployeeId ? "accepted" : "pending",
      payment_status: options?.markPaymentCompleted ? "completed" : "pending",
      payment_timing: options?.isAdminBooking ? "after_service" : "at_booking",
      customer_choices: normalizedCustomerChoices,
      address_line1: address.line1,
      address_line2: address.line2 || null,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
    })
    .select()
    .single();

  if (error) {
    throw new ValidationError(error.message);
  }

  await createNotification(
    userId,
    "booking_created",
    "Booking Confirmed",
    assignedEmployeeName
      ? `Your booking for ${service.name} on ${booking_date ?? "a selected date"} has been created and assigned to ${assignedEmployeeName}.`
      : `Your booking for ${service.name} on ${booking_date ?? "a selected date"} has been created. Available employees will respond shortly.`,
    newBooking.id,
    `/client/booking/${newBooking.id}`,
  );

  const employeesToNotify = assignedEmployeeUserId
    ? [
        {
          user_id: assignedEmployeeUserId,
          employee_name: assignedEmployeeName,
        },
      ]
    : await db.query(
        `
          SELECT DISTINCT u.id as user_id, u.name as employee_name
          FROM employee_services es
          JOIN employees e ON e.id = es.employee_id
          JOIN users u ON u.id = e.user_id
          WHERE es.service_id = $1
            AND e.verification_status = 'approved'
            AND e.is_available = true
        `,
        [service_id],
      );

  for (const emp of employeesToNotify) {
    await createNotification(
      emp.user_id,
      assignedEmployeeId ? "booking_accepted" : "booking_request",
      assignedEmployeeId ? "New Booking Assigned" : "New Booking Request",
      assignedEmployeeId
        ? `A booking for ${service.name} on ${booking_date} has been assigned to you.`
        : `New booking request for ${service.name} on ${booking_date}. Review and accept or decline.`,
      newBooking.id,
      `/employee/tasks`,
    );
  }

  if (save_address) {
    await db.query(
      "UPDATE user_addresses SET is_default = false WHERE user_id = $1",
      [userId],
    );
    await db.query(
      `
        INSERT INTO user_addresses (
          user_id, line1, line2, city, state, postal_code, country, is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT DO NOTHING
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
  }

  return { booking: newBooking as Booking, service };
};

export const bookingsController = {
  async createBooking(req: Request, res: Response) {
    const userId = req.user?.id;
    const {
      service_id,
      employee_id,
      client_name,
      booking_date,
      selected_time,
      time_slot,
      notes,
      address,
      save_address,
      customer_choices,
    } = req.body;

    console.log("Creating booking with data:", {
      userId,
      service_id,
      employee_id,
      booking_date,
      selected_time,
      time_slot,
      address,
      save_address,
      notes,
      customer_choices,
    });

    const { booking: newBooking } = await createBookingRecord(
      userId!,
      {
        service_id,
        employee_id,
        client_name,
        booking_date,
        selected_time,
        time_slot,
        notes,
        address,
        save_address,
        customer_choices,
      },
      {
        markPaymentCompleted: req.user?.role === "admin",
        isAdminBooking: req.user?.role === "admin",
      },
    );

    const response: ApiResponse<Booking> = {
      success: true,
      data: newBooking,
      message: "Booking created successfully",
    };

    res.status(201).json(response);
  },

  async getMyBookings(req: Request, res: Response) {
    const userId = req.user?.id;
    const { status } = req.query;

    const response: ApiResponse<Booking[]> = {
      success: true,
      data: await getDetailedBookings(
        `b.user_id = $1${status ? " AND b.status = $2" : ""}`,
        status ? [userId, status] : [userId],
      ),
    };

    res.status(200).json(response);
  },

  async getEmployeeBookings(req: Request, res: Response) {
    const userId = req.user?.id;
    const { status } = req.query;

    // Get employee record
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (empError || !employee) {
      throw new NotFoundError("Employee record not found");
    }

    const response: ApiResponse<Booking[]> = {
      success: true,
      data: await getDetailedBookings(
        `b.employee_id = $1${status ? " AND b.status = $2" : ""}`,
        status ? [employee.id, status] : [employee.id],
      ),
    };

    res.status(200).json(response);
  },

  async getAdminBookings(req: Request, res: Response) {
    const { status, service_id, page = "1", limit = "10" } = req.query as any;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const filters: string[] = ["b.admin_deleted_at IS NULL"];
    const values: any[] = [];

    if (status) {
      values.push(status);
      filters.push(`b.status = $${values.length}`);
    }

    if (service_id) {
      values.push(service_id);
      filters.push(`b.service_id = $${values.length}`);
    }

    const whereClause = filters.length > 0 ? filters.join(" AND ") : "1 = 1";

    // Get paginated data
    const paginatedData = await getDetailedBookingsPaginated(whereClause, values, offset, limitNum);

    // Get total count
    const totalResult = await db.queryOne(
      `SELECT COUNT(*)::int as total FROM bookings b WHERE ${whereClause}`,
      values
    );
    const totalCount = totalResult?.total || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    const response: any = {
      success: true,
      data: paginatedData,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_count: totalCount,
        per_page: limitNum,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1,
      }
    };

    res.status(200).json(response);
  },

  async deleteBookingPermanently(req: Request, res: Response) {
    const { id } = req.params;

    const existingBooking = await db.queryOne(
      `
        SELECT *
        FROM bookings
        WHERE id = $1
      `,
      [id],
    );

    if (!existingBooking) {
      throw new NotFoundError("Booking not found");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query("DELETE FROM notifications WHERE booking_id = $1", [id]);
      await client.query("DELETE FROM reviews WHERE booking_id = $1", [id]);
      await client.query("DELETE FROM payments WHERE booking_id = $1", [id]);
      await client.query(
        "UPDATE support_requests SET booking_id = NULL WHERE booking_id = $1",
        [id],
      );
      await client.query("DELETE FROM bookings WHERE id = $1", [id]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const response: ApiResponse<Booking> = {
      success: true,
      data: existingBooking as Booking,
      message: "Booking permanently deleted",
    };

    res.status(200).json(response);
  },

  async updateBookingStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body as { status: BookingStatus };

    // Validate status transition
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ["accepted", "cancelled"],
      accepted: ["in-progress", "cancelled"],
      "in-progress": ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    const { data: currentBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !currentBooking) {
      throw new NotFoundError("Booking not found");
    }

    if (req.user?.role === "client") {
      throw new AuthorizationError("Clients cannot update booking status");
    }

    if (req.user?.role === "employee") {
      const employee = await db.queryOne(
        `
          SELECT id, verification_status
          FROM employees
          WHERE user_id = $1
        `,
        [req.user.id],
      );

      if (!employee || employee.id !== currentBooking.employee_id) {
        throw new AuthorizationError("This booking is not assigned to you");
      }

      if (employee.verification_status !== "approved") {
        throw new ValidationError(
          "Admin approval is required before starting service",
        );
      }
    }

    const currentStatus = currentBooking.status as BookingStatus;

    if (!validTransitions[currentStatus].includes(status)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${status}`,
      );
    }

    const updateData: any = { status };
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    // Create notifications based on status change
    const clientNotificationMessages: Record<
      BookingStatus,
      { title: string; message: string }
    > = {
      pending: {
        title: "Booking Pending",
        message: "Your booking is pending.",
      },
      accepted: {
        title: "Booking Accepted",
        message: "Your booking has been accepted by the employee.",
      },
      "in-progress": {
        title: "Service Started",
        message: "Your service is now in progress.",
      },
      completed: {
        title: "Service Completed",
        message:
          "Your service has been completed. Thank you for using our service!",
      },
      cancelled: {
        title: "Booking Cancelled",
        message: "Your booking has been cancelled.",
      },
    };

    // Map booking status to notification type
    const statusToNotificationType: Record<BookingStatus, string> = {
      pending: "booking_created",
      accepted: "booking_accepted",
      "in-progress": "booking_started",
      completed: "booking_completed",
      cancelled: "booking_cancelled",
    };

    // Notify client
    const clientNotif = clientNotificationMessages[status];
    const notificationType = statusToNotificationType[status];
    if (clientNotif && notificationType) {
      await createNotification(
        currentBooking.user_id,
        notificationType,
        clientNotif.title,
        clientNotif.message,
        id,
        `/client/booking/${id}`,
      );
    }

    // Notify employee if applicable
    if (currentBooking.employee_id && status === "accepted") {
      const employee = await db.queryOne(
        "SELECT u.id FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = $1",
        [currentBooking.employee_id],
      );
      if (employee) {
        await createNotification(
          employee.id,
          "booking_accepted",
          "New Booking Assigned",
          "A new booking has been assigned to you.",
          id,
          `/employee/booking/${id}`,
        );
      }
    }

    const response: ApiResponse<Booking> = {
      success: true,
      data: updatedBooking,
      message: "Booking status updated successfully",
    };

    res.status(200).json(response);
  },

  async cancelBooking(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !booking) {
      throw new NotFoundError("Booking not found");
    }

    // Check if user is owner or admin
    if (booking.user_id !== userId && req.user?.role !== "admin") {
      throw new AuthorizationError(
        "You do not have permission to cancel this booking",
      );
    }

    // Check if booking is already in a terminal state
    if (["cancelled", "completed"].includes(booking.status)) {
      throw new ValidationError(`Cannot cancel a ${booking.status} booking`);
    }

    // 10-minute cancellation window check (only for clients, not admins)
    if (req.user?.role === "client") {
      const now = new Date();
      const createdAt = new Date(booking.created_at);

      // Calculate time elapsed since booking creation
      const timeElapsed = now.getTime() - createdAt.getTime();
      const minutesElapsed = Math.floor(timeElapsed / (1000 * 60));
      const CANCELLATION_WINDOW = 10;

      if (minutesElapsed >= CANCELLATION_WINDOW) {
        const timeRemaining = CANCELLATION_WINDOW - minutesElapsed;
        throw new ValidationError(
          `Cancellation window has closed. You could only cancel within 10 minutes of booking creation. ${Math.abs(timeRemaining)} minute(s) too late.`,
        );
      }
    }

    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    // Create notification for cancellation
    await createNotification(
      booking.user_id,
      "booking_cancelled",
      "Booking Cancelled",
      "Your booking has been cancelled.",
      id,
      `/client/booking/${id}`,
    );

    const response: ApiResponse<Booking> = {
      success: true,
      data: updatedBooking,
      message: "Booking cancelled successfully",
    };

    res.status(200).json(response);
  },

  async getBookingById(req: Request, res: Response) {
    const { id } = req.params;
    const bookings = await getDetailedBookings("b.id = $1", [id]);
    const booking = bookings[0];

    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    const response: ApiResponse<Booking> = {
      success: true,
      data: booking,
    };

    res.status(200).json(response);
  },

  async getAvailableSlots(req: Request, res: Response) {
    const { service_id, employee_id, booking_date } = req.query;

    // Validate required parameters
    if (!service_id || !booking_date) {
      throw new ValidationError("service_id and booking_date are required");
    }

    // Get service to know duration
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("duration")
      .eq("id", service_id)
      .single();

    if (serviceError || !service) {
      throw new NotFoundError("Service not found");
    }

    let existingBookings: any[] = [];

    if (employee_id) {
      const employee = await db.queryOne(
        `
          SELECT e.id
          FROM employee_services es
          JOIN employees e ON e.id = es.employee_id
          WHERE es.service_id = $1
            AND e.id = $2
            AND e.verification_status = 'approved'
            AND e.is_available = true
        `,
        [service_id, employee_id],
      );

      if (!employee) {
        throw new ValidationError(
          "Selected employee is not available for this service",
        );
      }

      existingBookings = await db.query(
        `
          SELECT time_slot
          FROM bookings
          WHERE employee_id = $1
            AND booking_date = $2::DATE
            AND status <> 'cancelled'
        `,
        [employee_id, booking_date],
      );
    }

    // Check if booking date is today
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const isToday = todayString === booking_date;

    let currentTime: { hours: number; minutes: number } | null = null;
    if (isToday) {
      currentTime = {
        hours: today.getHours(),
        minutes: today.getMinutes(),
      };
    }

    console.log("Slot generation:", {
      booking_date,
      todayString,
      isToday,
      currentTime,
      serverTime: today.toISOString(),
    });

    const slots = generateTimeSlots(
      service.duration,
      existingBookings || [],
      currentTime,
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: slots,
    };

    res.status(200).json(response);
  },
};

async function getDetailedBookingsPaginated(whereClause: string, values: any[], offset: number, limit: number) {
  const paginatedRows = await db.query(
    `
      SELECT
        b.*,
        s.name AS service_name,
        s.description AS service_description,
        s.image AS service_image,
        s.duration::int AS service_duration,
        COALESCE(s.rating, 0)::float AS service_rating,
        s.payment_timing,
        s.customer_choice_fields,
        COALESCE(NULLIF(b.client_name_override, ''), client.name) AS client_name,
        client.phone AS client_phone,
        employee_user.name AS employee_name,
        employee_user.phone AS employee_phone,
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
      WHERE ${whereClause}
      ORDER BY b.booking_date ASC, (b.time_slot->>'start_time') ASC, b.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset]
  );

  const CANCELLATION_WINDOW_MINUTES = 10;
  return paginatedRows.map((row: any) => {
    const now = new Date();
    const createdAt = new Date(row.created_at);
    const timeElapsed = now.getTime() - createdAt.getTime();
    const elapsedSeconds = Math.max(0, Math.floor(timeElapsed / 1000));
    const totalSecondsRemaining = Math.max(
      0,
      CANCELLATION_WINDOW_MINUTES * 60 - elapsedSeconds,
    );
    const minutesElapsed = Math.floor(elapsedSeconds / 60);

    const canBeCancelled =
      minutesElapsed < CANCELLATION_WINDOW_MINUTES &&
      !["cancelled", "completed"].includes(row.status);
    const minutesRemaining = Math.floor(totalSecondsRemaining / 60);
    const secondsRemaining = totalSecondsRemaining % 60;

    return {
      ...row,
      total_price: Number(row.total_price || 0),
      cancellation_status: {
        can_be_cancelled: canBeCancelled,
        minutes_remaining: minutesRemaining,
        seconds_remaining: secondsRemaining,
        cancellation_window_minutes: CANCELLATION_WINDOW_MINUTES,
      },
    };
  });
}

async function getDetailedBookings(whereClause: string, values: any[]) {
  const rows = await db.query(
    `
      SELECT
        b.*,
        s.name AS service_name,
        s.description AS service_description,
        s.image AS service_image,
        s.duration::int AS service_duration,
        COALESCE(s.rating, 0)::float AS service_rating,
        s.payment_timing,
        s.customer_choice_fields,
        COALESCE(NULLIF(b.client_name_override, ''), client.name) AS client_name,
        client.phone AS client_phone,
        employee_user.name AS employee_name,
        employee_user.phone AS employee_phone,
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
      WHERE ${whereClause}
      ORDER BY b.booking_date ASC, (b.time_slot->>'start_time') ASC, b.created_at DESC
    `,
    values
  );

  const CANCELLATION_WINDOW_MINUTES = 10;
  return rows.map((row: any) => {
    const now = new Date();
    const createdAt = new Date(row.created_at);
    const timeElapsed = now.getTime() - createdAt.getTime();
    const elapsedSeconds = Math.max(0, Math.floor(timeElapsed / 1000));
    const totalSecondsRemaining = Math.max(
      0,
      CANCELLATION_WINDOW_MINUTES * 60 - elapsedSeconds,
    );
    const minutesElapsed = Math.floor(elapsedSeconds / 60);

    const canBeCancelled =
      minutesElapsed < CANCELLATION_WINDOW_MINUTES &&
      !["cancelled", "completed"].includes(row.status);
    const minutesRemaining = Math.floor(totalSecondsRemaining / 60);
    const secondsRemaining = totalSecondsRemaining % 60;

    return {
      ...row,
      total_price: Number(row.total_price || 0),
      cancellation_status: {
        can_be_cancelled: canBeCancelled,
        minutes_remaining: minutesRemaining,
        seconds_remaining: secondsRemaining,
        cancellation_window_minutes: CANCELLATION_WINDOW_MINUTES,
      },
    };
  });
}

function generateTimeSlots(
  duration: number,
  bookedSlots: any[],
  currentTime: { hours: number; minutes: number } | null = null,
) {
  const slots: Array<{
    start_time: string;
    end_time: string;
    is_booked: boolean;
  }> = [];
  const startHour = 9;
  const endHour = 18;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += duration) {
      const startTime = `${String(hour).padStart(2, "0")}:${String(
        min,
      ).padStart(2, "0")}`;
      const endMin = min + duration;
      const endHourOffset = Math.floor(endMin / 60);
      const actualEndHour = hour + endHourOffset;
      const actualEndMin = endMin % 60;

      if (actualEndHour <= endHour) {
        const endTime = `${String(actualEndHour).padStart(2, "0")}:${String(
          actualEndMin,
        ).padStart(2, "0")}`;

        // Skip past time slots for today
        if (currentTime) {
          const slotHour = hour;
          const slotMinute = min;
          const currentHour = currentTime.hours;
          const currentMinute = currentTime.minutes;

          // Skip if slot start time is in the past or current minute
          if (
            slotHour < currentHour ||
            (slotHour === currentHour && slotMinute <= currentMinute)
          ) {
            console.log(
              `Skipping past slot: ${startTime} (current: ${currentHour}:${String(currentMinute).padStart(2, "0")})`,
            );
            continue;
          }
        }

        const isBooked = bookedSlots.some((slot: any) => {
          // Handle both object structure: {time_slot: {...}} and direct {...}
          const timeSlot = slot.time_slot || slot;
          if (!timeSlot || !timeSlot.start_time || !timeSlot.end_time) {
            return false;
          }
          return areTimeSlotsOverlapping(startTime, endTime, timeSlot);
        });

        slots.push({
          start_time: startTime,
          end_time: endTime,
          is_booked: isBooked,
        });
      }
    }
  }

  return slots;
}

function areTimeSlotsOverlapping(
  startTime1: string,
  endTime1: string,
  timeSlot: any,
): boolean {
  // Guard against null/undefined timeSlot
  if (!timeSlot || !timeSlot.start_time || !timeSlot.end_time) {
    return false;
  }

  try {
    const start1 = new Date(`2000-01-01 ${startTime1}`);
    const end1 = new Date(`2000-01-01 ${endTime1}`);
    const start2 = new Date(`2000-01-01 ${timeSlot.start_time}`);
    const end2 = new Date(`2000-01-01 ${timeSlot.end_time}`);

    return start1 < end2 && end1 > start2;
  } catch (error) {
    console.error("Error checking time slot overlap:", error, timeSlot);
    return false;
  }
}
