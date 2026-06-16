import React, { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Phone, RefreshCw, Navigation } from "lucide-react";
import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { Tabs } from "@/components/DataDisplay";
import { useAuthGuard } from "@/hooks";
import { BookingApiItem, bookingsAPI, employeeAPI } from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/helpers";

const getPreferredPaymentMode = (task: BookingApiItem) =>
  task.customer_choices?.["payment_method"] ||
  task.customer_choices?.["Preferred Payment Mode"] ||
  task.customer_choices?.["Payment Method"] ||
  null;

const formatCountdown = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const getRequestSecondsRemaining = (task: BookingApiItem, nowMs: number) => {
  if (task.request_expiry_status?.expires_at) {
    const expiresAtMs = new Date(task.request_expiry_status.expires_at).getTime();
    if (!Number.isNaN(expiresAtMs)) {
      return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
    }
  }

  if (task.created_at && task.request_expiry_status?.ttl_minutes) {
    const createdAtMs = new Date(task.created_at).getTime();
    if (!Number.isNaN(createdAtMs)) {
      const expiresAtMs =
        createdAtMs + task.request_expiry_status.ttl_minutes * 60 * 1000;
      return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
    }
  }

  return task.request_expiry_status?.total_seconds_remaining ?? 0;
};

const getTaskSortTime = (task: BookingApiItem) => {
  const dateValue = task.booking_date ? new Date(task.booking_date).getTime() : 0;
  const startTime = task.time_slot?.start_time || "00:00";
  const [hours, minutes] = startTime.split(":").map(Number);
  return dateValue + (Number.isFinite(hours) ? hours : 0) * 60 * 60 * 1000 +
    (Number.isFinite(minutes) ? minutes : 0) * 60 * 1000;
};

const sortTasks = (items: BookingApiItem[], direction: "asc" | "desc" = "asc") =>
  [...items].sort((first, second) => {
    const diff = getTaskSortTime(first) - getTaskSortTime(second);
    return direction === "asc" ? diff : -diff;
  });

