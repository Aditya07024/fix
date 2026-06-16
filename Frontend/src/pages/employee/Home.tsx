import React, { useEffect, useState } from "react";
import { Calendar, Clock, DollarSign, Star } from "lucide-react";
import { Badge, Divider } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { useAuthGuard } from "@/hooks";
import { EmployeeDashboardPayload, employeeAPI } from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/helpers";

const EmployeeHome: React.FC = () => {
  const { isAllowed: isEmployeeAllowed, isLoading: isAuthLoading } =
    useAuthGuard("employee");
  const [dashboard, setDashboard] = useState<EmployeeDashboardPayload | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEmployeeAllowed) return;
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await employeeAPI.getDashboard();
        setDashboard(response.data || null);
      } catch (loadError: any) {
        setError(
          loadError?.error ||
            loadError?.message ||
            "Failed to load employee dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [isEmployeeAllowed]);

  const profile = dashboard?.profile;
  const stats = dashboard?.stats;
  const todayTasks = dashboard?.today_tasks || [];
  const earnings = dashboard?.earnings;

  const handleAvailabilityToggle = async () => {
    if (!profile || availabilityUpdating) return;

    try {
      setAvailabilityUpdating(true);
      setError(null);
      await employeeAPI.updateAvailability(!profile.is_available);
      window.location.reload();
    } catch (updateError: any) {
      setError(
        updateError?.error ||
          updateError?.message ||
          "Failed to update availability",
      );
      setAvailabilityUpdating(false);
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

  if (isAuthLoading) {
    return (
      <div className="page-container">
        <div className="container-main">
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  if (!isEmployeeAllowed) {
    return (
      <div className="page-container">
        <div className="container-main">
          <p>Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container-main">
        <div className="mb-3xl flex-between">
          <div>
            <h1 className="section-title mb-md">Overview</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Live data from your assigned tasks and completed payments.
            </p>
          </div>
          {profile && (
            <Button
              variant={profile.is_available ? "secondary" : "primary"}
              onClick={() => void handleAvailabilityToggle()}
              disabled={
                profile.verification_status !== "approved" ||
                availabilityUpdating
              }
            >
              {profile.is_available ? "Go Offline" : "Go Online"}
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {profile?.verification_status !== "approved" && (
          <div className="mb-lg rounded-lg border border-amber-200 bg-amber-50 px-md py-sm text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Your account is {profile?.verification_status}. Admin approval is
            required before you can start jobs in the app.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {" "}
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Today's Tasks
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {stats?.today_tasks || 0}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Completed Tasks
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {stats?.completed_tasks || 0}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Total Earnings
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {formatCurrency(earnings?.total_earnings || 0)}
              </p>
            </CardBody>
          </Card>
          {/* <Card>
            <CardBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Rating
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {stats?.ratings ? stats.ratings.toFixed(1) : "0"}
              </p>
            </CardBody>
          </Card> */}
        </div>

        <div className="grid lg:grid-cols-3 gap-lg">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Today's Tasks" icon={<Calendar size={22} />} />
              <CardBody>
                {todayTasks.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">
                    No tasks scheduled for today.
                  </p>
                ) : (
                  <div className="space-y-md">
                    {todayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 p-md"
                      >
                        <div className="flex-between mb-sm">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-50">
                              {task.service_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {task.client_name}
                            </p>
                          </div>
                          <Badge variant="info">{task.status}</Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-md text-sm text-gray-600 dark:text-gray-400">
                          <p className="flex items-center gap-sm">
                            <Clock size={14} />
                            {task.time_slot?.start_time} -{" "}
                            {task.time_slot?.end_time}
                          </p>
                          <p className="flex items-center gap-sm">
                            <DollarSign size={14} />
                            {formatCurrency(task.total_price)}
                          </p>
                        </div>
                        {task.service_address && (
                          <>
                            <Divider className="my-md" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {task.service_address}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-lg">
            <Card>
              <CardHeader title="Profile Stats" icon={<Star size={22} />} />
              <CardBody>
                <div className="space-y-md">
                  <div className="flex-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Pending Tasks
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-50">
                      {stats?.pending_tasks || 0}
                    </span>
                  </div>
                  <div className="flex-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Transactions
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-50">
                      {earnings?.total_transactions || 0}
                    </span>
                  </div>
                  {/* <div className="flex-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Rating
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-50">
                      {stats?.ratings ? `{stats.ratings.toFixed(1)} ⭐` : "0"}
                    </span>
                  </div> */}
                  <div className="flex-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Hourly Rate
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-50">
                      {formatCurrency(profile?.hourly_rate || 0)}
                    </span>
                  </div>
                  <div className="flex-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Verification
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-50 capitalize">
                      {profile?.verification_status || "pending"}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent Payments" />
              <CardBody>
                {earnings?.recent_payments?.length ? (
                  <div className="space-y-md">
                    {earnings.recent_payments.slice(0, 5).map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 p-md"
                      >
                        <div className="flex-between mb-xs">
                          <p className="font-medium text-gray-900 dark:text-gray-50">
                            {payment.service_name}
                          </p>
                          <span className="font-semibold text-gray-900 dark:text-gray-50">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {payment.client_name} •{" "}
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    No completed payments yet.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHome;
