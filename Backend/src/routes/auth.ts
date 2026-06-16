import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validation.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { authController } from "../controllers/authController.js";
import { loginSchema, signupSchema } from "../schemas.js";

const authRouter = Router();

// Public routes
authRouter.post(
  "/signup",
  validateRequest(signupSchema),
  asyncHandler((req, res) => authController.signup(req, res)),
);

authRouter.post(
  "/login",
  validateRequest(loginSchema),
  asyncHandler((req, res) => authController.login(req, res)),
);

authRouter.post(
  "/clerk/sync",
  asyncHandler((req, res) => authController.syncClerkUser(req, res)),
);

// Protected routes
authRouter.get(
  "/verify",
  authMiddleware,
  asyncHandler((req, res) => authController.verifyToken(req, res)),
);

authRouter.get(
  "/profile",
  authMiddleware,
  asyncHandler((req, res) => authController.getProfile(req, res)),
);

authRouter.put(
  "/profile",
  authMiddleware,
  asyncHandler((req, res) => authController.updateProfile(req, res)),
);

export default authRouter;
