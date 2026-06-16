import { Variants } from "framer-motion";

/**
 * Common animation variants used throughout the landing page
 */

export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
};

export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/**
 * Transition configurations
 */

export const smoothTransition = {
  duration: 0.5,
  ease: "easeInOut" as const,
};

export const staggerTransition = {
  staggerChildren: 0.1,
  delayChildren: 0.2,
};

/**
 * Hover effect configurations
 */

export const hoverScaleVariants = {
  scale: 1.05,
  transition: { duration: 0.2 },
};

export const hoverLiftVariants = {
  y: -10,
  transition: { duration: 0.3 },
  shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
};

/**
 * Scroll animation configurations
 */

export const viewportConfig = {
  once: true,
  margin: "0px 0px -100px 0px",
};

/**
 * Common animation sequences
 */

export const pullUpVariants: Variants = {
  hidden: { opacity: 0, y: 100 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.1,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
};

export const fadeInScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};
