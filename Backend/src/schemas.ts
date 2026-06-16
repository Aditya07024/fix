import { z } from "zod";

const customerChoiceFieldSchema = z
  .object({
    key: z
      .string()
      .min(2, "Field key is required")
      .regex(
        /^[a-z0-9_]+$/i,
        "Field key must use letters, numbers, or underscores",
      ),
    label: z.string().min(2, "Field label is required"),
    type: z.enum(["text", "textarea", "select"]),
    required: z.boolean().optional().default(false),
    options: z.array(z.string().min(1)).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (
      data.type === "select" &&
      (!data.options || data.options.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Select fields require at least one option",
      });
    }
  });

const addressSchema = z.object({
  line1: z.string().min(3, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postal_code: z.string().min(3, "Postal code is required"),
  country: z.string().min(2, "Country is required").default("India"),
});

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    phone: z.string().regex(/^[0-9]{10}$/, "Phone must be 10 digits"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["client", "employee"]),
    service_ids: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "employee") {
      if (!data.service_ids || data.service_ids.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["service_ids"],
          message: "Select at least one service",
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["client", "employee", "admin"]),
});

export const serviceSchema = z.object({
  name: z.string().min(2, "Service name required"),
  category_id: z.string().min(1, "Category required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive"),
  duration: z.number().positive("Duration must be positive"),
  image: z.string().optional(),
  is_available: z.boolean().default(true),
  payment_timing: z.enum(["at_booking", "after_service"]).default("at_booking"),
  customer_choice_fields: z
    .array(customerChoiceFieldSchema)
    .optional()
    .default([]),
});

const bookingTimeSlotSchema = z.object({
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "End time must be in HH:MM format"),
});

export const bookingSchema = z
  .object({
    service_id: z.string().min(1, "Service ID required"),
    employee_id: z
      .string()
      .min(1, "Employee ID required")
      .optional()
      .nullable(),
    booking_date: z.string().refine((date) => {
      try {
        const d = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return !Number.isNaN(d.getTime()) && d >= today;
      } catch {
        return false;
      }
    }, "Booking date must be today or a future date"),
    time_slot: bookingTimeSlotSchema.optional(),
    selected_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Selected time must be in HH:MM format")
      .optional(),
    address: addressSchema,
    save_address: z.boolean().optional().default(false),
    notes: z.string().optional(),
    client_name: z.string().min(2, "Client name must be at least 2 characters").optional(),
    customer_choices: z.record(z.string()).optional().default({}),
  })
  .superRefine((data, ctx) => {
    if (!data.time_slot && !data.selected_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either time_slot or selected_time is required",
        path: ["time_slot"],
      });
    }
  });

export const clientProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/)
    .optional(),
  image: z.string().optional(),
  address: addressSchema.optional(),
});

export const paymentMethodSchema = z.object({
  type: z.enum(["card", "upi", "wallet"]),
  label: z.string().min(2, "Label is required"),
  provider: z.string().optional(),
  last_digits: z.string().optional(),
  upi_id: z.string().optional(),
  wallet_name: z.string().optional(),
  is_default: z.boolean().optional().default(false),
});

export const employeeReviewSchema = z.object({
  verification_status: z.enum(["approved", "rejected"]),
  review_notes: z.string().optional(),
});

export const adminUserUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone must be 10 digits")
    .optional(),
  image: z.string().optional(),
  hourly_rate: z.number().positive("Hourly rate must be positive").optional(),
  document_url: z.string().url("Document URL must be valid").optional(),
  is_available: z.boolean().optional(),
  service_ids: z.array(z.string()).optional(),
});

export const supportRequestSchema = z.object({
  type: z.enum(["complaint", "extra_service"]),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  service_id: z.string().optional(),
  booking_id: z.string().optional(),
});

export const supportRequestUpdateSchema = z.object({
  status: z.enum(["open", "in_review", "resolved", "closed"]),
  admin_response: z
    .string()
    .min(3, "Admin response must be at least 3 characters"),
});

export const employeeSupportMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
});

export const reviewSchema = z.object({
  booking_id: z.string().min(1, "Booking ID required"),
  service_id: z.string().min(1, "Service ID required"),
  rating: z.number().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(5, "Comment must be at least 5 characters"),
});

export const statusUpdateSchema = z.object({
  status: z.enum([
    "pending",
    "accepted",
    "in-progress",
    "completed",
    "cancelled",
  ]),
});

export const paymentInitiateSchema = z.object({
  booking_id: z.string().min(1, "Booking ID required"),
  amount: z.number().positive("Amount must be positive"),
});

export const paymentPreBookingInitiateSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  booking: bookingSchema,
});

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const paymentVerifyAndCreateBookingSchema = paymentVerifySchema.extend({
  booking: bookingSchema,
});
