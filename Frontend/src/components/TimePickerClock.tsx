import React, { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

interface TimePickerClockProps {
  onChange?: (time: {
    hours: number;
    minutes: number;
    formatted: string;
  }) => void;
  defaultHours?: number;
  defaultMinutes?: number;
  use24HourFormat?: boolean;
  minTime?: string;
  maxTime?: string;
}

const TimePickerClock: React.FC<TimePickerClockProps> = ({
  onChange,
  defaultHours,
  defaultMinutes,
  use24HourFormat = false,
  minTime,
  maxTime,
}) => {
  // Get current time
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // State management
  const [hours, setHours] = useState(defaultHours ?? currentHours);
  const [minutes, setMinutes] = useState(defaultMinutes ?? currentMinutes);
  const [is24Hour, setIs24Hour] = useState(use24HourFormat);
  const [selectionMode, setSelectionMode] = useState<"hours" | "minutes">(
    "hours",
  );
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Validate time against min/max range
  const isTimeValid = (h: number, m: number): boolean => {
    if (!minTime && !maxTime) return true;

    const timeInMinutes = h * 60 + m;

    if (minTime) {
      const [minH, minM] = minTime.split(":").map(Number);
      const minInMinutes = minH * 60 + minM;
      if (timeInMinutes < minInMinutes) return false;
    }

    if (maxTime) {
      const [maxH, maxM] = maxTime.split(":").map(Number);
      const maxInMinutes = maxH * 60 + maxM;
      if (timeInMinutes > maxInMinutes) return false;
    }

    return true;
  };

  // Format time display
  const formatTime = (h: number, m: number): string => {
    const displayHours = is24Hour ? h : h % 12 || 12;
    const period = is24Hour ? "" : h >= 12 ? " PM" : " AM";
    return `${String(displayHours).padStart(2, "0")}:${String(m).padStart(2, "0")}${period}`;
  };

  // Handle angle to time conversion
  const getTimeFromAngle = (angle: number, isHour: boolean): number => {
    let value;
    if (isHour) {
      value = Math.round(angle / 30); // 360 / 12
      value = value === 0 ? 12 : value;
      return is24Hour ? value : value % 12 || 12;
    } else {
      value = Math.round(angle / 6); // 360 / 60
      return value === 60 ? 0 : value;
    }
  };

  // Handle clock interaction
  const handleClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (selectionMode === "hours") {
      let newHours = getTimeFromAngle(angle, true);
      if (is24Hour) {
        const distance = Math.sqrt(x * x + y * y);
        newHours = distance < 80 ? newHours : newHours + 12;
      }
      if (isTimeValid(newHours, minutes)) {
        setHours(newHours);
        setSelectionMode("minutes");
      }
    } else {
      const newMinutes = getTimeFromAngle(angle, false);
      if (isTimeValid(hours, newMinutes)) {
        setMinutes(newMinutes);
      }
    }
  };

  // Handle touch interaction
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = touch.clientX - rect.left - centerX;
    const y = touch.clientY - rect.top - centerY;

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (selectionMode === "hours") {
      let newHours = getTimeFromAngle(angle, true);
      if (is24Hour) {
        const distance = Math.sqrt(x * x + y * y);
        newHours = distance < 80 ? newHours : newHours + 12;
      }
      if (isTimeValid(newHours, minutes)) {
        setHours(newHours);
      }
    } else {
      const newMinutes = getTimeFromAngle(angle, false);
      if (isTimeValid(hours, newMinutes)) {
        setMinutes(newMinutes);
      }
    }
  };

  // Notify parent on time change
  useEffect(() => {
    if (onChange && isTimeValid(hours, minutes)) {
      onChange({
        hours,
        minutes,
        formatted: formatTime(hours, minutes),
      });
    }
  }, [hours, minutes, is24Hour]);

  // Reset to current time
  const handleNow = () => {
    const now = new Date();
    const newHours = now.getHours();
    const newMinutes = now.getMinutes();
    if (isTimeValid(newHours, newMinutes)) {
      setHours(newHours);
      setMinutes(newMinutes);
    }
  };

  // Handle format toggle
  const handleFormatToggle = () => {
    setIs24Hour(!is24Hour);
  };

  // Calculate hand angles
  const hourAngle = (is24Hour ? hours % 12 : hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;

  // Generate clock numbers
  const renderClockNumbers = () => {
    const numbers = [];
    const radius = 90;

    if (is24Hour) {
      // Render 24-hour format with inner and outer circles
      for (let i = 0; i < 12; i++) {
        const angle = (i - 3) * 30;
        const rad = (angle * Math.PI) / 180;

        // Outer circle (12-23)
        const x1 = 120 + radius * Math.cos(rad);
        const y1 = 120 + radius * Math.sin(rad);
        const hour24 = (i + 12) % 24 || 12;

        // Inner circle (0-11)
        const x2 = 120 + 60 * Math.cos(rad);
        const y2 = 120 + 60 * Math.sin(rad);
        const hour12 = i || 12;

        numbers.push(
          <text
            key={`h24-${hour24}`}
            x={x1}
            y={y1}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`text-xs font-semibold select-none transition-colors ${
              hours === hour24
                ? "fill-blue-600 text-base font-bold"
                : "fill-gray-700"
            }`}
          >
            {hour24}
          </text>,
        );
        numbers.push(
          <text
            key={`h12-${hour12}`}
            x={x2}
            y={y2}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`text-xs font-semibold select-none transition-colors ${
              hours === hour12 && !is24Hour
                ? "fill-blue-600 text-base font-bold"
                : "fill-gray-600"
            }`}
          >
            {hour12}
          </text>,
        );
      }
    } else {
      // 12-hour format
      for (let i = 0; i < 12; i++) {
        const angle = (i - 3) * 30;
        const rad = (angle * Math.PI) / 180;
        const x = 120 + radius * Math.cos(rad);
        const y = 120 + radius * Math.sin(rad);
        const num = i || 12;

        numbers.push(
          <text
            key={`hour-${num}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`text-sm font-semibold select-none transition-colors ${
              hours % 12 === i ||
              (i === 0 && hours % 12 === 0 && selectionMode === "hours")
                ? "fill-blue-600 text-base font-bold"
                : "fill-gray-700"
            }`}
          >
            {num}
          </text>,
        );
      }
    }

    // Render minute markers
    for (let i = 0; i < 60; i += 5) {
      const angle = (i - 15) * 6;
      const rad = (angle * Math.PI) / 180;
      const x = 120 + 105 * Math.cos(rad);
      const y = 120 + 105 * Math.sin(rad);

      numbers.push(
        <text
          key={`minute-${i}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          className={`text-xs select-none transition-colors ${
            minutes === i && selectionMode === "minutes"
              ? "fill-blue-600 font-bold"
              : "fill-gray-500"
          }`}
        >
          {String(i).padStart(2, "0")}
        </text>,
      );
    }

    return numbers;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Select Time</h2>
        </div>
        <button
          onClick={handleFormatToggle}
          className="px-3 py-1 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          {is24Hour ? "24H" : "12H"}
        </button>
      </div>

      {/* Time Display */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl w-full text-center">
        <p className="text-sm text-gray-600 mb-1">Selected Time</p>
        <p className="text-3xl font-bold text-blue-600">
          {formatTime(hours, minutes)}
        </p>
      </div>

      {/* Clock Container */}
      <div className="relative w-full mb-6">
        <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl shadow-lg p-4">
          <svg
            ref={svgRef}
            viewBox="0 0 240 240"
            className="w-full h-full cursor-pointer select-none"
            onClick={handleClockClick}
            onTouchStart={() => setIsDragging(true)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setIsDragging(false)}
          >
            {/* Clock face */}
            <circle
              cx="120"
              cy="120"
              r="115"
              className="fill-white stroke-gray-200"
              strokeWidth="2"
            />

            {/* Hour markers */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const x1 = 120 + 105 * Math.cos(angle);
              const y1 = 120 + 105 * Math.sin(angle);
              const x2 = 120 + 115 * Math.cos(angle);
              const y2 = 120 + 115 * Math.sin(angle);
              return (
                <line
                  key={`marker-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className="stroke-gray-400"
                  strokeWidth="2"
                />
              );
            })}

            {/* Clock numbers */}
            {renderClockNumbers()}

            {/* Hour hand */}
            <line
              x1="120"
              y1="120"
              x2={120 + 50 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
              y2={120 + 50 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
              className={`stroke-blue-600 transition-all duration-100 ${
                selectionMode === "hours" ? "stroke-[4px]" : "stroke-[3px]"
              }`}
              strokeLinecap="round"
            />

            {/* Minute hand */}
            <line
              x1="120"
              y1="120"
              x2={120 + 70 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
              y2={120 + 70 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
              className={`stroke-blue-400 transition-all duration-100 ${
                selectionMode === "minutes" ? "stroke-[3px]" : "stroke-[2px]"
              }`}
              strokeLinecap="round"
            />

            {/* Center dot */}
            <circle cx="120" cy="120" r="5" className="fill-blue-600" />

            {/* Selection highlight ring */}
            {selectionMode === "hours" && (
              <circle
                cx="120"
                cy="120"
                r="80"
                className="fill-none stroke-blue-200 transition-all duration-200"
                strokeWidth="2"
                strokeDasharray="251.2"
                strokeDashoffset="125.6"
              />
            )}
            {selectionMode === "minutes" && (
              <circle
                cx="120"
                cy="120"
                r="100"
                className="fill-none stroke-blue-200 transition-all duration-200"
                strokeWidth="2"
              />
            )}
          </svg>
        </div>

        {/* Mode indicator */}
        <div className="mt-4 flex gap-2 justify-center">
          <button
            onClick={() => {
              setSelectionMode("hours");
              setIsDragging(false);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all transform ${
              selectionMode === "hours"
                ? "bg-blue-600 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Hours
          </button>
          <button
            onClick={() => {
              setSelectionMode("minutes");
              setIsDragging(false);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all transform ${
              selectionMode === "minutes"
                ? "bg-blue-600 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Minutes
          </button>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex gap-3 w-full">
        <button
          onClick={handleNow}
          className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md"
        >
          Now
        </button>
        <button
          onClick={() => {
            setHours(currentHours);
            setMinutes(currentMinutes);
          }}
          className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-gray-400 transition-all"
        >
          Reset
        </button>
      </div>

      {/* Validation message */}
      {!isTimeValid(hours, minutes) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ Selected time is outside the allowed range
        </div>
      )}
    </div>
  );
};

export default TimePickerClock;
