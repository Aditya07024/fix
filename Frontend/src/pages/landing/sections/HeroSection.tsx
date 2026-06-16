import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import img1 from "../../../../assets/1.png";
import img2 from "../../../../assets/2.jpg";
import img3 from "../../../../assets/3.jpg";
import img4 from "../../../../assets/4.jpg.avif";

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
  };

  return (
    <section
      id="hero"
      className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800 -z-10" />

      {/* Animated Background Elements */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-20 right-10 w-72 h-72 bg-primary-200 dark:bg-primary-900/20 rounded-full blur-3xl opacity-20 -z-10"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute bottom-0 left-20 w-96 h-96 bg-secondary-200 dark:bg-secondary-900/20 rounded-full blur-3xl opacity-20 -z-10"
      />

      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-full">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                Welcome to TotalFix27x7
              </span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
          >
            All Your Home Services
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              In One App
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            Book professional services like electrician, plumber, laundry, and
            home decoration instantly. Verified professionals, secure payments,
            and real-time tracking.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <button
              onClick={() => navigate("/signup")}
              className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300 hover:scale-105"
            >
              Get Started for Free
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-4 border-2 border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400 rounded-lg font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all duration-300"
            >
              Login to Account
            </button>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex justify-center"
          >
            <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg">
              <svg
                className="w-6 h-6 text-primary-600 dark:text-primary-400"
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
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
};
