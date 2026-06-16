export type UserRole = 'client' | 'employee' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  image?: string;
  role: UserRole;
  needsOnboarding?: boolean;
  createdAt: Date;
}

export interface Client extends User {
  role: 'client';
  address?: string;
  paymentMethods?: PaymentMethod[];
}

export interface Employee extends User {
  role: 'employee';
  services: string[];
  hourlyRate: number;
  rating: number;
  reviews: number;
  isAvailable: boolean;
  totalEarnings: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  image: string;
  subCategories: ServiceSubCategory[];
}

export interface ServiceSubCategory {
  id: string;
  name: string;
  categoryId: string;
  description: string;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  subCategoryId: string;
  description: string;
  price: number;
  duration: number; // in minutes
  rating: number;
  reviews: number;
  image: string;
  employeeId: string;
  isAvailable: boolean;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  price?: number;
}

export interface BookingStatus {
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
}

export interface Booking extends BookingStatus {
  id: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  date: Date;
  timeSlot: TimeSlot;
  notes?: string;
  totalPrice: number;
  createdAt: Date;
  completedAt?: Date;
  paymentId?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  serviceId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  bookingId: string;
  clientId: string;
  amount: number;
  method: 'razorpay' | 'card' | 'upi' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId: string;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  clientId: string;
  type: 'card' | 'upi' | 'wallet';
  lastDigits: string;
  isDefault: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'booking' | 'payment' | 'review' | 'message' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
}

export interface AnalyticsData {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  activeEmployees: number;
  completionRate: number;
  averageRating: number;
  bookingsByDate: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

export interface EarningsData {
  totalEarnings: number;
  thisMonth: number;
  thisWeek: number;
  completedBookings: number;
  rating: number;
  byDate: Array<{
    date: string;
    amount: number;
  }>;
}
