import React, { useEffect, useMemo, useState } from "react";
import { Eye, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { Checkbox, Input, Select, TextArea } from "@/components/Form";
import { Modal } from "@/components/Modal";
import { Pagination, Table } from "@/components/DataDisplay";
import {
  AdminUserApiItem,
  adminAPI,
  ServiceApiItem,
  servicesAPI,
} from "@/services/api";
import { useAuthGuard } from "@/hooks";
import { formatDate } from "@/utils/helpers";

const UsersManagement: React.FC = () => {
  const { isAllowed: isAdminAllowed, isLoading: isAuthLoading } =
    useAuthGuard("admin");
  const [users, setUsers] = useState<AdminUserApiItem[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceApiItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserApiItem | null>(
    null,
  );
  const [initialSelectedUser, setInitialSelectedUser] =
    useState<AdminUserApiItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<
    string | null
  >(null);

  // Add admin modal state
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);

  const loadUsers = async (role = filterRole, currentSearch = search) => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminAPI.getAllUsers(
        role !== "all" ? role : undefined,
        currentSearch.trim() || undefined,
      );
      setUsers(response.data || []);
    } catch (loadError: any) {
      setError(
        loadError?.error || loadError?.message || "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminAllowed) return;
    void loadUsers();
  }, [isAdminAllowed]);

  useEffect(() => {
    if (!isAdminAllowed) return;

    const loadServiceCatalog = async () => {
      try {
        const response = await servicesAPI.getAll();
        setAvailableServices(response.data || []);
      } catch (loadError: any) {
        setError(
          loadError?.error ||
            loadError?.message ||
            "Failed to load services catalog",
        );
      }
    };

    void loadServiceCatalog();
  }, [isAdminAllowed]);

  const paginatedUsers = useMemo(() => {
    const pageSize = 8;
    const start = (currentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [currentPage, users]);

  const totalPages = Math.max(1, Math.ceil(users.length / 8));

  const getUserStatusBadge = (user: AdminUserApiItem) => {
    if (user.role === "employee" && user.verification_status !== "approved") {
      return <Badge variant="warning">Not Approved</Badge>;
    }

    const isOnline =
      user.role === "employee"
        ? Boolean(user.is_available)
        : user.status === "active";
    const normalizedStatus =
      user.role === "employee" ? (isOnline ? "Online" : "Offline") : "Active";

    return (
      <Badge variant={isOnline ? "success" : "danger"}>
        {normalizedStatus}
      </Badge>
    );
  };

  const getVerificationBadge = (
    verificationStatus?: AdminUserApiItem["verification_status"],
  ) => {
    if (!verificationStatus) {
      return "-";
    }

    if (verificationStatus === "approved") {
      return <Badge variant="success">Approved</Badge>;
    }

    return <Badge variant="warning">Not Approved</Badge>;
  };

  const deleteUser = async (id: string) => {
    try {
      await adminAPI.deleteUser(id);
      setUsers((current) => current.filter((user) => user.id !== id));
      if (selectedUser?.id === id) {
        setSelectedUser(null);
      }
    } catch (deleteError: any) {
      setError(
        deleteError?.error || deleteError?.message || "Failed to delete user",
      );
    }
  };

  const toggleEmployeeStatus = async (user: AdminUserApiItem) => {
    if (user.role !== "employee" || user.verification_status !== "approved") {
      return;
    }

    setStatusUpdatingUserId(user.id);
    setError(null);

    try {
      const response = await adminAPI.updateUser(user.id, {
        is_available: !Boolean(user.is_available),
      });
      const updatedUser = response.data || {
        ...user,
        is_available: !Boolean(user.is_available),
      };

      setUsers((current) =>
        current.map((item) => (item.id === user.id ? updatedUser : item)),
      );

      if (selectedUser?.id === user.id) {
        setSelectedUser(updatedUser);
        setInitialSelectedUser(updatedUser);
      }
    } catch (updateError: any) {
      setError(
        updateError?.error ||
          updateError?.message ||
          "Failed to update employee status",
      );
    } finally {
      setStatusUpdatingUserId(null);
    }
  };

  const reviewEmployee = async (
    userId: string,
    verificationStatus: "approved" | "rejected",
  ) => {
    try {
      setIsSavingUser(true);
      setError(null);

      if (selectedUser && selectedUser.id === userId) {
        await persistUserDetails(selectedUser);
      }

      await adminAPI.reviewEmployee(userId, {
        verification_status: verificationStatus,
        review_notes: reviewNotes.trim() || undefined,
      });
      await loadUsers(filterRole, search);
      setSelectedUser(null);
      setReviewNotes("");
      setIsDetailsOpen(false);
    } catch (reviewError: any) {
      setError(
        reviewError?.error ||
          reviewError?.message ||
          "Failed to review employee",
      );
    } finally {
      setIsSavingUser(false);
    }
  };

  const openUserDetails = async (userId: string) => {
    setIsDetailsOpen(true);
    setDetailsLoading(true);
    setError(null);

    try {
      const response = await adminAPI.getUserDetail(userId);
      setSelectedUser(response.data || null);
      setInitialSelectedUser(response.data || null);
      setReviewNotes(response.data?.review_notes || "");
    } catch (loadError: any) {
      setError(
        loadError?.error || loadError?.message || "Failed to load user details",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateSelectedUserField = (field: string, value: any) => {
    setSelectedUser((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  };

  const buildUserUpdatePayload = (user: AdminUserApiItem) => {
    const payload: {
      name?: string;
      email?: string;
      phone?: string;
      image?: string;
      hourly_rate?: number;
      document_url?: string;
      is_available?: boolean;
      service_ids?: string[];
    } = {};

    if (!initialSelectedUser || user.name !== initialSelectedUser.name) {
      payload.name = user.name;
    }

    if (!initialSelectedUser || user.email !== initialSelectedUser.email) {
      payload.email = user.email;
    }

    if (!initialSelectedUser || user.phone !== initialSelectedUser.phone) {
      payload.phone = user.phone;
    }

    if (
      !initialSelectedUser ||
      (user.image || undefined) !== (initialSelectedUser.image || undefined)
    ) {
      payload.image = user.image || undefined;
    }

    if (user.role === "employee") {
      const nextHourlyRate =
        user.hourly_rate !== undefined &&
        user.hourly_rate !== null &&
        user.hourly_rate !== ""
          ? Number(user.hourly_rate)
          : undefined;
      const initialHourlyRate =
        initialSelectedUser?.hourly_rate !== undefined &&
        initialSelectedUser?.hourly_rate !== null &&
        initialSelectedUser?.hourly_rate !== ""
          ? Number(initialSelectedUser.hourly_rate)
          : undefined;

      if (nextHourlyRate !== initialHourlyRate) {
        payload.hourly_rate = nextHourlyRate;
      }

      if (
        (user.document_url || undefined) !==
        (initialSelectedUser?.document_url || undefined)
      ) {
        payload.document_url = user.document_url || undefined;
      }

      if (
        Boolean(user.is_available) !==
        Boolean(initialSelectedUser?.is_available)
      ) {
        payload.is_available = Boolean(user.is_available);
      }

      const nextServiceIds = [...(user.assigned_service_ids || [])].sort();
      const initialServiceIds = [
        ...(initialSelectedUser?.assigned_service_ids || []),
      ].sort();

      if (JSON.stringify(nextServiceIds) !== JSON.stringify(initialServiceIds)) {
        payload.service_ids = nextServiceIds;
      }
    }

    return payload;
  };

  const persistUserDetails = async (user: AdminUserApiItem) => {
    const payload = buildUserUpdatePayload(user);

    if (Object.keys(payload).length === 0) {
      return user;
    }

    const response = await adminAPI.updateUser(user.id, payload);
    const updatedUser = response.data || user;

    setSelectedUser(updatedUser);
    setInitialSelectedUser(updatedUser);

    return updatedUser;
  };

  const saveUserDetails = async () => {
    if (!selectedUser) {
      return;
    }

    setIsSavingUser(true);
    setError(null);

    try {
      await persistUserDetails(selectedUser);
      await loadUsers(filterRole, search);
    } catch (saveError: any) {
      setError(
        saveError?.error ||
          saveError?.message ||
          "Failed to update user details",
      );
    } finally {
      setIsSavingUser(false);
    }
  };

  const toggleAssignedService = (serviceId: string) => {
    if (!selectedUser || selectedUser.role !== "employee") {
      return;
    }

    const currentServiceIds = selectedUser.assigned_service_ids || [];
    const nextServiceIds = currentServiceIds.includes(serviceId)
      ? currentServiceIds.filter((id) => id !== serviceId)
      : [...currentServiceIds, serviceId];

    const nextAssignedServices = availableServices
      .filter((service) => nextServiceIds.includes(service.id))
      .map((service) => service.name);

    setSelectedUser({
      ...selectedUser,
      assigned_service_ids: nextServiceIds,
      assigned_services: nextAssignedServices,
    });
  };

  const handleCreateManagedUser = async (
    form: { name: string; email: string; phone: string },
    role: "admin" | "employee",
  ) => {
    setError(null);
    const { name, email, phone } = form;

    if (!name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!phone.trim()) {
      setError("Phone is required");
      return false;
    }

    try {
      await adminAPI.createUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
      });
      await loadUsers(filterRole, search);
      return true;
    } catch (err: any) {
      setError(
        err?.error ||
          err?.message ||
          `Failed to create ${role === "admin" ? "admin" : "employee"}`,
      );
      return false;
    }
  };

  const handleAddAdmin = async () => {
    try {
      setIsSubmittingAdmin(true);
      const created = await handleCreateManagedUser(adminForm, "admin");
      if (created) {
        setAdminForm({ name: "", email: "", phone: "" });
        setIsAddAdminOpen(false);
      }
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      setIsSubmittingEmployee(true);
      const created = await handleCreateManagedUser(employeeForm, "employee");
      if (created) {
        setEmployeeForm({ name: "", email: "", phone: "" });
        setIsAddEmployeeOpen(false);
      }
    } finally {
      setIsSubmittingEmployee(false);
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
        <div className="mb-3xl flex justify-between items-start gap-md">
          <div>
            <h1 className="section-title mb-md">Users</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage clients, employees, and admins from database records.
            </p>
          </div>
          <div className="mt-1 flex flex-wrap gap-sm">
            <Button
              icon={<Plus size={20} />}
              onClick={() => setIsAddEmployeeOpen(true)}
            >
              Add Employee
            </Button>
            <Button
              icon={<Plus size={20} />}
              onClick={() => setIsAddAdminOpen(true)}
            >
              Add Admin
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <Card className="mb-lg">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <Input
                placeholder="Search by name, email, or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                options={[
                  { value: "all", label: "All Roles" },
                  { value: "client", label: "Clients" },
                  { value: "employee", label: "Employees" },
                  { value: "admin", label: "Admins" },
                ]}
                value={filterRole}
                onChange={(event) => {
                  setFilterRole(event.target.value);
                  setCurrentPage(1);
                }}
              />
              <Button onClick={() => void loadUsers(filterRole, search)}>
                Apply Filters
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Table
              loading={loading}
              emptyState="No users found"
              columns={[
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                {
                  key: "role",
                  label: "Role",
                  render: (value: string) => (
                    <Badge
                      variant={
                        value === "employee"
                          ? "secondary"
                          : value === "admin"
                            ? "warning"
                            : "primary"
                      }
                    >
                      {value}
                    </Badge>
                  ),
                },
                { key: "bookings", label: "Bookings" },
                {
                  key: "status",
                  label: "Status",
                  render: (_value: string, row: AdminUserApiItem) =>
                    getUserStatusBadge(row),
                },
                {
                  key: "verification_status",
                  label: "Verification",
                  render: (value: string) =>
                    getVerificationBadge(
                      value as AdminUserApiItem["verification_status"],
                    ),
                },
                {
                  key: "last_active_at",
                  label: "Last Active",
                  render: (value: string | null | undefined) =>
                    value ? formatDate(value) : "-",
                },
                {
                  key: "id",
                  label: "Actions",
                  render: (_: string, row: AdminUserApiItem) => (
                    <div className="flex flex-wrap gap-sm">
                      {row.role === "employee" && (
                        <Button
                          size="sm"
                          variant={
                            row.verification_status === "approved"
                              ? row.is_available
                                ? "outline"
                                : "secondary"
                              : "ghost"
                          }
                          loading={statusUpdatingUserId === row.id}
                          disabled={row.verification_status !== "approved"}
                          onClick={() => void toggleEmployeeStatus(row)}
                        >
                          {row.verification_status === "approved"
                            ? row.is_available
                              ? "Go Offline"
                              : "Go Online"
                            : "Awaiting Approval"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye size={16} />}
                        onClick={() => void openUserDetails(row.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={16} />}
                        onClick={() => void deleteUser(row.id)}
                      />
                    </div>
                  ),
                },
              ]}
              data={paginatedUsers}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardBody>
        </Card>

        <Modal
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedUser(null);
            setInitialSelectedUser(null);
            setReviewNotes("");
          }}
          title="User Details"
        >
          {detailsLoading ? (
            <div className="flex-center min-h-[12rem]">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedUser ? (
            <div className="space-y-lg">
              <div className="grid md:grid-cols-2 gap-lg">
                <Input
                  label="Name"
                  value={selectedUser.name || ""}
                  onChange={(event) =>
                    updateSelectedUserField("name", event.target.value)
                  }
                />
                <Input
                  label="Email"
                  value={selectedUser.email || ""}
                  onChange={(event) =>
                    updateSelectedUserField("email", event.target.value)
                  }
                />
              </div>
              <div className="grid md:grid-cols-2 gap-lg">
                <Input
                  label="Phone"
                  value={selectedUser.phone || ""}
                  onChange={(event) =>
                    updateSelectedUserField("phone", event.target.value)
                  }
                />
                <Input label="Role" value={selectedUser.role} readOnly />
              </div>
              <div className="grid md:grid-cols-2 gap-lg">
                <Input
                  label="Bookings"
                  value={String(selectedUser.bookings || 0)}
                  readOnly
                />
                <Input
                  label="Created"
                  value={
                    selectedUser.created_at
                      ? formatDate(selectedUser.created_at)
                      : "Unknown"
                  }
                  readOnly
                />
              </div>
              <Input
                label="Last Active"
                value={
                  selectedUser.last_active_at
                    ? formatDate(selectedUser.last_active_at)
                    : "No recent activity"
                }
                readOnly
              />
              {selectedUser.role === "employee" && (
                <>
                  <div className="grid md:grid-cols-2 gap-lg">
                    <Input
                      label="Verification"
                      value={selectedUser.verification_status || "pending"}
                      readOnly
                    />
                    <Input
                      label="Document URL"
                      value={selectedUser.document_url || ""}
                      onChange={(event) =>
                        updateSelectedUserField(
                          "document_url",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-lg">
                    <Input
                      label="Hourly Rate"
                      type="number"
                      value={String(selectedUser.hourly_rate || "")}
                      onChange={(event) =>
                        updateSelectedUserField(
                          "hourly_rate",
                          event.target.value,
                        )
                      }
                    />
                    <label className="flex items-center gap-md rounded-lg border border-gray-200 px-md py-md text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedUser.is_available)}
                        disabled={selectedUser.verification_status !== "approved"}
                        onChange={(event) =>
                          updateSelectedUserField(
                            "is_available",
                            event.target.checked,
                          )
                        }
                      />
                      Accept new assignments
                    </label>
                  </div>
                  {selectedUser.verification_status !== "approved" && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Approve this employee before setting them online.
                    </p>
                  )}
                  <div>
                    <label className="label-base">Assigned Services</label>
                    {availableServices.length > 0 ? (
                      <div className="max-h-56 space-y-sm overflow-y-auto rounded-lg border border-gray-200 p-md dark:border-gray-700">
                        {availableServices.map((service) => (
                          <Checkbox
                            key={service.id}
                            checked={(
                              selectedUser.assigned_service_ids || []
                            ).includes(service.id)}
                            label={service.name}
                            onChange={() => toggleAssignedService(service.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No services available.
                      </p>
                    )}
                  </div>
                  <Input
                    label="Pending Service Request Summary"
                    value={
                      (selectedUser.pending_assigned_services || []).join(
                        ", ",
                      ) || "No pending service request"
                    }
                    readOnly
                  />
                  <div>
                    <label className="label-base">
                      Pending Service Request
                    </label>
                    {(selectedUser.pending_assigned_services || []).length >
                    0 ? (
                      <div className="flex flex-wrap gap-sm">
                        {(selectedUser.pending_assigned_services || []).map(
                          (service: string) => (
                            <Badge key={service} variant="warning">
                              {service}
                            </Badge>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No pending service request.
                      </p>
                    )}
                  </div>
                  <TextArea
                    label="Review Notes"
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    rows={4}
                    helperText="Add an internal review note before approving or rejecting this employee."
                  />
                  <div className="flex gap-md">
                    <Button
                      variant="ghost"
                      fullWidth
                      loading={isSavingUser}
                      onClick={() => void saveUserDetails()}
                    >
                      Save Details
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() =>
                        void reviewEmployee(selectedUser.id, "rejected")
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      fullWidth
                      onClick={() =>
                        void reviewEmployee(selectedUser.id, "approved")
                      }
                    >
                      Approve
                    </Button>
                  </div>
                </>
              )}
              {selectedUser.role !== "employee" && (
                <div className="flex justify-end">
                  <Button loading={isSavingUser} onClick={() => void saveUserDetails()}>
                    Save Details
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </Modal>

        <Modal
          isOpen={isAddAdminOpen}
          onClose={() => {
            setIsAddAdminOpen(false);
            setAdminForm({ name: "", email: "", phone: "" });
            setError(null);
          }}
          title="Add New Admin"
        >
          <div className="space-y-lg">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}
            <Input
              label="Name"
              placeholder="Admin name"
              value={adminForm.name}
              onChange={(e) =>
                setAdminForm({ ...adminForm, name: e.target.value })
              }
              disabled={isSubmittingAdmin}
            />
            <Input
              label="Email"
              type="email"
              placeholder="admin@example.com"
              value={adminForm.email}
              onChange={(e) =>
                setAdminForm({ ...adminForm, email: e.target.value })
              }
              disabled={isSubmittingAdmin}
            />
            <Input
              label="Phone"
              placeholder="+1 (555) 000-0000"
              value={adminForm.phone}
              onChange={(e) =>
                setAdminForm({ ...adminForm, phone: e.target.value })
              }
              disabled={isSubmittingAdmin}
            />
            <div className="flex gap-md pt-lg">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setIsAddAdminOpen(false);
                  setAdminForm({ name: "", email: "", phone: "" });
                  setError(null);
                }}
                disabled={isSubmittingAdmin}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={() => void handleAddAdmin()}
                disabled={isSubmittingAdmin}
              >
                {isSubmittingAdmin ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={isAddEmployeeOpen}
          onClose={() => {
            setIsAddEmployeeOpen(false);
            setEmployeeForm({ name: "", email: "", phone: "" });
            setError(null);
          }}
          title="Add New Employee"
        >
          <div className="space-y-lg">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}
            <Input
              label="Name"
              placeholder="Employee name"
              value={employeeForm.name}
              onChange={(e) =>
                setEmployeeForm({ ...employeeForm, name: e.target.value })
              }
              disabled={isSubmittingEmployee}
            />
            <Input
              label="Email"
              type="email"
              placeholder="employee@example.com"
              value={employeeForm.email}
              onChange={(e) =>
                setEmployeeForm({ ...employeeForm, email: e.target.value })
              }
              disabled={isSubmittingEmployee}
            />
            <Input
              label="Phone"
              placeholder="+1 (555) 000-0000"
              value={employeeForm.phone}
              onChange={(e) =>
                setEmployeeForm({ ...employeeForm, phone: e.target.value })
              }
              disabled={isSubmittingEmployee}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              New employee accounts are created in pending review state and can
              finish service setup later.
            </p>
            <div className="flex gap-md pt-lg">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setIsAddEmployeeOpen(false);
                  setEmployeeForm({ name: "", email: "", phone: "" });
                  setError(null);
                }}
                disabled={isSubmittingEmployee}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={() => void handleAddEmployee()}
                disabled={isSubmittingEmployee}
              >
                {isSubmittingEmployee ? "Creating..." : "Create Employee"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default UsersManagement;
