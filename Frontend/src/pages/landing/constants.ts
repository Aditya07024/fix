import {
  Zap,
  Users,
  Shield,
  Clock,
  CheckCircle,
  Home,
  Wrench,
  Droplet,
  UtensilsCrossed,
} from "lucide-react";

type LandingTestimonial = {
  name: string;
  text: string;
  avatar: string;
  role: string;
};

export const FEATURES = [
  {
    icon: Clock,
    title: "Easy Booking",
    description: "Choose your service and time slot in just 2 minutes",
  },
  {
    icon: Users,
    title: "Multiple Services",
    description: "All services you need in one convenient app",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Fast and secure online payments with Razorpay",
  },
  {
    icon: Zap,
    title: "Real-time Tracking",
    description: "Track your service professional in real-time",
  },
  {
    icon: CheckCircle,
    title: "Verified Professionals",
    description: "All professionals are background verified for your safety",
  },
  {
    icon: Users,
    title: "24/7 Support",
    description: "Customer support available round the clock",
  },
];

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Choose Service",
    description: "Browse and select from various services available",
  },
  {
    step: 2,
    title: "Select Time",
    description: "Pick your preferred date and time slot",
  },
  {
    step: 3,
    title: "Make Payment",
    description: "Complete secure payment via Razorpay",
  },
  {
    step: 4,
    title: "Get Service",
    description: "Professional arrives and completes the service at your home",
  },
];

export const SERVICES = [
  {
    id: "home-decoration",
    name: "Home Decoration",
    icon: Home,
    color: "from-purple-500 to-pink-500",
    description: "Professional interior decoration for any occasion",
  },
  {
    id: "electrician",
    name: "Electrician",
    icon: Wrench,
    color: "from-yellow-500 to-orange-500",
    description: "Electrical repairs and installations",
  },
  {
    id: "water-supply",
    name: "Water Supply",
    icon: Droplet,
    color: "from-blue-500 to-cyan-500",
    description: "Water system installation and maintenance",
  },
  {
    id: "laundry",
    name: "Laundry",
    icon: UtensilsCrossed,
    color: "from-green-500 to-emerald-500",
    description: "Professional laundry and dry cleaning services",
  },
];

export const TESTIMONIALS: LandingTestimonial[] = [];

export const DASHBOARD_FEATURES = [
  {
    role: "Client",
    features: [
      "Browse and book services",
      "Real-time professional tracking",
      "Payment history and receipts",
      "Ratings and reviews",
    ],
  },
  {
    role: "Professional",
    features: [
      "Accept and manage bookings",
      "View client details",
      "Track earnings",
      "Rating and reviews",
    ],
  },
  {
    role: "Admin",
    features: [
      "Manage users and services",
      "View analytics and reports",
      "Handle disputes",
      "System monitoring",
    ],
  },
];
