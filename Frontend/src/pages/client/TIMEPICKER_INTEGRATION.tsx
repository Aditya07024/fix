/**
 * QUICK START: TimePickerClock in Client Booking
 *
 * Copy-paste this into your /pages/client/Booking.tsx
 */

import React, { useState } from "react";
import { TimePickerClock } from "@/components";

interface SelectedTime {
  hours: number;
  minutes: number;
  formatted: string;
}

export function BookingTimeSection() {
  const [selectedTime, setSelectedTime] = useState<SelectedTime | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTimeChange = (time: SelectedTime) => {
    setSelectedTime(time);
  };

  const handleBooking = async () => {
    if (!selectedTime) return;

    setIsLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: selectedTime,
          // Add other booking details as needed
        }),
      });

      if (response.ok) {
        alert(`Booking confirmed for ${selectedTime.formatted}`);
      }
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Picker */}
      <div>
        <h2 className="text-xl font-bold mb-4">Select Your Time</h2>
        <TimePickerClock
          onChange={handleTimeChange}
          use24HourFormat={false}
          minTime="09:00" // Adjust based on your business hours
          maxTime="21:00" // Adjust based on your business hours
        />
      </div>

      {/* Time Confirmation */}
      {selectedTime && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 rounded-lg">
          <p className="text-sm text-gray-600 font-medium">
            Your Selected Time
          </p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {selectedTime.formatted}
          </p>
        </div>
      )}

      {/* Book Button */}
      <button
        onClick={handleBooking}
        disabled={!selectedTime || isLoading}
        className={`w-full py-3 px-6 font-bold rounded-lg transition-all transform ${
          selectedTime && !isLoading
            ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
      >
        {isLoading ? "Booking..." : "Confirm & Book"}
      </button>
    </div>
  );
}

/**
 * HOW TO INTEGRATE:
 *
 * 1. In your /pages/client/Booking.tsx, add this import:
 *    import { BookingTimeSection } from '@/path/to/this/file';
 *
 * 2. Add the component to your booking form:
 *    <form onSubmit={handleSubmit}>
 *      <BookingTimeSection />
 *      {other form fields}
 *    </form>
 *
 * 3. Or use the component directly:
 *    import { TimePickerClock } from '@/components';
 *
 *    <TimePickerClock
 *      onChange={(time) => setBookingTime(time)}
 *      minTime="09:00"
 *      maxTime="21:00"
 *    />
 */
