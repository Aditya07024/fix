import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  IndianRupee,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { StatCard, Table } from "@/components/DataDisplay";
import {
  adminAPI,
  AdminDashboardPayload,
  BookingApiItem,
  ServiceApiItem,
  servicesAPI,
} from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/helpers";
import { useAuthGuard } from "@/hooks";

const COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#6366f1",
];

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardPayload | null>(null);
  const [recentBookings, setRecentBookings] = useState<BookingApiItem[]>([]);
  const [allBookings, setAllBookings] = useState<BookingApiItem[]>([]);
  const [services, setServices] = useState<ServiceApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Auth guard - only render if admin and authenticated
  const { isAllowed: isAdminAllowed, isLoading: isAuthLoading } = useAuthGuard({
    role: "admin",
  });

  // ✅ Memoize data BEFORE any early returns (Rules of Hooks)
  const statusData = useMemo(() => stats?.bookings_by_status || [], [stats]);
  const serviceData = useMemo(() => stats?.service_distribution || [], [stats]);
  const servicesById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );
  const financials = useMemo(() => {
    const revenueFromBookings = allBookings
      .filter((booking) => booking.status !== "cancelled")
      .reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);
    const profitFromBookings = allBookings
      .filter((booking) => booking.status !== "cancelled")
      .reduce((sum, booking) => {
        const service = servicesById.get(booking.service_id);
        return sum + Number(service?.profit || 0);
      }, 0);

    return {
      totalMoney: Number(stats?.total_revenue || revenueFromBookings),
      totalProfit: Number(stats?.total_profit || profitFromBookings),
    };
  }, [allBookings, servicesById, stats]);

  useEffect(() => {
    // 🛡️ GUARD: Only call API if admin is allowed
    if (!isAdminAllowed) {
      console.warn("AdminOverview: User not allowed - skipping API calls");
      return;
    }

    const loadOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const [statsResponse, bookingsResponse, servicesResponse] =
          await Promise.all([
          adminAPI.getDashboardStats(),
          adminAPI.getAllBookings(),
          servicesAPI.getAll(),
        ]);

        setStats(statsResponse.data || null);
        const nextBookings = bookingsResponse.data || [];
        setAllBookings(nextBookings);
        setRecentBookings(nextBookings.slice(0, 10));
        setServices(servicesResponse.data || []);
      } catch (loadError: any) {
        setError(
          loadError?.error ||
            loadError?.message ||
            "Failed to load admin overview",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, [isAdminAllowed]); // Re-run when admin access changes

  // ✅ Show loading while auth is being checked
  if (isAuthLoading) {
    return (
      <div className="page-container">
        <div className="container-main">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-md border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">
                Verifying access...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Early return if not allowed
  if (!isAdminAllowed) {
    return (
      <div className="page-container">
        <div className="container-main">
          <div className="w-full max-w-md mx-auto mt-12">
            <Card>
              <CardBody>
                <div className="flex items-center gap-md mb-md">
                  <AlertCircle size={24} className="text-red-500" />
                  <p className="font-semibold text-red-600">Access Denied</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You do not have permission to access this page.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container-main">
        <div className="mb-3xl">
          <h1 className="section-title mb-md">Dashboard Overview</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Platform metrics sourced from live backend data.
          </p>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-lg mb-3xl">
          <StatCard
            title="Total Users"
            value={stats?.total_users || 0}
            icon={<Users size={32} />}
          />
          <StatCard
            title="Total Bookings"
            value={stats?.total_bookings || 0}
            icon={<BarChart3 size={32} />}
          />
          <StatCard
            title="Total Money"
            value={formatCurrency(financials.totalMoney)}
            icon={<IndianRupee size={32} />}
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(financials.totalProfit)}
            icon={<TrendingUp size={32} />}
          />
          <StatCard
            title="Avg Rating"
            value={(stats?.average_rating || 0).toFixed(1)}
            icon={<AlertCircle size={32} />}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-lg mb-3xl">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Bookings by Status" />
              <CardBody>
                {loading ? (
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading chart...
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusData}>
                      <XAxis dataKey="status" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#0ea5e9"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Service Mix" />
            <CardBody>
              {loading ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Loading chart...
                </p>
              ) : serviceData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={serviceData}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={95}
                      >
                        {serviceData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-sm">
                    {serviceData.map((service, index) => (
                      <div key={service.name} className="flex-between text-sm">
                        <div className="flex items-center gap-md">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="text-gray-600 dark:text-gray-400">
                            {service.name}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-50">
                          {service.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  No service data available.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Recent Bookings" />
          <CardBody>
            <Table
              loading={loading}
              emptyState="No bookings found"
              columns={[
                { key: "id", label: "Booking ID" },
                { key: "client_name", label: "Client" },
                { key: "service_name", label: "Service" },
                {
                  key: "booking_date",
                  label: "Date",
                  render: (value: string) => formatDate(value),
                },
                { key: "status", label: "Status" },
                {
                  key: "total_price",
                  label: "Amount",
                  render: (value: number) => formatCurrency(value),
                },
              ]}
              data={recentBookings}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
