# Pay365 — Design System & Color Palette (`DESIGN.md`)

**Date:** 2026-09-05  
**Design Reference:** Figma / Framer Inspiration (`#FFFFFF` + `#2357FE` Electric Royal Blue theme)

---

## 1. Color Palette Overview

The design system for Pay365 is built around a clean, high-contrast, modern aesthetic inspired by state-of-the-art SaaS platforms. It pairs pure crisp white (`#FFFFFF`) with a vibrant, electric royal blue (`#2357FE`) accent, supported by soft blue tints, subtle ambient glows, and dark slate typography.

```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│  Primary Electric Blue  │  │   Pure White Surface    │  │   Ice Blue Soft Tint    │
│         #2357FE         │  │         #FFFFFF         │  │         #EEF3FF         │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│   Deep Slate Heading    │  │  Muted Body Text Slate  │  │    Subtle Rim Border    │
│         #0F172A         │  │         #475569         │  │         #E2E8F0         │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

---

## 2. Color Tokens & Definitions

### 2.1 Brand & Accent Colors

| Token Name | HEX | HSL | Usage / Application |
|---|---|---|---|
| `--color-primary` | `#2357FE` | `hsl(226, 99%, 57%)` | Primary CTA buttons, active state indicators, logo icon, primary links |
| `--color-primary-hover` | `#1A46D8` | `hsl(226, 79%, 48%)` | Hover state for primary buttons and interactive elements |
| `--color-primary-light` | `#5B86FF` | `hsl(224, 100%, 68%)` | Gradient stops, highlight badges, active borders |
| `--color-primary-subtle` | `#EEF3FF` | `hsl(222, 100%, 97%)` | Pill badge background, selected table rows, active nav tab |
| `--color-primary-glow` | `rgba(35, 87, 254, 0.35)` | — | Ambient button drop-shadows and floating card glows |

### 2.2 Neutral & Surface Colors

| Token Name | HEX | HSL | Usage / Application |
|---|---|---|---|
| `--color-bg-app` | `#F8FAFC` | `hsl(210, 40%, 98%)` | Application background (very light slate/gray tint) |
| `--color-bg-card` | `#FFFFFF` | `hsl(0, 0%, 100%)` | Card surface, modal dialogs, top nav bar, dropdown menus |
| `--color-text-primary` | `#0F172A` | `hsl(222, 47%, 11%)` | Main headings (`h1`, `h2`, `h3`), bold labels, active text |
| `--color-text-secondary` | `#475569` | `hsl(215, 25%, 35%)` | Subtitles, paragraph body text, form field helper text |
| `--color-text-muted` | `#94A3B8` | `hsl(215, 16%, 65%)` | Placeholder text, disabled inputs, footer copyright, secondary icons |
| `--color-border` | `#E2E8F0` | `hsl(214, 32%, 91%)` | Standard container borders, divider lines, form input borders |
| `--color-border-subtle` | `#F1F5F9` | `hsl(210, 40%, 96%)` | Subtle inner table row borders, card outline dividers |

### 2.3 Status & Functional Colors

| Status | Color Name | HEX | Subtle BG | Usage |
|---|---|---|---|---|
| Success | Green | `#10B981` | `#ECFDF5` | Approved leaves, paid payruns, active contracts |
| Warning | Amber | `#F59E0B` | `#FFFBEB` | Payroll warnings, pending approvals, missing bank details |
| Danger / Error | Red | `#EF4444` | `#FEF2F2` | Validation errors, rejected requests, error alerts |
### 2.4 Typography Pairings

| Role | Font Family | Weights / Opsz | Usage |
|---|---|---|---|
| **Headings & Display** | `"Bricolage Grotesque", sans-serif` | `400`–`800`, `opsz 12..96` | Main title (`h1`), section titles (`h2`), card headers (`h3`), brand name |
| **Body & Interface** | `"Bricolage Grotesque", sans-serif` | `200`–`800`, `opsz 12..96` | Paragraphs, navigation links, buttons, form inputs, table data |

---

## 3. UI Component Style Specifications

### 3.1 Primary Buttons ("Launch HR Automation" style)
- **Background:** `linear-gradient(135deg, #2357FE 0%, #1D4ED8 100%)`
- **Text Color:** `#FFFFFF` (Font weight 600)
- **Border Radius:** `12px` (or pill `9999px` for badges)
- **Box Shadow:** `0 8px 20px -4px rgba(35, 87, 254, 0.45)`
- **Hover State:** Lift `transform: translateY(-2px)`, shadow intensifies `0 12px 25px -4px rgba(35, 87, 254, 0.55)`

