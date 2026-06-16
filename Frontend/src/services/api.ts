import axios from "axios";

const API_BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : import.meta.env.VITE_API_URL || "/api/v1";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationMeta;
}

export interface AuthApiUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  image?: string | null;
  role: "client" | "employee" | "admin";
  created_at?: string;
  employee_verification_status?: "pending" | "approved" | "rejected";
  needs_onboarding?: boolean;
}

export interface AdminUserApiItem extends AuthApiUser {
  bookings?: number;
  status?: string;
  last_active_at?: string | null;
  hourly_rate?: number | string | null;
  is_available?: boolean;
  verification_status?: "pending" | "approved" | "rejected";
  document_url?: string | null;
  review_notes?: string | null;
  assigned_services?: string[];
  assigned_service_ids?: string[];
  pending_assigned_services?: string[];
}

export interface AuthPayload {
  token: string;
  user: AuthApiUser;
}

export interface GoogleAuthPayload {
  user: AuthApiUser;
  token?: string;
}

export interface CustomerChoiceFieldApiItem {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  options?: string[];
}

export interface ServiceApiItem {
  id: string;
  name: string;
  category_id: string;
  description: string;
  price: number;
  profit?: number | null;
  duration: number;
  rating: number;
  total_reviews: number;
  image?: string | null;
  is_available: boolean;
  payment_timing?: "at_booking" | "after_service";
  customer_choice_fields?: CustomerChoiceFieldApiItem[];
  category_name?: string;
  employee_name?: string | null;
  is_saved?: boolean;
}

export interface ServiceEmployeeApiItem {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  image?: string | null;
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  verification_status: "pending" | "approved" | "rejected";
  bookings_on_date: number;
}

export interface ServiceCategoryApiItem {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  service_count?: number;
}

export interface LandingStatsApiItem {
  happy_users: number;
  verified_professionals: number;
  services_completed: number;
  average_rating: number;
}

export interface AddressApiItem {
  id?: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

export interface BookingCreatePayload {
  service_id: string;
  employee_id?: string;
  client_name?: string;
  booking_date: string;
  time_slot?: { start_time: string; end_time: string };
  selected_time?: string;
  address: AddressApiItem;
  save_address?: boolean;
  notes?: string;
  customer_choices?: Record<string, string>;
}

export interface PaymentMethodApiItem {
  id: string;
  type: "card" | "upi" | "wallet";
  label: string;
  provider?: string | null;
  last_digits?: string | null;
  upi_id?: string | null;
  wallet_name?: string | null;
  is_default: boolean;
  created_at?: string;
}

export interface BookingApiItem {
  id: string;
  user_id: string;
  service_id: string;
  employee_id?: string | null;
  booking_date: string;
  time_slot: { start_time: string; end_time: string };
  notes?: string | null;
  total_price: number;
  status: "pending" | "accepted" | "in-progress" | "completed" | "cancelled";
  payment_status: "pending" | "completed" | "failed" | "refunded";
  payment_timing?: "at_booking" | "after_service";
  customer_choices?: Record<string, string>;
  service_name?: string;
  service_description?: string;
  service_image?: string | null;
  service_duration?: number;
  service_rating?: number;
  client_name?: string;
  client_phone?: string;
  employee_name?: string | null;
  employee_phone?: string | null;
  employee_image?: string | null;
  service_address?: string | null;
  address_line2?: string | null;
  client_name_override?: string | null;
  created_at?: string;
  admin_deleted_at?: string | null;
  request_expiry_status?: {
    ttl_minutes: number;
    expires_at: string;
    total_seconds_remaining: number;
    minutes_remaining: number;
    seconds_remaining: number;
  };
  cancellation_status?: {
    can_be_cancelled: boolean;
    minutes_remaining: number;
    seconds_remaining: number;
    cancellation_window_minutes: number;
  };
}

export interface SupportRequestApiItem {
  id: string;
  user_id: string;
  type: "complaint" | "extra_service";
  subject: string;
  message: string;
  status: "open" | "in_review" | "resolved" | "closed";
  admin_response?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  booking_id?: string | null;
  booking_date?: string | null;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  created_at: string;
  responded_at?: string | null;
}

export interface EmployeeSupportMessageApiItem {
  id: string;
  employee_user_id: string;
  sender_user_id: string;
  sender_role: "admin" | "employee";
  sender_name?: string;
  sender_email?: string;
  message: string;
  created_at: string;
  updated_at?: string;
}

export interface EmployeeSupportConversationApiItem {
  employee_user_id: string;
  employee_name: string;
  employee_email?: string;
  employee_phone?: string;
  last_message?: string | null;
  last_message_at?: string | null;
  last_sender_role?: "admin" | "employee" | null;
}

export interface EmployeeSupportThreadPayload {
  employee: {
    employee_user_id: string;
    employee_name: string;
    employee_email?: string;
    employee_phone?: string;
  };
  messages: EmployeeSupportMessageApiItem[];
}

export interface ClientDashboardPayload {
  stats: {
    active_bookings: number;
    completed_bookings: number;
    reviews_given: number;
    saved_services: number;
    amount_spent: number;
  };
  categories: Array<ServiceCategoryApiItem & { service_names?: string[] }>;
  top_services: ServiceApiItem[];
  recent_bookings: Array<{
    id: string;
    booking_date: string;
    status: string;
    total_price: number;
    service_name: string;
    employee_name: string;
  }>;
}

export interface ClientProfilePayload extends AuthApiUser {
  address?: AddressApiItem | null;
  payment_methods: PaymentMethodApiItem[];
  stats: {
    total_bookings: number;
    completed_bookings: number;
    amount_spent: number;
    reviews_given: number;
  };
}

export interface EmployeeProfilePayload {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  image?: string | null;
  hourly_rate?: number | null;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  total_earnings: number;
  verification_status: "pending" | "approved" | "rejected";
  document_url?: string | null;
  review_notes?: string | null;
  assigned_services?: Array<{ id: string; name: string }>;
  pending_assigned_services?: Array<{ id: string; name: string }>;
  created_at?: string;
}

export interface EmployeeDashboardPayload {
  profile: EmployeeProfilePayload;
  stats: {
    today_tasks: number;
    pending_tasks: number;
    completed_tasks: number;
    ratings: number;
  };
  today_tasks: BookingApiItem[];
  earnings: EmployeeEarningsPayload;
}

export interface EmployeeEarningsPayload {
  total_earnings: number;
  total_transactions: number;
  recent_payments: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string;
    booking_date?: string;
    service_name?: string;
    client_name?: string;
  }>;
}

