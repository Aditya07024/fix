import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/react";
import {
  Home,
  Clock,
  TrendingUp,
  User,
  LogOut,
  Bell,
  MessageSquare,
} from "lucide-react";
import { Navbar, Sidebar } from "@/components/Navigation";
import { useAuth } from "@/stores/authStore";
import EmployeeHome from "./Home";
import EmployeeTasks from "./Tasks";
import EarningsPage from "./Earnings";
import EmployeeProfile from "./Profile";
import EmployeeAdminSupport from "./AdminSupport";
import Notifications from "../Notifications";

const EmployeeDashboard: React.FC = () => {
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
      id: "home",
      label: "Overview",
      icon: <Home size={20} />,
      onClick: () => navigate("/employee"),
      active: location.pathname === "/employee",
    },
    {
      id: "tasks",
      label: "My Tasks",
      icon: <Clock size={20} />,
      onClick: () => navigate("/employee/tasks"),
      active: location.pathname.includes("/tasks"),
    },
    {
      id: "earnings",
      label: "Earnings",
      icon: <TrendingUp size={20} />,
      onClick: () => navigate("/employee/earnings"),
      active: location.pathname.includes("/earnings"),
    },
    {
      id: "admin-support",
      label: "Admin Support",
      icon: <MessageSquare size={20} />,
      onClick: () => navigate("/employee/admin-support"),
      active: location.pathname.includes("/admin-support"),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell size={20} />,
      onClick: () => navigate("/employee/notifications"),
      active: location.pathname.includes("/notifications"),
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User size={20} />,
      onClick: () => navigate("/employee/profile"),
      active: location.pathname.includes("/profile"),
    },
  ];

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        title="Employee Dashboard"
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
            <Route index element={<EmployeeHome />} />
            <Route path="tasks" element={<EmployeeTasks />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="admin-support" element={<EmployeeAdminSupport />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<EmployeeProfile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
