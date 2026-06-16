import React from "react";
import { FEATURES } from "../constants";
import { AnimatedCard } from "../components/AnimatedCard";
import { motion } from "framer-motion";

export const FeaturesSection: React.FC = () => {
  return (
    <section
      id="features"
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
            Why Choose TotalFix27x7?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experience the best home services platform with features designed
            for your convenience
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <AnimatedCard
                key={feature.title}
                delay={index * 0.1}
                className="group"
              >
                <div className="h-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 hover:shadow-xl hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800/50">
                  <div className="mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};
