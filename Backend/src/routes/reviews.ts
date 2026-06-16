import { Router } from "express";
import { authMiddleware, requireRole } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validation.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { reviewsController } from "../controllers/reviewsController.js";
import { reviewSchema } from "../schemas.js";

const reviewsRouter = Router();

// Create review (protected)
reviewsRouter.post(
  "/",
  authMiddleware,
  requireRole("client"),
  validateRequest(reviewSchema),
  asyncHandler((req, res) => reviewsController.createReview(req, res)),
);

// Get public reviews for service
reviewsRouter.get(
  "/service/:service_id",
  asyncHandler((req, res) => reviewsController.getServiceReviews(req, res)),
);

// Update review (protected)
reviewsRouter.put(
  "/:id",
  authMiddleware,
  requireRole("client"),
  asyncHandler((req, res) => reviewsController.updateReview(req, res)),
);

// Delete review (protected)
reviewsRouter.delete(
  "/:id",
  authMiddleware,
  requireRole("client"),
  asyncHandler((req, res) => reviewsController.deleteReview(req, res)),
);

export default reviewsRouter;
