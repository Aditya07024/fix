import React, { useEffect, useState } from "react";
import { useClerk } from "@clerk/react";
import { Edit2, LogOut, MapPin, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, Badge, Divider } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Input, Select } from "@/components/Form";
import { Tabs } from "@/components/DataDisplay";
import { useAuthGuard } from "@/hooks";
import {
  clientAPI,
  ClientProfilePayload,
  PaymentMethodApiItem,
} from "@/services/api";
import { useAuth } from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/utils/helpers";

const emptyMethod = {
  type: "card" as "card" | "upi" | "wallet",
  label: "",
  provider: "",
  last_digits: "",
  upi_id: "",
  wallet_name: "",
  is_default: false,
};

const ProfilePage: React.FC = () => {
  const { isAllowed: isClientAllowed, isLoading: isAuthLoading } =
    useAuthGuard("client");
  const navigate = useNavigate();
  const clerk = useClerk();
  const { logout, setUser } = useAuth();
  const [profile, setProfile] = useState<ClientProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [methodForm, setMethodForm] = useState(emptyMethod);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await clientAPI.getProfile();
      const nextProfile = response.data || null;
      setProfile(nextProfile);
    } catch (loadError: any) {
      setError(
        loadError?.error || loadError?.message || "Failed to load profile",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isClientAllowed) return;
    void loadProfile();
  }, [isClientAllowed]);

  const updateField = (field: keyof ClientProfilePayload, value: string) => {
    setProfile((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  const updateAddressField = (field: string, value: string) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            address: {
              id: current.address?.id,
              line1: current.address?.line1 || "",
              line2: current.address?.line2 || "",
              city: current.address?.city || "",
              state: current.address?.state || "",
              postal_code: current.address?.postal_code || "",
              country: current.address?.country || "India",
              ...current.address,
              [field]: value,
            },
          }
        : current,
    );
  };

  const saveProfile = async () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await clientAPI.updateProfile({
        name: profile.name,
        phone: profile.phone,
        image: profile.image ?? undefined,
        address: profile.address
          ? {
              line1: profile.address.line1,
              line2: profile.address.line2 || "",
              city: profile.address.city,
              state: profile.address.state,
              postal_code: profile.address.postal_code,
              country: profile.address.country,
            }
          : undefined,
      });

      const updated = response.data || profile;
      setProfile((current) => (current ? { ...current, ...updated } : current));
      setUser({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        image: updated.image ?? undefined,
        createdAt: new Date(updated.created_at || new Date()),
      });
      setIsEditing(false);
    } catch (saveError: any) {
      setError(
        saveError?.error || saveError?.message || "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  };

  const addPaymentMethod = async () => {
    setError(null);

    try {
      const response = await clientAPI.createPaymentMethod(methodForm);
      const created = response.data;

      if (created) {
        setProfile((current) =>
          current
            ? {
                ...current,
                payment_methods: current.payment_methods
                  .map((method) => ({
                    ...method,
                    is_default: methodForm.is_default
                      ? false
                      : method.is_default,
                  }))
                  .concat(created),
              }
            : current,
        );
      }

      setMethodForm(emptyMethod);
      await loadProfile();
    } catch (methodError: any) {
      setError(
        methodError?.error ||
          methodError?.message ||
          "Failed to add payment method",
      );
    }
  };

  const setDefaultMethod = async (method: PaymentMethodApiItem) => {
    try {
      await clientAPI.setDefaultPaymentMethod(method.id);
      await loadProfile();
    } catch (methodError: any) {
      setError(
        methodError?.error ||
          methodError?.message ||
          "Failed to update payment method",
      );
    }
  };

  const deleteMethod = async (method: PaymentMethodApiItem) => {
    try {
      await clientAPI.deletePaymentMethod(method.id);
      await loadProfile();
    } catch (methodError: any) {
      setError(
        methodError?.error ||
          methodError?.message ||
          "Failed to delete payment method",
      );
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
          <h1 className="section-title mb-md">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Update your account, address, and payment methods.
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {profile.role}
                  </p>
                </div>

                <Divider />

                <div className="space-y-md text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-gray-50 break-all">
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
                    <p className="text-gray-500 dark:text-gray-400">Address</p>
                    <p className="text-gray-900 dark:text-gray-50">
                      {profile.address
                        ? [
                            profile.address.line1,
                            profile.address.line2,
                            profile.address.city,
                            profile.address.state,
                            profile.address.postal_code,
                            profile.address.country,
                          ]
                            .filter(Boolean)
                            .join(", ")
                        : "No default address saved"}
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
              <CardHeader title="Account Stats" />
              <CardBody className="space-y-md text-sm">
                <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Member Since
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-50">
                    {formatDate(profile.created_at || new Date())}
                  </span>
                </div>
                <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Bookings
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-50">
                    {profile.stats.total_bookings}
                  </span>
                </div>
                <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Completed
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-50">
                    {profile.stats.completed_bookings}
                  </span>
                </div>
                <div className="flex-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Amount Spent
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-50">
                    {formatCurrency(profile.stats.amount_spent)}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs
              tabs={[
                {
                  label: "Profile",
                  content: (
                    <Card>
                      <CardHeader
                        title="Personal Information"
                        action={
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={
                              isEditing ? (
                                <Save size={16} />
                              ) : (
                                <Edit2 size={16} />
                              )
                            }
                            loading={saving}
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
                        }
                      />
                      <CardBody className="space-y-lg">
                        <Input
                          label="Full Name"
                          value={profile.name}
                          onChange={(event) =>
                            updateField("name", event.target.value)
                          }
                          disabled={!isEditing}
                        />
                        <Input label="Email" value={profile.email} disabled />
                        <Input
                          label="Phone"
                          value={profile.phone}
                          onChange={(event) =>
                            updateField("phone", event.target.value)
                          }
                          disabled={!isEditing}
                        />
                        <Input
                          label="Address Line 1"
                          value={profile.address?.line1 || ""}
                          onChange={(event) =>
                            updateAddressField("line1", event.target.value)
                          }
                          disabled={!isEditing}
                        />
                        <Select
                          label="Address Line 2 (Colony)"
                          value={profile.address?.line2 || ""}
                          onChange={(event) =>
                            updateAddressField("line2", event.target.value)
                          }
                          disabled={!isEditing}
                          options={[
                            { value: "Vasundhara", label: "Vasundhara" },
                            { value: "Sagar Ratna", label: "Sagar Ratna" },
                            { value: "Keshav kunj", label: "Keshav kunj" },
                            {
                              value: "Nursing Village",
                              label: "Nursing Village",
                            },
                            { value: "Radha Puram", label: "Radha Puram" },
                          ]}
                          placeholder="Select a colony"
                        />
                        <div className="grid md:grid-cols-2 gap-lg">
                          <Input
                            label="City"
                            value={profile.address?.city || ""}
                            onChange={(event) =>
                              updateAddressField("city", event.target.value)
                            }
                            disabled={!isEditing}
                          />
                          <Input
                            label="State"
                            value={profile.address?.state || ""}
                            onChange={(event) =>
                              updateAddressField("state", event.target.value)
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-lg">
                          <Input
                            label="Postal Code"
                            value={profile.address?.postal_code || ""}
                            onChange={(event) =>
                              updateAddressField(
                                "postal_code",
                                event.target.value,
                              )
                            }
                            disabled={!isEditing}
                          />
                          <Input
                            label="Country"
                            value={profile.address?.country || "India"}
                            onChange={(event) =>
                              updateAddressField("country", event.target.value)
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        {isEditing && (
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
                      </CardBody>
                    </Card>
                  ),
                },
                {
                  label: `Payment Methods (${profile.payment_methods.length})`,
                  content: (
                    <div className="space-y-lg">
                      <Card>
                        <CardHeader title="Saved Payment Methods" />
                        <CardBody className="space-y-md">
                          {profile.payment_methods.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              No payment methods saved yet.
                            </p>
                          ) : (
                            profile.payment_methods.map((method) => (
                              <div
                                key={method.id}
                                className="flex flex-col md:flex-row md:items-center md:justify-between gap-md rounded-lg border border-gray-200 dark:border-gray-700 p-md"
                              >
                                <div>
                                  <div className="flex items-center gap-md mb-xs">
                                    <p className="font-medium text-gray-900 dark:text-gray-50">
                                      {method.label}
                                    </p>
                                    {method.is_default && (
                                      <Badge variant="success">Default</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {method.type === "card"
                                      ? `${method.provider || "Card"} •••• ${method.last_digits || ""}`
                                      : method.type === "upi"
                                        ? method.upi_id
                                        : method.wallet_name || method.provider}
                                  </p>
                                </div>
                                <div className="flex gap-md">
                                  {!method.is_default && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        void setDefaultMethod(method)
                                      }
                                    >
                                      Set Default
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={<Trash2 size={16} />}
                                    onClick={() => void deleteMethod(method)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </CardBody>
                      </Card>

                      <Card>
                        <CardHeader title="Add Payment Method" />
                        <CardBody className="space-y-lg">
                          <Select
                            label="Type"
                            options={[
                              { value: "card", label: "Card" },
                              { value: "upi", label: "UPI" },
                              { value: "wallet", label: "Wallet" },
                            ]}
                            value={methodForm.type}
                            onChange={(event) =>
                              setMethodForm((current) => ({
                                ...current,
                                type: event.target.value as
                                  | "card"
                                  | "upi"
                                  | "wallet",
                              }))
                            }
                          />
                          <Input
                            label="Label"
                            value={methodForm.label}
                            onChange={(event) =>
                              setMethodForm((current) => ({
                                ...current,
                                label: event.target.value,
                              }))
                            }
                            placeholder="Primary card or personal UPI"
                          />
                          {methodForm.type === "card" && (
                            <div className="grid md:grid-cols-2 gap-lg">
                              <Input
                                label="Provider"
                                value={methodForm.provider}
                                onChange={(event) =>
                                  setMethodForm((current) => ({
                                    ...current,
                                    provider: event.target.value,
                                  }))
                                }
                                placeholder="Visa / Mastercard"
                              />
                              <Input
                                label="Last 4 Digits"
                                value={methodForm.last_digits}
                                onChange={(event) =>
                                  setMethodForm((current) => ({
                                    ...current,
                                    last_digits: event.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 4),
                                  }))
                                }
                                placeholder="1234"
                              />
                            </div>
                          )}
                          {methodForm.type === "upi" && (
                            <Input
                              label="UPI ID"
                              value={methodForm.upi_id}
                              onChange={(event) =>
                                setMethodForm((current) => ({
                                  ...current,
                                  upi_id: event.target.value,
                                }))
                              }
                              placeholder="name@upi"
                            />
                          )}
                          {methodForm.type === "wallet" && (
                            <Input
                              label="Wallet Name"
                              value={methodForm.wallet_name}
                              onChange={(event) =>
                                setMethodForm((current) => ({
                                  ...current,
                                  wallet_name: event.target.value,
                                }))
                              }
                              placeholder="PhonePe / Paytm"
                            />
                          )}
                          <label className="flex items-center gap-md text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={methodForm.is_default}
                              onChange={(event) =>
                                setMethodForm((current) => ({
                                  ...current,
                                  is_default: event.target.checked,
                                }))
                              }
                            />
                            Make this the default payment method
                          </label>
                          <Button
                            onClick={() => void addPaymentMethod()}
                            disabled={
                              !methodForm.label ||
                              (methodForm.type === "card" &&
                                methodForm.last_digits.length !== 4) ||
                              (methodForm.type === "upi" &&
                                !methodForm.upi_id) ||
                              (methodForm.type === "wallet" &&
                                !methodForm.wallet_name)
                            }
                          >
                            Add Payment Method
                          </Button>
                        </CardBody>
                      </Card>
                    </div>
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

export default ProfilePage;