export interface AdminDashboardPayload {
  total_bookings: number;
  total_revenue: number;
  total_profit?: number;
  total_users: number;
  total_services: number;
  active_employees: number;
  average_rating: number;
  bookings_by_status: Array<{ status: string; count: number }>;
  service_distribution: Array<{ name: string; value: number }>;
}

export interface NotificationApiItem {
  id: string;
  user_id: string;
  type:
    | "booking_created"
    | "booking_request"
    | "booking_accepted"
    | "booking_declined"
    | "booking_taken"
    | "booking_started"
    | "booking_completed"
    | "booking_cancelled"
    | "payment_completed"
    | "review_received"
    | "system";
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string | null;
  booking_id?: string | null;
  created_at: string;
  read_at?: string | null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Protected route prefixes that require authentication
const PROTECTED_ROUTE_PREFIXES = ["/admin", "/employee", "/client"];

// Public auth routes that don't require token
const PUBLIC_AUTH_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/google",
  "/auth/clerk/sync",
];

const isProtectedRoute = (url: string): boolean => {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => url.includes(prefix));
};

const isPublicAuthRoute = (url: string): boolean => {
  return PUBLIC_AUTH_ROUTES.some((route) => url.includes(route));
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    const requestUrl = String(config.url || "");

    // Public routes - always allow
    if (isPublicAuthRoute(requestUrl)) {
      return config;
    }

    // Protected routes - require token
    if (isProtectedRoute(requestUrl)) {
      if (!token) {
        // CANCEL the request - don't send it
        const controller = new AbortController();
        controller.abort();
        config.signal = controller.signal;

        console.warn("❌ API Request BLOCKED - No token for protected route:", {
          url: requestUrl,
          reason: "Token not found in localStorage",
          timestamp: new Date().toISOString(),
        });

        return config;
      }
    }

    // Attach token if available (for any route that accepts it)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("✅ API Request - Token attached:", {
        url: requestUrl,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20),
      });
    } else if (!isPublicAuthRoute(requestUrl)) {
      console.warn("⚠️ API Request - No token (public route):", {
        url: requestUrl,
      });
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle aborted/canceled requests - return as error response
    if (error.code === "ERR_CANCELED" || error.message === "Request canceled") {
      console.debug(
        "API Request canceled - likely due to missing token for protected route",
      );
      // Return a proper error response structure instead of undefined
      return Promise.resolve({
        success: false,
        error: "Request blocked - no authentication",
        data: null,
      });
    }

    const requestUrl = String(error.config?.url || "");
    const isAuthRoute = isPublicAuthRoute(requestUrl);

    console.error("❌ API Error:", {
      url: requestUrl,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      config: {
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      },
    });

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !isAuthRoute) {
      console.error("🔐 Clearing auth on 401 - redirecting to login");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/#/login";
    }

    const apiError = {
      ...error,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Request failed",
      response: error.response,
      status: error.response?.status,
      error:
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Request failed",
    };

    return Promise.reject(apiError);
  },
);

