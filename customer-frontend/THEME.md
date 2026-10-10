# QuickPress Customer Panel — Theme & Design System Documentation

Welcome to the **QuickPress Customer App Theme Specification**. This document defines the visual design system, color tokens, typography, radii, shadows, animations, and dark mode architecture for the QuickPress customer-facing web application and Capacitor Android hybrid wrapper.

---

## 1. Design Philosophy & Brand Identity

QuickPress is a hyper-local, on-demand laundry and garment care marketplace. The customer interface is crafted to evoke:
- **Purity & Freshness**: Crisp white surfaces and deep emerald accents signify cleanliness and premium fabric care.
- **Speed & Precision**: Micro-animations, live delivery trackers, and instant feedback loops inspired by top on-demand apps (Blinkit, Swiggy, Uber).
- **Tactile Depth**: Layered glassmorphism (`glass-panel`), pill-shaped tactile buttons, and soft shadows (`--shadow-soft`, `--shadow-cta`).
- **Accessibility & Fluidity**: Native dark mode support using perceptual OKLCH color spaces, responsive touch targets (minimum 44x44px), and reduced-motion fallbacks.

---

## 2. Core Theme Architecture

The theme engine is implemented in Tailwind CSS v4 and vanilla CSS custom properties:
- **Core Stylesheet**: [`src/shared/styles/theme.css`](file:///Users/himanshupal/Documents/Source%20Code/Scource%20Code%20/Officall-main/customer-frontend/src/shared/styles/theme.css)
- **Global Bundle**: [`src/styles.css`](file:///Users/himanshupal/Documents/Source%20Code/Scource%20Code%20/Officall-main/customer-frontend/src/styles.css)
- **Theme Runtime Controller**: [`src/lib/theme.ts`](file:///Users/himanshupal/Documents/Source%20Code/Scource%20Code%20/Officall-main/customer-frontend/src/lib/theme.ts)

### 2.1 Default Theme Rule
> **CRITICAL RULE**: The default theme is **ALWAYS "light"**.
> The application never initializes dark by default. The active mode is persisted in `localStorage` and synchronized with the user's remote profile via `PUT /api/me/settings`.

```ts
import { applyTheme, initTheme, setThemeLocally } from "@/lib/theme";

// Initialize on app bootstrap (light by default)
const cleanup = initTheme();

// Switch theme explicitly
setThemeLocally("dark"); // or "light" | "system"
```

---

## 3. Color Tokens (OKLCH Color Space)

All colors are defined using the modern **OKLCH** format, ensuring perceptual uniformity and vivid colors across P3 and sRGB displays.

### 3.1 Brand Identity Colors
| Token Variable | Tailwind Utility | OKLCH Value | Description |
| :--- | :--- | :--- | :--- |
| `--brand-green` | `bg-brand-green`, `text-brand-green` | `oklch(0.5972 0.1656 145.62)` | Signature QuickPress Emerald Green |
| `--brand-green-dark` | `bg-brand-green-dark`, `text-brand-green-dark` | `oklch(0.4712 0.1352 145.62)` | Deep forest emerald for pressed states & borders |
| `--brand-dark` | `bg-brand-dark`, `text-brand-dark` | `oklch(0.12 0.02 264.29)` | Deep obsidian midnight black |

---

### 3.2 Semantic Color Mapping (Light vs. Dark)

| Semantic Token | Light Mode (`:root`) | Dark Mode (`.dark`) | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| **`--background`** | `oklch(1 0 0)` *(Pure White)* | `oklch(0.129 0.042 264.695)` *(Deep Charcoal)* | `bg-background` |
| **`--foreground`** | `oklch(0.12 0.02 264.29)` *(Near Black)* | `oklch(0.984 0.003 247.858)` *(Off White)* | `text-foreground` |
| **`--card`** | `oklch(1 0 0)` *(Pure White)* | `oklch(0.208 0.042 265.755)` *(Elevated Slate)* | `bg-card` |
| **`--card-foreground`** | `oklch(0.12 0.02 264.29)` | `oklch(0.984 0.003 247.858)` | `text-card-foreground` |
| **`--primary`** | `oklch(0.5972 0.1656 145.62)` *(Brand Green)* | `oklch(0.929 0.013 255.508)` *(High-Vis Slate)* | `bg-primary`, `text-primary` |
| **`--primary-foreground`**| `oklch(1 0 0)` *(White Text)* | `oklch(0.208 0.042 265.755)` *(Dark Slate Text)*| `text-primary-foreground` |
| **`--secondary`** | `oklch(0.5972 0.1656 145.62)` | `oklch(0.279 0.041 260.031)` | `bg-secondary` |
| **`--muted`** | `oklch(0.965 0.004 247.9)` *(Soft Gray)* | `oklch(0.279 0.041 260.031)` *(Subdued Dark)* | `bg-muted` |
| **`--muted-foreground`** | `oklch(0.35 0.02 257.4)` *(Medium Gray)* | `oklch(0.80 0.02 256.7)` *(Light Slate)* | `text-muted-foreground` |
| **`--accent`** | `oklch(0.968 0.007 247.896)` | `oklch(0.279 0.041 260.031)` | `bg-accent` |
| **`--border`** | `oklch(0.90 0.008 255.5)` *(Subtle Border)*| `oklch(1 0 0 / 10%)` *(10% Translucent)* | `border-border` |
| **`--input`** | `oklch(0.90 0.008 255.5)` | `oklch(1 0 0 / 15%)` | `border-input` |
| **`--ring`** | `oklch(0.5972 0.1656 145.62)` *(Emerald Ring)*| `oklch(0.551 0.027 264.364)` | `ring-ring` |
| **`--destructive`** | `oklch(0.577 0.245 27.325)` *(Vivid Red)* | `oklch(0.704 0.191 22.216)` *(Soft Red)* | `bg-destructive` |

---

## 4. Typography System

- **Primary Font Family**: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif` (`--font-sans`).
- **Smoothing**: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` applied globally on `body`.

### Recommended Scale & Weights
| Role | Size / Leading | Weight | Usage |
| :--- | :--- | :--- | :--- |
| **Display / Hero** | `text-2xl` to `text-3xl` (`24px - 30px`) | `font-bold` (700) / `font-black` (900) | Home greeting, onboarding titles, splash banners |
| **Section Header** | `text-lg` to `text-xl` (`18px - 20px`) | `font-semibold` (600) | Category rails, partner store titles, order progress |
| **Body (Default)** | `text-sm` (`14px`) | `font-normal` (400) / `font-medium` (500) | Item descriptions, addresses, order items, FAQ answers |
| **Sub-text / Meta** | `text-xs` (`12px`) | `font-normal` (400) | Timestamps, tags, delivery estimates, badges |
| **Price / Numerical** | `text-base` or `text-lg` | `font-bold` (700), tabular figures | Currency amounts (₹), discounts, countdowns |

---

## 5. Elevation, Shapes & Radii

### 5.1 Corner Radii (`border-radius`)
The design system features rounded curves that feel natural on mobile touchscreens:
- **Base Radius (`--radius`)**: `1rem` (16px)
- **Small (`--radius-sm`)**: `12px` (`calc(var(--radius) - 4px)`) — Badges, small pills, tags
- **Medium (`--radius-md`)**: `14px` (`calc(var(--radius) - 2px)`) — Input fields, search bars
- **Large (`--radius-lg`)**: `16px` (`var(--radius)`) — Standard cards, list items
- **Extra Large (`--radius-xl`)**: `20px` — Featured banner cards
- **2X Large (`--radius-2xl`)**: `24px` — Service modal containers
- **3X Large (`--radius-3xl`)**: `28px` — Bottom sheet drawers, floating checkout bars (`card-soft`)
- **4X Large (`--radius-4xl`)**: `32px` — Floating primary callouts

### 5.2 Shadows & Glows
- **`--shadow-soft`**: `0 1px 2px oklch(0 0 0 / 0.04), 0 12px 32px -12px oklch(0 0 0 / 0.12)`
  - Used for calm, modern card elevation without muddy black shadows.
- **`--shadow-cta`**: `0 10px 26px -10px color-mix(in oklab, var(--primary) 65%, transparent)`
  - Luminous emerald glow applied to primary call-to-action buttons ("Place Order", "Schedule Pickup").

### 5.3 Glassmorphism (`glass-panel`)
Provides modern iOS/visionOS-style frosted glass surfaces for sticky headers and floating bottom navigations:
```css
.glass-panel {
  background-color: color-mix(in oklab, var(--color-background) 72%, transparent);
  backdrop-filter: blur(14px);
  border: 1px solid color-mix(in oklab, var(--color-border) 70%, transparent);
}
```

---

## 6. Motion & Micro-Animation System

All animations include automatic graceful degradation when the user has enabled OS-level **`prefers-reduced-motion: reduce`**.

### 6.1 Layout & Sheet Animations
| Class | Animation | Keyframes Effect |
| :--- | :--- | :--- |
| `animate-rise` | `qp-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1)` | Elements enter with subtle translateY (14px to 0) & fade |
| `animate-sheet-up` | `qp-sheet-up 0.42s cubic-bezier(0.22, 1, 0.36, 1)` | Bottom sheets slide up smoothly from viewport bottom |
| `animate-overlay-in` | `qp-sheet-fade-in 0.28s ease-out` | Dimmed backdrop fade-in for dialogs & sheets |
| `animate-soft-fade` | `qp-fade 0.25s ease-out` | Smooth general fade-in transition |
| `animate-pop` | `qp-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1)` | Scale pop (0.96 to 1.0) on button click / badge display |
| `animate-float` | `qp-float 4.5s ease-in-out infinite` | Gentle floating motion for promo icons & illustrations |

### 6.2 Skeleton & Shimmer
- **`shimmer`**: Premium skeleton loading effect with an animated gradient sweep (`qp-shimmer 1.6s infinite`). Used across all loading skeleton cards (`AccountSkeletons`, `RewardsSkeletons`, etc.).

### 6.3 Interactive & Touch Feedback
- **`ripple`**: Material-inspired circular tap ripple on touch/click (`active::after`).
- **`field-focus`**: Elevated focus treatment for text inputs with smooth 4px primary color glow and a `-1px` lift.
- **`focus-key`**: High-visibility outline for keyboard accessibility.

### 6.4 Auth & Form Micro-Animations
- **`animate-slide-up`**: Smooth 18px slide up for OTP cards and phone inputs.
- **`animate-cell-pop`**: Immediate feedback pop for OTP numeric digit entry.
- **`animate-success-pop`**: Spring bounce on verification success.
- **`stagger-1` through `stagger-6`**: Cascading entrance delay (60ms intervals) for stacked forms.

### 6.5 Live Delivery & Rider Motion
Used in the live order tracking screen ([`track.$orderId.tsx`](file:///Users/himanshupal/Documents/Source%20Code/Scource%20Code%20/Officall-main/customer-frontend/src/routes/track.$orderId.tsx)):
- **`qp-ride`**: Entry slide-in for delivery scooter.
- **`qp-bob`**: Vertical oscillation simulating road suspension.
- **`qp-wheel`**: Linear infinite 360° wheel rotation.
- **`qp-road`**: Dashed road line stroke-dashoffset motion.
- **`qp-trail`**: Particle wind trail lines behind the rider.
- **`qp-bubble`**: Washing machine laundry bubble float animation.

### 6.6 Flash Loader (QuickPress Bolt)
Used during fast state transitions and cart operations:
- **`qp-bolt-box`**: Bouncy box scaling.
- **`qp-bolt-flash`**: Energetic lightning bolt rotation.
- **`qp-pulse-ring`**: Concentric radial pulse rings.
- **`qp-loader-bar`**: Continuous scanning progress bar.

---

## 7. Component Styling Guidelines

### 7.1 Buttons
- **Primary CTA**:
  ```tsx
  <button className="h-12 w-full rounded-2xl bg-brand-green text-white font-semibold shadow-cta transition-all active:scale-[0.98] hover:brightness-105">
    Schedule Pickup
  </button>
  ```
- **Secondary / Outline**:
  ```tsx
  <button className="h-11 px-4 rounded-xl border border-border bg-card text-foreground font-medium hover:bg-muted active:scale-[0.98] transition">
    View Invoices
  </button>
  ```

### 7.2 Surface Cards
- **Soft Elevated Card**:
  ```tsx
  <div className="card-soft p-4 border border-border/40">
    {/* Card Content */}
  </div>
  ```

### 7.3 Bottom Navigation & Sticky Floating Bars
- **Floating Cart Bar**:
  ```tsx
  <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto glass-panel rounded-3xl p-3 shadow-lg">
    {/* Cart details and Checkout button */}
  </div>
  ```

---

## 8. Developer Rules & Best Practices

1. **Zero Hardcoded Colors**: Never use hardcoded `#hex` colors in JSX styles (e.g. `bg-[#10b981]`). Always use semantic Tailwind tokens like `bg-brand-green`, `bg-card`, `text-muted-foreground`, etc.
2. **Always Support Dark Mode**: Use semantic tokens so dark mode switches automatically without extra overrides (`bg-card` and `text-foreground` handle both modes).
3. **Keep Mobile First**: Design for 360px - 430px viewport widths first; ensure desktop max-width containers (`max-w-lg mx-auto` or `max-w-xl mx-auto`) for centered phone-like web presentation.
4. **Accessible Touch Targets**: Buttons, tabs, and toggles must have a minimum interactive tap target of `44x44px`.
5. **No Layout Shifts**: Always use pre-sized skeletons (`shimmer`) during data loading to prevent Cumulative Layout Shift (CLS).
