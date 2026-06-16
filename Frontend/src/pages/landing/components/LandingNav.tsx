import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/stores/themeStore";
import { motion } from "framer-motion";
import logo from "../../../../assets/logo.png";

export const LandingNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleAdminAccess = () => {
    const password = window.prompt("Enter admin access password");

    if (password === null) {
      return;
    }

    if (password !== "123456789") {
      window.alert("Incorrect password");
      return;
    }

    sessionStorage.setItem("admin_access_granted", "true");
    navigate("/admin/login");
    setIsOpen(false);
  };

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Services", href: "#services" },
    { label: "Testimonials", href: "#testimonials" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={logo}
              alt="TotalFix27x7 logo"
              className="w-10 h-10 rounded-lg object-contain group-hover:shadow-lg transition-shadow"
            />
            <span className="font-display font-bold text-xl text-gray-900 dark:text-white hidden sm:inline">
              TotalFix27x7
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
              >
                Sign Up
              </button>
              <button
                onClick={handleAdminAccess}
                className="px-4 py-2 text-sm font-medium border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40"
              >
                Admin Access
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden pb-4 border-t border-gray-200 dark:border-gray-800"
          >
            <div className="pt-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                <button
                  onClick={() => {
                    navigate("/login");
                    setIsOpen(false);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    navigate("/signup");
                    setIsOpen(false);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Sign Up
                </button>
              </div>
              <button
                onClick={handleAdminAccess}
                className="w-full px-4 py-2 text-sm font-medium border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40"
              >
                Admin Access
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};
