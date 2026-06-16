import React, { useEffect, useState, useRef } from "react";
import {
  Sun,
  Moon,
  Bell,
  LogOut,
  Settings,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "@/stores/themeStore";
import { useAuth } from "@/stores/authStore";
import { Avatar, Badge } from "./Badge";
import { IconButton } from "./Button";
import { cn } from "@/utils/helpers";
import { notificationsAPI, NotificationApiItem } from "@/services/api";
import { subscribeToRealtimeNotifications } from "@/services/realtimeNotifications";
import { formatDate } from "@/utils/helpers";
import logoImage from "../../assets/logo.png";

interface NavbarProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
  title?: string;
  rightActions?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuClick,
  showMenu = true,
  title,
  rightActions,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationApiItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const [allNotifs, unreadRes] = await Promise.all([
        notificationsAPI.getAll(undefined, 5, 0),
        notificationsAPI.getUnreadCount(),
      ]);
      setNotifications(allNotifs.data || []);
      setUnreadCount(unreadRes.data?.unread_count || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    if (showNotifications) {
      void loadNotifications();
    }
  }, [showNotifications]);

  useEffect(() => {
    return subscribeToRealtimeNotifications((notification) => {
      setUnreadCount((prev) => prev + (notification.is_read ? 0 : 1));
      setNotifications((prev) => [notification, ...prev].slice(0, 5));
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showNotifications]);

  const handleMarkAsRead = async (
    e: React.MouseEvent,
    notificationId: string,
  ) => {
    e.stopPropagation();
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="px-sm md:px-lg py-sm md:py-md flex-between gap-md h-16">
        <div className="flex items-center gap-xs md:gap-md min-w-0">
          {showMenu && (
            <IconButton
              icon={<Menu size={30} strokeWidth={3.25} />}
              onClick={onMenuClick}
              variant="ghost"
              className="flex-shrink-0 w-12 h-12"
            />
          )}
          {title && (
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-50 hidden md:block truncate">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-xs md:gap-md flex-shrink-0">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-12 w-12 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <Badge
                  variant="danger"
                  className="absolute -top-1 -right-1 w-5 h-5 flex-center p-0 text-xs"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </button>

            {/* Dropdown Menu */}
            {showNotifications && (
              <div className="fixed right-2 top-16 mt-sm w-[min(24rem,calc(100vw-1rem))] max-h-[min(28rem,calc(100vh-5rem))] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:w-80 sm:max-w-[24rem]">
                {/* Header */}
                <div className="px-lg py-md border-b border-gray-200 dark:border-gray-800 flex-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <Badge variant="primary" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="px-lg py-md text-center text-gray-600 dark:text-gray-400 text-sm">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-lg py-md text-center text-gray-600 dark:text-gray-400 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-lg py-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            !notif.is_read ? "bg-blue-50 dark:bg-blue-950" : ""
                          }`}
                        >
                          <div className="flex gap-md items-start">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 dark:text-gray-50 truncate">
                                {notif.title}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-xs line-clamp-2">
                                {notif.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-sm">
                                {formatDate(notif.created_at)}
                              </p>
                            </div>
                            {!notif.is_read && (
                              <button
                                onClick={(e) => handleMarkAsRead(e, notif.id)}
                                className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 hover:bg-primary-600"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <IconButton
            icon={theme === "light" ? <Moon size={24} /> : <Sun size={24} />}
            onClick={toggleTheme}
            variant="ghost"
            className="w-12 h-12 rounded-xl"
          />

          {/* User Menu */}
          <div className="flex items-center gap-xs md:gap-md pl-xs md:pl-md border-l border-gray-200 dark:border-gray-700">
            <div className="hidden sm:flex flex-col items-end min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role || "Guest"}
              </p>
            </div>
            <Avatar
              name={user?.name || "User"}
              size="md"
              className="flex-shrink-0"
            />
          </div>

          {rightActions}
        </div>
      </div>
    </nav>
  );
};

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  active?: boolean;
  subItems?: NavItem[];
}

interface SidebarProps {
  items: NavItem[];
  isOpen: boolean;
  onClose?: () => void;
  logo?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  isOpen,
  onClose,
  logo,
  footer,
}) => {
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-30 transition-transform duration-300 md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="px-lg py-md border-b border-gray-100 dark:border-gray-800 flex-between">
          {logo || (
            <img
              src={logoImage}
              alt="Fixit logo"
              className="h-10 w-auto object-contain"
            />
          )}
          <button
            onClick={onClose}
            className="md:hidden p-xs hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-md">
          <div className="space-y-xs px-md">
            {items.map((item) => (
              <div key={item.id}>
                <div
                  className={cn(
                    "px-md py-md rounded-lg flex-between cursor-pointer transition-all duration-200",
                    item.active
                      ? "bg-primary-500 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  )}
                  onClick={() => {
                    if (item.subItems) {
                      toggleExpand(item.id);
                    } else {
                      item.onClick?.();
                      // Close sidebar on mobile after navigation
                      onClose?.();
                    }
                  }}
                >
                  <div className="flex items-center gap-md">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-md">
                    {item.badge && (
                      <Badge variant="warning" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {item.subItems && (
                      <span
                        className={cn(
                          "transition-transform",
                          expandedItems.includes(item.id) && "rotate-180",
                        )}
                      >
                        ▼
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub Items */}
                {item.subItems && expandedItems.includes(item.id) && (
                  <div className="pl-md space-y-xs mt-xs">
                    {item.subItems.map((subItem) => (
                      <div
                        key={subItem.id}
                        className="px-md py-md rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-all duration-200 flex items-center gap-md"
                        onClick={subItem.onClick}
                      >
                        {subItem.icon}
                        <span className="text-sm">{subItem.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        {footer && (
          <div className="px-lg py-md border-t border-gray-100 dark:border-gray-800">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
};
