# Pay365 — Landing Page Build Plan

**Date:** 2026-09-05
**Reference:** `automle-framer-website-design.md` (Automly Framer template analysis) — same section rhythm, layout DNA, and conversion-first structure, rebranded for Pay365.
**Design system:** `docs/Implementation plan/DESIGN.md` (Electric Royal Blue `#2357FE`)
**Target:** Public marketing landing page at `/` in the React SPA, ahead of the authenticated app (`/login`, `/dashboard`).
**Copy note:** All copy below is original Pay365 content written to fill the reference structure — no text is copied from the reference site.

---

## 1. Section Map (Reference → Pay365)

| # | Automly section | Pay365 section | Anchor |
|---|---|---|---|
| S0 | Minimal top nav | Glassmorphic floating navbar (DESIGN.md §3.5) | — |
| S1 | Hero: badge + serif headline + 2 CTAs + product shot | Hero: pill badge + display headline + 2 CTAs + dashboard mockup | — |
| S2 | Pain: "Why HR Needs Automation" — 3 cards | Pain: "Why HR Teams Still Live in Spreadsheets" — 3 cards | `#pain` |
| S3 | Features: 3 blocks with screenshots + proof strip | Features: 3 blocks with product mockups + proof strip | `#features` |
| S4 | Process: 4 simple steps | Process: "From Setup to Payslip in 4 Steps" | `#process` |
| S5 | Results: 3 stat counters | Results: 3 product-truth stat counters | `#results` |
| S6 | Pricing: 2 cards with checklists | Pricing: 2 cards with module checklists | `#pricing` |
| S7 | FAQ: 5 questions | FAQ: 5 questions | `#faq` |
| S8 | CTA band: "Build Yours" | CTA band: "Every Payroll Team Is Different" | — |
| S9 | Footer: logo + links + copyright | Footer: logo + nav columns + copyright | — |

---

## 2. Brand Tokens (override the reference palette — Pay365 wins)

| Role | Automly value | **Pay365 value** | Usage |
|---|---|---|---|
| Primary action | `#4671FA` | **`#2357FE`** | Primary CTAs, brand emphasis, active nav |
| Primary hover | — | **`#1A46D8`** | Button hover darkening |
| Accent / links | `#527AFF` | **`#5B86FF`** | Text links, gradient stops, highlights |
| Subtle tint | — | **`#EEF3FF`** | Pill badges, selected rows, icon wrappers |
| Background | `#FFFFFF` | **`#FFFFFF`** (app bg `#F8FAFC`) | Page + cards |
| Heading text | `#000000` | **`#0F172A`** | Headings (deep slate, softer than pure black) |
| Body text | `#000000` | **`#475569`** | Paragraphs, helper text |
| Border | `#E5E7EB` | **`#E2E8F0`** | Cards, dividers, inputs |
| Success / Warning / Danger | — | `#10B981` / `#F59E0B` / `#EF4444` | Status accents only |

All tokens already exist in `frontend/src/styles/_variables.scss` — the landing page imports them; no new colors are introduced.

## 3. Typography (Pay365 system, editorial scale from the reference)

| Role | Font | Size (desktop) | Weight | Notes |
|---|---|---|---|---|
| Hero headline | Bricolage Grotesque | 72–80px | 700, tight (-0.02em) | Two-line editorial headline, one phrase accent-colored |
| Section heading | Bricolage Grotesque | 36–40px | 700 | Every section: eyebrow label + heading |
| Eyebrow label | Bricolage Grotesque | 13px | 600, uppercase, +0.08em | `#2357FE`, e.g. "THE PROBLEM", "FEATURES" |
| Body | Inter (fallback: system sans) | 17–18px | 400 | Larger-than-average body for premium feel |
| Card title | Bricolage Grotesque | 20–22px | 600 | |
| Caption / fine print | Inter | 13–14px | 400 | `#94A3B8` |

