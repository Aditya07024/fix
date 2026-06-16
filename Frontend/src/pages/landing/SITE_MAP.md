# Landing Page Visual Structure

```
┌─────────────────────────────────────────────────────────┐
│                    LandingNav (Fixed)                   │
│            (Logo | Menu | Theme | Auth Buttons)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   HERO SECTION                          │
│         Animated Gradient BG | Heading | CTA            │
│       Badge | Heading | Subheading | Buttons            │
│          Scroll Indicator | Demo UI Mock                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              FEATURES SECTION (6 Cards)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Feature  │  │ Feature  │  │ Feature  │              │
│  │   Card   │  │   Card   │  │   Card   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Feature  │  │ Feature  │  │ Feature  │              │
│  │   Card   │  │   Card   │  │   Card   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           HOW IT WORKS (4 Steps)                        │
│     ① → ② → ③ → ④  (with connectors)                  │
│   Step numbers + descriptions below each               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│          SERVICES (4 Gradient Cards)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ ┌──────────┐ │
│  │ Service  │  │ Service  │  │ Service  │ │ Service  │ │
│  │  Card 1  │  │  Card 2  │  │  Card 3  │ │  Card 4  │ │
│  └──────────┘  └──────────┘  └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│       DASHBOARD PREVIEW (Tabbed Interface)              │
│  [Client] [Employee] [Admin]                           │
│  ┌─────────────────────────────────────────┐           │
│  │  Features List | Mock Dashboard UI      │           │
│  └─────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         TESTIMONIALS (4 Cards + Stats)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Quote     │  │Quote     │  │Quote     │              │
│  │& Rating  │  │& Rating  │  │& Rating  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│   50K+ Users | 10K+ Pros | 100K+ Services | 4.8★      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            CTA SECTION (Gradient BG)                    │
│        Large Headline | CTA Buttons | Trust Badge       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                FOOTER                                   │
│  Brand | Links | Contact | Social Icons | Copyright    │
└─────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
LandingPage
├── LandingNav
├── HeroSection
├── FeaturesSection
│   └── AnimatedCard (×6)
├── HowItWorksSection
│   └── Motion.div (×4)
├── ServicesSection
│   └── Motion.div (×4 Service Cards)
├── DashboardPreviewSection
│   ├── Tabs (Client/Professional/Admin)
│   └── Mock Dashboard UI
├── TestimonialsSection
│   └── Motion.div (×4 Testimonial Cards)
├── CTASection
└── FooterSection
    ├── Brand Section
    ├── Links Column (×3)
    └── Social Icons
```

## Animation Flow

1. Page Load → LandingNav appears (fixed)
2. Hero Section → Staggered fade-in animations
3. Scroll down → Each section animates on viewport enter
4. Hover Effects → Cards lift, gradients shift
5. Theme Toggle → Smooth color transition
6. Button Clicks → Smooth navigation with React Router

## Color Palette

```
Primary (Blue):
█ #0ea5e9 (500) - Main brand color
█ #0284c7 (600) - Hover state
█ #0369a1 (700) - Active state

Secondary (Green):
█ #22c55e (500) - Success/Secondary accent
█ #16a34a (600) - Darker shade

Accent (Orange):
█ #f97316 (500) - Warning/Highlight
█ #ea580c (600) - Darker shade

Neutrals:
█ #f0f0f0 (light) - Light backgrounds
█ #1f1f1f (dark) - Dark backgrounds
█ #666666 (gray) - Text secondary
```

## Responsive Breakpoints

- **Mobile**: 0px - 640px (default)
- **Tablet**: 641px - 1024px (md:)
- **Desktop**: 1025px+ (lg:)

All components adapt layout at breakpoints
