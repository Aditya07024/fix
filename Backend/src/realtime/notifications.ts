import { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { config } from "../config.js";
import { verifyToken } from "../utils/jwt.js";
import { UserRole } from "../types.js";

type RealtimeUser = {
  id: string;
  email: string;
  role: UserRole;
};

type NotificationPayload = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string | null;
  booking_id?: string | null;
  created_at: string;
  read_at?: string | null;
};

const userConnections = new Map<string, Set<WebSocket>>();

const isAllowedOrigin = (origin?: string | null) => {
  if (!origin) {
    return true;
  }

  if (config.server.frontendUrls.includes(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const getUserFromRequest = (req: IncomingMessage): RealtimeUser | null => {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const token = requestUrl.searchParams.get("token");

  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return null;
  }

  return decoded as RealtimeUser;
};

const registerConnection = (userId: string, ws: WebSocket) => {
  const connections = userConnections.get(userId) || new Set<WebSocket>();
  connections.add(ws);
  userConnections.set(userId, connections);
};

const removeConnection = (userId: string, ws: WebSocket) => {
  const connections = userConnections.get(userId);

  if (!connections) {
    return;
  }

  connections.delete(ws);

  if (connections.size === 0) {
    userConnections.delete(userId);
  }
};

export const setupNotificationWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws/notifications",
  });

  wss.on("connection", (ws, req) => {
    if (!isAllowedOrigin(req.headers.origin)) {
      ws.close(1008, "Origin not allowed");
      return;
    }

    const user = getUserFromRequest(req);

    if (!user?.id) {
      ws.close(1008, "Unauthorized");
      return;
    }

    registerConnection(user.id, ws);

    ws.send(
      JSON.stringify({
        type: "connection_ready",
        userId: user.id,
      }),
    );

    ws.on("close", () => {
      removeConnection(user.id, ws);
    });

    ws.on("error", () => {
      removeConnection(user.id, ws);
    });
  });

  return wss;
};

export const emitNotificationToUser = (
  userId: string,
  notification: NotificationPayload,
) => {
  const connections = userConnections.get(userId);

  if (!connections?.size) {
    return;
  }

  const message = JSON.stringify({
    type: "notification_created",
    payload: notification,
  });

  for (const connection of connections) {
    if (connection.readyState === WebSocket.OPEN) {
      connection.send(message);
    }
  }
};
