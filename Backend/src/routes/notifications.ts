import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notificationsController.js";

const router = express.Router();

// Protect all routes with authentication
router.use(authMiddleware);

// Get all notifications for the user
router.get("/", getNotifications);

// Get unread notifications count
router.get("/unread/count", getUnreadCount);

// Mark single notification as read
router.patch("/:notificationId/read", markAsRead);

// Mark all notifications as read
router.patch("/read/all", markAllAsRead);

// Delete a notification
router.delete("/:notificationId", deleteNotification);

// Clear all notifications
router.delete("/", clearAllNotifications);

export default router;