**Optional swap for a closer reference feel:** use *Instrument Serif* for the hero + section headings only (Automly's editorial trick), keeping Bricolage Grotesque for UI. Decide once at build start; do not mix mid-build.

## 4. Section-by-Section Specification

### S0 — Navbar (glassmorphic, DESIGN.md §3.5)
- Fixed, `max-width: 1240px`, `rgba(255,255,255,0.85)` + `backdrop-filter: blur(16px)`, radius `50px`, border `rgba(226,232,240,0.85)`.
- Scroll shrink: `scrollY > 60` → `max-width: 860px`, transition `0.45s cubic-bezier(0.4,0,0.2,1)`.
- Left: logo mark (`logo.svg` in `#EEF3FF` wrapper) + "Pay365" wordmark `#0F172A`.
- Center links: `Features` `How It Works` `Pricing` `FAQ` — anchor scroll, `#2357FE` animated underline on hover.
- Right: primary pill CTA **"Get Started"** (gradient `135deg #2357FE → #1D4ED8`, white text, glow shadow) → `/login`.
- Mobile: links collapse into a slide-down sheet; CTA stays visible.

### S1 — Hero
- Layout: centered stack — pill badge, headline, subcopy, CTA pair, product mockup below.
- Badge (pill, `#EEF3FF` bg, `#2357FE` text, border `rgba(35,87,254,0.2)`): **"Employee to payslip — one connected flow"**
- Headline (2 lines): **"HR & Payroll That Finally Works Together"** — accent the second line or the word "Together" in `#2357FE`.
- Subcopy (max 640px, centered): **"Employees, contracts, attendance, leave, and salary rules — connected into computed, validated payslips. No spreadsheets, no copy-paste, no month-end chaos."**
- CTAs: primary **"Launch Payroll"** → `/login` · secondary ghost **"Explore Features"** → `#features`.
- Product proof: rounded-16px dashboard mockup (KPI cards + payslip table) in a soft `#EEF3FF` glow container. Build a static JSX mockup with real Pay365 data shapes — no screenshot dependency.

### S2 — Pain (`#pain`) — eyebrow: "THE PROBLEM"
- Heading: **"Why HR Teams Still Live in Spreadsheets"**
- 3 cards (white, border `#E2E8F0`, radius 16px, icon in `#EEF3FF` wrapper):
  1. **Disconnected Records** — "Employees, contracts, and attendance live in different files. Payroll spends its days stitching them together by hand."
  2. **Manual Salary Math** — "Every allowance, deduction, and formula recalculated by hand each month — and one wrong cell becomes a wrong payslip."
  3. **Leave Balance Chaos** — "Approvals in chat, balances in someone's head. Nobody knows who has how many days left until it's already gone."

### S3 — Features (`#features`) — eyebrow: "FEATURES"
- Heading: **"Everything Connected. Nothing Manual."**
- 3 alternating two-column blocks (copy ↔ mockup), each: title + 2-line body + 3 mini bullet chips:
  1. **The Employee Hub** — "One record connects contracts, schedules, attendance, and leave. Smart buttons jump to everything that matters." Chips: `Contracts` `Attendance` `Leave balances`
  2. **Rules That Do the Math** — "Define salary rules once — fixed, percentage, or formula. They execute in sequence and compute every payslip the same way, every time." Chips: `Fixed` `Percentage` `Formula`
  3. **Payruns on Rails** — "Pick a structure and a period, select your team, and get rule-by-rule payslips with warnings surfaced before you validate." Chips: `Compute` `Validate` `Mark Paid`
- Proof strip under the blocks (pill row, `#EEF3FF`): **"Rule-driven payslips · Live dashboard · 5-role access control"**

### S4 — Process (`#process`) — eyebrow: "HOW IT WORKS"
- Heading: **"From Setup to Payslip in 4 Steps"**
- 4 numbered step cards (01–04, number in `#2357FE`):
  1. **Build Your Org** — "Add employees, departments, contracts, and working schedules. Weekly hours compute themselves."
  2. **Track Time & Leave** — "Attendance and time off capture the daily reality — with balances that update on approval."
  3. **Configure Salary Rules** — "Set up your structure once: basic, allowances, deductions — fixed, percentage, or formula, in execution order."
  4. **Run the Payrun** — "Select the period and your people. Compute, review warnings, validate, mark paid, send payslips."

### S5 — Results (`#results`) — eyebrow: "WHY PAY365"
- Heading: **"Built on Truth, Not Mockups"**
- 3 stat counters (large `#2357FE` numerals):
  - **100%** — "of payslips computed by configurable salary rules — zero hardcoded amounts"
  - **5** — "roles with enforced access control, from Employee to Admin"
  - **0** — "static numbers on the dashboard — every metric is a live query"

### S6 — Pricing (`#pricing`) — eyebrow: "PRICING"
- Heading: **"Built to Scale With Your Team"**
- 2 cards, checklist style (check icon `#10B981`):
  - **Growth** — "For teams that want the full HR & payroll flow out of the box." CTA: **Start Free** → `/login`
    - Employees, contracts & working schedules
    - Attendance with corrections & audit trail
    - Time off with allocations & auto-deduction
    - Salary structures with sequenced rules
    - Two-step payruns with warnings
    - Payslip PDF & bulk email delivery
    - Live payroll dashboard
  - **Enterprise** — "For organizations that need custom structures and controls." CTA: **Book a Call** (secondary style)
    - Custom salary structures & rule sets
    - Advanced RBAC & audit requirements
    - Multi-department analytics & exports
    - Dedicated onboarding & support
    - Integration with existing HRIS tools
    - Continuous optimization
- Fine print under cards: "Pricing shown for demonstration — Pay365 is a hackathon build."

### S7 — FAQ (`#faq`) — eyebrow: "FAQ"
- 5 accordion items (one open at a time, chevron rotates):
  1. **How are payslips calculated?** — "By salary rules you configure — fixed amounts, percentages of any earlier rule, or formulas. Rules execute in sequence, and every payslip line shows exactly which rule produced it."
  2. **What happens if employee data is incomplete?** — "Pay365 warns before it hurts: missing bank details, missing contracts, or duplicate payslips are surfaced as warnings on the payrun before you're allowed to validate."
  3. **Does payroll use the right contract?** — "Yes. Payslips always use the active contract valid for the pay period. If none or several match, the payrun raises an error instead of guessing."
  4. **Who can see what?** — "Five roles with enforced boundaries: employees see their own data, HR managers run people operations, payroll users run payruns, payroll managers control salary config and finalization."
  5. **Is the dashboard real data?** — "Every KPI, chart, and alert is a live query over employees, attendance, leave, and payroll records — filtered by period, department, and employee type."

### S8 — CTA Band
- Full-width `#EEF3FF` band, radius 24px: heading **"Every Payroll Team Is Different"**, subcopy **"Configure your own structures, rules, and flows — or explore the full platform with seeded demo data."**, CTAs: primary **"Get Started"** → `/login` · ghost **"Request Custom Setup"** → mailto.

### S9 — Footer
- White, top border `#E2E8F0`. Left: logo + "Pay365" + one-liner "Modern HR & Payroll Operations Platform."
- Columns: **Product** (Features, How It Works, Pricing, FAQ — anchors) · **Get Started** (Launch App → `/login`, Demo Logins → `/login`) · **Contact** (Support → mailto).
- Bottom row: "All Rights Reserved © 2026 Pay365" + "Built for the PeoplePay365 HR & Payroll hackathon brief."

---

## 5. Component Inventory & File Targets

```
frontend/src/
├── app/
│   ├── router.jsx                  # add public routes: / (Landing), keep /login
│   └── layout/
│       └── LandingNavbar.jsx       # S0 (glassmorphic, scroll shrink)
├── features/landing/
│   ├── pages/
│   │   └── LandingPage.jsx         # composes S1–S9
│   ├── components/
│   │   ├── Hero.jsx                # S1
│   │   ├── PainSection.jsx         # S2
│   │   ├── FeatureBlocks.jsx       # S3
│   │   ├── ProcessSteps.jsx        # S4
│   │   ├── StatsBand.jsx           # S5
│   │   ├── PricingCards.jsx        # S6
│   │   ├── FaqAccordion.jsx        # S7
│   │   ├── CtaBand.jsx             # S8
│   │   ├── LandingFooter.jsx       # S9
│   │   └── DashboardMockup.jsx     # static JSX product mockup (S1, S3)
│   └── styles/                     # landing.scss (imports _variables.scss)
└── components/ui/                  # reuse: Button, Badge, Card where possible
```

Rules: landing components are presentational (no API calls except none — fully static); reuse `components/ui` primitives; all styles via SCSS tokens from `_variables.scss`; smooth anchor scrolling via `scroll-behavior: smooth` + `scroll-margin-top` per section.

## 6. Responsive Behavior

| Breakpoint | Changes |
|---|---|
| Mobile `< 768px` | Single column; hero headline ~40px; CTAs full-width stacked; feature blocks stack (copy above mockup); pricing cards stack; navbar collapses to sheet |
| Tablet 768–1024px | Two-column feature blocks preserved; stats row 3-across; pricing 2-across if ≥ 900px else stacked |
| Desktop `> 1024px` | Full editorial layout: 72–80px hero, alternating feature rows, 3-across pain/process/stats grids |

Touch targets ≥ 44px; section vertical padding 96px desktop / 64px mobile.

## 7. Interaction Patterns

- Navbar: scroll-shrink (DESIGN.md §3.5), anchor links with animated underline.
- Buttons: primary lifts `translateY(-2px)` + glow intensifies on hover; secondary darkens border.
- Cards: subtle border-color shift + `shadow-md` on hover; no heavy elevation.
- FAQ accordion: height transition `250ms`, chevron rotate.
- Stats: count-up animation on first scroll into view (IntersectionObserver, runs once).
- Scroll reveal: sections fade-up 12px once (`prefers-reduced-motion` respected).
- No parallax, no neon, no heavy glassmorphism beyond the navbar — matches the reference's restraint.

## 8. Asset Mapping

| Asset | Source | Used in |
|---|---|---|
| `frontend/src/assets/pay365-banner.png` | existing | optional hero fallback / OG image |
| `frontend/src/assets/logo.svg` (pick 1 of 3) | existing | navbar + footer brand mark |
| Dashboard mockup | build as JSX (`DashboardMockup.jsx`) with real data shapes | S1, S3 |

## 9. Acceptance Criteria

- [ ] All 10 sections present in reference order (S0–S9), anchors scroll smoothly
- [ ] Colors exclusively from `_variables.scss` tokens — zero hardcoded hex in components
- [ ] Navbar shrinks on scroll; CTA routes to `/login`
- [ ] Hero mockup is JSX (crisp at any zoom), not a raster screenshot
- [ ] FAQ accordion: one open at a time, keyboard accessible (Enter/Space, focus ring `#2357FE`)
- [ ] Stats count up once on scroll; `prefers-reduced-motion` disables all animation
- [ ] Fully responsive at 375px / 768px / 1280px with no horizontal overflow
- [ ] Lighthouse accessibility ≥ 90 on the landing route
- [ ] No emoji in any landing copy; tone matches README (confident, plain, professional)
- [ ] All copy is original Pay365 content per this plan — no text lifted from the reference site
