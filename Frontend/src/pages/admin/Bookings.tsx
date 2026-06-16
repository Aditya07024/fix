import React, { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { Input, Select } from "@/components/Form";
import { Modal } from "@/components/Modal";
import { Pagination, Table } from "@/components/DataDisplay";
import {
  BookingApiItem,
  adminAPI,
  bookingsAPI,
} from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/helpers";
import { useAuthGuard } from "@/hooks";

const BOOKINGS_PER_PAGE = 10;

const getPreferredPaymentMode = (booking: BookingApiItem) =>
  booking.customer_choices?.["payment_method"] ||
  booking.customer_choices?.["Preferred Payment Mode"] ||
  booking.customer_choices?.["Payment Method"] ||
  null;

const BookingsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<BookingApiItem | null>(
    null,
  );
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  // ✅ Auth guard - verify admin access
  const { isAllowed: isAdminAllowed, isLoading: isAuthLoading } = useAuthGuard({
    role: "admin",
  });

  const loadBookings = async () => {
    // 🛡️ GUARD: Don't call API if not allowed
    if (!isAdminAllowed) {
      console.warn(
        "BookingsManagement: Admin access denied - skipping API call",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await adminAPI.getAllBookings(
        filterStatus !== "all" ? filterStatus : undefined,
      );
      setBookings(response.data || []);
    } catch (loadError: any) {
      setError(
        loadError?.error || loadError?.message || "Failed to load bookings",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🛡️ GUARD: Only load when admin is allowed
    if (!isAdminAllowed) {
      console.warn(
        "BookingsManagement: Skipping initial load - not authorized",
      );
      return;
    }
    void loadBookings();
  }, [filterStatus, isAdminAllowed]);

  // Early exit if not authorized
  if (isAuthLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-md border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">
              Verifying access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdminAllowed) {
    return (
      <div className="page-container">
        <div className="text-center text-red-600 mt-12">
          <p>Access Denied - Admin access required</p>
        </div>
      </div>
    );
  }

  const filteredBookings = useMemo(() => {
    if (!search.trim()) {
      return bookings;
    }

    const query = search.trim().toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.id.toLowerCase().includes(query) ||
        (booking.client_name || "").toLowerCase().includes(query) ||
        (booking.service_name || "").toLowerCase().includes(query),
    );
  }, [bookings, search]);

  const stats = useMemo(
    () => ({
      pending: bookings.filter((booking) => booking.status === "pending")
        .length,
      accepted: bookings.filter((booking) => booking.status === "accepted")
        .length,
      inProgress: bookings.filter((booking) => booking.status === "in-progress")
        .length,
      completed: bookings.filter((booking) => booking.status === "completed")
        .length,
    }),
    [bookings],
  );

  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * BOOKINGS_PER_PAGE,
    currentPage * BOOKINGS_PER_PAGE,
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const updateStatus = async (booking: BookingApiItem, status: string) => {
    try {
      await bookingsAPI.updateStatus(booking.id, status);
      await loadBookings();
      setSelectedBooking(null);
    } catch (updateError: any) {
      setError(
        updateError?.error ||
          updateError?.message ||
          "Failed to update booking",
      );
    }
  };

  const hideBooking = async (booking: BookingApiItem) => {
    try {
      setDeletingBookingId(booking.id);
      await bookingsAPI.deletePermanently(booking.id);
      setBookings((current) => current.filter((item) => item.id !== booking.id));
      setSelectedBooking((current) =>
        current?.id === booking.id ? null : current,
      );
    } catch (deleteError: any) {
      setError(
        deleteError?.error ||
          deleteError?.message ||
          "Failed to permanently delete booking",
      );
    } finally {
      setDeletingBookingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="container-main">
        <div className="mb-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
            <div>
              <h1 className="section-title mb-md">Bookings</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Review and update booking status from backend records.
              </p>
            </div>
            <div className="flex gap-md w-full sm:w-auto">
              <Button
                onClick={() => navigate("/admin/create-booking")}
                className="w-full sm:w-auto"
              >
                Create Booking
              </Button>
              <Button
                icon={
                  <RefreshCw
                    size={18}
                    className={loading ? "animate-spin" : ""}
                  />
                }
                onClick={() => void loadBookings()}
                disabled={loading}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-lg mb-lg">
          <Card>
            <CardBody className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Pending
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {stats.pending}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Accepted
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {stats.accepted}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                In Progress
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {stats.inProgress}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                Completed
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {stats.completed}
              </p>
            </CardBody>
          </Card>
        </div>

        <Card className="mb-lg">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <Input
                placeholder="Search booking, client, or service"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "pending", label: "Pending" },
                  { value: "accepted", label: "Accepted" },
                  { value: "in-progress", label: "In Progress" },
                  { value: "completed", label: "Completed" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                value={filterStatus}
                onChange={(event) => {
                  setFilterStatus(event.target.value);
                  setCurrentPage(1);
                }}
              />
              <Button onClick={() => setCurrentPage(1)}>Apply Filters</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Table
              loading={loading}
              emptyState="No bookings found"
              columns={[
                { key: "id", label: "Booking" },
                { key: "client_name", label: "Client" },
                { key: "service_name", label: "Service" },
                {
                  key: "booking_date",
                  label: "Date",
                  render: (value: string, row: BookingApiItem) =>
                    `${formatDate(value)} • ${row.time_slot?.start_time}`,
                },
                {
                  key: "total_price",
                  label: "Amount",
                  render: (value: number) => formatCurrency(value),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value: string) => <StatusBadge status={value} />,
                },
                {
                  key: "employee_name",
                  label: "Employee",
                  render: (value: string | null) =>
                    value ? value : <Badge variant="warning">Unassigned</Badge>,
                },
                {
                  key: "id",
                  label: "Action",
                  render: (_: string, row: BookingApiItem) => (
                    <div className="flex gap-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye size={16} />}
                        onClick={() => setSelectedBooking(row)}
                      >
                        View
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={16} />}
                        onClick={() => void hideBooking(row)}
                        disabled={deletingBookingId === row.id}
                      >
                        {deletingBookingId === row.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={paginatedBookings}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardBody>
        </Card>

        <Modal
          isOpen={Boolean(selectedBooking)}
          onClose={() => setSelectedBooking(null)}
          title="Booking Details"
          size="lg"
        >
          {selectedBooking && (
            <div className="space-y-lg">
              <div className="grid md:grid-cols-2 gap-lg">
                <Input
                  label="Client"
                  value={selectedBooking.client_name || ""}
                  readOnly
                />
                <Input
                  label="Service"
                  value={selectedBooking.service_name || ""}
                  readOnly
                />
              </div>
              <div className="grid md:grid-cols-2 gap-lg">
                <Input
                  label="Employee"
                  value={selectedBooking.employee_name || "Unassigned"}
                  readOnly
                />
                <Input
                  label="Scheduled"
                  value={`${formatDate(selectedBooking.booking_date)} • ${selectedBooking.time_slot?.start_time} - ${selectedBooking.time_slot?.end_time}`}
                  readOnly
                />
              </div>
              <Input
                label="Address"
                value={selectedBooking.service_address || ""}
                readOnly
              />
              <Input
                label="Notes"
                value={selectedBooking.notes || ""}
                readOnly
              />
              <Input
                label="Amount"
                value={formatCurrency(selectedBooking.total_price)}
                readOnly
              />
              <Input
                label="Preferred Payment Mode"
                value={getPreferredPaymentMode(selectedBooking) || ""}
                readOnly
              />

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-md py-sm text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
                <p>
                  <strong>Note:</strong> Clients can only cancel bookings at
                  least 10 minutes before the scheduled time.
                </p>
              </div>

              <div className="flex flex-wrap gap-md">
                {selectedBooking.status === "pending" && (
                  <Button
                    onClick={() =>
                      void updateStatus(selectedBooking, "accepted")
                    }
                  >
                    Accept
                  </Button>
                )}
                {selectedBooking.status === "accepted" && (
                  <Button
                    onClick={() =>
                      void updateStatus(selectedBooking, "in-progress")
                    }
                  >
                    Start Service
                  </Button>
                )}
                {selectedBooking.status === "in-progress" && (
                  <Button
                    onClick={() =>
                      void updateStatus(selectedBooking, "completed")
                    }
                  >
                    Mark Complete
                  </Button>
                )}
                {["pending", "accepted", "in-progress"].includes(
                  selectedBooking.status,
                ) && (
                  <Button
                    variant="danger"
                    onClick={() =>
                      void updateStatus(selectedBooking, "cancelled")
                    }
                  >
                    Cancel Booking
                  </Button>
                )}
                <Button
                  variant="danger"
                  icon={<Trash2 size={16} />}
                  onClick={() => void hideBooking(selectedBooking)}
                  disabled={deletingBookingId === selectedBooking.id}
                >
                  {deletingBookingId === selectedBooking.id
                    ? "Deleting..."
                    : "Delete Permanently"}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default BookingsManagement;
