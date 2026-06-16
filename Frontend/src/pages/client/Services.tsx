import React, { useEffect, useMemo, useState } from "react";
import { Star, MapPin, Clock, Filter, Grid, Heart, List } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Select } from "@/components/Form";
import { Badge, Divider } from "@/components/Badge";
import { formatCurrency } from "@/utils/helpers";
import { useNavigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks";
import {
  ServiceApiItem,
  ServiceCategoryApiItem,
  clientAPI,
  servicesAPI,
} from "@/services/api";

const ServiceListing: React.FC = () => {
  const { isAllowed: isClientAllowed, isLoading: isAuthLoading } =
    useAuthGuard("client");
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "all",
    priceRange: "all",
    rating: "all",
  });
  const [services, setServices] = useState<ServiceApiItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryMap = useMemo(
    () =>
      categories.reduce<Record<string, string>>((accumulator, category) => {
        accumulator[category.id] = category.name;
        return accumulator;
      }, {}),
    [categories],
  );

  useEffect(() => {
    if (!isClientAllowed) return;
    const loadCategories = async () => {
      try {
        const response = await servicesAPI.getCategories();
        setCategories(response.data || []);
      } catch (categoriesError: any) {
        setError(
          categoriesError?.error ||
            categoriesError?.message ||
            "Failed to load categories",
        );
      }
    };

    void loadCategories();
  }, [isClientAllowed]);

  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await servicesAPI.getAll(
          filters.category !== "all" ? filters.category : undefined,
          search.trim() || undefined,
        );
        setServices(response.data || []);
      } catch (servicesError: any) {
        setError(
          servicesError?.error ||
            servicesError?.message ||
            "Failed to load services",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadServices();
  }, [filters.category, search]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesPriceRange =
        filters.priceRange === "all" ||
        (filters.priceRange === "0-500" && service.price <= 500) ||
        (filters.priceRange === "500-1000" &&
          service.price > 500 &&
          service.price <= 1000) ||
        (filters.priceRange === "1000+" && service.price > 1000);

      const matchesRating =
        filters.rating === "all" ||
        (filters.rating === "4.5+" && service.rating >= 4.5) ||
        (filters.rating === "4+" && service.rating >= 4) ||
        (filters.rating === "3+" && service.rating >= 3);

      return matchesPriceRange && matchesRating;
    });
  }, [filters.priceRange, filters.rating, services]);

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  const getCategoryName = (service: ServiceApiItem) =>
    categoryMap[service.category_id] || "Uncategorized";

  const getServiceVisual = (service: ServiceApiItem) => {
    if (service.image && !service.image.startsWith("http")) {
      return service.image;
    }

    return getCategoryName(service).charAt(0).toUpperCase() || "S";
  };

  const resetFilters = () => {
    setSearch("");
    setFilters({
      category: "all",
      priceRange: "all",
      rating: "all",
    });
  };

  const toggleSaved = async (serviceId: string) => {
    try {
      await clientAPI.toggleSavedService(serviceId);
      setServices((current) =>
        current.map((service) =>
          service.id === serviceId
            ? { ...service, is_saved: !service.is_saved }
            : service,
        ),
      );
    } catch (toggleError: any) {
      setError(
        toggleError?.error || toggleError?.message || "Failed to save service",
      );
    }
  };

  const ServiceCard: React.FC<{ service: ServiceApiItem }> = ({ service }) => (
    <Card hoverable>
      <div className="space-y-md">
        <div className="flex-between">
          <div className="text-3xl">{getServiceVisual(service)}</div>
          <div className="flex items-center gap-md">
            <Badge variant="primary">{getCategoryName(service)}</Badge>
            <button
              type="button"
              onClick={() => void toggleSaved(service.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart
                size={18}
                className={service.is_saved ? "fill-red-500 text-red-500" : ""}
              />
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-xs">
            {service.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-md">
            {service.description}
          </p>
        </div>

        <div className="space-y-sm">
          <div className="flex items-center gap-xs">
            <Star size={14} className="fill-accent-400 text-accent-400" />
            <span className="text-sm font-medium">{service.rating || 0}</span>
            <span className="text-xs text-gray-500">
              ({service.total_reviews || 0})
            </span>
          </div>
          <div className="flex items-center gap-xs">
            <Clock size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {service.duration > 0 ? `${service.duration} mins` : "Varies"}
            </span>
          </div>
          <div className="flex items-center gap-xs">
            <MapPin size={14} className="text-primary-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {service.is_available ? "Available" : "Unavailable"}
            </span>
          </div>
        </div>

        <Divider />

        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-md">
            {formatCurrency(service.price)}
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() =>
              navigate("/client/booking", {
                state: { serviceId: service.id },
              })
            }
          >
            Book Now
          </Button>
        </div>
      </div>
    </Card>
  );

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
        <div className="mb-2xl">
          <h1 className="section-title mb-md">Browse Services</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find and book the perfect service for your needs
          </p>
        </div>

        <div className="mb-2xl">
          <Input
            label="Search Services"
            placeholder="Search by service name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-lg mb-2xl">
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <div className="flex-between mb-md">
                <h3 className="font-semibold flex items-center gap-md">
                  <Filter size={18} /> Filters
                </h3>
              </div>
              <Divider />

              <div className="space-y-lg mt-lg">
                <div>
                  <label className="label-base">Category</label>
                  <Select
                    options={categoryOptions}
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({ ...filters, category: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label-base">Price Range</label>
                  <Select
                    options={[
                      { value: "all", label: "All Prices" },
                      { value: "0-500", label: "₹0 - ₹500" },
                      { value: "500-1000", label: "₹500 - ₹1000" },
                      { value: "1000+", label: "₹1000+" },
                    ]}
                    value={filters.priceRange}
                    onChange={(e) =>
                      setFilters({ ...filters, priceRange: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label-base">Rating</label>
                  <Select
                    options={[
                      { value: "all", label: "All Ratings" },
                      { value: "4.5+", label: "4.5+ Stars" },
                      { value: "4+", label: "4+ Stars" },
                      { value: "3+", label: "3+ Stars" },
                    ]}
                    value={filters.rating}
                    onChange={(e) =>
                      setFilters({ ...filters, rating: e.target.value })
                    }
                  />
                </div>

                <Button variant="secondary" fullWidth onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <div className="flex-between mb-lg">
              <p className="text-gray-600 dark:text-gray-400">
                {loading
                  ? "Loading services..."
                  : `Showing ${filteredServices.length} services`}
              </p>
              <div className="flex gap-sm border border-gray-200 dark:border-gray-700 rounded-lg p-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-xs rounded ${viewMode === "grid" ? "bg-primary-500 text-white" : "text-gray-600 dark:text-gray-400"}`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-xs rounded ${viewMode === "list" ? "bg-primary-500 text-white" : "text-gray-600 dark:text-gray-400"}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            {!loading && filteredServices.length === 0 ? (
              <Card>
                <div className="py-3xl text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-sm">
                    No services found
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Change the search term or reset the filters.
                  </p>
                </div>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid-cards">
                {filteredServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <div className="space-y-md">
                {filteredServices.map((service) => (
                  <Card key={service.id} hoverable>
                    <div className="flex flex-col md:flex-row gap-lg md:items-center md:justify-between">
                      <div className="flex gap-md flex-1">
                        <div className="text-2xl">
                          {getServiceVisual(service)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                            {service.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {getCategoryName(service)}
                          </p>
                          <div className="flex gap-md mt-sm text-xs text-gray-500">
                            <span>
                              ⭐ {service.rating || 0} (
                              {service.total_reviews || 0})
                            </span>
                            <span>
                              ⏱️{" "}
                              {service.duration > 0
                                ? `${service.duration}min`
                                : "Varies"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-col items-end md:flex-col md:items-end">
                        <p className="text-xl font-bold mb-md">
                          {formatCurrency(service.price)}
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            navigate("/client/booking", {
                              state: { serviceId: service.id },
                            })
                          }
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceListing;
