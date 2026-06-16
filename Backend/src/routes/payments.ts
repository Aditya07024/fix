import { Router } from "express";
import { authMiddleware, requireRole } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validation.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { paymentController } from "../controllers/paymentController.js";
import {
  paymentInitiateSchema,
  paymentPreBookingInitiateSchema,
  paymentVerifyAndCreateBookingSchema,
  paymentVerifySchema,
} from "../schemas.js";

const paymentsRouter = Router();

// Client payment routes
paymentsRouter.post(
  "/prebook/initiate",
  authMiddleware,
  requireRole("client"),
  validateRequest(paymentPreBookingInitiateSchema),
  asyncHandler((req, res) => paymentController.initiatePreBookingPayment(req, res)),
);

paymentsRouter.post(
  "/initiate",
  authMiddleware,
  requireRole("client"),
  validateRequest(paymentInitiateSchema),
  asyncHandler((req, res) => paymentController.initiatePayment(req, res)),
);

paymentsRouter.post(
  "/prebook/verify-and-create-booking",
  authMiddleware,
  requireRole("client"),
  validateRequest(paymentVerifyAndCreateBookingSchema),
  asyncHandler((req, res) =>
    paymentController.verifyPaymentAndCreateBooking(req, res),
  ),
);

paymentsRouter.post(
  "/verify",
  authMiddleware,
  requireRole("client"),
  validateRequest(paymentVerifySchema),
  asyncHandler((req, res) => paymentController.verifyPayment(req, res)),
);

paymentsRouter.get(
  "/:booking_id/status",
  authMiddleware,
  asyncHandler((req, res) => paymentController.getPaymentStatus(req, res)),
);

paymentsRouter.post(
  "/:payment_id/refund",
  authMiddleware,
  requireRole("client"),
  asyncHandler((req, res) => paymentController.refundPayment(req, res)),
);

paymentsRouter.get(
  "/history/all",
  authMiddleware,
  requireRole("client"),
  asyncHandler((req, res) => paymentController.getPaymentHistory(req, res)),
);

// Employee routes (for after-service payment requests)
paymentsRouter.post(
  "/after-service/request-payment",
  authMiddleware,
  requireRole("employee"),
  asyncHandler((req, res) => paymentController.createAfterServicePaymentRequest(req, res)),
);

paymentsRouter.get(
  "/requests",
  authMiddleware,
  requireRole("client"),
  asyncHandler((req, res) => paymentController.getPaymentRequests(req, res)),
);

paymentsRouter.get(
  "/requests/:booking_id",
  authMiddleware,
  asyncHandler((req, res) => paymentController.getPaymentRequestByBooking(req, res)),
);

paymentsRouter.post(
  "/requests/:booking_id/complete",
  authMiddleware,
  requireRole("client"),
  validateRequest(paymentVerifySchema),
  asyncHandler((req, res) => paymentController.completePaymentRequest(req, res)),
);

// Admin payout management routes
paymentsRouter.get(
  "/admin/payouts/pending",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => paymentController.getAllPendingPayouts(req, res)),
);

paymentsRouter.put(
  "/admin/payouts/:payout_id/approve",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => paymentController.approvePayout(req, res)),
);

paymentsRouter.put(
  "/admin/payouts/:payout_id/reject",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => paymentController.rejectPayout(req, res)),
);

paymentsRouter.put(
  "/admin/payouts/:payout_id/complete",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => paymentController.completePayout(req, res)),
);

paymentsRouter.get(
  "/admin/analytics",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => paymentController.getPaymentAnalytics(req, res)),
);

export default paymentsRouter;
