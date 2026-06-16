import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export type Employee = {
  name: string;
  role: string;
  address: string;
  photo: string;
  bio: string;
  rating: number;
  skills: string[];
  history: { title: string; date: string; desc: string }[];
  contact: { phone: string; email: string };
};

type Props = {
  employee: Employee | null;
  onClose: () => void;
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1.5">
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-amber-400" : "text-gray-200 dark:text-gray-700"}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
    <span className="text-xs text-gray-400">{rating.toFixed(1)} / 5.0</span>
  </div>
);

export const EmployeeProfileModal: React.FC<Props> = ({ employee, onClose }) => {
  if (!employee) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero */}
          <div className="flex flex-col sm:flex-row">
            <img
              src={employee.photo}
              alt={employee.name}
              className="w-full h-[220px] sm:w-[180px] sm:h-[240px] object-cover object-center flex-shrink-0"
            />
            <div className="flex-1 p-4 sm:p-6 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-gray-800 flex flex-col gap-2">
              <span className="inline-flex w-fit bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-semibold rounded-full px-3 py-1 uppercase tracking-wide">
                {employee.role}
              </span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{employee.name}</h2>
              <p className="text-[13px] text-gray-400 leading-relaxed">{employee.bio}</p>
              <StarRating rating={employee.rating} />
              <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[11px] text-gray-400 mb-0.5">Address</p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">{employee.address}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 flex flex-col gap-6 border-t border-gray-100 dark:border-gray-800">

            {/* Skills */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {employee.skills.map((skill) => (
                  <span key={skill} className="text-[12px] bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Work History */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Work History</p>
              <div className="flex flex-col">
                {employee.history.map((h, i) => (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      {i < employee.history.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">{h.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{h.date}</p>
                      <p className="text-[12px] text-gray-400 mt-1 leading-relaxed">{h.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-[13px] text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    📞
                  </div>
                  {employee.contact.phone}
                </div>
                <div className="flex items-center gap-3 text-[13px] text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    ✉️
                  </div>
                  {employee.contact.email}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};