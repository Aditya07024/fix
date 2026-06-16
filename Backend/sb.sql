-- Supabase Database Schema for Fixit Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'employee', 'admin')),
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL, -- Duration in minutes
  rating DECIMAL(3, 1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  image VARCHAR(500),
  is_available BOOLEAN DEFAULT true,
  payment_timing VARCHAR(20) NOT NULL DEFAULT 'at_booking' CHECK (payment_timing IN ('at_booking', 'after_service')),
  customer_choice_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10, 2),
  rating DECIMAL(3, 1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT false,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  document_url VARCHAR(1000),
  pending_service_ids UUID[] DEFAULT ARRAY[]::UUID[],
  review_notes TEXT,
  approved_at TIMESTAMP,
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, service_id)
);

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS document_url VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS pending_service_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

ALTER TABLE employees
  ALTER COLUMN is_available SET DEFAULT false;

-- Time slots table (reference for booking time slots)
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE(start_time, end_time)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  client_name_override VARCHAR(255),
  booking_date DATE NOT NULL,
  time_slot JSONB NOT NULL, -- Stores {start_time: "HH:MM", end_time: "HH:MM"}
  notes TEXT,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in-progress', 'completed', 'cancelled')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_timing VARCHAR(20) NOT NULL DEFAULT 'at_booking' CHECK (payment_timing IN ('at_booking', 'after_service')),
  customer_choices JSONB NOT NULL DEFAULT '{}'::jsonb,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  admin_deleted_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Prevent double bookings: unique per service/date/slot/employee
  -- This allows multiple unassigned bookings (NULL employee_id) to compete for assignment
  UNIQUE(service_id, booking_date, time_slot, employee_id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(booking_id) -- Only one review per booking
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(100),
  razorpay_signature VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payouts table for employee earnings withdrawals
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  razorpay_payout_id VARCHAR(100),
  razorpay_fund_account_id VARCHAR(100),
  payout_method VARCHAR(20) NOT NULL DEFAULT 'bank' CHECK (payout_method IN ('bank', 'upi', 'card')),
  bank_account_number VARCHAR(50),
  bank_ifsc_code VARCHAR(20),
  upi_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'upi', 'wallet')),
  label VARCHAR(100) NOT NULL,
  provider VARCHAR(100),
  last_digits VARCHAR(10),
  upi_id VARCHAR(255),
  wallet_name VARCHAR(100),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, service_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('booking_created', 'booking_accepted', 'booking_started', 'booking_completed', 'booking_cancelled', 'payment_completed', 'payment_failed', 'review_received', 'system')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url VARCHAR(500),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('complaint', 'extra_service')),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  admin_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'employee')),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Address Areas table (for managing colonies/address line 2)
CREATE TABLE IF NOT EXISTS address_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default colonies
INSERT INTO address_areas (name, city, state, is_active)
VALUES
  ('Vasundhara', 'Ghaziabad', 'Uttar Pradesh', true),
  ('Sagar Ratna', 'Ghaziabad', 'Uttar Pradesh', true),
  ('Keshav kunj', 'Ghaziabad', 'Uttar Pradesh', true),
  ('Nursing Village', 'Ghaziabad', 'Uttar Pradesh', true),
  ('Radha Puram', 'Ghaziabad', 'Uttar Pradesh', true)
ON CONFLICT (name) DO NOTHING;






-- Indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_services_category_id ON services(category_id);
CREATE INDEX idx_employee_services_employee_id ON employee_services(employee_id);
CREATE INDEX idx_employee_services_service_id ON employee_services(service_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_employee_id ON bookings(employee_id);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_user_status_created_at ON bookings(user_id, status, created_at DESC);
CREATE INDEX idx_bookings_user_payment_status ON bookings(user_id, payment_status);
CREATE INDEX idx_bookings_employee_status_date_time ON bookings(employee_id, status, booking_date ASC, ((time_slot->>'start_time')));
CREATE INDEX idx_bookings_service_status_created_at ON bookings(service_id, status, created_at DESC);
CREATE INDEX idx_bookings_payment_status_completed_at ON bookings(payment_status, completed_at DESC);
CREATE INDEX idx_bookings_status_created_at ON bookings(status, created_at DESC);
CREATE INDEX idx_reviews_service_id ON reviews(service_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_saved_services_user_id ON saved_services(user_id);
CREATE INDEX idx_saved_services_service_id ON saved_services(service_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX idx_support_requests_status ON support_requests(status);
CREATE INDEX idx_employee_support_messages_employee_user_id ON employee_support_messages(employee_user_id);
CREATE INDEX idx_employee_support_messages_created_at ON employee_support_messages(created_at DESC);

-- Row Level Security (if using Supabase Auth)
-- Note: RLS is disabled for tables accessed by backend since it uses custom JWT verification
-- Backend handles all authorization through middleware and business logic
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE saved_services ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_services ENABLE ROW LEVEL SECURITY;

-- Add employee_id to reviews table for employee reviews support
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reviews_employee_id ON reviews(employee_id);

-- RLS Policies - DISABLED
-- These policies are commented out because:
-- 1. Backend uses custom JWT verification (not Supabase Auth)
-- 2. Backend has authorization middleware on all endpoints
-- 3. Database access is always through the backend (not direct client access)
-- 4. All user_id checks are done in application layer
--
-- If migrating to Supabase Auth, uncomment the RLS policies below and re-enable RLS

-- RLS Policies for users table
-- CREATE POLICY "Users can view their own profile"
--   ON users FOR SELECT
--   USING (auth.uid() = id);

-- RLS Policies for bookings table
-- CREATE POLICY "Users can view their own bookings"
--   ON bookings FOR SELECT
--   USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');
-- CREATE POLICY "Users can create their own bookings"
--   ON bookings FOR INSERT
--   WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update their own bookings"
--   ON bookings FOR UPDATE
--   USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin')
--   WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');
-- CREATE POLICY "Admins can delete bookings"
--   ON bookings FOR DELETE
--   USING (auth.jwt() ->> 'role' = 'admin');

-- All RLS policies removed since RLS is disabled

-- Seed data (optional)
INSERT INTO service_categories (name, description) VALUES
('Home Cleaning', 'Professional cleaning services for your home'),
('Plumbing', 'Expert plumbing repair and installation'),
('Electrical', 'Electrical services and maintenance'),
('Carpentry', 'Furniture and structural carpentry work'),
('Painting', 'Interior and exterior painting services')
ON CONFLICT (name) DO NOTHING;

INSERT INTO services (name, category_id, description, price, duration, image, is_available) 
SELECT 
  'Basic Home Cleaning',
  sc.id,
  'Complete home cleaning service - 2 hours',
  499.00,
  120,
  'https://images.unsplash.com/photo-1527857050631-ccf38dd332a2?w=500',
  true
FROM service_categories sc WHERE sc.name = 'Home Cleaning'
ON CONFLICT DO NOTHING;

INSERT INTO services (name, category_id, description, price, duration, image, is_available) 
SELECT 
  'Pipe Installation',
  sc.id,
  'Professional plumbing pipe installation',
  799.00,
  180,
  'https://images.unsplash.com/photo-1581092163562-40460efbc3ca?w=500',
  true
FROM service_categories sc WHERE sc.name = 'Plumbing'
ON CONFLICT DO NOTHING;

INSERT INTO users (name, email, phone, password_hash, role)
VALUES (
  'Platform Admin',
  'admin@Fixit.local',
  '9999999999',
  crypt('Admin@12345', gen_salt('bf')),
  'admin'
)
ON CONFLICT (email) DO NOTHING;
