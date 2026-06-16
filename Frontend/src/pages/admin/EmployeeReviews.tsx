import React, { useEffect, useState } from "react";
import { Star, Search, RefreshCw } from "lucide-react";
import { Badge, Divider } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Input } from "@/components/Form";
import { Tabs } from "@/components/DataDisplay";
import { adminAPI } from "@/services/api";
import { useAuthGuard } from "@/hooks";
import { formatDate } from "@/utils/helpers";

interface EmployeeReview {
  id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  employee_name: string;
  service_name: string;
  booking_date: string;
  booking_status: string;
}

const EmployeeReviews: React.FC = () => {
  const { isAllowed: isAdminAllowed, isLoading: isAuthLoading } =
    useAuthGuard("admin");
  const [reviews, setReviews] = useState<EmployeeReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<EmployeeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [populating, setPopulating] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminAPI.getEmployeeReviews();
      console.log("API Response:", response);

      // Handle case where response might be undefined or error response
      if (!response || response.success === false) {
        console.warn(
          "Failed to load reviews:",
          response?.error || "Unknown error",
        );
        setReviews([]);
        setFilteredReviews([]);
        return;
      }

      console.log("Reviews data:", response.data);
      setReviews(response.data || []);
      setFilteredReviews(response.data || []);

      if (!response.data || response.data.length === 0) {
        console.warn("No employee reviews found in database");
      }
    } catch (loadError: any) {
      console.error("Error loading reviews:", loadError);
      setError(
        loadError?.error ||
          loadError?.message ||
          "Failed to load employee reviews",
      );
      setReviews([]);
      setFilteredReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateEmployeeIds = async () => {
    setPopulating(true);
    setError(null);

    try {
      const response = await adminAPI.populateEmployeeReviews();
      console.log("Populate response:", response);

      // Reload reviews after population
      await loadReviews();

      setError(null);
    } catch (populateError: any) {
      console.error("Error populating employee IDs:", populateError);
      setError(
        `Failed to populate employee data: ${populateError?.error || populateError?.message}`,
      );
    } finally {
      setPopulating(false);
    }
  };

  useEffect(() => {
    if (!isAdminAllowed) return;
    void loadReviews();
  }, [isAdminAllowed]);

  useEffect(() => {
    const filtered = reviews.filter(
      (review) =>
        review.employee_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        review.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.service_name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredReviews(filtered);
  }, [searchTerm, reviews]);

  const fiveStarReviews = filteredReviews.filter((r) => r.rating === 5);
  const fourStarReviews = filteredReviews.filter((r) => r.rating === 4);
  const threeStarReviews = filteredReviews.filter((r) => r.rating === 3);
  const twoStarReviews = filteredReviews.filter((r) => r.rating === 2);
  const oneStarReviews = filteredReviews.filter((r) => r.rating === 1);

  const ReviewCard: React.FC<{ review: EmployeeReview }> = ({ review }) => (
    <Card>
      <CardBody>
        <div className="space-y-lg">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-md">
            <div className="flex-1">
              <div className="flex items-start gap-md mb-md">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-xs">
                    {review.employee_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                    Reviewed by: {review.client_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-sm">
                    Service: {review.service_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {formatDate(review.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-sm">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }
                    />
                  ))}
                  <span className="font-bold text-gray-900 dark:text-gray-50 ml-sm">
                    {review.rating}/5
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Divider />

          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-md">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {review.comment}
            </p>
          </div>

          <div className="flex flex-wrap gap-sm">
            <Badge variant="secondary" className="text-xs">
              Booking: {review.booking_status}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {review.client_email}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {review.client_phone}
            </Badge>
          </div>
        </div>
      </CardBody>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
            <div>
              <h1 className="section-title mb-md">Employee Reviews</h1>
              <p className="text-gray-600 dark:text-gray-400">
                View all reviews submitted by clients for employees.
              </p>
            </div>
            <div className="flex gap-md w-full sm:w-auto flex-col sm:flex-row">
              {reviews.length === 0 && !loading && (
                <Button
                  icon={
                    <RefreshCw
                      size={18}
                      className={populating ? "animate-spin" : ""}
                    />
                  }
                  onClick={() => void handlePopulateEmployeeIds()}
                  disabled={populating}
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  {populating ? "Populating..." : "Link Reviews to Employees"}
                </Button>
              )}
              <Button
                icon={
                  <RefreshCw
                    size={18}
                    className={loading ? "animate-spin" : ""}
                  />
                }
                onClick={() => void loadReviews()}
                disabled={loading || populating}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mb-lg">
          <Input
            placeholder="Search by employee name, client name, or service..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            icon={<Search size={18} />}
          />
        </div>

        <Tabs
          tabs={[
            {
              label: `All (${filteredReviews.length})`,
              content: loading ? (
                <Card>
                  <CardBody>Loading reviews...</CardBody>
                </Card>
              ) : filteredReviews.length > 0 ? (
                <div className="space-y-lg">
                  {filteredReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardBody className="text-center py-2xl">
                    <p className="text-gray-600 dark:text-gray-400">
                      No reviews found.
                    </p>
                  </CardBody>
                </Card>
              ),
            },
            {
              label: `⭐⭐⭐⭐⭐ (${fiveStarReviews.length})`,
              content:
                fiveStarReviews.length > 0 ? (
                  <div className="space-y-lg">
                    {fiveStarReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardBody className="text-center py-2xl">
                      <p className="text-gray-600 dark:text-gray-400">
                        No 5-star reviews yet.
                      </p>
                    </CardBody>
                  </Card>
                ),
            },
            {
              label: `⭐⭐⭐⭐ (${fourStarReviews.length})`,
              content:
                fourStarReviews.length > 0 ? (
                  <div className="space-y-lg">
                    {fourStarReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardBody className="text-center py-2xl">
                      <p className="text-gray-600 dark:text-gray-400">
                        No 4-star reviews yet.
                      </p>
                    </CardBody>
                  </Card>
                ),
            },
            {
              label: `⭐⭐⭐ (${threeStarReviews.length})`,
              content:
                threeStarReviews.length > 0 ? (
                  <div className="space-y-lg">
                    {threeStarReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardBody className="text-center py-2xl">
                      <p className="text-gray-600 dark:text-gray-400">
                        No 3-star reviews yet.
                      </p>
                    </CardBody>
                  </Card>
                ),
            },
            {
              label: `⭐⭐ (${twoStarReviews.length})`,
              content:
                twoStarReviews.length > 0 ? (
                  <div className="space-y-lg">
                    {twoStarReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardBody className="text-center py-2xl">
                      <p className="text-gray-600 dark:text-gray-400">
                        No 2-star reviews.
                      </p>
                    </CardBody>
                  </Card>
                ),
            },
            {
              label: `⭐ (${oneStarReviews.length})`,
              content:
                oneStarReviews.length > 0 ? (
                  <div className="space-y-lg">
                    {oneStarReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardBody className="text-center py-2xl">
                      <p className="text-gray-600 dark:text-gray-400">
                        No 1-star reviews.
                      </p>
                    </CardBody>
                  </Card>
                ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default EmployeeReviews;
