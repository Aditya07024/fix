import { Router } from "express";
import {
  authMiddleware,
  optionalAuth,
  requireRole,
} from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validation.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { servicesController } from "../controllers/servicesController.js";
import { serviceSchema } from "../schemas.js";
import { db } from "../db.js";
import type { ApiResponse } from "../types.js";

const servicesRouter = Router();

// Public routes
servicesRouter.get(
  "/",
  optionalAuth,
  asyncHandler((req, res) => servicesController.getServices(req, res)),
);

servicesRouter.get(
  "/categories",
  optionalAuth,
  asyncHandler((req, res) => servicesController.getCategories(req, res)),
);

servicesRouter.get(
  "/categories/:id",
  optionalAuth,
  asyncHandler((req, res) => servicesController.getCategoryById(req, res)),
);

servicesRouter.get(
  "/landing/stats",
  asyncHandler((req, res) => servicesController.getLandingStats(req, res)),
);

servicesRouter.get(
  "/:id/employees",
  optionalAuth,
  asyncHandler((req, res) => servicesController.getServiceEmployees(req, res)),
);

servicesRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler((req, res) => servicesController.getServiceById(req, res)),
);

// Public route for address areas
servicesRouter.get(
  "/booking/address-areas",
  asyncHandler(async (req, res) => {
    const { is_active } = req.query;

    let query = `SELECT * FROM address_areas`;
    const params: any[] = [];

    if (is_active !== undefined) {
      params.push(is_active === "true");
      query += ` WHERE is_active = $${params.length}`;
    }

    query += ` ORDER BY city, name`;

    const areas = await db.query(query, params);

    const response: ApiResponse<any[]> = {
      success: true,
      data: areas || [],
    };

    res.status(200).json(response);
  }),
);

// Admin routes
servicesRouter.post(
  "/categories",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => servicesController.createCategory(req, res)),
);

servicesRouter.delete(
  "/categories/:id",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => servicesController.deleteCategory(req, res)),
);

servicesRouter.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  validateRequest(serviceSchema),
  asyncHandler((req, res) => servicesController.createService(req, res)),
);

servicesRouter.put(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => servicesController.updateService(req, res)),
);

servicesRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  asyncHandler((req, res) => servicesController.deleteService(req, res)),
);

export default servicesRouter;
