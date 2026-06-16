import React, { useEffect, useState } from "react";
import {
  Clock,
  Heart,
  MapPin,
  Star,
  RefreshCw,
  AlertCircle,
  Timer,
  Phone,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, Badge, Divider, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { Input, TextArea } from "@/components/Form";
import { Modal } from "@/components/Modal";
import { Tabs } from "@/components/DataDisplay";
import { PaymentModal } from "@/components";
import {
  BookingApiItem,
  bookingsAPI,
  clientAPI,
  reviewsAPI,
  paymentsAPI,
  ServiceApiItem,
} from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/helpers";
import { useAuthGuard } from "@/hooks";

const CANCELLATION_WINDOW_SECONDS = 10 * 60;

const BookingHistory: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingApiItem[]>([]);
  const [savedServices, setSavedServices] = useState<ServiceApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEmployeeReviewModal, setShowEmployeeReviewModal] = useState(false);
  const [showEmployeePhotoModal, setShowEmployeePhotoModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingApiItem | null>(
    null,
  );
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [employeeReview, setEmployeeReview] = useState({
    rating: 5,
    comment: "",
  });
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [employeeReviewedIds, setEmployeeReviewedIds] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(
    null,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Payment modal state for after-service payments
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<BookingApiItem | null>(
    null,
  );

  // ✅ Auth guard - verify client access
  const { isAllowed: isClientAllowed, isLoading: isAuthLoading } = useAuthGuard(
    { role: "client" },
  );

  const loadData = async () => {
    // 🛡️ GUARD: Don't call API if not allowed
    if (!isClientAllowed) {
      console.warn("BookingHistory: Client access denied - skipping API calls");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [bookingsResponse, savedResponse] = await Promise.all([
        bookingsAPI.getMyBookings(),
        clientAPI.getSavedServices(),
      ]);

      setBookings(bookingsResponse.data || []);
      setSavedServices(savedResponse.data || []);
    } catch (loadError: any) {
      setError(
        loadError?.error ||
          loadError?.message ||
          "Failed to load booking history",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🛡️ GUARD: Only load when client is allowed
    void loadData();
  }, [isClientAllowed]);

  // Timer effect to update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const activeBookings = bookings.filter((booking) =>
    ["pending", "accepted", "in-progress"].includes(booking.status),
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "completed",
  );

  // Check if a booking can be cancelled using backend data
  const getCancellationStatus = (
    booking: BookingApiItem,
  ): {
    canCancel: boolean;
    message: string | null;
    hasStarted: boolean;
    timeRemaining: string | null;
  } => {
    if (!["pending", "accepted", "in-progress"].includes(booking.status)) {
      return {
        canCancel: false,
        message: null,
        hasStarted: false,
        timeRemaining: null,
      };
    }

    if (booking.cancellation_status) {
      const totalSecondsRemaining =
        booking.cancellation_status.minutes_remaining * 60 +
        booking.cancellation_status.seconds_remaining;

      if (totalSecondsRemaining > 0) {
        const mins = Math.floor(totalSecondsRemaining / 60);
        const secs = totalSecondsRemaining % 60;
        return {
          canCancel: true,
          message: null,
          hasStarted: false,
          timeRemaining: `${mins}:${String(secs).padStart(2, "0")}`,
        };
      }

      return {
        canCancel: false,
        message: "Cancellation window has closed (10 min limit reached)",
        hasStarted: false,
        timeRemaining: null,
      };
    }

    if (booking.created_at) {
      const createdAtMs = new Date(booking.created_at).getTime();
      if (!Number.isNaN(createdAtMs)) {
        const elapsedSeconds = Math.max(
          0,
          Math.floor((nowMs - createdAtMs) / 1000),
        );
        const remainingSeconds = Math.max(
          0,
          CANCELLATION_WINDOW_SECONDS - elapsedSeconds,
        );

        if (remainingSeconds > 0) {
          const mins = Math.floor(remainingSeconds / 60);
          const secs = remainingSeconds % 60;
          return {
            canCancel: true,
            message: null,
            hasStarted: false,
            timeRemaining: `${mins}:${String(secs).padStart(2, "0")}`,
          };
        }

        return {
          canCancel: false,
          message: "Cancellation window has closed (10 min limit reached)",
          hasStarted: false,
          timeRemaining: null,
        };
      }
    }

    return {
      canCancel: false,
      message: null,
      hasStarted: false,
      timeRemaining: null,
    };
  };

  const canCancelBooking = (booking: BookingApiItem): boolean => {
    return getCancellationStatus(booking).canCancel;
  };

  const cancelBooking = async (bookingId: string) => {
    setCancellationError(null);
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking || !canCancelBooking(booking)) {
      setCancellationError(
        "This booking can only be cancelled within 10 minutes of creation.",
      );
      return;
    }

    try {
      await bookingsAPI.cancel(bookingId);
      await loadData();
      setCancellationError(null);
    } catch (cancelError: any) {
      const errorMessage =
        cancelError?.error ||
        cancelError?.response?.data?.error ||
        cancelError?.message ||
        "Failed to cancel booking";
      setCancellationError(errorMessage);
    }
  };

  const openReviewModal = (booking: BookingApiItem) => {
    setSelectedBooking(booking);
    setReview({ rating: 5, comment: "" });
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedBooking) {
      return;
    }

    setReviewSubmitting(true);
    setError(null);

    try {
      await reviewsAPI.create({
        booking_id: selectedBooking.id,
        service_id: selectedBooking.service_id,
        rating: review.rating,
        comment: review.comment,
      });

      setReviewedIds((current) => [...current, selectedBooking.id]);
      setShowReviewModal(false);
    } catch (reviewError: any) {
      setError(
        reviewError?.error || reviewError?.message || "Failed to submit review",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const openEmployeeReviewModal = (booking: BookingApiItem) => {
    setSelectedBooking(booking);
    setEmployeeReview({ rating: 5, comment: "" });
    setShowEmployeeReviewModal(true);
  };

  const openEmployeePhotoModal = (booking: BookingApiItem) => {
    setSelectedBooking(booking);
    setShowEmployeePhotoModal(true);
  };

  const submitEmployeeReview = async () => {
    if (!selectedBooking || !selectedBooking.employee_id) {
      return;
    }

    setReviewSubmitting(true);
    setError(null);

    try {
      await reviewsAPI.create({
        booking_id: selectedBooking.id,
        service_id: selectedBooking.service_id,
        employee_id: selectedBooking.employee_id,
        rating: employeeReview.rating,
        comment: employeeReview.comment,
      });

      setEmployeeReviewedIds((current) => [...current, selectedBooking.id]);
      setShowEmployeeReviewModal(false);
    } catch (reviewError: any) {
      setError(
        reviewError?.error || reviewError?.message || "Failed to submit review",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const removeSavedService = async (serviceId: string) => {
    try {
      await clientAPI.toggleSavedService(serviceId);
      setSavedServices((current) =>
        current.filter((service) => service.id !== serviceId),
      );
    } catch (toggleError: any) {
      setError(
        toggleError?.error ||
          toggleError?.message ||
          "Failed to update saved service",
      );
    }
  };

  const BookingCard: React.FC<{ booking: BookingApiItem }> = ({ booking }) => (
    <Card>
      <CardBody>
        <div className="space-y-lg">
          <div className="flex flex-col md:flex-row md:items-start gap-lg">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 text-white flex-center text-2xl">
              {(booking.service_name || "S").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex-between mb-sm">
                <div className="flex items-center gap-md">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                    {booking.service_name || "Service"}
                  </h3>
                  {booking.status === "completed" &&
                    booking.payment_timing === "after_service" &&
                    booking.payment_status !== "completed" && (
                      <Badge
                        variant="warning"
                        className="flex items-center gap-xs"
                      >
                        <AlertCircle size={12} />
                        Payment Pending
                      </Badge>
                    )}
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                {booking.employee_name || "Employee will be assigned"}
              </p>
              {booking.employee_name &&
                ["accepted", "in-progress", "completed"].includes(
                  booking.status,
                ) && (
                  <button
                    type="button"
                    onClick={() => openEmployeePhotoModal(booking)}
                    className="mb-md inline-flex items-center gap-md rounded-xl border border-gray-200 bg-white px-md py-sm text-left shadow-sm transition hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-700 dark:hover:bg-gray-800"
                  >
                    <Avatar
                      src={booking.employee_image || undefined}
                      name={booking.employee_name}
                      size="lg"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {booking.employee_name}
                      </p>
                      <p className="text-xs text-primary-600 dark:text-primary-400">
                        Tap to view employee photo
                      </p>
                    </div>
                  </button>
                )}
              <div className="space-y-xs text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-md">
                  <Clock size={14} />
                  {formatDate(booking.booking_date)} •{" "}
                  {booking.time_slot?.start_time} -{" "}
                  {booking.time_slot?.end_time}
                </p>
                {booking.employee_phone &&
                  ["accepted", "in-progress", "completed"].includes(
                    booking.status,
                  ) && (
                    <p className="flex items-center gap-md">
                      <Phone size={14} />
                      {booking.employee_phone}
                    </p>
                  )}
                {booking.service_address && (
                  <p className="flex items-center gap-md">
                    <MapPin size={14} />
                    {booking.service_address}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Divider />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-md">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {formatCurrency(booking.total_price)}
            </p>

            <div className="flex gap-md flex-wrap">
              {booking.status === "completed" &&
                booking.payment_timing === "after_service" &&
                booking.payment_status !== "completed" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setPaymentBooking(booking);
                      setShowPaymentModal(true);
                    }}
                  >
                    Complete Payment
                  </Button>
                )}
              {booking.status === "completed" &&
                !reviewedIds.includes(booking.id) &&
                booking.payment_status === "completed" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openReviewModal(booking)}
                  >
                    Write Review
                  </Button>
                )}
              {booking.status === "completed" &&
                booking.employee_id &&
                !employeeReviewedIds.includes(booking.id) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEmployeeReviewModal(booking)}
                  >
                    Review Employee
                  </Button>
                )}
              {booking.status === "completed" &&
                reviewedIds.includes(booking.id) && (
                  <Badge variant="success">Reviewed</Badge>
                )}
              {["pending", "accepted"].includes(booking.status) &&
                (() => {
                  const status = getCancellationStatus(booking);
                  return (
                    <div className="flex flex-col gap-md">
                      {status.timeRemaining && (
                        <div className="px-md py-sm rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-md mb-sm">
                            <Timer
                              size={16}
                              className="text-blue-600 dark:text-blue-400"
                            />
                            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                              Cancellation available for
                            </span>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-300">
                              {status.timeRemaining}
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-200 mt-xs">
                              You can cancel this booking within 10 minutes of
                              creation
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-md">
                        {!status.hasStarted && (
                          <Button
                            variant={status.canCancel ? "danger" : "outline"}
                            size="sm"
                            disabled={!status.canCancel}
                            onClick={() => void cancelBooking(booking.id)}
                            icon={<Trash2 size={20} />}
                            className="flex-1 justify-center"
                          >
                            {status.canCancel
                              ? "Cancel Booking"
                              : "Can't Cancel"}
                          </Button>
                        )}
                        {status.message && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 px-md py-sm flex items-center gap-xs">
                            <AlertCircle size={14} />
                            {status.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );

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

  if (!isClientAllowed) {
    return (
      <div className="page-container">
        <div className="text-center text-red-600 mt-12">
          <p>Access Denied - Client access required</p>
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
              <h1 className="section-title mb-md">Booking History</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track active jobs, completed work, and saved services.
              </p>
            </div>
            <Button
              icon={
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
              }
              onClick={() => void loadData()}
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

        {cancellationError && (
          <div className="mb-lg rounded-lg border border-yellow-200 bg-yellow-50 px-md py-sm text-sm text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200 flex items-start gap-md">
            <AlertCircle size={18} className="flex-shrink-0 mt-xs" />
            <div>
              <p className="font-medium">Cannot Cancel Booking</p>
              <p className="text-xs mt-xs">{cancellationError}</p>
            </div>
          </div>
        )}

        <Tabs
          tabs={[
            {
              label: `Active (${activeBookings.length})`,
              content: loading ? (
                <Card>
                  <CardBody>Loading bookings...</CardBody>
                </Card>
              ) : activeBookings.length > 0 ? (
                <div className="space-y-lg">
                  {activeBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardBody className="text-center py-2xl">
                    <p className="text-gray-600 dark:text-gray-400 mb-md">
                      No active bookings.
                    </p>
                    <Button
                      onClick={() => navigate("/client/services")}
                      className="w-full sm:w-auto"
                    >
                      Book a Service
                    </Button>
                  </CardBody>
                </Card>
              ),
            },
            {
              label: `Completed (${completedBookings.length})`,
              content: loading ? (
                <Card>
                  <CardBody>Loading bookings...</CardBody>
                </Card>
              ) : completedBookings.length > 0 ? (
                <div className="space-y-lg">
                  {completedBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardBody className="text-center py-2xl">
                    <p className="text-gray-600 dark:text-gray-400">
                      No completed bookings yet.
                    </p>
                  </CardBody>
                </Card>
              ),
            },
            {
              label: `Saved Services (${savedServices.length})`,
              content: loading ? (
                <Card>
                  <CardBody>Loading saved services...</CardBody>
                </Card>
              ) : savedServices.length > 0 ? (
                <div className="space-y-lg">
                  {savedServices.map((service) => (
                    <Card key={service.id}>
                      <CardBody className="flex flex-col md:flex-row md:items-center md:justify-between gap-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-sm mb-sm">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-base sm:text-lg truncate">
                              {service.name}
                            </h3>
                            <Badge variant="primary" className="w-fit">
                              {service.category_name || "Service"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm line-clamp-2">
                            {service.description}
                          </p>
                          <div className="flex items-center gap-md text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                            <span className="inline-flex items-center gap-xs">
                              <Star
                                size={14}
                                className="fill-accent-400 text-accent-400 flex-shrink-0"
                              />
                              {service.rating || 0}
                            </span>
                            <span>{formatCurrency(service.price)}</span>
                          </div>
                        </div>
                        <div className="flex gap-md w-full md:w-auto">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              navigate("/client/booking", {
                                state: { serviceId: service.id },
                              })
                            }
                            className="flex-1 md:flex-none"
                          >
                            Book
                          </Button>
                          <Button
                            variant="ghost"
                            icon={
                              <Heart
                                size={16}
                                className="fill-red-500 text-red-500"
                              />
                            }
                            onClick={() => void removeSavedService(service.id)}
                            className="flex-1 md:flex-none"
                          >
                            Remove
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardBody className="text-center py-2xl">
                    <p className="text-gray-600 dark:text-gray-400">
                      No saved services yet.
                    </p>
                  </CardBody>
                </Card>
              ),
            },
          ]}
        />

        <Modal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title="Write a Review"
        >
          {selectedBooking && (
            <div className="space-y-lg">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-md">
                <p className="font-semibold text-gray-900 dark:text-gray-50">
                  {selectedBooking.service_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedBooking.employee_name}
                </p>
              </div>
              <Input
                label="Rating (1 to 5)"
                type="number"
                min={1}
                max={5}
                value={String(review.rating)}
                onChange={(event) =>
                  setReview((current) => ({
                    ...current,
                    rating: Number(event.target.value),
                  }))
                }
              />
              <TextArea
                label="Comment"
                value={review.comment}
                onChange={(event) =>
                  setReview((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
              />
              <div className="flex flex-col sm:flex-row gap-md">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  loading={reviewSubmitting}
                  onClick={() => void submitReview()}
                  disabled={review.comment.trim().length < 5}
                >
                  Submit Review
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Employee Review Modal */}
        <Modal
          isOpen={showEmployeeReviewModal}
          onClose={() => setShowEmployeeReviewModal(false)}
          title="Review Employee"
        >
          {selectedBooking && (
            <div className="space-y-lg">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-md">
                <p className="font-semibold text-gray-900 dark:text-gray-50">
                  {selectedBooking.employee_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Service: {selectedBooking.service_name}
                </p>
              </div>
              <Input
                label="Rating (1 to 5)"
                type="number"
                min={1}
                max={5}
                value={String(employeeReview.rating)}
                onChange={(event) =>
                  setEmployeeReview((current) => ({
                    ...current,
                    rating: Number(event.target.value),
                  }))
                }
              />
              <TextArea
                label="Comment"
                value={employeeReview.comment}
                onChange={(event) =>
                  setEmployeeReview((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
                placeholder="Share your experience with this employee..."
              />
              <div className="flex flex-col sm:flex-row gap-md">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowEmployeeReviewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  loading={reviewSubmitting}
                  onClick={() => void submitEmployeeReview()}
                  disabled={employeeReview.comment.trim().length < 5}
                >
                  Submit Review
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={showEmployeePhotoModal}
          onClose={() => setShowEmployeePhotoModal(false)}
          title={selectedBooking?.employee_name || "Employee Photo"}
          size="lg"
        >
          {selectedBooking && (
            <div className="space-y-lg text-center">
              <div className="mx-auto flex w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl bg-gray-100 p-md dark:bg-gray-800">
                {selectedBooking.employee_image ? (
                  <img
                    src={selectedBooking.employee_image}
                    alt={selectedBooking.employee_name || "Employee"}
                    className="max-h-[70vh] w-full rounded-2xl object-cover"
                  />
                ) : (
                  <Avatar
                    src={selectedBooking.employee_image || undefined}
                    name={selectedBooking.employee_name || "Employee"}
                    size="xl"
                    className="h-48 w-48 text-5xl"
                  />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {selectedBooking.employee_name || "Assigned employee"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedBooking.service_name}
                </p>
              </div>
            </div>
          )}
        </Modal>

        {/* Payment Modal for after-service payments */}
        {paymentBooking && (
          <PaymentModal
            isOpen={showPaymentModal}
            bookingId={paymentBooking.id}
            amount={paymentBooking.total_price}
            onClose={() => {
              setShowPaymentModal(false);
              setPaymentBooking(null);
            }}
            onPaymentSuccess={() => {
              setShowPaymentModal(false);
              setPaymentBooking(null);
              void loadData();
            }}
            onPaymentFailed={() => {
              setShowPaymentModal(false);
              setPaymentBooking(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BookingHistory;
