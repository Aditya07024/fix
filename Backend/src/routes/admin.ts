import { Router } from "express";
import { authMiddleware, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { adminController } from "../controllers/adminController.js";
import { supportController } from "../controllers/supportController.js";
import { validateRequest } from "../middlewares/validation.js";
import {
  adminUserUpdateSchema,
  employeeSupportMessageSchema,
  employeeReviewSchema,
  supportRequestUpdateSchema,
} from "../schemas.js";

const adminRouter = Router();

// All admin routes require authentication and admin role
adminRouter.use(authMiddleware, requireRole("admin"));

// Dashboard stats
adminRouter.get(
  "/dashboard/stats",
  asyncHandler((req, res) => adminController.getDashboardStats(req, res)),
);

// Users management
adminRouter.get(
  "/users",
  asyncHandler((req, res) => adminController.getAllUsers(req, res)),
);

adminRouter.get(
  "/users/:id",
  asyncHandler((req, res) => adminController.getUserDetail(req, res)),
);

adminRouter.put(
  "/users/:id",
  validateRequest(adminUserUpdateSchema),
  asyncHandler((req, res) => adminController.updateUser(req, res)),
);

adminRouter.post(
  "/users",
  asyncHandler((req, res) => adminController.createAdmin(req, res)),
);

adminRouter.delete(
  "/users/:id",
  asyncHandler((req, res) => adminController.deleteUser(req, res)),
);

// Bookings management
adminRouter.get(
  "/bookings",
  asyncHandler((req, res) => adminController.getAllBookings(req, res)),
);

// Revenue stats
adminRouter.get(
  "/revenue",
  asyncHandler((req, res) => adminController.getRevenueStats(req, res)),
);

// Employee stats
adminRouter.get(
  "/employees/stats",
  asyncHandler((req, res) => adminController.getEmployeeStats(req, res)),
);

// Employee reviews
adminRouter.get(
  "/employees/reviews",
  asyncHandler((req, res) => adminController.getEmployeeReviews(req, res)),
);

// Populate missing employee_ids in reviews (data migration helper)
adminRouter.post(
  "/employees/reviews/populate",
  asyncHandler((req, res) =>
    adminController.populateEmployeeIdsInReviews(req, res),
  ),
);

adminRouter.put(
  "/employees/:user_id/review",
  validateRequest(employeeReviewSchema),
  asyncHandler((req, res) => adminController.reviewEmployee(req, res)),
);

adminRouter.get(
  "/support-requests",
  asyncHandler((req, res) => supportController.getAdminRequests(req, res)),
);

adminRouter.put(
  "/support-requests/:id",
  validateRequest(supportRequestUpdateSchema),
  asyncHandler((req, res) => supportController.updateAdminRequest(req, res)),
);

adminRouter.get(
  "/employee-support/conversations",
  asyncHandler((req, res) =>
    supportController.getAdminEmployeeSupportConversations(req, res),
  ),
);

adminRouter.get(
  "/employee-support/:employee_user_id",
  asyncHandler((req, res) =>
    supportController.getAdminEmployeeSupportMessages(req, res),
  ),
);

adminRouter.post(
  "/employee-support/:employee_user_id",
  validateRequest(employeeSupportMessageSchema),
  asyncHandler((req, res) =>
    supportController.createAdminEmployeeSupportMessage(req, res),
  ),
);

// Address areas management
adminRouter.get(
  "/address-areas",
  asyncHandler((req, res) => adminController.getAddressAreas(req, res)),
);

adminRouter.post(
  "/address-areas",
  asyncHandler((req, res) => adminController.createAddressArea(req, res)),
);

adminRouter.put(
  "/address-areas/:id",
  asyncHandler((req, res) => adminController.updateAddressArea(req, res)),
);

adminRouter.delete(
  "/address-areas/:id",
  asyncHandler((req, res) => adminController.deleteAddressArea(req, res)),
);

export default adminRouter;
