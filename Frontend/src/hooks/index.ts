import { useEffect } from "react";
import { useTheme } from "@/stores/themeStore";

export const useInitTheme = () => {
  const { setTheme } = useTheme();

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as
      | "light"
      | "dark"
      | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const theme = storedTheme || (prefersDark ? "dark" : "light");
    setTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [setTheme]);
};

export const useResponsive = () => {
  const [isMobile, setIsMobile] = window.React?.useState(false) ?? [
    false,
    () => {},
  ];

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  return { isMobile };
};

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = window.React?.useState(value) ?? [
    value,
    () => {},
  ];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay, setDebouncedValue]);

  return debouncedValue;
};

// Export auth guard hooks
export * from "./useAuthGuard";
