import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SERVICES } from "../constants";
import { motion, AnimatePresence } from "framer-motion";
import electrician from "../../../assets/electrician.webp";
import homedecoration from "../../../assets/homedecoration.avif";
import laundary from "../../../assets/laundary.jpeg";
import watersupply from "../../../assets/watersupply.jpg";

const serviceImages: Record<string, string> = {
  Electrician: electrician,
  Laundry: laundary,
  "Water Supply": watersupply,
  "Home Decoration": homedecoration,
};

export const ServicesSection: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % SERVICES.length);
    }, 3000); // 3 sec — gives users time to actually see the service
    return () => clearInterval(interval);
  }, []);

  const goTo = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <section
      id="services"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900"
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
            Our Services
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Wide range of professional services available at your fingertips
          </p>
        </motion.div>

        {/* Slider Container — fixed height so nothing jumps */}
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg"
          style={{ height: "360px" }}  // fixed height: image + content are both locked inside
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {SERVICES.map((service, index) => {
              if (index !== currentIndex) return null;
              const Icon = service.icon;
              const imgSrc = serviceImages[service.name];

              return (
                <motion.div
                  key={service.id}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="absolute inset-0 flex flex-col md:flex-row cursor-pointer"
                  onClick={() => navigate("/login")}
                >
                  {/* Left: Image — takes exactly half width on desktop, full height */}
                  <div className="w-full md:w-1/2 h-48 md:h-full relative flex-shrink-0">
                    <img
                      src={imgSrc}
                      alt={service.name}
                      className="w-full h-full object-cover object-center"
                      // object-center ensures the focal point stays visible
                      // If a specific image needs adjustment, use object-[50%_30%] etc.
                    />
                    {/* subtle gradient overlay for polish */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent md:block hidden" />
                  </div>

                  {/* Right: Content */}
                  <div className="w-full md:w-1/2 h-full flex flex-col justify-between p-6 md:p-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                    <div>
                      {/* Icon */}
                      <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-5">
                        <Icon className="w-7 h-7 text-gray-700 dark:text-gray-200" />
                      </div>

                      {/* Title */}
                      <h3 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">
                        {service.name}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="mt-6">
                      <button
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/login");
                        }}
                      >
                        Book Now
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-5">
          {SERVICES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "bg-gray-900 dark:bg-white scale-125"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
              aria-label={`Go to service ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};