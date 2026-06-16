export type UserRole = "client" | "employee" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  image?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_at: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface SignupRequest extends AuthRequest {
  name: string;
  phone: string;
  role: UserRole;
  service_ids?: string[];
}

export interface Employee extends User {
  role: "employee";
  services: string[];
  pending_service_ids?: string[];
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  total_earnings: number;
  verification_status?: "pending" | "approved" | "rejected";
  document_url?: string;
  review_notes?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface Service {
  id: string;
  name: string;
  category_id: string;
  description: string;
  price: number;
  duration: number; // in minutes
  rating: number;
  total_reviews: number;
  image: string;
  is_available: boolean;
  payment_timing?: "at_booking" | "after_service";
  customer_choice_fields?: CustomerChoiceField[];
}

export interface CustomerChoiceField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  options?: string[];
}

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  price?: number;
}

export interface AddressInput {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export type BookingStatus =
  | "pending"
  | "accepted"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  employee_id?: string;
  client_name_override?: string;
  booking_date: Date;
  time_slot: TimeSlot;
  notes?: string;
  total_price: number;
  status: BookingStatus;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  payment_timing?: "at_booking" | "after_service";
  customer_choices?: Record<string, string>;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_at: Date;
  completed_at?: Date;
  admin_deleted_at?: Date;
  payment_id?: string;
}

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  service_id: string;
  rating: number;
  comment: string;
  created_at: Date;
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  status: "pending" | "completed" | "failed";
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeReviewRequest {
  verification_status: "approved" | "rejected";
  review_notes?: string;
}

export interface SupportRequest {
  id: string;
  user_id: string;
  type: "complaint" | "extra_service";
  subject: string;
  message: string;
  status: "open" | "in_review" | "resolved" | "closed";
  service_id?: string | null;
  booking_id?: string | null;
  admin_response?: string | null;
  created_at: Date;
  updated_at?: Date;
  responded_at?: Date | null;
}

export interface EmployeeSupportMessage {
  id: string;
  employee_user_id: string;
  sender_user_id: string;
  sender_role: "admin" | "employee";
  message: string;
  created_at: Date;
  updated_at?: Date;
}

export interface AuthToken {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LandingStats {
  happy_users: number;
  verified_professionals: number;
  services_completed: number;
  average_rating: number;
}
