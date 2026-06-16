import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { supabase } from "../db.js";
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../utils/errors.js";
import { config } from "../config.js";
import { createNotification } from "./notificationsController.js";
import { ApiResponse, Payment } from "../types.js";
import {
  createBookingRecord,
  type BookingCreationInput,
} from "./bookingsController.js";

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

export const paymentController = {
  async initiatePreBookingPayment(req: Request, res: Response) {
    const userId = req.user?.id;
    const { amount, booking } = req.body as {
      amount: number;
      booking: BookingCreationInput;
    };

    console.log("initiatePreBookingPayment called with:", {
      userId,
      amount,
      service_id: booking?.service_id,
      hasRazorpayKeyId: Boolean(config.razorpay.keyId),
      hasRazorpayKeySecret: Boolean(config.razorpay.keySecret),
    });

    if (!userId) {
      throw new ValidationError("User not authenticated");
    }

    if (!booking?.service_id || !amount) {
      throw new ValidationError("booking and amount are required");
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, price")
      .eq("id", booking.service_id)
      .single();

    if (serviceError || !service) {
      throw new NotFoundError("Service not found");
    }

    const payableAmount = Number(service.price);

    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      throw new ValidationError("Invalid booking amount");
    }

    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      throw new ValidationError(
        "Razorpay is not configured on the server. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
    }

    if (Math.abs(Number(amount) - payableAmount) > 0.01) {
      console.warn("Client amount mismatch detected. Using service amount.", {
        service_id: booking.service_id,
        clientAmount: amount,
        serviceAmount: payableAmount,
      });
    }

    try {
      console.log("Creating pre-booking Razorpay order with amount:", payableAmount * 100);
      const receipt = `pre_${userId.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;
      const order = await razorpay.orders.create({
        amount: Math.round(payableAmount * 100),
        currency: "INR",
        receipt,
      });

      console.log("Pre-booking Razorpay order created:", order.id);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          razorpay_key: config.razorpay.keyId,
        },
        message: "Pre-booking payment order created",
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Pre-booking payment order creation error:", {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        response: error.response?.data,
        description: error.description,
        errorDetails: error,
        stack: error.stack,
      });

      throw new ValidationError(
        error.response?.data?.description ||
          error.description ||
          error.message ||
          "Failed to create payment order",
      );
    }
  },

  async initiatePayment(req: Request, res: Response) {
    const userId = req.user?.id;
    const { booking_id, amount } = req.body;

    console.log("initiatePayment called with:", { userId, booking_id, amount });

    // Validate input
    if (!booking_id || !amount) {
      throw new ValidationError("booking_id and amount are required");
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new ValidationError("amount must be a positive number");
    }

    if (!userId) {
      throw new ValidationError("User not authenticated");
    }

    // Validate booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq("user_id", userId)
      .single();

    console.log("Booking lookup result:", { booking, bookingError });

    if (bookingError || !booking) {
      console.error("Booking error:", bookingError);
      throw new NotFoundError("Booking not found");
    }

    if (booking.payment_status === "completed") {
      throw new ValidationError("Booking is already paid");
    }

    try {
      const payableAmount = Number(booking.total_price);

      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        throw new ValidationError("Invalid booking amount");
      }

      if (Math.abs(Number(amount) - payableAmount) > 0.01) {
        console.warn("Client amount mismatch detected. Using booking amount.", {
          booking_id,
          clientAmount: amount,
          bookingAmount: payableAmount,
        });
      }

      const { data: existingPayments, error: existingPaymentsError } =
        await supabase
          .from("payments")
          .select("id, status")
          .eq("booking_id", booking_id)
          .eq("user_id", userId)
          .in("status", ["pending", "failed"])
          .order("created_at", { ascending: false })
          .limit(1);

      if (existingPaymentsError) {
        throw new ValidationError(existingPaymentsError.message);
      }

      const existingPayment = existingPayments?.[0];

      console.log("Creating Razorpay order with amount:", payableAmount * 100);

      const receipt = `rcpt_${booking_id.replace(/-/g, "").slice(0, 20)}`;

      // Create Razorpay order
      const options = {
        amount: Math.round(payableAmount * 100),
        currency: "INR",
        receipt,
      };

      const order = await razorpay.orders.create(options);
      console.log("Razorpay order created:", order.id);

      const paymentPayload = {
        amount: payableAmount,
        razorpay_order_id: order.id,
        razorpay_payment_id: null,
        razorpay_signature: null,
        status: "pending",
        updated_at: new Date().toISOString(),
      };

      const paymentQuery = existingPayment
        ? supabase
            .from("payments")
            .update(paymentPayload)
            .eq("id", existingPayment.id)
        : supabase.from("payments").insert({
            booking_id,
            user_id: userId,
            ...paymentPayload,
          });

      const { data: payment, error } = await paymentQuery.select().single();

      if (error) {
        console.error("Database insert error:", error);
        throw new ValidationError(error.message);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          razorpay_key: config.razorpay.keyId,
          booking_id,
          payment_id: payment.id,
        },
        message: "Payment order created",
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Payment order creation error:", {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        response: error.response?.data,
        description: error.description,
        errorDetails: error,
        stack: error.stack,
      });

      // Try to extract the best error message
      const errorMessage =
        error.response?.data?.description ||
        error.description ||
        error.message ||
        "Failed to create payment order";

      throw new ValidationError(errorMessage);
    }
  },

  async createAfterServicePaymentRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    const { booking_id } = req.body;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq(
        "employee_id",
        (
          await supabase
            .from("employees")
            .select("id")
            .eq("user_id", userId)
            .single()
        ).data?.id || "",
      )
      .single();

    if (bookingError || !booking) {
      throw new NotFoundError("Booking not found or Not authorized");
    }

    if (booking.payment_timing !== "after_service") {
      throw new ValidationError(
        "This booking does not require payment after service",
      );
    }

    if (booking.payment_status === "completed") {
      throw new ValidationError("Payment already completed");
    }

    try {
      // Create payment request record
      const { data: paymentRequest, error } = await supabase
        .from("payments")
        .insert({
          booking_id,
          user_id: booking.user_id,
          amount: booking.total_price,
          razorpay_order_id: `payment_request_${booking_id}`,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      // Create notification for client
      await createNotification(
        booking.user_id,
        "payment_completed",
        "Payment Request",
        `Your service has been completed. Please complete the payment of ₹${booking.total_price}`,
        booking_id,
        `/client/payment/${paymentRequest.id}`,
      );

      const response: ApiResponse<any> = {
        success: true,
        data: paymentRequest,
        message: "Payment request created and sent to client",
      };

      res.status(201).json(response);
    } catch (error: any) {
      throw new ValidationError(
        error.message || "Failed to create payment request",
      );
    }
  },

  async verifyPayment(req: Request, res: Response) {
    const userId = req.user?.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    try {
      // Verify signature
      const generatedSignature = crypto
        .createHmac("sha256", config.razorpay.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        throw new ValidationError("Invalid payment signature");
      }

      // Get payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("razorpay_order_id", razorpay_order_id)
        .eq("user_id", userId)
        .single();

      if (paymentError || !payment) {
        throw new NotFoundError("Payment record not found");
      }

      // Update payment status
      const { data: updatedPayment, error: updateError } = await supabase
        .from("payments")
        .update({
          razorpay_payment_id,
          razorpay_signature,
          status: "completed",
        })
        .eq("id", payment.id)
        .select()
        .single();

      if (updateError) {
        throw new ValidationError(updateError.message);
      }

      // Update booking payment status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ payment_status: "completed" })
        .eq("id", payment.booking_id);

      if (bookingError) {
        throw new ValidationError(bookingError.message);
      }

      const response: ApiResponse<Payment> = {
        success: true,
        data: updatedPayment,
        message: "Payment verified and completed successfully",
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ValidationError(error.message || "Payment verification failed");
    }
  },

  async verifyPaymentAndCreateBooking(req: Request, res: Response) {
    const userId = req.user?.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking,
    } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      booking: BookingCreationInput;
    };

    if (!userId) {
      throw new ValidationError("User not authenticated");
    }

    const generatedSignature = crypto
      .createHmac("sha256", config.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      throw new ValidationError("Invalid payment signature");
    }

    const { booking: createdBooking } = await createBookingRecord(userId, booking);

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        booking_id: createdBooking.id,
        user_id: userId,
        amount: createdBooking.total_price,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        status: "completed",
      })
      .select()
      .single();

    if (paymentError) {
      throw new ValidationError(paymentError.message);
    }

    const { error: bookingError } = await supabase
      .from("bookings")
      .update({ payment_status: "completed" })
      .eq("id", createdBooking.id);

    if (bookingError) {
      throw new ValidationError(bookingError.message);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        booking: {
          ...createdBooking,
          payment_status: "completed",
        },
        payment,
      },
      message: "Payment verified and booking created successfully",
    };

    res.status(201).json(response);
  },

  async getPaymentStatus(req: Request, res: Response) {
    const { booking_id } = req.params;
    const userId = req.user?.id;

    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const payment = payments?.[0];

    if (error || !payment) {
      throw new NotFoundError("Payment not found");
    }

    const response: ApiResponse<Payment> = {
      success: true,
      data: payment,
    };

    res.status(200).json(response);
  },

  async refundPayment(req: Request, res: Response) {
    const { payment_id } = req.params;
    const userId = req.user?.id;

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .eq("user_id", userId)
      .single();

    if (paymentError || !payment) {
      throw new NotFoundError("Payment not found");
    }

    if (payment.status !== "completed") {
      throw new ValidationError("Only completed payments can be refunded");
    }

    try {
      // Create refund
      const refund = await razorpay.payments.refund(
        payment.razorpay_payment_id,
        {
          amount: payment.amount * 100,
        },
      );

      // Update payment status
      const { data: updatedPayment, error: updateError } = await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("id", payment_id)
        .select()
        .single();

      if (updateError) {
        throw new ValidationError(updateError.message);
      }

      await supabase
        .from("bookings")
        .update({ payment_status: "refunded" })
        .eq("id", payment.booking_id);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          refund_id: refund.id,
          status: refund.status,
          amount: (refund.amount ?? 0) / 100,
        },
        message: "Payment refunded successfully",
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ValidationError(error.message || "Failed to refund payment");
    }
  },

  async getPaymentHistory(req: Request, res: Response) {
    const userId = req.user?.id;
    const { limit = 10, offset = 0 } = req.query;

    const { data: payments, error } = await supabase
      .from("payments")
      .select(
        `
        *,
        bookings:booking_id (
          id,
          booking_date,
          total_price,
          status,
          services:service_id (id, name, description)
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: payments,
      message: "Payment history retrieved",
    };

    res.status(200).json(response);
  },

  // Employee payout methods
  async createPayoutRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    const {
      amount,
      payout_method,
      bank_account_number,
      bank_ifsc_code,
      upi_id,
    } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      throw new ValidationError("Amount must be greater than 0");
    }

    // Validate payout method
    if (!["bank", "upi", "card"].includes(payout_method)) {
      throw new ValidationError("Invalid payout method");
    }

    // Get employee record
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, total_earnings, verification_status")
      .eq("user_id", userId)
      .single();

    if (empError || !employee) {
      throw new NotFoundError("Employee profile not found");
    }

    if (employee.verification_status !== "approved") {
      throw new ValidationError("Only approved employees can request payouts");
    }

    // Check if employee has sufficient balance
    if (Number(employee.total_earnings) < amount) {
      throw new ValidationError("Insufficient balance for payout");
    }

    // Validate payout details based on method
    if (payout_method === "bank") {
      if (!bank_account_number || !bank_ifsc_code) {
        throw new ValidationError(
          "Bank account number and IFSC code are required",
        );
      }
    } else if (payout_method === "upi") {
      if (!upi_id) {
        throw new ValidationError("UPI ID is required");
      }
    }

    try {
      // Create payout request
      const { data: payout, error } = await supabase
        .from("payouts")
        .insert({
          employee_id: employee.id,
          user_id: userId,
          amount,
          payout_method,
          bank_account_number:
            payout_method === "bank" ? bank_account_number : null,
          bank_ifsc_code: payout_method === "bank" ? bank_ifsc_code : null,
          upi_id: payout_method === "upi" ? upi_id : null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: payout,
        message: "Payout request created successfully",
      };

      res.status(201).json(response);
    } catch (error: any) {
      throw new ValidationError(
        error.message || "Failed to create payout request",
      );
    }
  },

  async getEmployeePayouts(req: Request, res: Response) {
    const userId = req.user?.id;
    const { status, limit = 10, offset = 0 } = req.query;

    // Get employee record
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (empError || !employee) {
      throw new NotFoundError("Employee profile not found");
    }

    let query = supabase
      .from("payouts")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: payouts, error } = await query.range(
      Number(offset),
      Number(offset) + Number(limit) - 1,
    );

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: payouts,
      message: "Payout history retrieved",
    };

    res.status(200).json(response);
  },

  async getEmployeeEarningsDetail(req: Request, res: Response) {
    const userId = req.user?.id;

    // Get employee record
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, total_earnings, verification_status")
      .eq("user_id", userId)
      .single();

    if (empError || !employee) {
      throw new NotFoundError("Employee profile not found");
    }

    // Get earnings breakdown by booking
    const { data: bookings, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        booking_date,
        total_price,
        status,
        services:service_id (id, name),
        payments:id (
          amount,
          status as payment_status,
          created_at
        )
      `,
      )
      .eq("employee_id", employee.id)
      .eq("status", "completed")
      .order("booking_date", { ascending: false });

    if (bookingError) {
      throw new ValidationError(bookingError.message);
    }

    // Get total paid out via payouts table
    const { data: payouts } = await supabase
      .from("payouts")
      .select("amount")
      .eq("employee_id", employee.id)
      .eq("status", "completed");

    const totalPaidOut =
      payouts?.reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0,
      ) || 0;
    const availableBalance = Number(employee.total_earnings) - totalPaidOut;

    const response: ApiResponse<any> = {
      success: true,
      data: {
        total_earnings: Number(employee.total_earnings),
        total_paid_out: totalPaidOut,
        available_balance: Math.max(0, availableBalance),
        earnings_breakdown: bookings || [],
      },
      message: "Employee earnings details retrieved",
    };

    res.status(200).json(response);
  },

  // Admin payout management methods
  async getAllPendingPayouts(req: Request, res: Response) {
    const { limit = 20, offset = 0, employee_id } = req.query;

    let query = supabase
      .from("payouts")
      .select(
        `
        *,
        users:user_id (id, name, email, phone),
        employees:employee_id (id, hourly_rate)
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (employee_id) {
      query = query.eq("employee_id", employee_id);
    }

    const {
      data: payouts,
      error,
      count,
    } = await query.range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: payouts,
      message: "Pending payouts retrieved",
    };

    res.status(200).json(response);
  },

  async approvePayout(req: Request, res: Response) {
    const { payout_id } = req.params;
    const { razorpay_payout_id } = req.body;

    // Get payout request
    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) {
      throw new NotFoundError("Payout not found");
    }

    if (payout.status !== "pending") {
      throw new ValidationError("Only pending payouts can be approved");
    }

    try {
      // Update payout status to processing
      const { data: updatedPayout, error } = await supabase
        .from("payouts")
        .update({
          status: "processing",
          razorpay_payout_id: razorpay_payout_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payout_id)
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: updatedPayout,
        message: "Payout approved and processing initiated",
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ValidationError(error.message || "Failed to approve payout");
    }
  },

  async rejectPayout(req: Request, res: Response) {
    const { payout_id } = req.params;
    const { reason } = req.body;

    // Get payout request
    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) {
      throw new NotFoundError("Payout not found");
    }

    if (payout.status !== "pending") {
      throw new ValidationError("Only pending payouts can be rejected");
    }

    try {
      const { data: updatedPayout, error } = await supabase
        .from("payouts")
        .update({
          status: "failed",
          failure_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payout_id)
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: updatedPayout,
        message: "Payout rejected",
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ValidationError(error.message || "Failed to reject payout");
    }
  },

  async completePayout(req: Request, res: Response) {
    const { payout_id } = req.params;

    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) {
      throw new NotFoundError("Payout not found");
    }

    if (payout.status !== "processing") {
      throw new ValidationError(
        "Only processing payouts can be marked as completed",
      );
    }

    try {
      const { data: updatedPayout, error } = await supabase
        .from("payouts")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payout_id)
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: updatedPayout,
        message: "Payout marked as completed",
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ValidationError(
        error.message || "Failed to mark payout as completed",
      );
    }
  },

  async getPaymentAnalytics(req: Request, res: Response) {
    const { start_date, end_date } = req.query;

    try {
      // Revenue is tracked from completed bookings so cash and online payments
      // are counted once from the same source of truth.
      const { data: payments } = await supabase
        .from("bookings")
        .select("id, total_price, payment_status, completed_at")
        .eq("payment_status", "completed");

      const { data: payouts } = await supabase
        .from("payouts")
        .select("amount, status, created_at");

      const completedPayments = payments || [];
      const totalRevenue = completedPayments.reduce(
        (sum: number, p: any) => sum + Number(p.total_price || 0),
        0,
      );

      const completedPayouts =
        payouts?.filter((p: any) => p.status === "completed") || [];
      const totalPaidOut = completedPayouts.reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0,
      );

      const platformEarnings = totalRevenue - totalPaidOut;

      const response: ApiResponse<any> = {
        success: true,
        data: {
          total_revenue: totalRevenue,
          total_paid_out: totalPaidOut,
          platform_earnings: platformEarnings,
          total_transactions: completedPayments.length,
          pending_payouts:
            payouts?.filter((p: any) => p.status === "pending").length || 0,
          processing_payouts:
            payouts?.filter((p: any) => p.status === "processing").length || 0,
        },
        message: "Payment analytics retrieved",
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ValidationError(error.message || "Failed to fetch analytics");
    }
  },

  // Get all pending payment requests for a client
  async getPaymentRequests(req: Request, res: Response) {
    const userId = req.user?.id;
    const { status } = req.query;

    try {
      let query = supabase
        .from("payments")
        .select(
          "*, bookings(id, service_id, booking_date, total_price, services(name))",
        )
        .eq("user_id", userId)
        .eq("status", status || "pending")
        .order("created_at", { ascending: false });

      const { data: paymentRequests, error } = await query;

      if (error) {
        throw new ValidationError(error.message);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: paymentRequests || [],
        message: "Payment requests retrieved",
      };

      res.status(200).json(response);
    } catch (error: any) {
      throw new ValidationError(
        error.message || "Failed to fetch payment requests",
      );
    }
  },

  // Get payment request for a specific booking
  async getPaymentRequestByBooking(req: Request, res: Response) {
    const userId = req.user?.id;
    const { booking_id } = req.params;

    try {
      const { data: payment, error } = await supabase
        .from("payments")
        .select(
          "*, bookings(id, service_id, booking_date, total_price, services(name))",
        )
        .eq("id", booking_id)
        .eq("user_id", userId)
        .single();

      if (error) {
        throw new NotFoundError("Payment request not found");
      }

      const response: ApiResponse<any> = {
        success: true,
        data: payment,
        message: "Payment request retrieved",
      };

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      throw new ValidationError(
        error.message || "Failed to fetch payment request",
      );
    }
  },

  // Complete payment request (after_service payment)
  async completePaymentRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    const { booking_id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    try {
      // Get the payment request
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("id", booking_id)
        .eq("user_id", userId)
        .single();

      if (paymentError || !payment) {
        throw new NotFoundError("Payment request not found");
      }

      // Verify the signature with Razorpay
      const crypto = await import("crypto");
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        throw new ValidationError("Payment signature verification failed");
      }

      // Update payment status
      const { data: updatedPayment, error: updateError } = await supabase
        .from("payments")
        .update({
          razorpay_payment_id,
          razorpay_order_id: razorpay_order_id || payment.razorpay_order_id,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking_id)
        .select()
        .single();

      if (updateError) {
        throw new ValidationError(updateError.message);
      }

      // Update booking payment status
      await supabase
        .from("bookings")
        .update({ payment_status: "completed" })
        .eq("id", payment.booking_id);

      // Notify employee that payment was completed
      const { data: booking } = await supabase
        .from("bookings")
        .select("employee_id")
        .eq("id", payment.booking_id)
        .single();

      if (booking) {
        const { data: employee } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", booking.employee_id)
          .single();

        if (employee) {
          await createNotification(
            employee.user_id,
            "payment_completed",
            "Payment Received",
            `Client has completed the payment of ₹${payment.amount} for booking`,
            payment.booking_id,
            `/employee/earnings`,
          );
        }
      }

      const response: ApiResponse<any> = {
        success: true,
        data: updatedPayment,
        message: "Payment completed successfully",
      };

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ValidationError)
        throw error;
      throw new ValidationError(error.message || "Failed to complete payment");
    }
  },
};
