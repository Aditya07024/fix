import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/Badge";
import { Input } from "@/components/Form";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import {
  authAPI,
  employeeAPI,
  EmployeeProfilePayload,
  ServiceApiItem,
  servicesAPI,
} from "@/services/api";
import { useAuth } from "@/stores/authStore";
import { cn } from "@/utils/helpers";

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [hourlyRate, setHourlyRate] = useState("");
  const [selectedServices, setSelectedServices] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableServices, setAvailableServices] = useState<ServiceApiItem[]>(
    [],
  );
  const [initializing, setInitializing] = useState(user?.role === "employee");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEmployee = user?.role === "employee";

  useEffect(() => {
    if (!isEmployee) {
      setInitializing(false);
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        const [profileResponse, servicesResponse] = await Promise.all([
          employeeAPI.getProfile(),
          servicesAPI.getAll(),
        ]);

        if (!mounted) {
          return;
        }

        const profile = profileResponse.data as EmployeeProfilePayload | undefined;
        setHourlyRate(
          profile?.hourly_rate ? String(Number(profile.hourly_rate)) : "",
        );
        setSelectedServices(profile?.assigned_services || []);
        setAvailableServices(servicesResponse.data || []);
      } catch (loadError: any) {
        if (!mounted) {
          return;
        }

        setError(
          loadError?.error ||
            loadError?.message ||
            "Failed to load employee onboarding details",
        );
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isEmployee]);

  const selectedServiceIds = useMemo(
    () => new Set(selectedServices.map((service) => service.id)),
    [selectedServices],
  );

  const toggleServiceSelection = (service: ServiceApiItem) => {
    setSelectedServices((current) => {
      const exists = current.some(
        (selectedService) => selectedService.id === service.id,
      );

      if (exists) {
        return current.filter(
          (selectedService) => selectedService.id !== service.id,
        );
      }

      return [...current, { id: service.id, name: service.name }];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Phone must be 10 digits and start with 6-9.");
      return;
    }

    if (isEmployee) {
      const parsedHourlyRate = Number(hourlyRate);

      if (!hourlyRate.trim() || !Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
        setError("Hourly rate must be a positive number.");
        return;
      }

      if (selectedServices.length === 0) {
        setError("Select at least one task type.");
        return;
      }
    }

    setSaving(true);

    try {
      const [response] = await Promise.all([
        authAPI.updateProfile({
          name: name.trim(),
          phone,
        }),
        ...(isEmployee
          ? [
              employeeAPI.updateProfile({
                hourly_rate: Number(hourlyRate),
                service_ids: selectedServices.map((service) => service.id),
              }),
            ]
          : []),
      ]);

      const updated = response.data;

      if (!updated) {
        throw new Error("Profile update failed");
      }

      setUser({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        image: updated.image ?? undefined,
        needsOnboarding: false,
        createdAt: new Date(updated.created_at || new Date()),
      });

      navigate(`/${updated.role}`, { replace: true });
    } catch (saveError: any) {
      setError(saveError?.error || saveError?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-md py-lg">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-md border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Preparing your account setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-md py-lg">
      <Card className="w-full max-w-2xl">
        <div className="p-lg">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-sm">
            Complete your account
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-lg">
            Add the remaining TotalFix27x7 profile details before entering the dashboard.
          </p>

          {error && (
            <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-lg">
            <Input
              label="Full Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(event) => {
                const cleaned = event.target.value.replace(/\D/g, "").slice(0, 10);

                // Reject numbers starting with 1–5
                if (cleaned.length > 0 && /^[1-5]/.test(cleaned)) {
                  return;
                }

                setPhone(cleaned);
              }}
              placeholder="Write 10 digit phone number without country code"
              required
            />
            {isEmployee && (
              <>
                <Input
                  label="Hourly Rate"
                  type="number"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(event.target.value)}
                  placeholder="500"
                  required
                />
                <div>
                  <label className="label-base">Assigned Services</label>
                  <p className="mb-sm text-sm text-gray-600 dark:text-gray-400">
                    Choose the task types you want to handle as an employee.
                  </p>
                  <div className="grid gap-sm sm:grid-cols-2">
                    {availableServices.map((service) => {
                      const isSelected = selectedServiceIds.has(service.id);

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleServiceSelection(service)}
                          className={cn(
                            "rounded-lg border px-md py-md text-left transition-colors",
                            isSelected
                              ? "border-primary-500 dark:border-primary-400 dark:bg-primary-950/40"
                              : "border-gray-200 bg-white hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900",
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
                            <Badge variant={isSelected ? "success" : "secondary"} size="sm">
                              {isSelected ? "Selected" : "Optional"}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            <Button type="submit" variant="primary" fullWidth loading={saving}>
              Save And Continue
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingPage;
