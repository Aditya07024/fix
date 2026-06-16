import React, { useState } from "react";
import { MapPin } from "lucide-react";
import { useAuthGuard } from "@/hooks";
import AddressAreasTab from "./settings/AddressAreas";

type SettingTab = "addresses";

const AdminSettings: React.FC = () => {
  const { isAllowed: isAdminAllowed, isLoading: isAuthLoading } =
    useAuthGuard("admin");
  const [activeTab, setActiveTab] = useState<SettingTab>("addresses");

  if (isAuthLoading) {
    return (
      <div className="page-container">
        <div className="container-main">
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAdminAllowed) {
    return (
      <div className="page-container">
        <div className="container-main">
          <p>Access Denied</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: "addresses" as SettingTab,
      label: "Address Areas",
      icon: <MapPin size={18} />,
    },
  ];

  return (
    <div className="page-container">
      <div className="container-main">
        <div className="mb-3xl">
          <h1 className="section-title mb-md">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage system-wide settings and configurations.
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-lg border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-lg overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-sm px-md py-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>{activeTab === "addresses" && <AddressAreasTab />}</div>
      </div>
    </div>
  );
};

export default AdminSettings;
