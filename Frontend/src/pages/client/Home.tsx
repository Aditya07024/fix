import React, { useEffect, useState } from "react";
import { ArrowRight, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import {
  ClientDashboardPayload,
  clientAPI,
  ServiceApiItem,
} from "@/services/api";
import { useAuthGuard } from "@/hooks";
import { formatCurrency, formatDate, getStatusLabel } from "@/utils/helpers";

const ClientHome: React.FC = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<ClientDashboardPayload | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await clientAPI.getDashboard();
      setDashboard(response.data || null);
    } catch (loadError: any) {
      setError(
        loadError?.error || loadError?.message || "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const toggleSavedService = async (service: ServiceApiItem) => {
    try {
      await clientAPI.toggleSavedService(service.id);
      setDashboard((current) => {
        if (!current) {
          return current;
        }

        const topServices = current.top_services.map((item) =>
          item.id === service.id ? { ...item, is_saved: !item.is_saved } : item,
        );

        const savedDelta = service.is_saved ? -1 : 1;

        return {
          ...current,
          top_services: topServices,
          stats: {
            ...current.stats,
            saved_services: Math.max(
              0,
              current.stats.saved_services + savedDelta,
            ),
          },
        };
      });
    } catch (toggleError: any) {
      setError(
        toggleError?.error ||
          toggleError?.message ||
          "Failed to update saved service",
      );
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="container-main flex-center min-h-[50vh]">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page-container">
        <div className="container-main">
          <Card>
            <p className="text-gray-600 dark:text-gray-400">
              {error || "No dashboard data available."}
            </p>
            <div className="mt-lg">
              <Button onClick={loadDashboard}>Retry</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container-main">
        <div className="mb-3xl">
          <h1 className="section-title mb-md">Welcome back</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Book services, track jobs, and manage your saved options.
          </p>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-amber-200 bg-amber-50 px-md py-sm text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {error}
          </div>
        )}

        <div className="grid-2 md:grid-cols-4 mb-3xl">
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Active Bookings
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {dashboard.stats.active_bookings}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Completed
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {dashboard.stats.completed_bookings}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Saved Services
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {dashboard.stats.saved_services}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Amount Spent
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {formatCurrency(dashboard.stats.amount_spent)}
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="mb-3xl">
          <div className="flex-between mb-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              Categories
            </h2>
            <Button
              variant="ghost"
              onClick={() => navigate("/client/services")}
            >
              View All <ArrowRight size={16} />
            </Button>
          </div>
          <div className="grid-cards">
            {dashboard.categories.map((category) => (
              <div
                key={category.id}
                onClick={() => navigate("/client/services")}
              >
                <Card hoverable className="cursor-pointer">
                  <CardBody>
                    <div className="flex-between mb-md">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                        {category.name}
                      </h3>
                      <Badge variant="primary">
                        {category.service_count || 0}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-md">
                      {category.description ||
                        "Browse services in this category."}
                    </p>
                    <div className="space-y-xs">
                      {(category.service_names || [])
                        .slice(0, 3)
                        .map((name) => (
                          <p
                            key={name}
                            className="text-sm text-gray-700 dark:text-gray-300"
                          >
                            • {name}
                          </p>
                        ))}
                    </div>
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3xl">
          <div className="flex-between mb-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              Top Services
            </h2>
            <Button
              variant="ghost"
              onClick={() => navigate("/client/services")}
            >
              Browse Services <ArrowRight size={16} />
            </Button>
          </div>
          <div className="space-y-lg">
            {dashboard.top_services.map((service) => (
              <Card key={service.id}>
                <CardBody>
                  <div className="flex flex-col md:flex-row gap-lg">
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 text-white flex-center text-3xl">
                      {(service.category_name || service.name)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex-between gap-md mb-sm">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                          {service.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => void toggleSavedService(service)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Heart
                            size={18}
                            className={
                              service.is_saved
                                ? "fill-red-500 text-red-500"
                                : ""
                            }
                          />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                        {service.description}
                      </p>
                      <div className="flex flex-wrap gap-md text-sm text-gray-600 dark:text-gray-400">
                        <span>{service.category_name || "Service"}</span>
                        {service.employee_name && (
                          <span>{service.employee_name}</span>
                        )}
                        <span>{service.duration} mins</span>
                        <span className="inline-flex items-center gap-xs">
                          <Star
                            size={14}
                            className="fill-accent-400 text-accent-400"
                          />
                          {service.rating || 0} ({service.total_reviews || 0})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-md justify-between">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                        {formatCurrency(service.price)}
                      </p>
                      <Button
                        onClick={() =>
                          navigate("/client/booking", {
                            state: { serviceId: service.id },
                          })
                        }
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader title="Recent Bookings" />
          <CardBody>
            {dashboard.recent_bookings.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                No bookings yet. Start by booking your first service.
              </p>
            ) : (
              <div className="space-y-md">
                {dashboard.recent_bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-md rounded-lg border border-gray-200 dark:border-gray-700 p-md"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-50">
                        {booking.service_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(booking.booking_date)} •{" "}
                        {booking.employee_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-md">
                      <Badge variant="info">
                        {getStatusLabel(booking.status)}
                      </Badge>
                      <span className="font-semibold text-gray-900 dark:text-gray-50">
                        {formatCurrency(booking.total_price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default ClientHome;