export const authAPI = {
  syncClerkUser: (
    token: string,
    desiredRole?: "client" | "employee" | "admin",
  ) =>
    api.post<any, ApiResponse<GoogleAuthPayload>>(
      "/auth/clerk/sync",
      desiredRole ? { role: desiredRole } : {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),

  signup: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: "client" | "employee";
    service_ids?: string[];
  }) => api.post<any, ApiResponse<AuthPayload>>("/auth/signup", data),

  login: (
    email: string,
    password: string,
    role: "client" | "employee" | "admin",
  ) =>
    api.post<any, ApiResponse<AuthPayload>>("/auth/login", {
      email,
      password,
      role,
    }),

  getProfile: () => api.get<any, ApiResponse<AuthApiUser>>("/auth/profile"),

  updateProfile: (data: { name?: string; phone?: string; image?: string }) =>
    api.put<any, ApiResponse<AuthApiUser>>("/auth/profile", data),

  verifyToken: () =>
    api.get<
      any,
      ApiResponse<{ id: string; email: string; role: AuthApiUser["role"] }>
    >("/auth/verify"),
};

export const servicesAPI = {
  getAll: (categoryId?: string, search?: string) =>
    api.get<any, ApiResponse<ServiceApiItem[]>>("/services", {
      params: { category_id: categoryId, search },
    }),

  getById: (id: string) =>
    api.get<any, ApiResponse<ServiceApiItem>>(`/services/${id}`),

  getEmployees: (id: string, bookingDate?: string) =>
    api.get<any, ApiResponse<ServiceEmployeeApiItem[]>>(
      `/services/${id}/employees`,
      {
        params: { booking_date: bookingDate },
      },
    ),

  getCategories: () =>
    api.get<any, ApiResponse<ServiceCategoryApiItem[]>>("/services/categories"),

  getLandingStats: () =>
    api.get<any, ApiResponse<LandingStatsApiItem>>("/services/landing/stats"),

  getCategoryById: (id: string) =>
    api.get<any, ApiResponse<ServiceCategoryApiItem>>(
      `/services/categories/${id}`,
    ),

  create: (data: {
    name: string;
    category_id: string;
    description: string;
    price: number;
    profit?: number;
    duration: number;
    image?: string;
    payment_timing?: "at_booking" | "after_service";
    customer_choice_fields?: CustomerChoiceFieldApiItem[];
  }) => api.post("/services", data),

  createCategory: (data: {
    name: string;
    description?: string;
    image?: string;
  }) => api.post("/services/categories", data),

  deleteCategory: (id: string) => api.delete(`/services/categories/${id}`),

  update: (
    id: string,
    data: {
      name?: string;
      category_id?: string;
      description?: string;
      price?: number;
      profit?: number;
      duration?: number;
      image?: string;
      is_available?: boolean;
      payment_timing?: "at_booking" | "after_service";
      customer_choice_fields?: CustomerChoiceFieldApiItem[];
    },
  ) => api.put(`/services/${id}`, data),

  delete: (id: string) => api.delete(`/services/${id}`),

  // Address areas (public access for bookings)
  getAddressAreas: (isActive?: boolean) =>
    api.get<any, ApiResponse<any[]>>("/services/booking/address-areas", {
      params: { is_active: isActive?.toString() },
    }),
};

