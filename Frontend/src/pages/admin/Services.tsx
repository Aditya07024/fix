import React, { useEffect, useMemo, useState } from "react";
import { Eye, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { Input, Select } from "@/components/Form";
import { Modal } from "@/components/Modal";
import { Pagination, Table } from "@/components/DataDisplay";
import {
  ServiceApiItem,
  ServiceCategoryApiItem,
  servicesAPI,
} from "@/services/api";
import { useAuthGuard } from "@/hooks";
import { formatCurrency } from "@/utils/helpers";

const PAYMENT_MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "online", label: "Online" },
] as const;

const PAYMENT_MODE_FIELD_KEY = "payment_method";
const PAYMENT_MODE_FIELD_LABEL = "Preferred Payment Mode";
const SERVICES_PER_PAGE = 10;

const getServicePaymentModes = (service?: ServiceApiItem | null) => {
  const field = service?.customer_choice_fields?.find(
    (item) => item.key === PAYMENT_MODE_FIELD_KEY,
  );

  return Array.isArray(field?.options)
    ? field.options.filter(Boolean)
    : [];
};

const buildPaymentChoiceFields = (selectedModes: string[]) =>
  selectedModes.length > 0
    ? [
        {
          key: PAYMENT_MODE_FIELD_KEY,
          label: PAYMENT_MODE_FIELD_LABEL,
          type: "select" as const,
          required: true,
          options: selectedModes,
        },
      ]
    : [];

