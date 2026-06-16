import React, { useState } from "react";
import { Clock, CheckCircle2 } from "lucide-react";

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selected?: string;
  onChange: (startTime: string) => void;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selected,
  onChange,
}) => {
  // Arrange slots in a grid with circular presentation
  const hoursColumns = Math.ceil(Math.sqrt(slots.length));

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Grid of time slots */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))`,
        }}
      >
        {slots.map((slot) => {
          const isSelected = selected === slot.start_time;
          const isBooked = slot.is_booked;

          return (
            <button
              key={slot.start_time}
              onClick={() => !isBooked && onChange(slot.start_time)}
              disabled={isBooked}
              className={`relative group transition-all duration-200 p-4 rounded-xl border-2 font-semibold text-sm h-28 flex flex-col items-center justify-center ${
                isSelected
                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-lg scale-105"
                  : isBooked
                    ? "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed opacity-60"
                    : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700 hover:shadow-md"
              }`}
            >
              {/* Time display */}
              <div className="flex flex-col items-center gap-1 flex-1 justify-center">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {slot.start_time}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {slot.end_time}
                </span>
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-1">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
              )}

              {/* Booked badge */}
              {isBooked && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  Booked
                </div>
              )}

              {/* Hover tooltip */}
              {!isBooked && (
                <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {isSelected ? "Selected" : "Click to select"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* No slots message */}
      {slots.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            No available time slots
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Please choose a different date
          </p>
        </div>
      )}

      {/* Selected time summary */}
      {selected && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Selected Time
              </p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {selected}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotPicker;
