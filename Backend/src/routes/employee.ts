import { Router } from "express";
import { authMiddleware, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { employeeController } from "../controllers/employeeController.js";
import { supportController } from "../controllers/supportController.js";
import { validateRequest } from "../middlewares/validation.js";
import { employeeSupportMessageSchema } from "../schemas.js";

const employeeRouter = Router();

// All employee routes require authentication and employee role
employeeRouter.use(authMiddleware, requireRole("employee"));

// Dashboard
employeeRouter.get(
  "/dashboard",
  asyncHandler((req, res) => employeeController.getDashboard(req, res)),
);

// Profile
employeeRouter.get(
  "/profile",
  asyncHandler((req, res) => employeeController.getProfile(req, res)),
);

employeeRouter.put(
  "/profile",
  asyncHandler((req, res) => employeeController.updateProfile(req, res)),
);

employeeRouter.put(
  "/availability",
  asyncHandler((req, res) => employeeController.updateAvailability(req, res)),
);

employeeRouter.put(
  "/hourly-rate",
  asyncHandler((req, res) => employeeController.updateHourlyRate(req, res)),
);

// Tasks
employeeRouter.get(
  "/tasks",
  asyncHandler((req, res) => employeeController.getAssignedTasks(req, res)),
);

employeeRouter.get(
  "/tasks/today",
  asyncHandler((req, res) => employeeController.getTodaysTasks(req, res)),
);

employeeRouter.put(
  "/tasks/:booking_id/complete",
  asyncHandler((req, res) => employeeController.completeTask(req, res)),
);

// Booking Requests (new feature - accept/decline unassigned bookings)
employeeRouter.get(
  "/booking-requests",
  asyncHandler((req, res) => employeeController.getPendingBookingRequests(req, res)),
);

employeeRouter.post(
  "/booking-requests/:booking_id/accept",
  asyncHandler((req, res) => employeeController.acceptBookingRequest(req, res)),
);

employeeRouter.post(
  "/booking-requests/:booking_id/decline",
  asyncHandler((req, res) => employeeController.declineBookingRequest(req, res)),
);

employeeRouter.get(
  "/admin-support",
  asyncHandler((req, res) =>
    supportController.getEmployeeAdminSupportMessages(req, res),
  ),
);

employeeRouter.post(
  "/admin-support",
  validateRequest(employeeSupportMessageSchema),
  asyncHandler((req, res) =>
    supportController.createEmployeeAdminSupportMessage(req, res),
  ),
);

// Earnings
employeeRouter.get(
  "/earnings",
  asyncHandler((req, res) => employeeController.getEarnings(req, res)),
);

export default employeeRouter;
