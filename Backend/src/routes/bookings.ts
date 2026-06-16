import { Router } from "express";
import { authMiddleware, requireRole } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validation.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { bookingsController } from "../controllers/bookingsController.js";
import { bookingSchema, statusUpdateSchema } from "../schemas.js";

const bookingsRouter = Router();

// Protected routes
bookingsRouter.post(
  "/",
  authMiddleware,
  requireRole("client", "admin"),
  validateRequest(bookingSchema),
  asyncHandler((req, res) => bookingsController.createBooking(req, res)),
);

bookingsRouter.get(
  "/client/my-bookings",
  authMiddleware,
  requireRole("client"),
  asyncHandler((req, res) => bookingsController.getMyBookings(req, res)),
);

bookingsRouter.get(
  "/employee/my-bookings",
  authMiddleware,
  requireRole("employee"),
  asyncHandler((req, res) => bookingsController.getEmployeeBookings(req, res)),
);

bookingsRouter.get(
  "/admin/all-bookings",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => bookingsController.getAdminBookings(req, res)),
);

// Available slots - must come before /:id route
bookingsRouter.get(
  "/available-slots",
  asyncHandler((req, res) => bookingsController.getAvailableSlots(req, res)),
);

bookingsRouter.get(
  "/:id",
  authMiddleware,
  asyncHandler((req, res) => bookingsController.getBookingById(req, res)),
);

bookingsRouter.put(
  "/:id/status",
  authMiddleware,
  validateRequest(statusUpdateSchema),
  asyncHandler((req, res) => bookingsController.updateBookingStatus(req, res)),
);

bookingsRouter.put(
  "/:id/cancel",
  authMiddleware,
  asyncHandler((req, res) => bookingsController.cancelBooking(req, res)),
);

bookingsRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) =>
    bookingsController.deleteBookingPermanently(req, res),
  ),
);

export default bookingsRouter;
