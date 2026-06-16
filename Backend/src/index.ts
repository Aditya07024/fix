import express, { Response } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import http from "http";
import { config } from "./config.js";
import { db } from "./db.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { ApiResponse } from "./types.js";
import path from "path";

// Import routes
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
import bookingsRouter from "./routes/bookings.js";
import paymentsRouter from "./routes/payments.js";
import reviewsRouter from "./routes/reviews.js";
import adminRouter from "./routes/admin.js";
import employeeRouter from "./routes/employee.js";
import clientRouter from "./routes/client.js";
import notificationsRouter from "./routes/notifications.js";
import { setupNotificationWebSocketServer } from "./realtime/notifications.js";
import { startBookingRequestExpiryCleanup } from "./services/bookingRequestExpiry.js";

const app = express();
const server = http.createServer(app);
const allowedOrigins = new Set(config.server.frontendUrls);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalDevOrigin =
        !!origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  }),
);

app.use(clerkMiddleware());

// Health check
app.get("/health", (_, res: Response) => {
  const response: ApiResponse<null> = {
    success: true,
    message: "Server is running",
  };
  res.status(200).json(response);
});

// API Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/services", servicesRouter);
app.use("/api/v1/bookings", bookingsRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/reviews", reviewsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/employee", employeeRouter);
app.use("/api/v1/client", clientRouter);
app.use("/api/v1/notifications", notificationsRouter);

// Backend API-only - Frontend served separately on Render Static
console.log(
  "🚀 Backend API-only mode - Frontend served as separate static service",
);

// Error handling
// API-only - notFound catches unknown API routes
app.all("*", notFoundHandler);
app.use(errorHandler);

async function ensureRuntimeSchema() {
  await db.query(`
    ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS pending_service_ids UUID[] DEFAULT ARRAY[]::UUID[]
  `);
}

async function startServer() {
  await ensureRuntimeSchema();

  const PORT = config.server.port;
  setupNotificationWebSocketServer(server);
  startBookingRequestExpiryCleanup();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${config.server.nodeEnv}`);
    console.log(`🌐 Frontend URLs: ${config.server.frontendUrls.join(", ")}`);
    console.log(`🔔 Notifications WebSocket ready at /ws/notifications`);
    console.log(
      `⏱️ Pending booking requests expire after ${config.server.bookingRequestTtlMinutes} minute(s)`,
    );
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to initialize server:", error);
  process.exit(1);
});

export default app;
