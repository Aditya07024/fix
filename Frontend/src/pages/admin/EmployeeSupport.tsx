import React, { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Send, Users } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { TextArea } from "@/components/Form";
import { useAuthGuard } from "@/hooks";
import {
  adminAPI,
  EmployeeSupportConversationApiItem,
  EmployeeSupportThreadPayload,
} from "@/services/api";
import { formatDateTime, truncateText } from "@/utils/helpers";

const AdminEmployeeSupport: React.FC = () => {
  const { isAllowed: isAdminAllowed, isLoading: isAuthLoading } =
    useAuthGuard("admin");
  const [conversations, setConversations] = useState<
    EmployeeSupportConversationApiItem[]
  >([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [thread, setThread] = useState<EmployeeSupportThreadPayload | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async (preferredEmployeeId?: string | null) => {
    setLoadingList(true);
    setError(null);

    try {
      const response = await adminAPI.getEmployeeSupportConversations();
      const nextConversations = response.data || [];
      setConversations(nextConversations);

      const nextSelectedEmployeeId =
        preferredEmployeeId ||
        selectedEmployeeId ||
        nextConversations[0]?.employee_user_id ||
        null;

      setSelectedEmployeeId(nextSelectedEmployeeId);

      if (nextSelectedEmployeeId) {
        await loadThread(nextSelectedEmployeeId);
      } else {
        setThread(null);
      }
    } catch (loadError: any) {
      setError(
        loadError?.error ||
          loadError?.message ||
          "Failed to load employee support conversations",
      );
    } finally {
      setLoadingList(false);
    }
  };

  const loadThread = async (employeeUserId: string) => {
    setLoadingThread(true);
    setError(null);

    try {
      const response = await adminAPI.getEmployeeSupportThread(employeeUserId);
      setThread(response.data || null);
    } catch (loadError: any) {
      setError(
        loadError?.error ||
          loadError?.message ||
          "Failed to load employee chat",
      );
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (!isAdminAllowed) {
      return;
    }

    void loadConversations();
  }, [isAdminAllowed]);

  const handleSelectConversation = async (employeeUserId: string) => {
    setSelectedEmployeeId(employeeUserId);
    await loadThread(employeeUserId);
  };

  const handleRefresh = async () => {
    await loadConversations(selectedEmployeeId);
  };

  const sendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!selectedEmployeeId) {
      setError("Select an employee first.");
      return;
    }

    if (!trimmedMessage) {
      setError("Message is required.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      await adminAPI.sendEmployeeSupportMessage(
        selectedEmployeeId,
        trimmedMessage,
      );
      setMessage("");
      await loadConversations(selectedEmployeeId);
    } catch (sendError: any) {
      setError(
        sendError?.error ||
          sendError?.message ||
          "Failed to send message to employee",
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
        <div className="mb-3xl flex flex-col gap-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="section-title mb-md">Employee Support</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Message employees directly. This page reloads data when opened and
              can be refreshed manually without websocket usage.
            </p>
          </div>
          <Button
            variant="secondary"
            icon={
              <RefreshCw
                size={18}
                className={loadingList || loadingThread ? "animate-spin" : ""}
              />
            }
            onClick={() => void handleRefresh()}
            disabled={loadingList || loadingThread}
          >
            {loadingList || loadingThread ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-lg lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Employees" icon={<Users size={20} />} />
            <CardBody>
              {loadingList ? (
                <div className="flex-center min-h-[16rem]">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-lg text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No employees available for support chat yet.
                </div>
              ) : (
                <div className="space-y-sm">
                  {conversations.map((conversation) => {
                    const isActive =
                      conversation.employee_user_id === selectedEmployeeId;

                    return (
                      <button
                        key={conversation.employee_user_id}
                        type="button"
                        onClick={() =>
                          void handleSelectConversation(
                            conversation.employee_user_id,
                          )
                        }
                        className={`w-full rounded-xl border px-md py-md text-left transition-colors ${
                          isActive
                            ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/40"
                            : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-sm">
                          <p className="font-semibold text-gray-900 dark:text-gray-50">
                            {conversation.employee_name}
                          </p>
                          {conversation.last_message_at && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {formatDateTime(conversation.last_message_at)}
                            </span>
                          )}
                        </div>
                        <p className="mt-xs text-xs text-gray-500 dark:text-gray-400">
                          {conversation.employee_email}
                        </p>
                        <p className="mt-sm text-sm text-gray-600 dark:text-gray-300">
                          {conversation.last_message
                            ? truncateText(conversation.last_message, 60)
                            : "No messages yet"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={thread?.employee.employee_name || "Conversation"}
              icon={<MessageSquare size={20} />}
            />
            <CardBody className="space-y-lg">
              <div className="rounded-lg border border-gray-200 bg-white p-md dark:border-gray-700 dark:bg-gray-900">
                {loadingThread ? (
                  <div className="flex-center min-h-[20rem]">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !selectedEmployeeId ? (
                  <div className="min-h-[12rem] rounded-lg border border-dashed border-gray-300 p-lg text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Select an employee to open the support chat.
                  </div>
                ) : !thread || thread.messages.length === 0 ? (
                  <div className="min-h-[12rem] rounded-lg border border-dashed border-gray-300 p-lg text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    No messages yet. Send the first message to this employee.
                  </div>
                ) : (
                  <div className="max-h-[28rem] space-y-md overflow-y-auto pr-xs">
                    {thread.messages.map((chatMessage) => {
                      const isAdminMessage = chatMessage.sender_role === "admin";

                      return (
                        <div
                          key={chatMessage.id}
                          className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-md py-sm text-sm ${
                              isAdminMessage
                                ? "bg-primary-600 text-white"
                                : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                            }`}
                          >
                            <p className="mb-xs text-xs font-semibold uppercase tracking-wide opacity-80">
                              {isAdminMessage
                                ? "Admin"
                                : chatMessage.sender_name || "Employee"}
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
                  placeholder="Write a message for the selected employee"
                />
                <div className="flex justify-end">
                  <Button
                    icon={<Send size={16} />}
                    loading={sending}
                    onClick={() => void sendMessage()}
                    disabled={!selectedEmployeeId}
                  >
                    Send Message
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminEmployeeSupport;
