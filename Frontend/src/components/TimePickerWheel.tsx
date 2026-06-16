import React, { useState, useRef, useEffect } from "react";

interface TimePickerWheelProps {
  value?: string; // "HH:MM" format
  onChange: (time: string) => void;
  onDone?: () => void;
}

const TimePickerWheel: React.FC<TimePickerWheelProps> = ({
  value = "09:00",
  onChange,
  onDone,
}) => {
  // Parse initial time
  const initialParts = value.split(":");
  const initialHour = parseInt(initialParts[0] || "09", 10);
  const initialMinute = parseInt(initialParts[1] || "00", 10);

  const [hours, setHours] = useState(initialHour);
  const [minutes, setMinutes] = useState(initialMinute);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ITEM_HEIGHT = 44; // Height of each item in pixels

  // Format time display
  const formatTime = (h: number, m: number): string => {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // All hours (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  // All minutes (0-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  // Scroll to specific hour
  const scrollToHour = (hour: number, smooth = true) => {
    if (hourScrollRef.current) {
      const scrollPosition = hour * ITEM_HEIGHT;
      hourScrollRef.current.scrollTo({
        top: scrollPosition,
        behavior: smooth ? "smooth" : "auto",
      });
    }
    setHours(hour);
  };

  // Scroll to specific minute
  const scrollToMinute = (minute: number, smooth = true) => {
    if (minuteScrollRef.current) {
      const scrollPosition = minute * ITEM_HEIGHT;
      minuteScrollRef.current.scrollTo({
        top: scrollPosition,
        behavior: smooth ? "smooth" : "auto",
      });
    }
    setMinutes(minute);
  };

  // Handle hour scroll with snap
  const handleHourScroll = () => {
    if (!hourScrollRef.current) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const scrollTop = hourScrollRef.current?.scrollTop || 0;
      const selectedIndex = Math.round(scrollTop / ITEM_HEIGHT);
      const selectedHour = Math.max(0, Math.min(23, selectedIndex));

      // Snap to the selected hour
      if (hourScrollRef.current) {
        hourScrollRef.current.scrollTo({
          top: selectedHour * ITEM_HEIGHT,
          behavior: "smooth",
        });
      }

      setHours(selectedHour);
    }, 100);
  };

  // Handle minute scroll with snap
  const handleMinuteScroll = () => {
    if (!minuteScrollRef.current) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const scrollTop = minuteScrollRef.current?.scrollTop || 0;
      const selectedIndex = Math.round(scrollTop / ITEM_HEIGHT);
      const selectedMinute = Math.max(0, Math.min(59, selectedIndex));

      // Snap to the selected minute
      if (minuteScrollRef.current) {
        minuteScrollRef.current.scrollTo({
          top: selectedMinute * ITEM_HEIGHT,
          behavior: "smooth",
        });
      }

      setMinutes(selectedMinute);
    }, 100);
  };

  // Initialize scroll positions
  useEffect(() => {
    scrollToHour(initialHour, false);
    scrollToMinute(initialMinute, false);
  }, []);

  // Update parent on change
  useEffect(() => {
    const timeStr = formatTime(hours, minutes);
    onChange(timeStr);
  }, [hours, minutes]);

  // Preset times
  const presets = [
    { label: "9 am", hour: 9, minute: 0 },
    { label: "12 pm", hour: 12, minute: 0 },
    { label: "4 pm", hour: 16, minute: 0 },
    { label: "6 pm", hour: 18, minute: 0 },
  ];

  const currentTimeString = formatTime(hours, minutes);
  const ampm = hours >= 12 ? "pm" : "am";

  return (
    <div className="w-full max-w-sm mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
      {/* Title */}
      <h2 className="text-center text-xl font-bold text-gray-900 dark:text-gray-50 mb-6">
        Select Time
      </h2>

      {/* Time Picker Wheels */}
      <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
        <div className="flex items-center justify-center gap-3 relative">
          {/* Hours column */}
          <div className="relative flex flex-col items-center">
            <div
              ref={hourScrollRef}
              onScroll={handleHourScroll}
              className="h-40 w-16 overflow-y-scroll overflow-x-hidden border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 snap-y snap-mandatory"
              style={{
                scrollBehavior: "smooth",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {/* Spacer top */}
              <div style={{ height: "72px" }} />

              {/* Hour options */}
              {hourOptions.map((hour) => (
                <div
                  key={`hour-${hour}`}
                  style={{ height: `${ITEM_HEIGHT}px` }}
                  className={`flex items-center justify-center font-semibold transition-all cursor-pointer snap-center ${
                    hours === hour
                      ? "text-blue-600 dark:text-blue-400 text-2xl font-bold scale-110"
                      : "text-gray-400 dark:text-gray-600 text-lg"
                  }`}
                  onClick={() => scrollToHour(hour)}
                >
                  {String(hour).padStart(2, "0")}
                </div>
              ))}

              {/* Spacer bottom */}
              <div style={{ height: "72px" }} />
            </div>

            {/* Highlight ring for hours */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[44px] w-16 border-2 border-blue-500 rounded-lg dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30" />
            </div>
          </div>

          {/* Colon separator */}
          <div className="text-4xl font-bold text-gray-900 dark:text-gray-50 mx-1">
            :
          </div>

          {/* Minutes column */}
          <div className="relative flex flex-col items-center">
            <div
              ref={minuteScrollRef}
              onScroll={handleMinuteScroll}
              className="h-40 w-16 overflow-y-scroll overflow-x-hidden border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 snap-y snap-mandatory"
              style={{
                scrollBehavior: "smooth",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {/* Spacer top */}
              <div style={{ height: "72px" }} />

              {/* Minute options */}
              {minuteOptions.map((minute) => (
                <div
                  key={`minute-${minute}`}
                  style={{ height: `${ITEM_HEIGHT}px` }}
                  className={`flex items-center justify-center font-semibold transition-all cursor-pointer snap-center ${
                    minutes === minute
                      ? "text-blue-600 dark:text-blue-400 text-2xl font-bold scale-110"
                      : "text-gray-400 dark:text-gray-600 text-lg"
                  }`}
                  onClick={() => scrollToMinute(minute)}
                >
                  {String(minute).padStart(2, "0")}
                </div>
              ))}

              {/* Spacer bottom */}
              <div style={{ height: "72px" }} />
            </div>

            {/* Highlight ring for minutes */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[44px] w-16 border-2 border-blue-500 rounded-lg dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30" />
            </div>
          </div>

          {/* AM/PM indicator */}
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 min-w-[45px] text-center">
            <div className="text-sm">{ampm}</div>
          </div>
        </div>
      </div>

      {/* Current time display */}
      <div className="text-center mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Selected Time
        </p>
        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
          {currentTimeString}
        </p>
      </div>

      {/* Presets */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Presets
        </p>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                scrollToHour(preset.hour);
                scrollToMinute(preset.minute);
              }}
              className={`py-2 px-2 rounded-lg font-semibold text-sm transition-all ${
                hours === preset.hour && minutes === preset.minute
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "border border-gray-300 text-gray-700 hover:border-blue-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-400"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Done Button */}
      {/* <button
        onClick={onDone}
        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg active:scale-95"
      >
        Done
      </button> */}
    </div>
  );
};

// Add CSS to hide scrollbars
const styles = `
  .time-picker-wheel::-webkit-scrollbar {
    display: none;
  }
`;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);
}

export default TimePickerWheel;
