import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/react";
import {
  BarChart3,
  Users,
  ShoppingCart,
  FileText,
  LogOut,
  Bell,
  MessageSquare,
  Star,
  Settings,
} from "lucide-react";
import { Navbar, Sidebar } from "@/components/Navigation";
import { useAuth } from "@/stores/authStore";
import AdminOverview from "./Overview";
import UsersManagement from "./Users";
import ServicesManagement from "./Services";
import BookingsManagement from "./Bookings";
import AdminSupport from "./Support";
import EmployeeReviews from "./EmployeeReviews";
import AdminSettings from "./Settings";
import AdminEmployeeSupport from "./EmployeeSupport";
import Notifications from "../Notifications";
import BookingPage from "../client/Booking";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await clerk.signOut();
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      id: "overview",
      label: "Overview",
      icon: <BarChart3 size={20} />,
      onClick: () => navigate("/admin"),
      active: location.pathname === "/admin",
    },
    {
      id: "users",
      label: "Users",
      icon: <Users size={20} />,
      onClick: () => navigate("/admin/users"),
      active: location.pathname.includes("/users"),
    },
    {
      id: "services",
      label: "Services",
      icon: <ShoppingCart size={20} />,
      onClick: () => navigate("/admin/services"),
      active: location.pathname.includes("/services"),
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: <FileText size={20} />,
      onClick: () => navigate("/admin/bookings"),
      active: location.pathname.includes("/bookings"),
    },
    {
      id: "create-booking",
      label: "Create Booking",
      icon: <FileText size={20} />,
      onClick: () => navigate("/admin/create-booking"),
      active: location.pathname.includes("/create-booking"),
    },
    {
      id: "reviews",
      label: "Employee Reviews",
      icon: <Star size={20} />,
      onClick: () => navigate("/admin/reviews"),
      active: location.pathname.includes("/reviews"),
    },
    {
      id: "employee-support",
      label: "Employee Support",
      icon: <MessageSquare size={20} />,
      onClick: () => navigate("/admin/employee-support"),
      active: location.pathname.includes("/employee-support"),
    },
    {
      id: "support",
      label: "Support",
      icon: <MessageSquare size={20} />,
      onClick: () => navigate("/admin/support"),
      active: location.pathname.includes("/support"),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell size={20} />,
      onClick: () => navigate("/admin/notifications"),
      active: location.pathname.includes("/notifications"),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings size={20} />,
      onClick: () => navigate("/admin/settings"),
      active: location.pathname.includes("/settings"),
    },
  ];

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        title="Admin Dashboard"
        showMenu={true}
      />

      <Sidebar
        items={navItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        footer={
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-md px-md py-md rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block w-64 flex-shrink-0" />
        <main className="flex-1 overflow-y-auto pt-16">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="services" element={<ServicesManagement />} />
            <Route path="bookings" element={<BookingsManagement />} />
            <Route path="create-booking" element={<BookingPage />} />
            <Route path="reviews" element={<EmployeeReviews />} />
            <Route path="employee-support" element={<AdminEmployeeSupport />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