const EmployeeTasks: React.FC = () => {
  const { isAllowed: isEmployeeAllowed, isLoading: isAuthLoading } =
    useAuthGuard("employee");
  const [tasks, setTasks] = useState<BookingApiItem[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<BookingApiItem | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const [tasksResponse, requestsResponse] = await Promise.all([
        employeeAPI.getTasks(),
        employeeAPI.getPendingBookingRequests(),
      ]);
      setTasks(tasksResponse.data || []);
      setBookingRequests(requestsResponse.data || []);
    } catch (loadError: any) {
      setError(
        loadError?.error || loadError?.message || "Failed to load tasks",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmployeeAllowed) return;
    void loadTasks();
  }, [isEmployeeAllowed]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const pendingTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.status === "accepted")),
    [tasks],
  );
  const inProgressTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.status === "in-progress")),
    [tasks],
  );
  const completedTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.status === "completed"), "desc"),
    [tasks],
  );

  const activeBookingRequests = useMemo(
    () =>
      sortTasks(
        bookingRequests.filter(
          (request) => getRequestSecondsRemaining(request, nowMs) > 0,
        ),
      ),
    [bookingRequests, nowMs],
  );

  const updateStatus = async (task: BookingApiItem, nextStatus: string) => {
    try {
      if (nextStatus === "accepted") {
        await employeeAPI.acceptBookingRequest(task.id);
      } else if (nextStatus === "completed") {
        await employeeAPI.completeTask(task.id);
      } else {
        await bookingsAPI.updateStatus(task.id, nextStatus);
      }

      await loadTasks();
      setSelectedTask(null);
    } catch (updateError: any) {
      setError(
        updateError?.error || updateError?.message || "Failed to update task",
      );
    }
  };

  const declineRequest = async (task: BookingApiItem) => {
    try {
      await employeeAPI.declineBookingRequest(task.id);
      await loadTasks();
      setSelectedTask(null);
    } catch (updateError: any) {
      setError(
        updateError?.error || updateError?.message || "Failed to decline task",
      );
    }
  };

  const openGoogleMaps = (task: BookingApiItem) => {
    const address = task.address_line2 || task.service_address;
    if (!address) return;

    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://www.google.com/maps/search/${encodedAddress}`;
    window.open(mapsUrl, "_blank");
  };

  const renderActions = (task: BookingApiItem) => {
    if (task.status === "pending") {
      return (
        <div className="flex gap-sm flex-wrap">
          <Button size="sm" onClick={() => void updateStatus(task, "accepted")}>
            Accept
          </Button>
          {task.request_expiry_status && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void declineRequest(task)}
            >
              Decline
            </Button>
          )}
        </div>
      );
    }

    if (task.status === "accepted") {
      return (
        <Button
          size="sm"
          onClick={() => void updateStatus(task, "in-progress")}
        >
          Start Service
        </Button>
      );
    }

    if (task.status === "in-progress") {
      return (
        <Button size="sm" onClick={() => void updateStatus(task, "completed")}>
          Mark Complete
        </Button>
      );
    }

    return <Badge variant="success">Completed</Badge>;
  };

  const TaskCard: React.FC<{ task: BookingApiItem }> = ({ task }) => (
    <Card>
      <CardBody>
        <div className="space-y-lg">
          <div className="flex flex-col md:flex-row md:items-start gap-lg">
            <div
              className="flex-1 cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm mb-sm">
                <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-base sm:text-lg">
                  {task.service_name}
                </h3>
                <StatusBadge status={task.status} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                {task.client_name}
              </p>
              <div className="space-y-xs text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-sm flex-wrap">
                  <Clock size={14} className="flex-shrink-0" />
                  <span>
                    {formatDate(task.booking_date)} •{" "}
                    {task.time_slot?.start_time} - {task.time_slot?.end_time}
                  </span>
                </p>
                {task.client_phone &&
                  ["accepted", "in-progress", "completed"].includes(
                    task.status,
                  ) && (
                    <p className="flex items-center gap-sm flex-wrap">
                      <Phone size={14} className="flex-shrink-0" />
                      <span>{task.client_phone}</span>
                    </p>
                  )}
                {task.service_address && (
                  <p className="flex items-start gap-sm">
                    <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                    <span className="break-words">{task.service_address}</span>
                  </p>
                )}
                {getPreferredPaymentMode(task) && (
                  <p className="flex items-center gap-sm flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                      Payment:
                    </span>
                    <span>{getPreferredPaymentMode(task)}</span>
                  </p>
                )}
                {task.request_expiry_status && (
                  <p className="flex items-center gap-sm flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                      Expires in:
                    </span>
                    <Badge
                      variant={
                        getRequestSecondsRemaining(task, nowMs) <= 60
                          ? "danger"
                          : "warning"
                      }
                      size="sm"
                    >
                      {formatCountdown(getRequestSecondsRemaining(task, nowMs))}
                    </Badge>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-md w-full sm:w-auto">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {formatCurrency(task.total_price)}
              </p>
              <div className="w-full sm:w-auto">{renderActions(task)}</div>
              {task.status !== "completed" &&
                (task.address_line2 || task.service_address) && (
                  <Button
                    variant="secondary"
                    icon={<Navigation size={16} />}
                    onClick={() => openGoogleMaps(task)}
                  >
                    Direction
                  </Button>
                )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );

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
        <div className="mb-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
            <div>
              <h1 className="section-title mb-md">My Tasks</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Live tasks assigned from the backend.
              </p>
            </div>
            <Button
              icon={
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
              }
              onClick={() => void loadTasks()}
              disabled={loading}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <Tabs
          tabs={[
            {
              label: `Requests (${activeBookingRequests.length})`,
              content: loading ? (
                <Card>
                  <CardBody>Loading requests...</CardBody>
                </Card>
              ) : (
                <div className="space-y-lg">
                  {activeBookingRequests.length > 0 ? (
                    activeBookingRequests.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  ) : (
                    <Card>
                      <CardBody className="text-gray-600 dark:text-gray-400">
                        No open booking requests.
                      </CardBody>
                    </Card>
                  )}
                </div>
              ),
            },
            {
              label: `Active (${pendingTasks.length + inProgressTasks.length})`,
              content: loading ? (
                <Card>
                  <CardBody>Loading tasks...</CardBody>
                </Card>
              ) : (
                <div className="space-y-lg">
                  {pendingTasks.length > 0 || inProgressTasks.length > 0 ? (
                    <>
                      {inProgressTasks.length > 0 && (
                        <div className="space-y-md">
                          <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                              In Progress
                            </h2>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Jobs you have already started.
                            </p>
                          </div>
                          {inProgressTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                        </div>
                      )}
                      {pendingTasks.length > 0 && (
                        <div className="space-y-md">
                          <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                              Accepted
                            </h2>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Upcoming jobs waiting to be started.
                            </p>
                          </div>
                          {pendingTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardBody className="text-gray-600 dark:text-gray-400">
                        No active tasks.
                      </CardBody>
                    </Card>
                  )}
                </div>
              ),
            },
            {
              label: `Completed (${completedTasks.length})`,
              content: loading ? (
                <Card>
                  <CardBody>Loading tasks...</CardBody>
                </Card>
              ) : (
                <div className="space-y-lg">
                  {completedTasks.length > 0 ? (
                    completedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  ) : (
                    <Card>
                      <CardBody className="text-gray-600 dark:text-gray-400">
                        No completed tasks.
                      </CardBody>
                    </Card>
                  )}
                </div>
              ),
            },
          ]}
        />

        <Modal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          title="Task Details"
          size="lg"
        >
          {selectedTask && (
            <div className="space-y-lg">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-md">
                <div className="flex-between mb-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                    {selectedTask.service_name}
                  </h3>
                  <StatusBadge status={selectedTask.status} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedTask.client_name}
                </p>
              </div>

              <div className="space-y-md text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-sm">
                  <Clock size={14} />
                  {formatDate(selectedTask.booking_date)} •{" "}
                  {selectedTask.time_slot?.start_time} -{" "}
                  {selectedTask.time_slot?.end_time}
                </p>
                {selectedTask.client_phone &&
                  ["accepted", "in-progress", "completed"].includes(
                    selectedTask.status,
                  ) && (
                  <p className="flex items-center gap-sm">
                    <Phone size={14} />
                    {selectedTask.client_phone}
                  </p>
                )}
                {selectedTask.service_address && (
                  <p className="flex items-center gap-sm">
                    <MapPin size={14} />
                    {selectedTask.service_address}
                  </p>
                )}
                {getPreferredPaymentMode(selectedTask) && (
                  <p>
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                      Payment:
                    </span>{" "}
                    {getPreferredPaymentMode(selectedTask)}
                  </p>
                )}
                {selectedTask.request_expiry_status && (
                  <p className="flex items-center gap-sm flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                      Expires in:
                    </span>
                    <Badge
                      variant={
                        getRequestSecondsRemaining(selectedTask, nowMs) <= 60
                          ? "danger"
                          : "warning"
                      }
                      size="sm"
                    >
                      {formatCountdown(
                        getRequestSecondsRemaining(selectedTask, nowMs),
                      )}
                    </Badge>
                  </p>
                )}
                {selectedTask.notes && (
                  <p>
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                      Notes:
                    </span>{" "}
                    {selectedTask.notes}
                  </p>
                )}
                <p className="font-semibold text-gray-900 dark:text-gray-50">
                  Amount: {formatCurrency(selectedTask.total_price)}
                </p>
              </div>

              <div className="flex gap-md flex-wrap">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setSelectedTask(null)}
                >
                  Close
                </Button>
                {selectedTask.status !== "completed" &&
                  (selectedTask.address_line2 ||
                    selectedTask.service_address) && (
                    <Button
                      variant="secondary"
                      icon={<Navigation size={16} />}
                      onClick={() => openGoogleMaps(selectedTask)}
                    >
                      Direction
                    </Button>
                  )}
                <div className="flex-1">{renderActions(selectedTask)}</div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default EmployeeTasks;