export const bookingsAPI = {
  create: (data: BookingCreatePayload) =>
    api.post<any, ApiResponse<BookingApiItem>>("/bookings", data),

  getMyBookings: (status?: string) =>
    api.get<any, ApiResponse<BookingApiItem[]>>(
      "/bookings/client/my-bookings",
      {
        params: { status },
      },
    ),

  getEmployeeBookings: (status?: string) =>
    api.get<any, ApiResponse<BookingApiItem[]>>(
      "/bookings/employee/my-bookings",
      { params: { status } },
    ),

  getAdminBookings: ({
    status,
    service_id,
    page,
    limit,
  }: {
    status?: string;
    service_id?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    api.get<any, PaginatedApiResponse<BookingApiItem>>(
      "/bookings/admin/all-bookings",
      {
        params: { status, service_id, page, limit },
      },
    ),

  getById: (id: string) =>
    api.get<any, ApiResponse<BookingApiItem>>(`/bookings/${id}`),

  updateStatus: (id: string, status: string) =>
    api.put(`/bookings/${id}/status`, { status }),

  cancel: (id: string) => api.put(`/bookings/${id}/cancel`, {}),

  deletePermanently: (id: string) =>
    api.delete<any, ApiResponse<BookingApiItem>>(`/bookings/${id}`),

  getAvailableSlots: (
    service_id: string,
    booking_date: string,
    employee_id?: string,
  ) =>
    api.get("/bookings/available-slots", {
      params: { service_id, booking_date, employee_id },
    }),
};

export const paymentsAPI = {
  initiatePreBookingPayment: (amount: number, booking: BookingCreatePayload) =>
    api.post("/payments/prebook/initiate", { amount, booking }),

  verifyPaymentAndCreateBooking: (
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
    booking: BookingCreatePayload,
  ) =>
    api.post("/payments/prebook/verify-and-create-booking", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking,
    }),

  initiatePayment: (booking_id: string, amount: number) =>
    api.post("/payments/initiate", { booking_id, amount }),

  verifyPayment: (
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) =>
    api.post("/payments/verify", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),

  getPaymentStatus: (booking_id: string) =>
    api.get(`/payments/${booking_id}/status`),

  getPaymentHistory: (limit?: number, offset?: number) =>
    api.get("/payments/history/all", { params: { limit, offset } }),

  refundPayment: (payment_id: string) =>
    api.post(`/payments/${payment_id}/refund`, {}),

  // Employee payout methods
  createPayoutRequest: (data: {
    amount: number;
    payout_method: "bank" | "upi" | "card";
    bank_account_number?: string;
    bank_ifsc_code?: string;
    upi_id?: string;
  }) => api.post("/payments/payouts/request", data),

  getEmployeePayouts: (status?: string, limit?: number, offset?: number) =>
    api.get("/payments/payouts/employee", {
      params: { status, limit, offset },
    }),

  getEmployeeEarningsDetail: () => api.get("/payments/earnings/employee"),

  // Aliases for backward compatibility
  initiate: (booking_id: string, amount: number) =>
    api.post("/payments/initiate", { booking_id, amount }),

  verify: (
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) =>
    api.post("/payments/verify", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),

  getStatus: (booking_id: string) => api.get(`/payments/${booking_id}/status`),

  refund: (payment_id: string) =>
    api.post(`/payments/${payment_id}/refund`, {}),

  // Payment request methods (after_service flow)
  getPaymentRequests: (status?: string) =>
    api.get("/payments/requests", { params: { status } }),

  getPaymentRequestsByBooking: (booking_id: string) =>
    api.get(`/payments/requests/${booking_id}`),

  completePaymentRequest: (
    booking_id: string,
    payment_data: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    },
  ) => api.post(`/payments/requests/${booking_id}/complete`, payment_data),
};

export const reviewsAPI = {
  create: (data: {
    booking_id: string;
    service_id: string;
    rating: number;
    comment: string;
    employee_id?: string;
  }) => api.post("/reviews", data),

  getServiceReviews: (service_id: string) =>
    api.get(`/reviews/service/${service_id}`),

  update: (id: string, data: { rating?: number; comment?: string }) =>
    api.put(`/reviews/${id}`, data),

  delete: (id: string) => api.delete(`/reviews/${id}`),
};

