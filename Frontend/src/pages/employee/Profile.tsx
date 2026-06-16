import React, { useEffect, useState } from "react";
import { useClerk } from "@clerk/react";
import { Edit2, LogOut, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, Badge, Divider } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Input } from "@/components/Form";
import { Tabs } from "@/components/DataDisplay";
import { useAuthGuard } from "@/hooks";
import {
  authAPI,
  employeeAPI,
  EmployeeProfilePayload,
  ServiceApiItem,
  servicesAPI,
} from "@/services/api";
import { useAuth } from "@/stores/authStore";
import { cn, formatCurrency, formatDate } from "@/utils/helpers";

const EmployeeProfile: React.FC = () => {
  const { isAllowed: isEmployeeAllowed, isLoading: isAuthLoading } =
    useAuthGuard("employee");
  const navigate = useNavigate();
  const clerk = useClerk();
  const { logout, setUser } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfilePayload | null>(null);
  const [availableServices, setAvailableServices] = useState<ServiceApiItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profileResponse, servicesResponse] = await Promise.all([
        employeeAPI.getProfile(),
        servicesAPI.getAll(),
      ]);

      setProfile(profileResponse.data || null);
      setAvailableServices(servicesResponse.data || []);
    } catch (loadError: any) {
      setError(
        loadError?.error ||
          loadError?.message ||
          "Failed to load employee profile",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmployeeAllowed) return;
    void loadProfile();
  }, [isEmployeeAllowed]);

  const getEditableServices = (currentProfile: EmployeeProfilePayload) =>
    currentProfile.verification_status === "approved" &&
    (currentProfile.pending_assigned_services || []).length > 0
      ? currentProfile.pending_assigned_services || []
      : currentProfile.assigned_services || [];

  const saveProfile = async () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await Promise.all([
        authAPI.updateProfile({
          name: profile.name,
          phone: profile.phone,
          image: profile.image || undefined,
        }),
        employeeAPI.updateProfile({
          hourly_rate: Number(profile.hourly_rate || 0),
          document_url: profile.document_url || "",
          service_ids: getEditableServices(profile).map((service) => service.id),
        }),
        ...(profile.verification_status === "approved"
          ? [employeeAPI.updateAvailability(profile.is_available)]
          : []),
      ]);

      setUser({
        id: profile.user_id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: "employee",
        image: profile.image || undefined,
        createdAt: new Date(profile.created_at || new Date()),
      });

      setIsEditing(false);
      await loadProfile();
    } catch (saveError: any) {
      setError(
        saveError?.error ||
          saveError?.message ||
          "Failed to update employee profile",
      );
    } finally {
      setSaving(false);
    }
  };

  const requestApproval = async () => {
    if (!profile) {
      return;
    }

    setRequestingApproval(true);
    setError(null);

    try {
      await Promise.all([
        authAPI.updateProfile({
          name: profile.name,
          phone: profile.phone,
          image: profile.image || undefined,
        }),
        employeeAPI.updateProfile({
          hourly_rate: Number(profile.hourly_rate || 0),
          document_url: profile.document_url || "",
          service_ids: getEditableServices(profile).map((service) => service.id),
          request_approval: true,
        }),
      ]);

      setUser({
        id: profile.user_id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: "employee",
        image: profile.image || undefined,
        createdAt: new Date(profile.created_at || new Date()),
      });

      setIsEditing(false);
      await loadProfile();
    } catch (requestError: any) {
      setError(
        requestError?.error ||
          requestError?.message ||
          "Failed to request approval",
      );
    } finally {
      setRequestingApproval(false);
    }
  };

  const handleLogout = async () => {
    await clerk.signOut();
    logout();
    navigate("/login");
  };

  if (loading || !profile) {
    return (
      <div className="page-container">
        <div className="container-main flex-center min-h-[50vh]">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const canEditProfile =
    isEditing || profile.verification_status !== "approved";
  const editableServices = getEditableServices(profile);

  const selectedServiceIds = new Set(
    editableServices.map((service) => service.id),
  );

  const toggleServiceSelection = (service: ServiceApiItem) => {
    if (!canEditProfile) {
      return;
    }

    setProfile((current) => {
      if (!current) {
        return current;
      }

      const targetKey =
        current.verification_status === "approved" &&
        (current.pending_assigned_services || []).length > 0
          ? "pending_assigned_services"
          : "assigned_services";
      const assignedServices = current[targetKey] || [];
      const isSelected = assignedServices.some(
        (assignedService) => assignedService.id === service.id,
      );

      return {
        ...current,
        [targetKey]: isSelected
          ? assignedServices.filter(
              (assignedService) => assignedService.id !== service.id,
            )
          : [...assignedServices, { id: service.id, name: service.name }],
      };
    });
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
        <div className="mb-3xl">
          <h1 className="section-title mb-md">Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your employee details and submit them for admin approval.
          </p>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-lg">
          <div className="space-y-lg">
            <Card>
              <CardBody>
                <div className="flex-col-center mb-lg">
                  <Avatar
                    name={profile.name}
                    src={profile.image || undefined}
                    size="xl"
                    className="mb-md"
                  />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {profile.name}
                  </h3>
                  <div className="mt-sm">
                    <Badge
                      variant={
                        profile.verification_status === "approved"
                          ? profile.is_available
                            ? "success"
                            : "warning"
                          : "danger"
                      }
                    >
                      {profile.verification_status === "approved"
                        ? profile.is_available
                          ? "Available"
                          : "Offline"
                        : profile.verification_status}
                    </Badge>
                  </div>
                </div>
                <Divider />
                <div className="space-y-md text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-gray-50">
                      {profile.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-gray-900 dark:text-gray-50">
                      {profile.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Joined</p>
                    <p className="text-gray-900 dark:text-gray-50">
                      {formatDate(profile.created_at || new Date())}
                    </p>
                  </div>
                </div>
                <Divider />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg bg-red-50 px-md py-md text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                >
                  <div className="flex items-center justify-center gap-md">
                    <LogOut size={18} />
                    Logout
                  </div>
                </button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Performance" />
              <CardBody className="space-y-md text-sm">
                {/* <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">Rating</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {profile.rating}
                  </span>
                </div>
                <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">Reviews</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {profile.total_reviews}
                  </span>
                </div> */}
                <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Hourly Rate
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {formatCurrency(profile.hourly_rate || 0)}
                  </span>
                </div>
                <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Earnings
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {formatCurrency(profile.total_earnings || 0)}
                  </span>
                </div>
                <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Verification
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50 capitalize">
                    {profile.verification_status}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs
              tabs={[
                {
                  label: "Details",
                  content: (
                    <Card>
                      <CardHeader
                        title="Employee Details"
                        action={
                          profile.verification_status === "approved" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={saving}
                              icon={
                                isEditing ? (
                                  <Save size={16} />
                                ) : (
                                  <Edit2 size={16} />
                                )
                              }
                              onClick={() => {
                                if (isEditing) {
                                  void saveProfile();
                                } else {
                                  setIsEditing(true);
                                }
                              }}
                            >
                              {isEditing ? "Save" : "Edit"}
                            </Button>
                          ) : null
                        }
                      />
                      <CardBody className="space-y-lg">
                        <Input
                          label="Full Name"
                          value={profile.name}
                          onChange={(event) =>
                            setProfile((current) =>
                              current
                                ? { ...current, name: event.target.value }
                                : current,
                            )
                          }
                          disabled={!canEditProfile}
                        />
                        <Input label="Email" value={profile.email} readOnly />
                        <Input
                          label="Phone"
                          value={profile.phone}
                          onChange={(event) =>
                            setProfile((current) =>
                              current
                                ? { ...current, phone: event.target.value }
                                : current,
                            )
                          }
                          disabled={!canEditProfile}
                        />
                        <Input
                          label="Hourly Rate"
                          type="number"
                          value={String(profile.hourly_rate || 0)}
                          onChange={(event) =>
                            setProfile((current) =>
                              current
                                ? {
                                    ...current,
                                    hourly_rate: Number(event.target.value),
                                  }
                                : current,
                            )
                          }
                          disabled={!canEditProfile}
                        />
                        <Input
                          label="Document URL"
                          value={profile.document_url || ""}
                          onChange={(event) =>
                            setProfile((current) =>
                              current
                                ? {
                                    ...current,
                                    document_url: event.target.value,
                                  }
                                : current,
                            )
                          }
                          disabled={!canEditProfile}
                        />
                        <Input
                          label="Admin Review Notes"
                          value={profile.review_notes || ""}
                          readOnly
                        />
                        <Input
                          label="Approved Task Types"
                          value={(profile.assigned_services || [])
                            .map((service) => service.name)
                            .join(", ")}
                          readOnly
                          helperText="These services are live on your account right now."
                        />
                        <Input
                          label="Pending Approval Services"
                          value={(profile.pending_assigned_services || [])
                            .map((service) => service.name)
                            .join(", ")}
                          readOnly
                          helperText="Newly requested services stay here until admin approves them."
                        />
                        <div>
                          <label className="label-base">
                            Task Types You Can Do
                          </label>
                          <div className="grid gap-sm sm:grid-cols-2">
                            {availableServices.map((service) => {
                              const isSelected = selectedServiceIds.has(
                                service.id,
                              );
                              const isPending =
                                profile.verification_status === "approved" &&
                                (profile.pending_assigned_services || []).some(
                                  (pendingService) =>
                                    pendingService.id === service.id,
                                );

                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() =>
                                    toggleServiceSelection(service)
                                  }
                                  disabled={!canEditProfile}
                                  className={cn(
                                    "rounded-lg border px-md py-md text-left transition-colors",
                                    isSelected
                                      ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/40"
                                      : "border-gray-200 bg-white hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900",
                                    !canEditProfile &&
                                      "cursor-not-allowed opacity-70",
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-md">
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-gray-50">
                                        {service.name}
                                      </p>
                                      {service.category_name && (
                                        <p className="mt-xs text-sm text-gray-500 dark:text-gray-400">
                                          {service.category_name}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      variant={
                                        isPending
                                          ? "warning"
                                          : isSelected
                                            ? "success"
                                            : "secondary"
                                      }
                                      size="sm"
                                    >
                                      {isPending
                                        ? "Pending"
                                        : isSelected
                                          ? "Selected"
                                          : "Optional"}
                                    </Badge>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <label className="flex items-center gap-md text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={profile.is_available}
                            disabled={
                              !canEditProfile ||
                              profile.verification_status !== "approved"
                            }
                            onChange={(event) =>
                              setProfile((current) =>
                                current
                                  ? {
                                      ...current,
                                      is_available: event.target.checked,
                                    }
                                  : current,
                              )
                            }
                          />
                          Accept new assignments
                        </label>
                        {profile.verification_status !== "approved" && (
                          <div className="space-y-sm">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Admin approval is required before you can go
                              online and start services.
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Add your document URL and other details here, then
                              submit your profile for review.
                            </p>
                          </div>
                        )}
                        {profile.verification_status === "approved" &&
                          (profile.pending_assigned_services || []).length >
                            0 && (
                            <div className="space-y-sm rounded-lg border border-amber-200 bg-amber-50 p-md text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                              <p>
                                New service requests are waiting for admin
                                approval.
                              </p>
                              <p>
                                Your current approved services remain active
                                until admin reviews the pending ones.
                              </p>
                            </div>
                          )}
                        {isEditing &&
                          profile.verification_status === "approved" && (
                            <div className="flex gap-md">
                              <Button
                                variant="secondary"
                                fullWidth
                                onClick={() => {
                                  setIsEditing(false);
                                  void loadProfile();
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                fullWidth
                                loading={saving}
                                onClick={() => void saveProfile()}
                              >
                                Save Changes
                              </Button>
                            </div>
                          )}
                        {profile.verification_status !== "approved" && (
                          <Button
                            fullWidth
                            variant="secondary"
                            loading={saving}
                            onClick={() => void saveProfile()}
                          >
                            Save Details
                          </Button>
                        )}
                        {profile.verification_status !== "approved" && (
                          <Button
                            fullWidth
                            variant="primary"
                            loading={requestingApproval}
                            onClick={() => void requestApproval()}
                          >
                            Ask For Approval
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
