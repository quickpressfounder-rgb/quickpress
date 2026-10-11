# QuickPress Partner Console — Theme & Design System Documentation

Welcome to the **QuickPress Partner Console Theme Specification**. This document defines the visual design system, color tokens, typography, radii, shadows, animations, and dark mode architecture for the QuickPress partner-facing merchant web application and Capacitor Android hybrid wrapper.

---

## 1. Design Philosophy & Brand Identity

QuickPress Partner Console is a high-frequency, operational merchant hub for laundromats, dry cleaners, and garment care partners. The partner interface is crafted to evoke:
- **Operational Velocity & Clarity**: High-contrast, scannable queues, bold numeric figures, and distinct order stage badges allowing partners to manage incoming laundry loads under peak rush hours.
- **Brand Identity (Brand Blue `#0178d4`)**: Crisp white surfaces accented with QuickPress **Brand Blue (`#0178d4`)** denote trust, business security, precision, and reliable financial settlement.
- **Tactile Depth & Feedback**: Layered glassmorphism (`glass-panel`), active button spring scaling (`scale-[0.965]`), pill-shaped tactile filters, and luminous blue shadows (`--shadow-soft`, `--shadow-cta`).
- **Accessibility & Fluidity**: Native dark mode support using perceptual OKLCH color spaces, responsive touch targets (minimum 44x44px), and reduced-motion fallbacks.

---

## 2. Core Theme Architecture

