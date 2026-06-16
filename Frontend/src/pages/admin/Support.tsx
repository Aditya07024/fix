import React, { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Input, Select, TextArea } from "@/components/Form";
import { Badge } from "@/components/Badge";
import { adminAPI, SupportRequestApiItem } from "@/services/api";
import { useAuthGuard } from "@/hooks";
import { formatDate } from "@/utils/helpers";

const AdminSupport: React.FC = () => {
  const { isAllowed: isAdminAllowed, isLoading: isAuthLoading } =
    useAuthGuard("admin");
  const [requests, setRequests] = useState<SupportRequestApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { status: SupportRequestApiItem["status"]; admin_response: string }
    >
  >({});

  const loadRequests = async (
    nextStatus = statusFilter,
    nextType = typeFilter,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminAPI.getSupportRequests(
        (nextStatus || undefined) as
          | SupportRequestApiItem["status"]
          | undefined,
        (nextType || undefined) as SupportRequestApiItem["type"] | undefined,
      );
      const nextRequests = response.data || [];
      setRequests(nextRequests);
      setDrafts(
        Object.fromEntries(
          nextRequests.map((request) => [
            request.id,
            {
              status: request.status,
              admin_response: request.admin_response || "",
            },
          ]),
        ),
      );
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
    if (!isAdminAllowed) return;
    void loadRequests();
  }, [isAdminAllowed]);

  const updateRequest = async (requestId: string) => {
    const draft = drafts[requestId];
    if (!draft) {
      return;
    }

    setSavingId(requestId);
    setError(null);

    try {
      await adminAPI.updateSupportRequest(requestId, draft);
      await loadRequests();
    } catch (saveError: any) {
      setError(
        saveError?.error ||
          saveError?.message ||
          "Failed to update support request",
      );
    } finally {
      setSavingId(null);
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
  if (!isAdminAllowed) {
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
          <h1 className="section-title mb-md">Support Desk</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review complaints and extra-service requirements from clients.
          </p>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <Card className="mb-lg">
          <CardBody>
            <div className="grid gap-lg md:grid-cols-3">
              <Select
                label="Status"
                options={[
                  { value: "", label: "All statuses" },
                  { value: "open", label: "Open" },
                  { value: "in_review", label: "In Review" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                ]}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
              <Select
                label="Type"
                options={[
                  { value: "", label: "All types" },
                  { value: "complaint", label: "Complaint" },
                  { value: "extra_service", label: "Extra Service" },
                ]}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              />
              <div className="flex items-end">
                <Button
                  fullWidth
                  onClick={() => void loadRequests(statusFilter, typeFilter)}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Incoming Requests" />
          <CardBody className="space-y-md">
            {loading ? (
              <div className="flex-center min-h-[18rem]">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-lg text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No support requests found.
              </div>
            ) : (
              requests.map((request) => {
                const draft = drafts[request.id] || {
                  status: request.status,
                  admin_response: request.admin_response || "",
                };

                return (
                  <div
                    key={request.id}
                    className="rounded-lg border border-gray-200 p-lg dark:border-gray-700"
                  >
                    <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-sm">
                          <p className="font-semibold text-gray-900 dark:text-gray-50">
                            {request.subject}
                          </p>
                          <Badge
                            variant={
                              request.type === "complaint" ? "danger" : "info"
                            }
                          >
                            {request.type === "complaint"
                              ? "Complaint"
                              : "Extra Service"}
                          </Badge>
                        </div>
                        <p className="mt-xs text-sm text-gray-600 dark:text-gray-400">
                          {request.client_name} • {request.client_email} •{" "}
                          {request.client_phone}
                        </p>
                        <p className="mt-xs text-sm text-gray-600 dark:text-gray-400">
                          Created {formatDate(request.created_at)}
                          {request.service_name
                            ? ` • ${request.service_name}`
                            : ""}
                          {request.booking_date
                            ? ` • Booking ${formatDate(request.booking_date)}`
                            : ""}
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

                    <div className="mt-md rounded-lg bg-gray-50 p-md text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      {request.message}
                    </div>

                    <div className="mt-lg grid gap-lg lg:grid-cols-2">
                      <Select
                        label="Update Status"
                        options={[
                          { value: "open", label: "Open" },
                          { value: "in_review", label: "In Review" },
                          { value: "resolved", label: "Resolved" },
                          { value: "closed", label: "Closed" },
                        ]}
                        value={draft.status}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [request.id]: {
                              ...draft,
                              status: event.target
                                .value as SupportRequestApiItem["status"],
                            },
                          }))
                        }
                      />
                      {/* <Input
                        label="Quick Reply Hint"
                        value={request.service_name || ""}
                        readOnly
                      /> */}
                    </div>

                    <div className="mt-lg">
                      <TextArea
                        label="Admin Response"
                        rows={4}
                        value={draft.admin_response}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [request.id]: {
                              ...draft,
                              admin_response: event.target.value,
                            },
                          }))
                        }
                        placeholder="Reply to the client here"
                      />
                    </div>

                    <div className="mt-lg flex justify-end">
                      <Button
                        loading={savingId === request.id}
                        onClick={() => void updateRequest(request.id)}
                      >
                        Save Response
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default AdminSupport;
