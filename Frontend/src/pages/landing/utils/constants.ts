/**
 * Configuration constants for the landing page
 */

export const NAVBAR_HEIGHT = 64; // 16 * 4 (h-16)

export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.5,
  slow: 0.8,
};

export const SECTION_SPACING = {
  mobile: "py-16",
  tablet: "py-20",
  desktop: "py-24",
};

export const HEADING_STYLES = {
  h1: "font-display text-4xl sm:text-5xl lg:text-6xl font-bold",
  h2: "font-display text-3xl sm:text-4xl font-bold",
  h3: "font-display text-2xl sm:text-3xl font-bold",
};

export const CONTAINER_STYLES = {
  maxWidth: "max-w-7xl",
  padding: "px-4 sm:px-6 lg:px-8",
};

export const GRADIENT_BG = {
  light: "from-primary-50 to-secondary-50",
  dark: "dark:from-gray-900 dark:to-gray-800",
};

export const SHADOW_STYLES = {
  xs: "shadow-sm",
  sm: "shadow",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  glow: "shadow-lg shadow-primary-500/30",
};

export const BORDER_RADIUS = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
};

export const TRANSITION_TIMING = {
  fast: "transition-all duration-200",
  normal: "transition-all duration-300",
  slow: "transition-all duration-500",
};