const ServicesManagement: React.FC = () => {
  const { isAllowed: isAdminAllowed, isLoading: isAuthLoading } =
    useAuthGuard("admin");
  const [services, setServices] = useState<ServiceApiItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceApiItem | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    custom_category_name: "",
    custom_category_desc: "",
    description: "",
    price: "",
    profit: "",
    duration: "",
    image: "",
    payment_timing: "at_booking" as "at_booking" | "after_service",
    payment_modes: [] as string[],
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    image: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [servicesResponse, categoriesResponse] = await Promise.all([
        servicesAPI.getAll(),
        servicesAPI.getCategories(),
      ]);

      setServices(servicesResponse.data || []);
      setCategories(categoriesResponse.data || []);
    } catch (loadError: any) {
      setError(
        loadError?.error || loadError?.message || "Failed to load services",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminAllowed) return;
    void loadData();
  }, [isAdminAllowed]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesCategory =
        filterCategory === "all" || service.category_id === filterCategory;
      const matchesSearch =
        !search.trim() ||
        service.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        service.description.toLowerCase().includes(search.trim().toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [filterCategory, search, services]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredServices.length / SERVICES_PER_PAGE),
  );
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * SERVICES_PER_PAGE,
    currentPage * SERVICES_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const deleteService = async (id: string) => {
    try {
      await servicesAPI.delete(id);
      setServices((current) => current.filter((service) => service.id !== id));
      if (selectedService?.id === id) {
        setSelectedService(null);
      }
    } catch (deleteError: any) {
      const errorMessage =
        deleteError?.error ||
        deleteError?.response?.data?.error ||
        deleteError?.message ||
        "Failed to delete service";
      setError(errorMessage);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await servicesAPI.deleteCategory(id);
      setCategories((current) => current.filter((cat) => cat.id !== id));
      setCategoryToDelete(null);
    } catch (deleteError: any) {
      const errorMessage =
        deleteError?.error ||
        deleteError?.response?.data?.error ||
        deleteError?.message ||
        "Failed to delete category";
      setError(errorMessage);
    }
  };

  const handleCreateService = async () => {
    if (
      !formData.name ||
      !formData.description ||
      !formData.price ||
      !formData.duration
    ) {
      setCreateError("Please fill in all required fields");
      return;
    }

    if (useCustomCategory && !formData.custom_category_name) {
      setCreateError("Please enter a custom category name");
      return;
    }

    if (!useCustomCategory && !formData.category_id) {
      setCreateError(
        `Please select or create a category. ${categories.length === 0 ? "No categories available - use 'Create New Category'." : ""}`,
      );
      return;
    }

    // Verify selected category exists
    if (!useCustomCategory && formData.category_id) {
      const categoryExists = categories.some(
        (cat) => cat.id === formData.category_id,
      );
      if (!categoryExists) {
        setCreateError(
          "Selected category is invalid. Please select a valid category.",
        );
        return;
      }
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      let categoryId = formData.category_id;

      // Create custom category if needed
      if (useCustomCategory) {
        const categoryResponse = await servicesAPI.createCategory({
          name: formData.custom_category_name,
          description: formData.custom_category_desc || undefined,
        });

        if (categoryResponse.data?.id) {
          categoryId = categoryResponse.data.id;
          // Add to categories list
          setCategories((current) => [
            categoryResponse.data as ServiceCategoryApiItem,
            ...current,
          ]);
        } else {
          throw new Error("Failed to create category");
        }
      }

      const response = await servicesAPI.create({
        name: formData.name,
        category_id: categoryId,
        description: formData.description,
        price: parseFloat(formData.price),
        profit: formData.profit ? parseFloat(formData.profit) : 0,
        duration: parseInt(formData.duration, 10),
        payment_timing: formData.payment_timing,
        customer_choice_fields: buildPaymentChoiceFields(formData.payment_modes),
      });

      // Add the new service to the list
      if (response.data) {
        setServices((current) => [response.data as ServiceApiItem, ...current]);
      }

      // Reset form and close modal
      setFormData({
        name: "",
        category_id: "",
        custom_category_name: "",
        custom_category_desc: "",
        description: "",
        price: "",
        profit: "",
        duration: "",
        image: "",
        payment_timing: "at_booking",
        payment_modes: [],
      });
      setUseCustomCategory(false);
      setShowCreateModal(false);
    } catch (createErr: any) {
      console.error("Service creation error:", createErr);
      const errorMessage =
        createErr?.error ||
        createErr?.response?.data?.error ||
        createErr?.message ||
        "Failed to create service";
      setCreateError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.name) {
      setCreateError("Category name is required");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await servicesAPI.createCategory({
        name: categoryFormData.name,
        description: categoryFormData.description || undefined,
      });

      // Add the new category to the list
      if (response.data) {
        setCategories((current) => [
          response.data as ServiceCategoryApiItem,
          ...current,
        ]);
      }

      // Reset form and close modal
      setCategoryFormData({
        name: "",
        description: "",
        image: "",
      });
      setShowCreateCategoryModal(false);
    } catch (createErr: any) {
      console.error("Category creation error:", createErr);
      const errorMessage =
        createErr?.error ||
        createErr?.response?.data?.error ||
        createErr?.message ||
        "Failed to create category";
      setCreateError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCategoryFormChange = (field: string, value: string) => {
    setCategoryFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectedServiceChange = (field: string, value: any) => {
    setSelectedService((current) =>
      current
        ? {
            ...current,
            [field]: value,
            ...(field === "category_id"
              ? {
                  category_name:
                    categories.find((category) => category.id === value)?.name ||
                    current.category_name,
                }
              : {}),
          }
        : current,
    );
  };

  const handleSaveService = async () => {
    if (!selectedService) {
      return;
    }

    if (
      !selectedService.name.trim() ||
      !selectedService.description.trim() ||
      !selectedService.category_id ||
      !Number(selectedService.price) ||
      !Number(selectedService.duration)
    ) {
      setError("Please complete all required service fields");
      return;
    }

    setSaveLoading(true);
    setError(null);

    try {
      const response = await servicesAPI.update(selectedService.id, {
        name: selectedService.name.trim(),
        category_id: selectedService.category_id,
        description: selectedService.description.trim(),
        price: Number(selectedService.price),
        profit: Number(selectedService.profit || 0),
        duration: Number(selectedService.duration),
        is_available: Boolean(selectedService.is_available),
        payment_timing: selectedService.payment_timing || "at_booking",
        customer_choice_fields: buildPaymentChoiceFields(
          getServicePaymentModes(selectedService),
        ),
      });

      const categoryName =
        categories.find((category) => category.id === selectedService.category_id)
          ?.name || selectedService.category_name;
      const updatedService = {
        ...(response.data as ServiceApiItem),
        category_name: categoryName,
      };

      setSelectedService(updatedService);
      setServices((current) =>
        current.map((service) =>
          service.id === updatedService.id ? updatedService : service,
        ),
      );
    } catch (saveError: any) {
      setError(
        saveError?.error ||
          saveError?.response?.data?.error ||
          saveError?.message ||
          "Failed to update service",
      );
    } finally {
      setSaveLoading(false);
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
          <h1 className="section-title mb-md">Services</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review service catalog and category coverage from the backend.
          </p>
        </div>
        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="flex justify-between items-center mb-lg">
          <h2 className="text-lg font-semibold">
            Categories ({categories.length})
          </h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateCategoryModal(true)}
            icon={<Plus size={16} />}
          >
            Add Category
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-lg">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardBody>
                <div className="flex justify-between items-start mb-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {category.name}
                  </p>
                  <button
                    onClick={() => setCategoryToDelete(category.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {category.service_count || 0}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
        <Card className="mb-lg">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <Input
                placeholder="Search services"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                options={[
                  { value: "all", label: "All Categories" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                value={filterCategory}
                onChange={(event) => {
                  setFilterCategory(event.target.value);
                  setCurrentPage(1);
                }}
              />
              <div className="flex gap-sm">
                <Button onClick={() => setCurrentPage(1)}>Apply Filters</Button>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                  icon={<Plus size={16} />}
                >
                  Add Service
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Table
              loading={loading}
              emptyState="No services found"
              columns={[
                { key: "name", label: "Service" },
                {
                  key: "category_name",
                  label: "Category",
                  render: (value: string | null | undefined) =>
                    value ? (
                      <span>{value}</span>
                    ) : (
                      <span className="text-gray-400 italic">
                        Uncategorized
                      </span>
                    ),
                },
                {
                  key: "price",
                  label: "Price",
                  render: (value: number) => formatCurrency(value),
                },
                {
                  key: "duration",
                  label: "Duration",
                  render: (value: number) => `${value} mins`,
                },
                {
                  key: "is_available",
                  label: "Status",
                  render: (value: boolean) => (
                    <Badge variant={value ? "success" : "danger"}>
                      {value ? "Active" : "Inactive"}
                    </Badge>
                  ),
                },
                {
                  key: "id",
                  label: "Actions",
                  render: (_: string, row: ServiceApiItem) => (
                    <div className="flex gap-md">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye size={16} />}
                        onClick={() => setSelectedService(row)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={16} />}
                        onClick={() => void deleteService(row.id)}
                      />
                    </div>
                  ),
                },
              ]}
              data={paginatedServices}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardBody>
        </Card>
        <Modal
          isOpen={Boolean(selectedService)}
          onClose={() => {
            setSelectedService(null);
            setError(null);
          }}
          title="Service Details"
        >
          {selectedService && (
            <div className="space-y-lg">
              <Input
                label="Name"
                value={selectedService.name}
                onChange={(event) =>
                  handleSelectedServiceChange("name", event.target.value)
                }
              />
              <Select
                label="Category"
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                value={selectedService.category_id}
                onChange={(event) =>
                  handleSelectedServiceChange("category_id", event.target.value)
                }
              />
              <Input
                label="Price"
                value={String(selectedService.price)}
                type="number"
                onChange={(event) =>
                  handleSelectedServiceChange("price", event.target.value)
                }
              />
              <Input
                label="Profit (₹)"
                value={String(selectedService.profit || 0)}
                type="number"
                onChange={(event) =>
                  handleSelectedServiceChange("profit", event.target.value)
                }
              />
              <Input
                label="Duration"
                value={String(selectedService.duration)}
                type="number"
                onChange={(event) =>
                  handleSelectedServiceChange("duration", event.target.value)
                }
              />
              <Input
                label="Rating"
                value={String(selectedService.rating || 0)}
                readOnly
              />
              <Input
                label="Reviews"
                value={String(selectedService.total_reviews || 0)}
                readOnly
              />
              <Input
                label="Description"
                value={selectedService.description}
                onChange={(event) =>
                  handleSelectedServiceChange("description", event.target.value)
                }
              />
              <Select
                label="Payment Timing"
                options={[
                  { value: "at_booking", label: "Payment at Booking" },
                  { value: "after_service", label: "Payment After Service" },
                ]}
                value={selectedService.payment_timing || "at_booking"}
                onChange={(event) =>
                  handleSelectedServiceChange("payment_timing", event.target.value)
                }
              />
              <div className="space-y-sm rounded-lg border border-gray-200 px-md py-md dark:border-gray-700">
                <p className="label-base">Visible Payment Options</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The customer will choose from these options during booking.
                </p>
                <div className="flex flex-wrap gap-md">
                  {PAYMENT_MODE_OPTIONS.map((option) => {
                    const selectedModes = getServicePaymentModes(selectedService);
                    const checked = selectedModes.includes(option.value);

                    return (
                      <label
                        key={option.value}
                        className="flex items-center gap-sm text-sm text-gray-700 dark:text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const nextModes = event.target.checked
                              ? [...selectedModes, option.value]
                              : selectedModes.filter((mode) => mode !== option.value);

                            handleSelectedServiceChange(
                              "customer_choice_fields",
                              buildPaymentChoiceFields(nextModes),
                            );
                          }}
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-md rounded-lg border border-gray-200 px-md py-md text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={Boolean(selectedService.is_available)}
                  onChange={(event) =>
                    handleSelectedServiceChange(
                      "is_available",
                      event.target.checked,
                    )
                  }
                />
                Service is active
              </label>
              <div className="flex justify-end">
                <Button loading={saveLoading} onClick={() => void handleSaveService()}>
                  Save Service
                </Button>
              </div>
            </div>
          )}
        </Modal>
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCreateError(null);
            setUseCustomCategory(false);
            setFormData({
              name: "",
              category_id: "",
              custom_category_name: "",
              custom_category_desc: "",
              description: "",
              price: "",
              profit: "",
              duration: "",
              image: "",
              payment_timing: "at_booking",
              payment_modes: [],
            });
          }}
          title="Add New Service"
        >
          {createError && (
            <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {createError}
            </div>
          )}
          <div className="space-y-lg">
            <Input
              label="Service Name *"
              placeholder="e.g., Car Wash, House Cleaning"
              value={formData.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
            />

            {useCustomCategory ? (
              <>
                <Input
                  label="New Category Name *"
                  placeholder="e.g., Car Wash, Plumbing"
                  value={formData.custom_category_name}
                  onChange={(e) =>
                    handleFormChange("custom_category_name", e.target.value)
                  }
                />
                <Input
                  label="Category Description"
                  placeholder="Brief description of this service category"
                  value={formData.custom_category_desc}
                  onChange={(e) =>
                    handleFormChange("custom_category_desc", e.target.value)
                  }
                />
                <Button
                  variant="ghost"
                  onClick={() => {
                    setUseCustomCategory(false);
                    setFormData((prev) => ({
                      ...prev,
                      custom_category_name: "",
                      custom_category_desc: "",
                    }));
                  }}
                >
                  ← Use Existing Category
                </Button>
              </>
            ) : (
              <>
                {categories.length === 0 ? (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-md py-sm text-sm text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                    No categories available. Please create a category first by
                    clicking "Add Category" above.
                  </div>
                ) : (
                  <Select
                    label="Category *"
                    placeholder="Select a category..."
                    options={categories.map((cat) => ({
                      value: cat.id,
                      label: cat.name,
                    }))}
                    value={formData.category_id}
                    onChange={(e) =>
                      handleFormChange("category_id", e.target.value)
                    }
                  />
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setUseCustomCategory(true);
                    setCreateError(null);
                  }}
                >
                  + Create New Category
                </Button>
              </>
            )}

            <Input
              label="Description *"
              placeholder="Describe the service"
              value={formData.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-md">
              <Input
                label="Price (₹) *"
                type="number"
                placeholder="99.99"
                value={formData.price}
                onChange={(e) => handleFormChange("price", e.target.value)}
              />
              <Input
                label="Profit (₹)"
                type="number"
                placeholder="30"
                value={formData.profit}
                onChange={(e) => handleFormChange("profit", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-md">
              <Input
                label="Duration (mins) *"
                type="number"
                placeholder="60"
                value={formData.duration}
                onChange={(e) => handleFormChange("duration", e.target.value)}
              />
            </div>

            <Select
              label="Payment Timing *"
              options={[
                { value: "at_booking", label: "Payment at Booking" },
                { value: "after_service", label: "Payment After Service" },
              ]}
              value={formData.payment_timing}
              onChange={(e) =>
                handleFormChange(
                  "payment_timing",
                  e.target.value as "at_booking" | "after_service",
                )
              }
            />
            <div className="space-y-sm rounded-lg border border-gray-200 px-md py-md dark:border-gray-700">
              <p className="label-base">Visible Payment Options</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select which payment choices the customer can see for this
                service.
              </p>
              <div className="flex flex-wrap gap-md">
                {PAYMENT_MODE_OPTIONS.map((option) => {
                  const checked = formData.payment_modes.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-sm text-sm text-gray-700 dark:text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const nextModes = event.target.checked
                            ? [...formData.payment_modes, option.value]
                            : formData.payment_modes.filter(
                                (mode) => mode !== option.value,
                              );

                          setFormData((prev) => ({
                            ...prev,
                            payment_modes: nextModes,
                          }));
                        }}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-md justify-end pt-lg">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                }}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleCreateService()}
                disabled={createLoading}
              >
                {createLoading ? "Creating..." : "Create Service"}
              </Button>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={showCreateCategoryModal}
          onClose={() => {
            setShowCreateCategoryModal(false);
            setCreateError(null);
            setCategoryFormData({
              name: "",
              description: "",
              image: "",
            });
          }}
          title="Add New Category"
        >
          {createError && (
            <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {createError}
            </div>
          )}
          <div className="space-y-lg">
            <Input
              label="Category Name *"
              placeholder="e.g., Car Wash, Plumbing, Electrical"
              value={categoryFormData.name}
              onChange={(e) => handleCategoryFormChange("name", e.target.value)}
            />

            <Input
              label="Description"
              placeholder="Briefly describe this service category"
              value={categoryFormData.description}
              onChange={(e) =>
                handleCategoryFormChange("description", e.target.value)
              }
            />
            <div className="flex gap-md justify-end pt-lg">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateCategoryModal(false);
                  setCreateError(null);
                }}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleCreateCategory()}
                disabled={createLoading}
              >
                {createLoading ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={Boolean(categoryToDelete)}
          onClose={() => setCategoryToDelete(null)}
          title="Delete Category"
          size="sm"
        >
          <div className="space-y-lg">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete this category? Services in this
              category will be unaffected but the category will be removed.
            </p>
            <div className="flex gap-md">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setCategoryToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() =>
                  categoryToDelete && void deleteCategory(categoryToDelete)
                }
              >
                Delete Category
              </Button>
            </div>
          </div>
        </Modal>{" "}
      </div>
    </div>
  );
};

export default ServicesManagement;
