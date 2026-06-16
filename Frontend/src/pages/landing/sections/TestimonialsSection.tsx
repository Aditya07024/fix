import React, { useEffect, useState } from "react";
import { TESTIMONIALS } from "../constants";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { LandingStatsApiItem, servicesAPI } from "@/services/api";

const fallbackStats: LandingStatsApiItem = {
  happy_users: 0,
  verified_professionals: 0,
  services_completed: 0,
  average_rating: 0,
};

export const TestimonialsSection: React.FC = () => {
  const [stats, setStats] = useState<LandingStatsApiItem>(fallbackStats);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const response = await servicesAPI.getLandingStats();

        if (isMounted && response.data) {
          setStats(response.data);
        }
      } catch (error) {
        console.error("Failed to load landing stats", error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const trustStats = [
    { number: String(stats.happy_users), label: "Happy Users" },
    {
      number: String(stats.verified_professionals),
      label: "Verified Professionals",
    },
    { number: String(stats.services_completed), label: "Services Completed" },
    {
      number: `${stats.average_rating.toFixed(1)}★`,
      label: "Average Rating",
    },
  ];

  return (
    <section
      id="testimonials"
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
            Loved by Thousands
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            See what our users have to say about Fixit
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 transition-all duration-300 hover:border-primary-200 dark:hover:border-primary-800">
                {/* Star Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 line-clamp-4 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{testimonial.avatar}</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {trustStats.map((stat, index) => (
            <div key={index}>
              <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                {stat.number}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
