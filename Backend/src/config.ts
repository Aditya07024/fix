import dotenv from "dotenv";

dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || "",
    key: process.env.SUPABASE_KEY || "",
    databaseUrl: process.env.DATABASE_URL || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your_jwt_secret_here",
    expire: process.env.JWT_EXPIRE || "7d",
  },
  server: {
    port: parseInt(process.env.PORT || "5000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    bookingRequestTtlMinutes: parseInt(
      process.env.BOOKING_REQUEST_TTL_MINUTES || "15",
      10,
    ),
    bookingRequestCleanupIntervalMs: parseInt(
      process.env.BOOKING_REQUEST_CLEANUP_INTERVAL_MS || "60000",
      10,
    ),
    frontendUrls: (
      process.env.FRONTEND_URLS ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173,http://127.0.0.1:5173"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  },
};