The theme engine is implemented in Tailwind CSS v4 and vanilla CSS custom properties:
- **Core Stylesheet**: [`src/shared/styles/theme.css`](file:///Users/himanshupal/Documents/Source%20Code/Scource%20Code%20/Officall-main/partner-frontend/src/shared/styles/theme.css)
- **Global Bundle**: [`src/styles.css`](file:///Users/himanshupal/Documents/Source%20Code/Scource%20Code%20/Officall-main/partner-frontend/src/styles.css)
- **Theme Runtime Controller**: [`src/lib/theme.ts`](file:///Users/himanshupal/Documents/Source%20Code/Scource%20Code%20/Officall-main/partner-frontend/src/lib/theme.ts)

### 2.1 Default Theme Rule
> **CRITICAL RULE**: The default theme is **ALWAYS "light"**.
> The application never initializes dark by default. The active mode is persisted in `localStorage` under `qp_partner_theme_mode`.

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
| Token Variable | Tailwind Utility | OKLCH Value | Hex Equiv | Description |
| :--- | :--- | :--- | :--- | :--- |
| `--brand-blue` | `bg-brand-blue`, `text-brand-blue` | `oklch(0.5678 0.1665 251.36)` | `#0178d4` | Signature QuickPress Partner Brand Blue |
| `--brand-blue-dark` | `bg-brand-blue-dark` | `oklch(0.46 0.15 251.36)` | `#005a9e` | Deep navy blue for pressed states & borders |
| `--brand-dark` | `bg-brand-dark`, `text-brand-dark` | `oklch(0.12 0.02 264.29)` | `#111827` | Deep obsidian midnight black |

---

### 3.2 Semantic Color Mapping (Light vs. Dark)

| Semantic Token | Light Mode (`:root`) | Dark Mode (`.dark`) | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| **`--background`** | `oklch(1 0 0)` *(Pure White)* | `oklch(0.129 0.042 264.695)` *(Deep Charcoal)* | `bg-background` |
| **`--foreground`** | `oklch(0.12 0.02 264.29)` *(Near Black)* | `oklch(0.984 0.003 247.858)` *(Off White)* | `text-foreground` |
| **`--card`** | `oklch(1 0 0)` *(Pure White)* | `oklch(0.208 0.042 265.755)` *(Elevated Slate)* | `bg-card` |
| **`--card-foreground`** | `oklch(0.12 0.02 264.29)` | `oklch(0.984 0.003 247.858)` | `text-card-foreground` |
| **`--primary`** | `oklch(0.5678 0.1665 251.36)` *(Brand Blue)* | `oklch(0.68 0.16 251.36)` *(Luminous Blue)* | `bg-primary`, `text-primary` |
| **`--primary-foreground`**| `oklch(1 0 0)` *(White Text)* | `oklch(0.129 0.042 264.695)` *(Dark Slate Text)*| `text-primary-foreground` |
| **`--secondary`** | `oklch(0.5678 0.1665 251.36)` | `oklch(0.279 0.041 260.031)` | `bg-secondary` |
| **`--muted`** | `oklch(0.965 0.004 247.9)` *(Soft Gray)* | `oklch(0.279 0.041 260.031)` *(Subdued Dark)* | `bg-muted` |
| **`--muted-foreground`** | `oklch(0.35 0.02 257.4)` *(Medium Gray)* | `oklch(0.80 0.02 256.7)` *(Light Slate)* | `text-muted-foreground` |
| **`--accent`** | `oklch(0.968 0.007 247.896)` | `oklch(0.279 0.041 260.031)` | `bg-accent` |
| **`--border`** | `oklch(0.90 0.008 255.5)` *(Subtle Border)*| `oklch(1 0 0 / 10%)` *(10% Translucent)* | `border-border` |
| **`--input`** | `oklch(0.90 0.008 255.5)` | `oklch(1 0 0 / 15%)` | `border-input` |
| **`--ring`** | `oklch(0.5678 0.1665 251.36)` *(Blue Ring)*| `oklch(0.5678 0.1665 251.36)` | `ring-ring` |
| **`--destructive`** | `oklch(0.577 0.245 27.325)` *(Vivid Red)* | `oklch(0.704 0.191 22.216)` *(Soft Red)* | `bg-destructive` |

---

## 4. Typography System

- **Primary Font Family**: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif` (`--font-sans`).
- **Smoothing**: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` applied globally on `body`.

### Recommended Scale & Weights
| Role | Size / Leading | Weight | Usage |
| :--- | :--- | :--- | :--- |
| **Display / Hero** | `text-2xl` to `text-3xl` (`24px - 30px`) | `font-bold` (700) / `font-black` (900) | Welcome card, live store banner, revenue total |
| **Section Header** | `text-base` to `text-lg` (`16px - 18px`) | `font-black` (900) | Queue headers, order status, settlement cycles |
| **Body (Default)** | `text-sm` (`14px`) | `font-semibold` (600) / `font-medium` (500) | Order item lists, customer notes, instructions |
| **Sub-text / Meta** | `text-xs` (`12px`) | `font-bold` (700) / `font-normal` (400) | Timestamps, tags, SLA counters, OTP instructions |
| **Currency / Financial** | `text-sm` or `text-base` | `font-black` (900), tabular figures | Order amounts (₹), wallet balance, payouts |

---

## 5. Elevation, Shapes & Radii

### 5.1 Corner Radii (`border-radius`)
The design system features rounded curves optimized for fast thumb navigation:
- **Base Radius (`--radius`)**: `1rem` (16px)
- **Small (`--radius-sm`)**: `12px` (`calc(var(--radius) - 4px)`) — Badges, small pills, tags
- **Medium (`--radius-md`)**: `14px` (`calc(var(--radius) - 2px)`) — Inputs, select fields
- **Large (`--radius-lg`)**: `16px` (`var(--radius)`) — Standard metric cards, queue rows
- **Extra Large (`--radius-xl`)**: `20px` — Featured action tiles
- **2X Large (`--radius-2xl`)**: `24px` — Service modal containers, form blocks
- **3X Large (`--radius-3xl`)**: `28px` — Bottom sheet drawers, floating overview cards (`card-soft`)
- **4X Large (`--radius-4xl`)**: `32px` — Floating primary callouts

### 5.2 Shadows & Glows
- **`--shadow-soft`**: `0 1px 2px oklch(0 0 0 / 0.04), 0 12px 32px -12px oklch(0 0 0 / 0.12)`
  - Used for calm, modern card elevation without muddy black shadows.
- **`--shadow-cta`**: `0 10px 26px -10px color-mix(in oklab, var(--primary) 65%, transparent)`
  - Luminous Brand Blue glow applied to primary call-to-action buttons ("Accept Order", "Verify & Handover", "Withdraw to Bank").

### 5.3 Glassmorphism (`glass-panel`)
Provides frosted glass surfaces for sticky top bars and docked navigations:
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

### 6.1 Layout & Queue Motion
| Class | Animation | Keyframes Effect |
| :--- | :--- | :--- |
| `animate-rise` | `qp-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1)` | Elements enter with subtle translateY (14px to 0) & fade |
| `card-enter` | `qp-rise-in 0.46s cubic-bezier(0.22, 1, 0.36, 1)` | Cards enter with smooth scale lift (0.985 to 1.0) |
| `stagger-children` | Cascading `animation-delay` | Auto-staggers grid children (0.02s to 0.46s) |
| `bottom-sheet-motion` | `qp-sheet-in 0.42s cubic-bezier(0.22, 1, 0.36, 1)` | Bottom sheets slide up smoothly from viewport bottom |
| `modal-motion` | `qp-modal-in 0.34s cubic-bezier(0.22, 1, 0.36, 1)` | Modal scale pop (0.95 to 1.0) with fade |
| `overlay-motion` | `qp-overlay-in 0.28s ease-out` | Dimmed backdrop fade-in |
| `animate-pop` | `qp-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1)` | Scale pop on button click / badge display |
| `fab-motion` | `qp-fab-in + qp-fab-glow` | Floating action button with breathing blue glow |

### 6.2 Skeleton & Shimmer
- **Sweeping Shimmer (`.animate-pulse`)**: Premium sweeping gradient shimmer (`qp-skeleton-sweep 1.5s infinite`) replacing flat grey blinking across all loading states.

### 6.3 Interactive & Touch Feedback
- **Tactile Tap Scaling**: All buttons subtly scale to `0.965` on `:active` with instant touch response (`touch-action: manipulation`).
- **`field-focus`**: Elevated focus treatment for inputs with 4px Brand Blue glow and smooth border transition.
- **`btn-ripple`**: Circular tap ripple sheen on CTA press.

---

## 7. Component Styling Guidelines

### 7.1 Primary Action Button
```tsx
<button className="h-12 w-full rounded-2xl bg-primary hover:bg-primary-dark text-white font-black text-sm uppercase tracking-wider shadow-cta transition-all active:scale-[0.98]">
  Accept Order
</button>
```

### 7.2 Secondary / Action Outline
```tsx
<button className="h-11 px-4 rounded-xl border border-primary/20 bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 active:scale-95 transition-all">
  Download Excel
</button>
```

### 7.3 Soft Elevated Card
```tsx
<div className="card-soft p-5 border border-border/80">
  {/* Card Content */}
</div>
```

### 7.4 Captain Handover Dispatch OTP Card
```tsx
<div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-white p-4 shadow-sm">
  {/* OTP input and verification action */}
</div>
```

---

## 8. Developer Rules & Best Practices

1. **Zero Hardcoded Colors**: Never use hardcoded `#hex` colors in JSX styles (e.g. `bg-[#10b981]` or `bg-[#F4B400]`). Always use semantic Tailwind tokens like `bg-primary`, `bg-card`, `text-primary`, `text-muted-foreground`, etc.
2. **Brand Blue Distinguishing Identity**: Partner Console strictly utilizes Brand Blue (`#0178d4` / `oklch(0.5678 0.1665 251.36)`) as its primary color token.
3. **Always Support Dark Mode**: Use semantic tokens so dark mode switches automatically without extra overrides (`bg-card` and `text-foreground` handle both modes).
4. **Accessible Touch Targets**: Buttons, tabs, and toggles must have a minimum interactive tap target of `44x44px`.
5. **No Layout Shifts**: Always use pre-sized skeletons (`.animate-pulse` sweeping shimmer) during data loading to prevent Cumulative Layout Shift (CLS).