export const employeeAPI = {
  getDashboard: () =>
    api.get<any, ApiResponse<EmployeeDashboardPayload>>("/employee/dashboard"),

  getProfile: () =>
    api.get<any, ApiResponse<EmployeeProfilePayload>>("/employee/profile"),

  updateProfile: (data: {
    hourly_rate?: number;
    document_url?: string;
    service_ids?: string[];
    request_approval?: boolean;
  }) =>
    api.put<any, ApiResponse<EmployeeProfilePayload>>(
      "/employee/profile",
      data,
    ),

  updateAvailability: (is_available: boolean) =>
    api.put("/employee/availability", { is_available }),

  updateHourlyRate: (hourly_rate: number) =>
    api.put("/employee/hourly-rate", { hourly_rate }),

  getTasks: (status?: string) =>
    api.get<any, ApiResponse<BookingApiItem[]>>("/employee/tasks", {
      params: { status },
    }),

  getTodaysTasks: () =>
    api.get<any, ApiResponse<BookingApiItem[]>>("/employee/tasks/today"),

  completeTask: (booking_id: string) =>
    api.put(`/employee/tasks/${booking_id}/complete`, {}),

  getPendingBookingRequests: () =>
    api.get<any, ApiResponse<BookingApiItem[]>>("/employee/booking-requests"),

  acceptBookingRequest: (booking_id: string) =>
    api.post<any, ApiResponse<BookingApiItem>>(
      `/employee/booking-requests/${booking_id}/accept`,
      {},
    ),

  declineBookingRequest: (booking_id: string, reason?: string) =>
    api.post<any, ApiResponse<any>>(
      `/employee/booking-requests/${booking_id}/decline`,
      { reason },
    ),

  getAdminSupportThread: () =>
    api.get<any, ApiResponse<EmployeeSupportThreadPayload>>(
      "/employee/admin-support",
    ),

  sendAdminSupportMessage: (message: string) =>
    api.post<any, ApiResponse<EmployeeSupportMessageApiItem>>(
      "/employee/admin-support",
      { message },
    ),

  getEarnings: () =>
    api.get<any, ApiResponse<EmployeeEarningsPayload>>("/employee/earnings"),
};

export const clientAPI = {
  getDashboard: () =>
    api.get<any, ApiResponse<ClientDashboardPayload>>("/client/dashboard"),

  getProfile: () =>
    api.get<any, ApiResponse<ClientProfilePayload>>("/client/profile"),

  updateProfile: (data: {
    name?: string;
    phone?: string;
    image?: string;
    address?: AddressApiItem;
  }) =>
    api.put<any, ApiResponse<ClientProfilePayload>>("/client/profile", data),

  getSavedServices: () =>
    api.get<any, ApiResponse<ServiceApiItem[]>>("/client/saved-services"),

  toggleSavedService: (serviceId: string) =>
    api.post<any, ApiResponse<{ saved: boolean }>>(
      `/client/saved-services/${serviceId}/toggle`,
      {},
    ),

  getPaymentMethods: () =>
    api.get<any, ApiResponse<PaymentMethodApiItem[]>>(
      "/client/payment-methods",
    ),

  createPaymentMethod: (data: {
    type: "card" | "upi" | "wallet";
    label: string;
    provider?: string;
    last_digits?: string;
    upi_id?: string;
    wallet_name?: string;
    is_default?: boolean;
  }) =>
    api.post<any, ApiResponse<PaymentMethodApiItem>>(
      "/client/payment-methods",
      data,
    ),

  setDefaultPaymentMethod: (id: string) =>
    api.put(`/client/payment-methods/${id}/default`, {}),

  deletePaymentMethod: (id: string) =>
    api.delete(`/client/payment-methods/${id}`),

  getSupportRequests: () =>
    api.get<any, ApiResponse<SupportRequestApiItem[]>>(
      "/client/support-requests",
    ),

  createSupportRequest: (data: {
    type: "complaint" | "extra_service";
    subject: string;
    message: string;
    service_id?: string;
    booking_id?: string;
  }) =>
    api.post<any, ApiResponse<SupportRequestApiItem>>(
      "/client/support-requests",
      data,
    ),
};

