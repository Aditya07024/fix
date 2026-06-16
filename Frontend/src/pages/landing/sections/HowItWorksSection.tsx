import React from "react";
import { HOW_IT_WORKS } from "../constants";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Book a service in 4 simple steps
          </p>
        </motion.div>

        {/* Steps Container */}
        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Connection Line for Desktop */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-300 dark:via-primary-700 to-transparent -z-10" />

          {HOW_IT_WORKS.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Step Card */}
              <div className="text-center">
                {/* Step Number */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-shadow"
                >
                  <span className="text-3xl font-bold text-white font-display">
                    {item.step}
                  </span>
                </motion.div>

                {/* Arrow */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute -right-4 top-24 text-primary-300 dark:text-primary-700">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                )}

                {/* Mobile Arrow */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="md:hidden flex justify-center mb-6">
                    <svg
                      className="w-6 h-6 text-primary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                )}

                {/* Title and Description */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <button className="px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg">
            Start Booking Today
          </button>
        </motion.div>
      </div>
    </section>
  );
};
