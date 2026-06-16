import React, { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { TextArea } from "@/components/Form";
import { useAuthGuard } from "@/hooks";
import {
  EmployeeSupportThreadPayload,
  employeeAPI,
} from "@/services/api";
import { formatDateTime } from "@/utils/helpers";

const EmployeeAdminSupport: React.FC = () => {
  const { isAllowed: isEmployeeAllowed, isLoading: isAuthLoading } =
    useAuthGuard("employee");
  const [thread, setThread] = useState<EmployeeSupportThreadPayload | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThread = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await employeeAPI.getAdminSupportThread();
      setThread(response.data || null);
    } catch (loadError: any) {
      setError(
        loadError?.error ||
          loadError?.message ||
          "Failed to load admin support chat",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmployeeAllowed) {
      return;
    }

    void loadThread();
  }, [isEmployeeAllowed]);

  const sendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError("Message is required.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      await employeeAPI.sendAdminSupportMessage(trimmedMessage);
      setMessage("");
      await loadThread();
    } catch (sendError: any) {
      setError(
        sendError?.error ||
          sendError?.message ||
          "Failed to send message to admin",
      );
    } finally {
      setSending(false);
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
        <div className="mb-3xl flex flex-col gap-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="section-title mb-md">Admin Support</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Chat with admin without realtime sockets. This page refreshes when
              opened, and you can refresh it any time.
            </p>
          </div>
          <Button
            variant="secondary"
            icon={<RefreshCw size={18} className={loading ? "animate-spin" : ""} />}
            onClick={() => void loadThread()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <Card>
          <CardHeader
            title="Conversation"
            icon={<MessageSquare size={20} />}
          />
          <CardBody className="space-y-lg">
            <div className="rounded-lg border border-gray-200 bg-white p-md dark:border-gray-700 dark:bg-gray-900">
              {loading ? (
                <div className="flex-center min-h-[20rem]">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !thread || thread.messages.length === 0 ? (
                <div className="min-h-[12rem] rounded-lg border border-dashed border-gray-300 p-lg text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No messages yet. Start the conversation with admin.
                </div>
              ) : (
                <div className="max-h-[28rem] space-y-md overflow-y-auto pr-xs">
                  {thread.messages.map((chatMessage) => {
                    const isOwnMessage = chatMessage.sender_role === "employee";

                    return (
                      <div
                        key={chatMessage.id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-md py-sm text-sm ${
                            isOwnMessage
                              ? "bg-primary-600 text-white"
                              : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                          }`}
                        >
                          <p className="mb-xs text-xs font-semibold uppercase tracking-wide opacity-80">
                            {isOwnMessage
                              ? "You"
                              : chatMessage.sender_name || "Admin"}
                          </p>
                          <p className="whitespace-pre-wrap">{chatMessage.message}</p>
                          <p className="mt-xs text-[11px] opacity-75">
                            {formatDateTime(chatMessage.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-md">
              <TextArea
                label="New Message"
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your message for admin"
              />
              <div className="flex justify-end">
                <Button
                  icon={<Send size={16} />}
                  loading={sending}
                  onClick={() => void sendMessage()}
                >
                  Send Message
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeAdminSupport;
