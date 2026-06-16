import React, { useState } from "react";
import { TimePickerClock } from "@/components";

/**
 * Example usage of TimePickerClock in your Client Booking page
 *
 * This demonstrates:
 * - Basic time selection
 * - Time range validation (min/max times)
 * - Integration with form submission
 * - State management for selected time
 */

interface BookingTime {
  hours: number;
  minutes: number;
  formatted: string;
}

export default function BookingTimePickerExample() {
  const [selectedTime, setSelectedTime] = useState<BookingTime | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Example: Restrict booking to business hours (9 AM - 6 PM)
  const handleTimeChange = (time: BookingTime) => {
    console.log("Selected time:", time);
    setSelectedTime(time);
  };

  const handleSubmitBooking = () => {
    if (selectedTime) {
      console.log("Booking submitted with time:", selectedTime);
      setIsSubmitted(true);
      // Send to backend API
      // API call: POST /api/bookings with { date, time: selectedTime, ... }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Example 1: Basic Time Picker */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Book Your Service
          </h1>
          <p className="text-gray-600 mb-8">Select your preferred time</p>

          <TimePickerClock
            onChange={handleTimeChange}
            use24HourFormat={false}
            // Optional: Set time range (9 AM to 6 PM)
            minTime="09:00"
            maxTime="18:00"
          />

          {selectedTime && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
              <p className="text-sm text-gray-600">Booking time:</p>
              <p className="text-2xl font-bold text-blue-600">
                {selectedTime.formatted}
              </p>
            </div>
          )}

          <button
            onClick={handleSubmitBooking}
            disabled={!selectedTime}
            className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-all transform hover:scale-105 active:scale-95"
          >
            Confirm Booking
          </button>
        </div>

        {/* Example 2: 24-hour Format Time Picker */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            24-Hour Format Example
          </h2>
          <TimePickerClock
            onChange={(time) => console.log("24-hour time:", time)}
            use24HourFormat={true}
            defaultHours={14}
            defaultMinutes={30}
          />
        </div>

        {/* Example 3: Integration with Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Full Booking Form
          </h2>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Preferred Time
              </label>
              <TimePickerClock
                onChange={handleTimeChange}
                use24HourFormat={false}
                minTime="10:00"
                maxTime="20:00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Select a service</option>
                <option>Hair Cutting</option>
                <option>Salon Services</option>
                <option>Cleaning</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              Book Service
            </button>
          </form>
        </div>

        {isSubmitted && (
          <div className="mt-8 p-6 bg-green-50 border-l-4 border-green-600 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800">
              ✓ Booking Confirmed!
            </h3>
            <p className="text-green-700 mt-2">
              Your booking has been submitted successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * USAGE IN YOUR CLIENT BOOKING PAGE:
 *
 * // 1. Import the component
 * import { TimePickerClock } from '@/components';
 *
 * // 2. Use in your component
 * const [bookingTime, setBookingTime] = useState(null);
 *
 * <TimePickerClock
 *   onChange={(time) => {
 *     setBookingTime(time);
 *     // time = { hours: 14, minutes: 30, formatted: "02:30 PM" }
 *   }}
 *   use24HourFormat={false}  // or true for 24-hour format
 *   minTime="09:00"          // Optional: earliest available time
 *   maxTime="18:00"          // Optional: latest available time
 * />
 *
 * // 3. Access selected time
 * console.log(bookingTime.formatted);  // "02:30 PM"
 * console.log(bookingTime.hours);      // 14
 * console.log(bookingTime.minutes);    // 30
 */
