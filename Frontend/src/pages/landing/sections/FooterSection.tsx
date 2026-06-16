import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Instagram,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import logo from "../../../../assets/logo.png";

export const FooterSection: React.FC = () => {
  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "How It Works", href: "#how-it-works" },
        { label: "Services", href: "#services" },
        { label: "Pricing", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "Cookie Policy", href: "#" },
        { label: "Disclaimer", href: "#" },
      ],
    },
  ];

  const socialLinks = [
    { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/totalfix27x7?igsh=MXdwbzhhZXkxbzltOQ%3D%3D&utm_source=qr" },
  ];

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300 pt-20 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Link to="/" className="flex items-center gap-2 mb-6">
              <img
                src={logo}
                alt="TotalFix27x7 logo"
                className="w-10 h-10 rounded-lg object-contain"
              />
              <span className="font-display font-bold text-xl text-white">
                TotalFix27x7
              </span>
            </Link>
            <p className="text-gray-400 text-sm mb-6">
              Making home services accessible to everyone with verified
              professionals and secure transactions.
            </p>
            {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <span> 7300586001</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <span>totalfix27x7@totalfix27x7.in</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <span>kosi kalan</span>
              </div>
            </div>
          </motion.div>

          {/* Links Columns */}
          {footerLinks.map((column, index) => (
            <motion.div
              key={column.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold text-white mb-4">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-primary-400 transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <motion.div
          className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-8"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Copyright */}
          <motion.p
            className="text-gray-400 text-sm text-center md:text-left"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            © {new Date().getFullYear()} TotalFix27x7. All rights reserved.
          </motion.p>

          {/* Social Links */}
          <motion.div
            className="flex gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors group"
                  aria-label={social.label}
                >
                  <Icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </a>
              );
            })}
          </motion.div>
        </div>
      </div>
    </footer>
  );
};
