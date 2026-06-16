import { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { NotFoundError } from "../utils/errors.js";
import { ApiResponse } from "../types.js";
import { emitNotificationToUser } from "../realtime/notifications.js";

// Get all notifications for the current user
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { is_read, limit = 20, offset = 0 } = req.query;

    let sql = "SELECT * FROM notifications WHERE user_id = $1";
    const values: any[] = [userId];
    let paramIndex = 2;

    if (is_read !== undefined) {
      sql += ` AND is_read = $${paramIndex}`;
      values.push(is_read === "true");
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(Number(limit), Number(offset));

    const notifications = await db.query(sql, values);

    const response: ApiResponse<any> = {
      success: true,
      data: notifications,
      message: "Notifications retrieved successfully",
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get unread notifications count
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;

    const result = await db.queryOne(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false",
      [userId],
    );

    res.json({
      success: true,
      data: {
        unread_count: parseInt(result?.count || 0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.params;

    const notification = await db.queryOne(
      "SELECT * FROM notifications WHERE id = $1 AND user_id = $2",
      [notificationId, userId],
    );

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    const updated = await db.queryOne(
      "UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING *",
      [notificationId],
    );

    res.json({
      success: true,
      data: updated,
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;

    const result = await db.query(
      "UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false RETURNING id",
      [userId],
    );

    res.json({
      success: true,
      data: {
        updated_count: result.length,
      },
      message: `${result.length} notifications marked as read`,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a notification
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.params;

    const notification = await db.queryOne(
      "SELECT * FROM notifications WHERE id = $1 AND user_id = $2",
      [notificationId, userId],
    );

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    await db.query("DELETE FROM notifications WHERE id = $1", [notificationId]);

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    next(error);
  }
};

// Clear all notifications for user
export const clearAllNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;

    const result = await db.query(
      "DELETE FROM notifications WHERE user_id = $1 RETURNING id",
      [userId],
    );

    res.json({
      success: true,
      data: {
        deleted_count: result.length,
      },
      message: `${result.length} notifications cleared`,
    });
  } catch (error) {
    next(error);
  }
};

// Create notification (internal use)
export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  bookingId?: string,
  actionUrl?: string,
) => {
  try {
    const notification = await db.queryOne(
      `INSERT INTO notifications 
       (user_id, type, title, message, booking_id, action_url, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
       RETURNING *`,
      [userId, type, title, message, bookingId || null, actionUrl || null],
    );

    if (notification) {
      emitNotificationToUser(userId, notification);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