export const adminAPI = {
  getDashboardStats: () =>
    api.get<any, ApiResponse<AdminDashboardPayload>>("/admin/dashboard/stats"),

  getAllUsers: (role?: string, search?: string) =>
    api.get<any, ApiResponse<any[]>>("/admin/users", {
      params: { role, search },
    }),

  getUserDetail: (id: string) => api.get(`/admin/users/${id}`),

  updateUser: (
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      image?: string;
      hourly_rate?: number;
      document_url?: string;
      is_available?: boolean;
      service_ids?: string[];
    },
  ) => api.put<any, ApiResponse<any>>(`/admin/users/${id}`, data),

  createUser: (data: {
    name: string;
    email: string;
    phone: string;
    role: "admin" | "employee";
  }) =>
    api.post<any, ApiResponse<any>>("/admin/users", data),

  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  getAllBookings: (status?: string, service_id?: string, user_id?: string) =>
    api.get<any, ApiResponse<BookingApiItem[]>>("/admin/bookings", {
      params: { status, service_id, user_id },
    }),

  getRevenueStats: (start_date?: string, end_date?: string) =>
    api.get<any, ApiResponse<any>>("/admin/revenue", {
      params: { start_date, end_date },
    }),

  getEmployeeStats: () =>
    api.get<any, ApiResponse<any[]>>("/admin/employees/stats"),

  getEmployeeReviews: (employee_id?: string) =>
    api.get<any, ApiResponse<any[]>>("/admin/employees/reviews", {
      params: { employee_id },
    }),

  populateEmployeeReviews: () =>
    api.post<any, ApiResponse<any>>("/admin/employees/reviews/populate", {}),

  reviewEmployee: (
    userId: string,
    data: {
      verification_status: "approved" | "rejected";
      review_notes?: string;
    },
  ) => api.put(`/admin/employees/${userId}/review`, data),

  getSupportRequests: (
    status?: SupportRequestApiItem["status"],
    type?: SupportRequestApiItem["type"],
  ) =>
    api.get<any, ApiResponse<SupportRequestApiItem[]>>(
      "/admin/support-requests",
      {
        params: { status, type },
      },
    ),

  updateSupportRequest: (
    id: string,
    data: {
      status: SupportRequestApiItem["status"];
      admin_response: string;
    },
  ) =>
    api.put<any, ApiResponse<SupportRequestApiItem>>(
      `/admin/support-requests/${id}`,
      data,
    ),

  getEmployeeSupportConversations: () =>
    api.get<any, ApiResponse<EmployeeSupportConversationApiItem[]>>(
      "/admin/employee-support/conversations",
    ),

  getEmployeeSupportThread: (employeeUserId: string) =>
    api.get<any, ApiResponse<EmployeeSupportThreadPayload>>(
      `/admin/employee-support/${employeeUserId}`,
    ),

  sendEmployeeSupportMessage: (employeeUserId: string, message: string) =>
    api.post<any, ApiResponse<EmployeeSupportMessageApiItem>>(
      `/admin/employee-support/${employeeUserId}`,
      { message },
    ),

  // Address areas management
  getAddressAreas: (isActive?: boolean) =>
    api.get<any, ApiResponse<any[]>>("/services/booking/address-areas", {
      params: { is_active: isActive?.toString() },
    }),

  createAddressArea: (data: {
    name: string;
    line2?: string;
    city: string;
    state: string;
    description?: string;
  }) => api.post<any, ApiResponse<any>>("/admin/address-areas", data),

  updateAddressArea: (
    id: string,
    data: {
      name?: string;
      line2?: string;
      city?: string;
      state?: string;
      description?: string;
      is_active?: boolean;
    },
  ) => api.put<any, ApiResponse<any>>(`/admin/address-areas/${id}`, data),

  deleteAddressArea: (id: string) =>
    api.delete<any, ApiResponse<any>>(`/admin/address-areas/${id}`),
};

export const notificationsAPI = {
  getAll: (is_read?: boolean, limit?: number, offset?: number) =>
    api.get<any, ApiResponse<NotificationApiItem[]>>("/notifications", {
      params: { is_read, limit, offset },
    }),

  getUnreadCount: () =>
    api.get<any, ApiResponse<{ unread_count: number }>>(
      "/notifications/unread/count",
    ),

  markAsRead: (notificationId: string) =>
    api.patch<any, ApiResponse<NotificationApiItem>>(
      `/notifications/${notificationId}/read`,
      {},
    ),

  markAllAsRead: () =>
    api.patch<any, ApiResponse<{ updated_count: number }>>(
      "/notifications/read/all",
      {},
    ),

  delete: (notificationId: string) =>
    api.delete(`/notifications/${notificationId}`),

  clearAll: () => api.delete("/notifications"),
};

export default api;
