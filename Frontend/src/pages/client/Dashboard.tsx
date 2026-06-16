import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/react";
import {
  Home,
  Search,
  Calendar,
  HistoryIcon,
  User,
  LogOut,
  Menu,
  Bell,
  MessageSquare,
  TestTube2,
} from "lucide-react";
import { Navbar, Sidebar } from "@/components/Navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/stores/authStore";
import { realtimeNotifications } from "@/services/realtimeNotifications";
import ClientHome from "./Home";
import ServiceListing from "./Services";
import BookingPage from "./Booking";
import BookingHistory from "./BookingHistory";
import ProfilePage from "./Profile";
import ClientSupport from "./Support";
import Notifications from "../Notifications";

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await clerk.signOut();
    logout();
    navigate("/login");
  };

  const handleTestNotification = async () => {
    await realtimeNotifications.sendTestNotification();
  };

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: <Home size={20} />,
      onClick: () => navigate("/client"),
      active: location.pathname === "/client",
    },
    {
      id: "services",
      label: "Browse Services",
      icon: <Search size={20} />,
      onClick: () => navigate("/client/services"),
      active: location.pathname.includes("/services"),
    },
    {
      id: "booking",
      label: "Book Service",
      icon: <Calendar size={20} />,
      onClick: () => navigate("/client/booking"),
      active: location.pathname.includes("/booking"),
    },
    {
      id: "history",
      label: "Booking History",
      icon: <HistoryIcon size={20} />,
      onClick: () => navigate("/client/history"),
      active: location.pathname.includes("/history"),
    },
    {
      id: "support",
      label: "Support",
      icon: <MessageSquare size={20} />,
      onClick: () => navigate("/client/support"),
      active: location.pathname.includes("/support"),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell size={20} />,
      onClick: () => navigate("/client/notifications"),
      active: location.pathname.includes("/notifications"),
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User size={20} />,
      onClick: () => navigate("/client/profile"),
      active: location.pathname.includes("/profile"),
    },
  ];

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        title="Client Dashboard"
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
            <Route index element={<ClientHome />} />
            <Route path="services" element={<ServiceListing />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="history" element={<BookingHistory />} />
            <Route path="support" element={<ClientSupport />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default ClientDashboard;
