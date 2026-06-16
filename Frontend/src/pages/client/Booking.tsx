import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/Card";
import { Checkbox, Input, Select, TextArea } from "@/components/Form";
import { Badge, Divider } from "@/components/Badge";
import { PaymentModal, TimePickerWheel } from "@/components";
import { useAuthGuard } from "@/hooks";
import {
  AddressApiItem,
  BookingCreatePayload,
  bookingsAPI,
  clientAPI,
  PaymentMethodApiItem,
  ServiceApiItem,
  ServiceEmployeeApiItem,
  servicesAPI,
} from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/helpers";

const BOOKING_PAGE_CACHE_KEY = "booking_page_cache_v1";
const BOOKING_PAGE_CACHE_TTL = 5 * 60 * 1000;
const IMMEDIATE_PAYMENT_TIMING = "at_booking";

const emptyAddress: AddressApiItem = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
};

const buildOneHourTimeSlot = (startTime: string) => {
  const [hours, minutes] = startTime.split(":").map(Number);
  return {
    start_time: startTime,
    end_time: `${String(hours + 1).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
};

type BookingPageCache = {
  timestamp: number;
  services: ServiceApiItem[];
  paymentMethods: PaymentMethodApiItem[];
  addressAreas: any[];
  profileAddress: AddressApiItem | null;
};

type ClientCustomField = {
  id: string;
  label: string;
  type: "text" | "textarea";
  value: string;
};

const SERVICE_PAYMENT_METHOD_FIELD_KEY = "payment_method";

const readBookingPageCache = (): BookingPageCache | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawCache = sessionStorage.getItem(BOOKING_PAGE_CACHE_KEY);

    if (!rawCache) {
      return null;
    }

    const parsedCache = JSON.parse(rawCache) as BookingPageCache;
    const isExpired =
      Date.now() - parsedCache.timestamp > BOOKING_PAGE_CACHE_TTL;

    if (isExpired) {
      sessionStorage.removeItem(BOOKING_PAGE_CACHE_KEY);
      return null;
    }

    return parsedCache;
  } catch (error) {
    console.warn("Failed to read booking page cache:", error);
    sessionStorage.removeItem(BOOKING_PAGE_CACHE_KEY);
    return null;
  }
};

const writeBookingPageCache = (cache: Omit<BookingPageCache, "timestamp">) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(
      BOOKING_PAGE_CACHE_KEY,
      JSON.stringify({
        ...cache,
        timestamp: Date.now(),
      } satisfies BookingPageCache),
    );
  } catch (error) {
    console.warn("Failed to write booking page cache:", error);
  }
};

const mergeBookingPageCache = (
  partialCache: Partial<Omit<BookingPageCache, "timestamp">>,
) => {
  const existingCache = readBookingPageCache();

  writeBookingPageCache({
    services: partialCache.services ?? existingCache?.services ?? [],
    paymentMethods:
      partialCache.paymentMethods ?? existingCache?.paymentMethods ?? [],
    addressAreas: partialCache.addressAreas ?? existingCache?.addressAreas ?? [],
    profileAddress:
      partialCache.profileAddress ?? existingCache?.profileAddress ?? null,
  });
};

const BookingPage: React.FC = () => {
  const {
    isAllowed: isBookingAllowed,
    isLoading: isAuthLoading,
    role,
  } = useAuthGuard({ role: ["client", "admin"] });
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const initialServiceId =
    (location.state as { serviceId?: string } | null)?.serviceId || "";
  const cachedPageData = useMemo(() => readBookingPageCache(), []);

  const [step, setStep] = useState(1);
  const [services, setServices] = useState<ServiceApiItem[]>(
    () => cachedPageData?.services || [],
  );
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const [adminClientName, setAdminClientName] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [employees, setEmployees] = useState<ServiceEmployeeApiItem[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<
    Array<{ start_time: string; end_time: string; is_booked: boolean }>
  >([]);
  const [address, setAddress] = useState<AddressApiItem>(
    () => cachedPageData?.profileAddress || emptyAddress,
  );
  const [saveAddress, setSaveAddress] = useState(false);
  const [notes, setNotes] = useState("");
  const [customFields, setCustomFields] = useState<ClientCustomField[]>([]);
  const [addressAreas, setAddressAreas] = useState<any[]>(
    () => cachedPageData?.addressAreas || [],
  );
  const [citiesSet, setCitiesSet] = useState(
    () => new Set<string>((cachedPageData?.addressAreas || []).map((area: any) => area.city)),
  );
  const [statesSet, setStatesSet] = useState(
    () => new Set<string>((cachedPageData?.addressAreas || []).map((area: any) => area.state)),
  );

  // Load default address from profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileResponse = await clientAPI.getProfile();
        const defaultAddress = profileResponse.data?.address;
        if (defaultAddress) {
          const nextAddress = {
            line1: defaultAddress.line1,
            line2: defaultAddress.line2 || "",
            city: defaultAddress.city,
            state: defaultAddress.state,
            postal_code: defaultAddress.postal_code,
            country: defaultAddress.country,
          };

          setAddress(nextAddress);
          mergeBookingPageCache({
            profileAddress: nextAddress,
          });
        }
      } catch (err) {
        console.warn("Failed to load default address:", err);
      }
    };

    if (step === 3 && !isAdmin) {
      void loadProfile();
    }
  }, [step, isAdmin]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodApiItem[]>(
    () => cachedPageData?.paymentMethods || [],
  );
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [selectedServicePaymentMode, setSelectedServicePaymentMode] =
    useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(
    () => !(cachedPageData?.services?.length || cachedPageData?.paymentMethods?.length),
  );
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [paymentTiming, setPaymentTiming] = useState<
    "at_booking" | "after_service" | null
  >(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingDataForPayment, setBookingDataForPayment] = useState<{
    bookingPayload: BookingCreatePayload;
    total_price: number;
  } | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) || null,
    [services, selectedServiceId],
  );

  const servicePaymentMethodField = useMemo(
    () =>
      selectedService?.customer_choice_fields?.find(
        (field) => field.key === SERVICE_PAYMENT_METHOD_FIELD_KEY,
      ) || null,
    [selectedService],
  );

  const filteredAddressAreas = useMemo(() => {
    if (!address.city) {
      return [];
    }

    return addressAreas.filter(
      (area: any) =>
        String(area.city || "").trim().toLowerCase() ===
        address.city.trim().toLowerCase(),
    );
  }, [address.city, addressAreas]);

  const loadInitialData = async () => {
    if (!cachedPageData) {
      setLoading(true);
    }
    setError(null);
    try {
      const requests: Promise<any>[] = [
        servicesAPI.getAll(),
        servicesAPI.getAddressAreas(true),
      ];

      if (!isAdmin) {
        requests.splice(1, 0, clientAPI.getPaymentMethods());
      }

      const responses = await Promise.all(requests);
      const servicesResponse = responses[0];
      const paymentMethodsResponse = isAdmin ? { data: [] } : responses[1];
      const addressAreasResponse = isAdmin ? responses[1] : responses[2];

      const nextServices = servicesResponse.data || [];
      const nextPaymentMethods = paymentMethodsResponse.data || [];
      const nextAddressAreas = addressAreasResponse.data || [];
      const nextCities = new Set<string>(
        nextAddressAreas.map((area: any) => area.city),
      );
      const nextStates = new Set<string>(
        nextAddressAreas.map((area: any) => area.state),
      );

      setServices(nextServices);
      setPaymentMethods(nextPaymentMethods);
      setAddressAreas(nextAddressAreas);
      setCitiesSet(nextCities);
      setStatesSet(nextStates);

      mergeBookingPageCache({
        services: nextServices,
        paymentMethods: nextPaymentMethods,
        addressAreas: nextAddressAreas,
      });
    } catch (err: any) {
      if (!cachedPageData) {
        setError(err?.error || err?.message || "Failed to load booking data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isBookingAllowed) return;
    void loadInitialData();
  }, [cachedPageData, isBookingAllowed, isAdmin]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedServiceId || !selectedDate) {
        setSlots([]);
        setSelectedSlot("");
        return;
      }

      // No need to load slots - just clear and allow manual selection
      setSlots([]);
      setSelectedSlot("");
    };

    void loadSlots();
  }, [selectedDate, selectedServiceId]);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!isAdmin || !selectedServiceId || !selectedDate) {
        setEmployees([]);
        setSelectedEmployeeId("");
        return;
      }

      setLoadingEmployees(true);

      try {
        const response = await servicesAPI.getEmployees(
          selectedServiceId,
          selectedDate,
        );
        const nextEmployees = response.data || [];
        setEmployees(nextEmployees);
        setSelectedEmployeeId((current) =>
          nextEmployees.some((employee) => employee.id === current)
            ? current
            : "",
        );
      } catch (loadError: any) {
        setEmployees([]);
        setSelectedEmployeeId("");
        setError(
          loadError?.error ||
            loadError?.message ||
            "Failed to load available employees",
        );
      } finally {
        setLoadingEmployees(false);
      }
    };

    void loadEmployees();
  }, [isAdmin, selectedDate, selectedServiceId]);

  useEffect(() => {
    setSelectedServicePaymentMode("");
  }, [selectedServiceId]);

  const selectedPaymentMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ||
    null;

  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot) {
      setError("Please select a service and time");
      return;
    }

    if (!address.line1 || address.line1.length < 3) {
      setError("Address line 1 is required (minimum 3 characters)");
      return;
    }

    if (!address.city || address.city.length < 2) {
      setError("City is required (minimum 2 characters)");
      return;
    }

    if (!address.state || address.state.length < 2) {
      setError("State is required (minimum 2 characters)");
      return;
    }

    if (!address.postal_code || address.postal_code.length < 3) {
      setError("Postal code is required (minimum 3 characters)");
      return;
    }

    const normalizedCustomFields = customFields
      .map((field) => ({
        label: field.label.trim(),
        value: field.value.trim(),
      }))
      .filter((field) => field.label || field.value);

    const hasIncompleteCustomField = normalizedCustomFields.some(
      (field) => !field.label || !field.value,
    );

    if (hasIncompleteCustomField) {
      setError("Each custom detail must have both a label and a value");
      return;
    }

    const customerChoices = Object.fromEntries(
      normalizedCustomFields.map((field) => [field.label, field.value]),
    );

    if (servicePaymentMethodField?.required && !selectedServicePaymentMode) {
      setError("Please select a payment method");
      return;
    }

    if (servicePaymentMethodField && selectedServicePaymentMode) {
      customerChoices[servicePaymentMethodField.key] =
        selectedServicePaymentMode;
    }

    if (isAdmin && !selectedEmployeeId) {
      setError("Please select an employee for this booking");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const timeSlot = buildOneHourTimeSlot(selectedSlot);
      const bookingPayload: BookingCreatePayload = {
        service_id: selectedService.id,
        employee_id: isAdmin ? selectedEmployeeId : undefined,
        client_name: isAdmin ? adminClientName.trim() || undefined : undefined,
        booking_date: selectedDate,
        selected_time: selectedSlot,
        time_slot: timeSlot,
        address,
        save_address: saveAddress,
        notes: notes.trim() || undefined,
        customer_choices: customerChoices,
      };

      console.log("Submitting booking:", {
        ...bookingPayload,
      });

      const paymentTimingValue = isAdmin
        ? "after_service"
        : selectedService.payment_timing || IMMEDIATE_PAYMENT_TIMING;
      setPaymentTiming(paymentTimingValue);

      if (!isAdmin && paymentTimingValue === "at_booking") {
        setBookingDataForPayment({
          bookingPayload,
          total_price: selectedService.price,
        });
        setShowPaymentModal(true);
      } else {
        const response = await bookingsAPI.create(bookingPayload);
        const bookingId = response.data?.id || "created";
        setSuccessId(bookingId);
      }
    } catch (submitError: any) {
      const errorMsg =
        submitError?.error ||
        submitError?.message ||
        "Failed to create booking";
      console.error("Booking submission error:", { submitError, errorMsg });
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (result?: { bookingId?: string }) => {
    setShowPaymentModal(false);
    if (result?.bookingId) {
      setSuccessId(result.bookingId);
    }
    setTimeout(() => {
      navigate(isAdmin ? "/admin/bookings" : "/client/history");
    }, 1500);
  };

  const handlePaymentFailed = () => {
    setError(
      "Payment failed. Please try again or use a different payment method.",
    );
  };

  const addCustomField = () => {
    setCustomFields((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: "",
        type: "text",
        value: "",
      },
    ]);
  };

  const updateCustomField = (
    id: string,
    updates: Partial<ClientCustomField>,
  ) => {
    setCustomFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, ...updates } : field,
      ),
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields((current) => current.filter((field) => field.id !== id));
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="container-main flex-center min-h-[50vh]">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Payment Modal Screen
  if (showPaymentModal && paymentTiming === "at_booking" && bookingDataForPayment) {
    return (
      <>
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            navigate(isAdmin ? "/admin/bookings" : "/client/history");
          }}
          amount={bookingDataForPayment.total_price}
          bookingPayload={bookingDataForPayment.bookingPayload}
          bookingDetails={{
            service_name: selectedService?.name,
            booking_date: selectedDate,
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailed={handlePaymentFailed}
        />
        <div className="page-container">
          <div className="container-main max-w-3xl">
            <Card>
              <CardBody className="text-center py-3xl">
                <CheckCircle2
                  size={56}
                  className="mx-auto text-green-500 mb-lg"
                />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-md">
                  Booking created!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-lg">
                  Complete the payment to confirm your booking
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Success screen for after-service payments
  if (successId && isAdmin) {
    return (
      <div className="page-container">
        <div className="container-main max-w-3xl">
          <Card>
            <CardBody className="text-center py-3xl">
              <CheckCircle2
                size={56}
                className="mx-auto text-green-500 mb-lg"
              />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-md">
                Booking created
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-md">
                The booking was created by admin without collecting payment.
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-lg">
                Booking ID: {successId}
              </p>
              <div className="flex gap-md justify-center">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/admin/bookings")}
                >
                  View Bookings
                </Button>
                <Button onClick={() => navigate("/admin/create-booking")}>
                  Create Another
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Success screen for after-service payments
  if (successId && paymentTiming === "after_service") {
    return (
      <div className="page-container">
        <div className="container-main max-w-3xl">
          <Card>
            <CardBody className="text-center py-3xl">
              <CheckCircle2
                size={56}
                className="mx-auto text-green-500 mb-lg"
              />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-md">
                Booking confirmed!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-md">
                Your booking has been confirmed. Payment will be required after
                the service is completed.
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-lg">
                Booking ID: {successId}
              </p>
              <div className="flex gap-md justify-center">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/client/history")}
                >
                  View History
                </Button>
                <Button onClick={() => navigate("/client/services")}>
                  Book Another Service
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (successId) {
    return (
      <div className="page-container">
        <div className="container-main max-w-3xl">
          <Card>
            <CardBody className="text-center py-3xl">
              <CheckCircle2
                size={56}
                className="mx-auto text-green-500 mb-lg"
              />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-md">
                Booking created
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-lg">
                Your booking has been saved. Booking ID: {successId}
              </p>
              <div className="flex gap-md justify-center">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/client/history")}
                >
                  View History
                </Button>
                <Button onClick={() => navigate("/client/services")}>
                  Book Another Service
                </Button>
              </div>
            </CardBody>
          </Card>
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
  if (!isBookingAllowed) {
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
            <div>
              <h1 className="section-title mb-md">Book a Service</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isAdmin
                  ? "Create a booking directly without collecting payment."
                  : "Select a service, pick a slot, and confirm your address. Available employees will respond to your booking."}
              </p>
            </div>
            <Button
              icon={
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
              }
              onClick={() => void loadInitialData()}
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

        <div className="grid lg:grid-cols-3 gap-lg">
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card>
                <CardHeader
                  title="Select service and date"
                  icon={<Calendar size={22} />}
                />
                <CardBody className="space-y-lg">
                  <Select
                    label="Service"
                    options={services.map((service) => ({
                      value: service.id,
                      label: `${service.name} • ${formatCurrency(service.price)}`,
                    }))}
                    value={selectedServiceId}
                    onChange={(event) => {
                      setSelectedServiceId(event.target.value);
                      setSelectedEmployeeId("");
                      setSelectedSlot("");
                    }}
                    placeholder="Choose a service"
                  />

                  <Input
                    label="Booking Date"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setSelectedSlot("");
                    }}
                    min={new Date().toISOString().split("T")[0]}
                  />

                  {isAdmin && (
                    <Input
                      label="Client Name"
                      value={adminClientName}
                      onChange={(event) => setAdminClientName(event.target.value)}
                      placeholder="Enter the client's name"
                    />
                  )}

                  {isAdmin && selectedServiceId && selectedDate && (
                    <Select
                      label="Assign Employee"
                      options={employees.map((employee) => ({
                        value: employee.id,
                        label: `${employee.name} • ${employee.bookings_on_date} booking(s) on this date`,
                      }))}
                      value={selectedEmployeeId}
                      onChange={(event) =>
                        setSelectedEmployeeId(event.target.value)
                      }
                      placeholder={
                        loadingEmployees
                          ? "Loading employees..."
                          : employees.length > 0
                            ? "Choose an employee"
                            : "No employees available"
                      }
                      disabled={loadingEmployees || employees.length === 0}
                    />
                  )}

                  {selectedService && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-md text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
                      {selectedService.name} • {selectedService.duration} mins •{" "}
                      {formatCurrency(selectedService.price)} •{" "}
                      {isAdmin
                        ? "Admin booking without payment"
                        : "Pay at booking"}
                    </div>
                  )}
                </CardBody>
                <CardFooter>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(isAdmin ? "/admin/bookings" : "/client/services")
                    }
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={
                      !selectedServiceId ||
                      !selectedDate ||
                      (isAdmin && !selectedEmployeeId)
                    }
                  >
                    Continue
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader title="Select time" icon={<Clock size={22} />} />
                <CardBody className="space-y-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-lg">
                    {selectedService?.name} on {formatDate(selectedDate)}
                  </p>

                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    ℹ️ Select your preferred time. The employee will arrive
                    within 1 hour of your selected time.
                  </p>

                  <div className="flex justify-center">
                    <TimePickerWheel
                      value={selectedSlot || "09:00"}
                      onChange={setSelectedSlot}
                    />
                  </div>
                </CardBody>
                <CardFooter>
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!selectedSlot}>
                    Continue
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader
                  title="Confirm address"
                  icon={<MapPin size={22} />}
                />
                <CardBody className="space-y-lg">
                  <div className="grid md:grid-cols-2 gap-lg">
                    <Select
                      label="City *"
                      value={address.city}
                      onChange={(event) => {
                        const nextCity = event.target.value;
                        const matchingArea = addressAreas.find(
                          (area: any) =>
                            String(area.city || "").trim().toLowerCase() ===
                            nextCity.trim().toLowerCase(),
                        );

                        setAddress((current) => ({
                          ...current,
                          city: nextCity,
                          line2:
                            current.city === nextCity ? current.line2 : "",
                          state:
                            matchingArea?.state && !current.state
                              ? matchingArea.state
                              : current.state,
                        }));
                      }}
                      options={Array.from(citiesSet).map((city) => ({
                        value: city,
                        label: city,
                      }))}
                      placeholder="Select city"
                    />
                    <Select
                      label="State *"
                      value={address.state}
                      onChange={(event) =>
                        setAddress({ ...address, state: event.target.value })
                      }
                      options={Array.from(statesSet).map((state) => ({
                        value: state,
                        label: state,
                      }))}
                      placeholder="Select state"
                    />
                  </div>
                  <Input
                    label="Address Line 1 *"
                    value={address.line1}
                    onChange={(event) =>
                      setAddress({ ...address, line1: event.target.value })
                    }
                    placeholder="Enter street address"
                  />
                  <Select
                    label="Address Line 2 (Colony/Area) *"
                    value={address.line2 || ""}
                    onChange={(event) =>
                      setAddress({ ...address, line2: event.target.value })
                    }
                    options={filteredAddressAreas.map((area: any) => ({
                      value: area.name,
                      label: area.line2
                        ? `${area.name} (${area.line2})`
                        : area.name,
                    }))}
                    placeholder={
                      address.city
                        ? "Select a colony/area"
                        : "Select city first"
                    }
                    disabled={!address.city}
                  />
                  <div className="grid md:grid-cols-2 gap-lg">
                    <Input
                      label="Postal Code *"
                      value={address.postal_code}
                      onChange={(event) =>
                        setAddress({
                          ...address,
                          postal_code: event.target.value,
                        })
                      }
                      placeholder="Enter postal code"
                    />
                    <Input
                      label="Country"
                      value={address.country}
                      onChange={(event) =>
                        setAddress({ ...address, country: event.target.value })
                      }
                      placeholder="India"
                    />
                  </div>
                  <TextArea
                    label="Notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Any special instructions for the employee"
                  />
                  {servicePaymentMethodField && (
                    <Select
                      label={`${servicePaymentMethodField.label} *`}
                      value={selectedServicePaymentMode}
                      onChange={(event) =>
                        setSelectedServicePaymentMode(event.target.value)
                      }
                      options={(servicePaymentMethodField.options || []).map(
                        (option) => ({
                          value: option,
                          label: option.toUpperCase(),
                        }),
                      )}
                      placeholder="Select payment method"
                    />
                  )}
                  <div className="space-y-md rounded-xl border border-dashed border-gray-300 p-md dark:border-gray-700">
                    <div className="flex items-center justify-between gap-md">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-50">
                          Custom details
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Add any extra fields you want to include with this
                          booking.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={<Plus size={16} />}
                        onClick={addCustomField}
                      >
                        Add Field
                      </Button>
                    </div>

                    {customFields.length > 0 && (
                      <div className="space-y-md">
                        {customFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="rounded-lg border border-gray-200 p-md dark:border-gray-800"
                          >
                            <div className="grid gap-md md:grid-cols-[1.4fr_1fr_auto]">
                              <Input
                                label={`Field Label ${index + 1}`}
                                value={field.label}
                                onChange={(event) =>
                                  updateCustomField(field.id, {
                                    label: event.target.value,
                                  })
                                }
                                placeholder="Example: Gate code"
                              />
                              <Select
                                label="Input Type"
                                value={field.type}
                                onChange={(event) =>
                                  updateCustomField(field.id, {
                                    type: event.target.value as
                                      | "text"
                                      | "textarea",
                                  })
                                }
                                options={[
                                  { value: "text", label: "Text" },
                                  { value: "textarea", label: "Textarea" },
                                ]}
                              />
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  icon={<Trash2 size={16} />}
                                  onClick={() => removeCustomField(field.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>

                            <div className="mt-md">
                              {field.type === "textarea" ? (
                                <TextArea
                                  label="Field Value"
                                  value={field.value}
                                  onChange={(event) =>
                                    updateCustomField(field.id, {
                                      value: event.target.value,
                                    })
                                  }
                                  placeholder="Enter the detail you want to share"
                                  rows={3}
                                />
                              ) : (
                                <Input
                                  label="Field Value"
                                  value={field.value}
                                  onChange={(event) =>
                                    updateCustomField(field.id, {
                                      value: event.target.value,
                                    })
                                  }
                                  placeholder="Enter the detail you want to share"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Checkbox
                    label="Save this address as default"
                    checked={saveAddress}
                    onChange={(event) => setSaveAddress(event.target.checked)}
                  />
                </CardBody>
                <CardFooter>
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={
                      !address.line1 ||
                      !address.city ||
                      !address.state ||
                      !address.postal_code ||
                      !address.country
                    }
                  >
                    Confirm Booking
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader title="Booking Summary" />
              <CardBody className="space-y-lg">
                {selectedService ? (
                  <>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-50">
                        {selectedService.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedService.category_name || "Service"}
                      </p>
                    </div>
                    <Divider />
                    <div className="space-y-sm text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex-between">
                        <span>Date</span>
                        <span>
                          {selectedDate ? formatDate(selectedDate) : "-"}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span>Slot</span>
                        <span>
                          {selectedSlot
                            ? `${selectedSlot}${
                                slots.find(
                                  (slot) => slot.start_time === selectedSlot,
                                )?.end_time || ""
                              }`
                            : ""}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span>Duration</span>
                        <span>{selectedService.duration} mins</span>
                      </div>
                      <div className="flex-between">
                        <span>Client</span>
                        <span>
                          {isAdmin
                            ? adminClientName.trim() || "Not entered"
                            : "Your account"}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span>Employee</span>
                        <span>
                          {isAdmin
                            ? employees.find(
                                (employee) => employee.id === selectedEmployeeId,
                              )?.name || "Not selected"
                            : "Will be assigned"}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span>Payment Method</span>
                        <span>
                          {selectedServicePaymentMode ||
                            selectedPaymentMethod?.label ||
                            "Not selected"}
                        </span>
                      </div>
                      <div className="flex-between">
                        <span>Payment Timing</span>
                        <span>
                          {isAdmin ? "After service" : "At booking"}
                        </span>
                      </div>
                    </div>
                    {paymentMethods.length > 0 && (
                      <Select
                        label="Payment Method"
                        options={paymentMethods.map((method) => ({
                          value: method.id,
                          label: method.label,
                        }))}
                        value={selectedPaymentMethodId}
                        onChange={(event) =>
                          setSelectedPaymentMethodId(event.target.value)
                        }
                      />
                    )}
                    <Divider />
                    <div className="flex-between">
                      <span className="font-medium text-gray-900 dark:text-gray-50">
                        Total
                      </span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                        {formatCurrency(selectedService.price)}
                      </span>
                    </div>
                    <Badge variant="info">
                      {isAdmin
                        ? adminClientName.trim()
                          ? `Booking will be saved for ${adminClientName.trim()}.`
                          : "Employee assignment is required for admin bookings."
                        : "Payment required at booking."}
                    </Badge>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a service to start the booking.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
