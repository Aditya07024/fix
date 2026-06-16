import React, { useEffect, useState } from "react";
import { Trash2, Check, CheckCheck, Bell } from "lucide-react";
import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { NotificationApiItem, notificationsAPI } from "@/services/api";
import { subscribeToRealtimeNotifications } from "@/services/realtimeNotifications";
import { formatDate } from "@/utils/helpers";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "read">(
    "all",
  );

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const isRead =
        activeFilter === "read"
          ? true
          : activeFilter === "unread"
            ? false
            : undefined;
      const response = await notificationsAPI.getAll(isRead);
      setNotifications(response.data || []);
    } catch (loadError: any) {
      setError(
        loadError?.error ||
          loadError?.message ||
          "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [activeFilter]);

  useEffect(() => {
    return subscribeToRealtimeNotifications((notification) => {
      setNotifications((prev) => {
        const alreadyExists = prev.some((item) => item.id === notification.id);

        if (alreadyExists) {
          return prev;
        }

        if (activeFilter === "read" && !notification.is_read) {
          return prev;
        }

        if (activeFilter === "unread" && notification.is_read) {
          return prev;
        }

        return [notification, ...prev];
      });
    });
  }, [activeFilter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
    } catch (e: any) {
      console.error("Error marking notification as read:", e);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationsAPI.delete(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (e: any) {
      console.error("Error deleting notification:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e: any) {
      console.error("Error marking all as read:", e);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to delete all notifications?")) {
      try {
        await notificationsAPI.clearAll();
        setNotifications([]);
      } catch (e: any) {
        console.error("Error clearing notifications:", e);
      }
    }
  };

  const filteredNotifications = notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    if (type.startsWith("booking")) return "📅";
    if (type.startsWith("payment")) return "💳";
    if (type === "review_received") return "⭐";
    return "📢";
  };

  return (
    <div className="space-y-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-md">
            <Bell className="text-primary-500" size={28} />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-sm">
              You have {unreadCount} unread notification
              {unreadCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-sm">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              icon={<CheckCheck size={18} />}
              onClick={handleMarkAllAsRead}
              size="sm"
            >
              Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              onClick={handleClearAll}
              size="sm"
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-sm overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {(["all", "unread", "read"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-md py-sm font-medium capitalize border-b-2 transition-colors ${
              activeFilter === filter
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {filter === "all" && `All (${notifications.length})`}
            {filter === "unread" && `Unread (${unreadCount})`}
            {filter === "read" &&
              `Read (${notifications.length - unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardBody className="flex justify-center items-center py-xl">
            <p className="text-gray-500">Loading notifications...</p>
          </CardBody>
        </Card>
      ) : error ? (
        <Card>
          <CardBody className="flex justify-center items-center py-xl">
            <p className="text-red-600">{error}</p>
          </CardBody>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col justify-center items-center py-xl text-center">
            <Bell size={48} className="text-gray-300 mb-md" />
            <p className="text-gray-600 dark:text-gray-400">
              {activeFilter === "all"
                ? "No notifications yet"
                : activeFilter === "unread"
                  ? "No unread notifications"
                  : "No read notifications"}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-sm">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all ${
                !notification.is_read
                  ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                  : ""
              }`}
            >
              <CardBody className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-md">
                <div className="flex-1 flex items-start gap-md min-w-0">
                  <div className="text-2xl mt-sm">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-sm">
                      <h3 className="min-w-0 font-semibold text-gray-900 dark:text-gray-50">
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <Badge variant="primary" className="text-xs">
                          New
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-auto">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-xs">
                      {notification.message}
                    </p>
                    
                  </div>
                </div>
                <div className="flex gap-xs self-end sm:self-auto flex-shrink-0">
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                      title="Mark as read"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-sm rounded-md hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
