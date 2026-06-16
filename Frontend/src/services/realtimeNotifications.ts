import { NotificationApiItem, notificationsAPI } from "@/services/api";

export const NOTIFICATION_EVENT_NAME = "fixit:notification-created";

type RealtimeNotificationEvent = CustomEvent<NotificationApiItem>;

class RealtimeNotificationsService {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private activeToken: string | null = null;
  private pollTimer: number | null = null;
  private seenNotificationIds = new Set<string>();
  private hasCompletedInitialSync = false;
  private permissionPromptTimer: number | null = null;

  connect(token: string) {
    if (!token) {
      return;
    }

    if (
      this.socket &&
      this.activeToken === token &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.disconnect();
    this.activeToken = token;
    this.startPolling();

    const socketUrl = this.getSocketUrl(token);
    this.socket = new WebSocket(socketUrl);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type?: string;
          payload?: NotificationApiItem;
        };

        if (
          parsed.type === "notification_created" &&
          parsed.payload?.id &&
          parsed.payload.user_id
        ) {
          this.handleIncomingNotification(parsed.payload);
        }
      } catch (error) {
        console.error("Failed to parse realtime notification payload:", error);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;

      if (this.activeToken) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error("Realtime notifications socket error:", error);
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.permissionPromptTimer) {
      window.clearTimeout(this.permissionPromptTimer);
      this.permissionPromptTimer = null;
    }
  }

  clearSession() {
    this.activeToken = null;
    this.hasCompletedInitialSync = false;
    this.seenNotificationIds.clear();
    this.disconnect();
  }

  requestPermission(userId?: string) {
    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "default") {
      return;
    }

    const promptKey = this.getPermissionPromptKey(userId);

    if (promptKey && localStorage.getItem(promptKey) === "true") {
      return;
    }

    if (this.permissionPromptTimer) {
      window.clearTimeout(this.permissionPromptTimer);
    }

    this.permissionPromptTimer = window.setTimeout(() => {
      this.permissionPromptTimer = null;

      if (!("Notification" in window) || Notification.permission !== "default") {
        return;
      }

      if (promptKey) {
        localStorage.setItem(promptKey, "true");
      }

      void Notification.requestPermission();
    }, 1200);
  }

  async requestPermissionFromUserAction() {
    if (!("Notification" in window)) {
      return "unsupported" as const;
    }

    if (Notification.permission === "granted") {
      return "granted" as const;
    }

    if (Notification.permission === "denied") {
      return "denied" as const;
    }

    const permission = await Notification.requestPermission();

    return permission;
  }

  async sendTestNotification() {
    const permission = await this.requestPermissionFromUserAction();

    const testNotification: NotificationApiItem = {
      id: `test-notification-${Date.now()}`,
      user_id: "local-test-user",
      type: "system",
      title: "Test Notification",
      message: "Desktop notifications are working.",
      is_read: false,
      action_url: null,
      booking_id: null,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    if (permission === "granted") {
      this.showDesktopNotification(testNotification);
    }
  }

  private startPolling() {
    if (this.pollTimer) {
      return;
    }

    void this.syncNotifications();

    this.pollTimer = window.setInterval(() => {
      void this.syncNotifications();
    }, 10000);
  }

  private async syncNotifications() {
    if (!this.activeToken) {
      return;
    }

    try {
      const response = await notificationsAPI.getAll(undefined, 20, 0);
      const notifications = response.data || [];

      if (!this.hasCompletedInitialSync) {
        notifications.forEach((notification) => {
          this.seenNotificationIds.add(notification.id);
        });
        this.hasCompletedInitialSync = true;
        return;
      }

      notifications
        .slice()
        .reverse()
        .forEach((notification) => {
          if (!this.seenNotificationIds.has(notification.id)) {
            this.handleIncomingNotification(notification);
          }
        });
    } catch (error) {
      console.error("Failed to poll notifications:", error);
    }
  }

  private handleIncomingNotification(notification: NotificationApiItem) {
    if (this.seenNotificationIds.has(notification.id)) {
      return;
    }

    this.seenNotificationIds.add(notification.id);
    this.emitNotification(notification);
    this.showDesktopNotification(notification);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.activeToken) {
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;

      if (this.activeToken) {
        this.connect(this.activeToken);
      }
    }, delay);
  }

  private emitNotification(notification: NotificationApiItem) {
    window.dispatchEvent(
      new CustomEvent<NotificationApiItem>(NOTIFICATION_EVENT_NAME, {
        detail: notification,
      }),
    );
  }

  private showDesktopNotification(notification: NotificationApiItem) {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const desktopNotification = new Notification(notification.title, {
      body: notification.message,
      tag: notification.id,
    });

    desktopNotification.onclick = () => {
      window.focus();
      window.location.href =
        notification.action_url || this.getDefaultNotificationUrl();
      desktopNotification.close();
    };
  }

  private getDefaultNotificationUrl() {
    const storedUser = localStorage.getItem("user");

    try {
      const user = storedUser ? (JSON.parse(storedUser) as { role?: string }) : {};
      const role = user.role || "client";
      return `/${role}/notifications`;
    } catch {
      return "/client/notifications";
    }
  }

  private getPermissionPromptKey(userId?: string) {
    const resolvedUserId = userId || this.getStoredUserId();
    return resolvedUserId
      ? `fixit-notification-permission-prompted:${resolvedUserId}`
      : null;
  }

  private getStoredUserId() {
    const storedUser = localStorage.getItem("user");

    try {
      const user = storedUser ? (JSON.parse(storedUser) as { id?: string }) : {};
      return user.id || null;
    } catch {
      return null;
    }
  }

  private getSocketUrl(token: string) {
    const configuredUrl = import.meta.env.VITE_WS_URL as string | undefined;
    const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

    if (configuredUrl) {
      const url = new URL(configuredUrl, window.location.origin);
      url.searchParams.set("token", token);
      return url.toString();
    }

    if (configuredApiUrl && /^https?:\/\//.test(configuredApiUrl)) {
      const url = new URL(configuredApiUrl);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws/notifications";
      url.search = "";
      url.searchParams.set("token", token);
      return url.toString();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = new URL(`${protocol}//${window.location.host}/ws/notifications`);
    url.searchParams.set("token", token);
    return url.toString();
  }
}

export const realtimeNotifications = new RealtimeNotificationsService();

export const subscribeToRealtimeNotifications = (
  handler: (notification: NotificationApiItem) => void,
) => {
  const listener: EventListener = (event) => {
    handler((event as RealtimeNotificationEvent).detail);
  };

  window.addEventListener(NOTIFICATION_EVENT_NAME, listener);

  return () => {
    window.removeEventListener(NOTIFICATION_EVENT_NAME, listener);
  };
};
