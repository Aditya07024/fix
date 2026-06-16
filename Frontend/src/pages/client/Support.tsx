import React, { useEffect, useState } from "react";
import { AlertCircle, MessageSquarePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Input, Select, TextArea } from "@/components/Form";
import { Badge } from "@/components/Badge";
import { useAuthGuard } from "@/hooks";
import {
  BookingApiItem,
  bookingsAPI,
  clientAPI,
  ServiceApiItem,
  servicesAPI,
  SupportRequestApiItem,
} from "@/services/api";
import { formatDate } from "@/utils/helpers";

const ClientSupport: React.FC = () => {
  const { isAllowed: isClientAllowed, isLoading: isAuthLoading } =
    useAuthGuard("client");
  const [requests, setRequests] = useState<SupportRequestApiItem[]>([]);
  const [services, setServices] = useState<ServiceApiItem[]>([]);
  const [bookings, setBookings] = useState<BookingApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "complaint" as "complaint" | "extra_service",
    subject: "",
    message: "",
    service_id: "",
    booking_id: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [requestsResponse, servicesResponse, bookingsResponse] =
        await Promise.all([
          clientAPI.getSupportRequests(),
          servicesAPI.getAll(),
          bookingsAPI.getMyBookings(),
        ]);

      setRequests(requestsResponse.data || []);
      setServices(servicesResponse.data || []);
      setBookings(bookingsResponse.data || []);
    } catch (loadError: any) {
      setError(
        loadError?.error ||
          loadError?.message ||
          "Failed to load support requests",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isClientAllowed) return;
    void loadData();
  }, [isClientAllowed]);

  const submitRequest = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      setError("Subject and message are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await clientAPI.createSupportRequest({
        type: form.type,
        subject: form.subject.trim(),
        message: form.message.trim(),
        service_id: form.service_id || undefined,
        booking_id: form.booking_id || undefined,
      });

      setForm({
        type: "complaint",
        subject: "",
        message: "",
        service_id: "",
        booking_id: "",
      });
      await loadData();
    } catch (submitError: any) {
      setError(
        submitError?.error ||
          submitError?.message ||
          "Failed to submit request",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="page-container">
        <div className="container-main">
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  if (!isClientAllowed) {
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
          <h1 className="section-title mb-md">Support Requests</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Send complaints or extra-service requests directly to admin.
          </p>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-lg lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Create Request"
              icon={<MessageSquarePlus size={20} />}
            />
            <CardBody className="space-y-lg">
              <Select
                label="Request Type"
                options={[
                  { value: "complaint", label: "Complaint" },
                  {
                    value: "extra_service",
                    label: "Extra Service Requirement",
                  },
                ]}
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as "complaint" | "extra_service",
                  }))
                }
              />
              <Input
                label="Subject"
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                placeholder="Short summary"
              />
              <Select
                label="Related Service"
                options={[
                  { value: "", label: "No related service" },
                  ...services.map((service) => ({
                    value: service.id,
                    label: service.name,
                  })),
                ]}
                value={form.service_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    service_id: event.target.value,
                  }))
                }
              />
              <Select
                label="Related Booking"
                options={[
                  { value: "", label: "No related booking" },
                  ...bookings.map((booking) => ({
                    value: booking.id,
                    label: `${booking.service_name || booking.id} • ${formatDate(booking.booking_date)}`,
                  })),
                ]}
                value={form.booking_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    booking_id: event.target.value,
                  }))
                }
              />
              <TextArea
                label="Message"
                rows={5}
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="Tell admin exactly what you need."
              />
              <Button
                fullWidth
                loading={submitting}
                onClick={() => void submitRequest()}
              >
                Send To Admin
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Request History" icon={<Sparkles size={20} />} />
            <CardBody className="space-y-md">
              {loading ? (
                <div className="flex-center min-h-[18rem]">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : requests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-lg text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No support requests yet.
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border border-gray-200 p-md dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-md">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-50">
                          {request.subject}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(request.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          request.status === "resolved"
                            ? "success"
                            : request.status === "closed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <p className="mt-sm text-sm text-gray-700 dark:text-gray-300">
                      {request.message}
                    </p>
                    {request.admin_response && (
                      <div className="mt-md rounded-lg bg-blue-50 p-sm text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-200">
                        <div className="mb-xs font-medium">Admin Response</div>
                        {request.admin_response}
                      </div>
                    )}
                    <div className="mt-md flex items-center gap-sm text-xs text-gray-500 dark:text-gray-400">
                      <AlertCircle size={14} />
                      {request.type === "complaint"
                        ? "Complaint"
                        : "Extra service requirement"}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientSupport;
