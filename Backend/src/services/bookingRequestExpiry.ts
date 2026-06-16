import { config } from "../config.js";
import { db } from "../db.js";
import { createNotification } from "../controllers/notificationsController.js";

type ExpiredBookingRow = {
  id: string;
  user_id: string;
  service_name: string;
  booking_date: string;
};

export const getBookingRequestTtlMinutes = () =>
  Math.max(1, Number(config.server.bookingRequestTtlMinutes) || 10);

export const getBookingRequestExpiryStatus = (createdAt?: string | Date) => {
  const ttlMinutes = getBookingRequestTtlMinutes();
  const createdAtDate = new Date(createdAt || new Date());
  const expiresAtMs = createdAtDate.getTime() + ttlMinutes * 60 * 1000;
  const totalSecondsRemaining = Math.max(
    0,
    Math.ceil((expiresAtMs - Date.now()) / 1000),
  );

  return {
    ttl_minutes: ttlMinutes,
    expires_at: new Date(expiresAtMs).toISOString(),
    total_seconds_remaining: totalSecondsRemaining,
    minutes_remaining: Math.floor(totalSecondsRemaining / 60),
    seconds_remaining: totalSecondsRemaining % 60,
  };
};

export const cleanupExpiredBookingRequests = async (): Promise<
  ExpiredBookingRow[]
> => {
  const MAX_RETRIES = 3;
  const ttlMinutes = getBookingRequestTtlMinutes();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const expiredBookings = (await db.query(
        `
          WITH expired_bookings AS (
            UPDATE bookings b
            SET status = 'cancelled', updated_at = NOW()
            WHERE b.employee_id IS NULL
              AND b.status = 'pending'
              AND b.created_at <= NOW() - ($1 * INTERVAL '1 minute')
            RETURNING b.id, b.user_id, b.service_id, b.booking_date
          )
          SELECT
            eb.id,
            eb.user_id,
            s.name AS service_name,
            eb.booking_date::text AS booking_date
          FROM expired_bookings eb
          JOIN services s ON s.id = eb.service_id
        `,
        [ttlMinutes],
      )) as ExpiredBookingRow[];

      if (expiredBookings.length === 0) {
        return [];
      }

      await db.query(
        `
          DELETE FROM notifications
          WHERE booking_id = ANY($1::uuid[])
            AND type = 'booking_request'
        `,
        [expiredBookings.map((booking) => booking.id)],
      );

      for (const booking of expiredBookings) {
        await createNotification(
          booking.user_id,
          "booking_cancelled",
          "Booking Request Expired",
          `Your booking request for ${booking.service_name} on ${booking.booking_date} expired because no employee accepted it in time.`,
          booking.id,
          "/client/booking-history",
        );
      }

      console.log(
        `Successfully cleaned up ${expiredBookings.length} expired booking requests on attempt ${attempt}.`,
      );
      return expiredBookings;
    } catch (error) {
      console.warn(`Cleanup attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      if (attempt === MAX_RETRIES) {
        console.error("All retry attempts failed for booking cleanup.");
        throw error;
      }
      // Exponential backoff: 1s, 2s, 4s
      const delayMs = 1000 * 2 ** (attempt - 1);
      console.log(`Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  // Unreachable but for TS
  return [];
};

export const startBookingRequestExpiryCleanup = () => {
  const cleanupIntervalMs = Math.max(
    10000,
    Number(config.server.bookingRequestCleanupIntervalMs) || 60000,
  );

  const runCleanup = async () => {
    try {
      const expiredBookings = await cleanupExpiredBookingRequests();

      if (expiredBookings.length > 0) {
        console.log(
          `Expired ${expiredBookings.length} pending booking request(s) older than ${getBookingRequestTtlMinutes()} minute(s)`,
        );
      }
    } catch (error) {
      console.error(
        "Failed to clean up expired booking requests after retries:",
        error,
      );
    }
  };

  void runCleanup();

  const interval = setInterval(() => {
    void runCleanup();
  }, cleanupIntervalMs);

  interval.unref?.();

  return interval;
};
