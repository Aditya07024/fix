import { Router } from "express";
import { authMiddleware, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { validateRequest } from "../middlewares/validation.js";
import { clientController } from "../controllers/clientController.js";
import { supportController } from "../controllers/supportController.js";
import {
  clientProfileSchema,
  paymentMethodSchema,
  supportRequestSchema,
} from "../schemas.js";

const clientRouter = Router();

clientRouter.use(authMiddleware, requireRole("client"));

clientRouter.get(
  "/dashboard",
  asyncHandler((req, res) => clientController.getDashboard(req, res)),
);

clientRouter.get(
  "/profile",
  asyncHandler((req, res) => clientController.getProfile(req, res)),
);

clientRouter.put(
  "/profile",
  validateRequest(clientProfileSchema),
  asyncHandler((req, res) => clientController.updateProfile(req, res)),
);

clientRouter.get(
  "/saved-services",
  asyncHandler((req, res) => clientController.getSavedServices(req, res)),
);

clientRouter.post(
  "/saved-services/:service_id/toggle",
  asyncHandler((req, res) => clientController.toggleSavedService(req, res)),
);

clientRouter.get(
  "/payment-methods",
  asyncHandler((req, res) => clientController.getPaymentMethods(req, res)),
);

clientRouter.post(
  "/payment-methods",
  validateRequest(paymentMethodSchema),
  asyncHandler((req, res) => clientController.createPaymentMethod(req, res)),
);

clientRouter.put(
  "/payment-methods/:id/default",
  asyncHandler((req, res) => clientController.setDefaultPaymentMethod(req, res)),
);

clientRouter.delete(
  "/payment-methods/:id",
  asyncHandler((req, res) => clientController.deletePaymentMethod(req, res)),
);

clientRouter.get(
  "/support-requests",
  asyncHandler((req, res) => supportController.getClientRequests(req, res)),
);

clientRouter.post(
  "/support-requests",
  validateRequest(supportRequestSchema),
  asyncHandler((req, res) => supportController.createClientRequest(req, res)),
);

export default clientRouter;