### 3.2 Secondary Buttons ("Learn More" style)
- **Background:** `#FFFFFF`
- **Text Color:** `#0F172A`
- **Border:** `1px solid #E2E8F0`
- **Box Shadow:** `0 2px 6px rgba(0, 0, 0, 0.04)`
- **Hover State:** Background `#F8FAFC`, border `#CBD5E1`

### 3.3 Pill Badges & Feature Tags ("Automated 50+ companies" style)
- **Background:** `#EEF3FF`
- **Text Color:** `#2357FE`
- **Border:** `1px solid rgba(35, 87, 254, 0.2)`
- **Border Radius:** `9999px`
- **Padding:** `6px 16px`

### 3.4 Cards & Data Surfaces
- **Background:** `#FFFFFF`
- **Border Radius:** `16px` or `20px`
- **Border:** `1px solid #E2E8F0`
- **Box Shadow:** `0 10px 30px -5px rgba(15, 23, 42, 0.05), 0 4px 12px -2px rgba(35, 87, 254, 0.03)`

### 3.5 Floating Glassmorphic Navbar Component (`Navbar.jsx` / `Navbar.scss`)
- **Layout & Floating Container:** Fixed header positioned at top (`top: 0`, `z-index: 1000`) with dynamic container width (`max-width: 1240px`).
- **Glassmorphism Backdrop:** `background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(226, 232, 240, 0.85); border-radius: 50px;`
- **Dynamic Scroll Shrink:** When `scrollY > 60`, container smoothly shrinks to `max-width: 860px` using `transition: max-width 0.45s cubic-bezier(0.4, 0, 0.2, 1)`.
- **Brand Logo:** Wallet/Card icon in `#2357FE` inside an `#EEF3FF` soft wrapper + `Pay365` title in `#0F172A`.
- **Nav Links:** `Features`, `About Us`, `Client`, `Pricing`, `FAQ` with animated `#2357FE` underline indicator on hover.
- **CTA Button:** Electric royal blue pill button (`Get Started`) with `#2357FE` gradient fill, white text, right arrow icon, and glowing shadow `rgba(35, 87, 254, 0.4)`.

---

## 4. SCSS Design System Tokens (`src/styles/_variables.scss`)

```scss
// ==========================================
// Pay365 SCSS Design Tokens
// Primary: #2357FE | Pure White: #FFFFFF
// ==========================================

// 1. Color Palette
$color-primary: #2357fe;
$color-primary-hover: #1a46d8;
$color-primary-light: #5b86ff;
$color-primary-subtle: #eef3ff;
$color-primary-glow: rgba(35, 87, 254, 0.35);

$color-bg-app: #f8fafc;
$color-bg-card: #ffffff;
$color-bg-overlay: rgba(15, 23, 42, 0.4);

$color-text-primary: #0f172a;
$color-text-secondary: #475569;
$color-text-muted: #94a3b8;

$color-border: #e2e8f0;
$color-border-subtle: #f1f5f9;
$color-border-focus: #2357fe;

// Status Colors
$color-success: #10b981;
$color-success-bg: #ecfdf5;
$color-warning: #f59e0b;
$color-warning-bg: #fffbeb;
$color-danger: #ef4444;
$color-danger-bg: #fef2f2;

// 2. Shadows & Glows
$shadow-sm: 0 2px 4px rgba(15, 23, 42, 0.04);
$shadow-md: 0 6px 16px -2px rgba(15, 23, 42, 0.06);
$shadow-lg: 0 12px 32px -4px rgba(15, 23, 42, 0.08);
$shadow-primary-btn: 0 8px 20px -4px rgba(35, 87, 254, 0.45);
$shadow-primary-hover: 0 12px 25px -4px rgba(35, 87, 254, 0.55);

// 3. Border Radiuses
$radius-sm: 6px;
$radius-md: 10px;
$radius-lg: 16px;
$radius-xl: 24px;
$radius-pill: 9999px;

// 4. Transitions
$transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
$transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 5. Summary of Visual Guidelines

1. **High Contrast Typography:** Deep slate (`#0F172A`) titles on pure white (`#FFFFFF`) card backgrounds deliver crisp readability.
2. **Vibrant Primary Accents:** Electric Royal Blue (`#2357FE`) commands attention on primary action buttons, key indicators, and active navigation states.
3. **Soft Glowing Lighting:** Ambient drop-shadows using transparent primary blue (`rgba(35, 87, 254, 0.35)`) give cards and buttons a premium, modern depth.
4. **Clean Pill Badges:** Pill-shaped badges with soft ice-blue tint (`#EEF3FF`) highlight company stats, status indicators, and category tags.
