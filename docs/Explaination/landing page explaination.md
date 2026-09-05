# Pay365 Landing Page — Complete Code Explanation

**Date:** 2026-09-05
**Scope:** Every file that renders the landing page at `/` — explained file-by-file and function-by-function, at line level, for hackathon review.
**Code state:** Matches the working tree as of this date (including manual edits: the inline headline glyph and the bottom-of-hero "Pain" pill were removed from `Hero.jsx`).

---

## 0. How the Page Renders (the 30-second version)

```
index.html                  loads fonts, has <div id="root">
  └── src/main.jsx          creates the React root, wraps <Providers> around <Router>
        └── app/router.jsx  maps URL "/" → <LandingPage>
              └── features/landing/pages/LandingPage.jsx
                    ├── <Navbar/>                (shared glassmorphic nav)
                    ├── <Hero/>                  (two-column hero + floating cards)
                    ├── <PainSection/>           (3 problem cards)
                    ├── <FeatureBlocks/>         (3 alternating feature rows)
                    ├── <ProcessSteps/>          (4 numbered steps)
                    ├── <StatsBand/>             (animated count-up stats)
                    ├── <PricingCards/>          (2 plan cards)
                    ├── <FaqAccordion/>          (5 accessible accordions)
                    ├── <CtaBand/>               (closing call-to-action)
                    └── <LandingFooter/>         (footer)
```

Every section is a **presentational component**: no API calls, no global state. The only stateful logic on the page is (a) the FAQ open/close index, (b) the stats count-up, and (c) the scroll-reveal hook. Everything else is static JSX driven by module-level constant arrays.

---

## 1. `index.html` — document shell & fonts

| Line(s) | Code | Explanation |
|---|---|---|
| 1 | `<!doctype html>` | Tells the browser to render in standards mode (without it, legacy quirks mode changes box-model behavior). |
| 2 | `<html lang="en">` | Declares document language — used by screen readers for pronunciation and by translation tools. |
| 4 | `<meta charset="UTF-8" />` | Unicode encoding — required so the rupee sign (₹) and em-dashes render correctly. |
| 5 | `<meta name="viewport" ...>` | `width=device-width, initial-scale=1.0` makes the page responsive on mobile; without it phones render a zoomed-out 980px desktop layout. |
| 6 | `<title>Pay365 — HR & Payroll</title>` | Browser tab text; also the default text search engines and link previews show. |
| 7–8 | `<link rel="preconnect">` ×2 | Hints the browser to open early connections to Google Fonts' HTML and font-file hosts, cutting ~100–300ms off font load. |
| 9 | Google Fonts stylesheet | Loads two families in one request: **Bricolage Grotesque** (variable font, optical size 12–96, weights 200–800 — used for everything) and **Instrument Serif** (regular + italic — used for the italic badge accent and the chart watermark). `display=swap` means text renders immediately in a fallback font and swaps once loaded (no invisible-text period). |
| 11–14 | `<div id="root">` + module script | React mounts into `#root`. `type="module"` makes the browser treat the script as an ES module (deferred by default, imports resolved by Vite). |

---

## 2. `src/main.jsx` — React entry point

```jsx
import React from 'react';                                  // L1 — React namespace (JSX transform + StrictMode)
import ReactDOM from 'react-dom/client';                    // L2 — the React 18+ concurrent root API
import Providers from './app/providers.jsx';                // L3 — wraps Redux store + React Query client
import Router from './app/router.jsx';                      // L4 — the route table
import './styles/main.scss';                                // L5 — global stylesheet (imports _variables, _base)

ReactDOM.createRoot(document.getElementById('root')).render(// L7 — create a concurrent root on #root
  <React.StrictMode>                                        // L8 — dev-only double-render to surface impure code
    <Providers>                                             // L9 — store/query context available everywhere
      <Router />                                            // L10 — renders the matched route
    </Providers>
  </React.StrictMode>
);
```

- **L7 `createRoot`** is the React 18+ API (the old `ReactDOM.render` is legacy). It enables concurrent features and better batching.
- **L8 `StrictMode`** does not affect production; in dev it renders components twice and runs effects twice so that missing cleanup or impure render logic shows up as bugs immediately.
- **L9 `Providers`** supplies Redux (`react-redux` Provider) and TanStack Query's client. The landing page itself uses neither, but the authenticated app does — one wrapper serves both.

## 3. `src/app/router.jsx` — URL → component mapping

```jsx
<Route path="/" element={<LandingPage />} />               // public marketing page
<Route path="/login" element={<LoginPage />} />            // public login
<Route element={<RequireAuth />}>                          // guard: redirects to /login if no session
  <Route element={<AppShell />}>                           // authenticated layout (top nav + outlet)
    <Route path="/dashboard" element={<DashboardPage />} />
    ... one route per module ...
  </Route>
</Route>
<Route path="*" element={<Navigate to="/dashboard" replace />} />  // 404 fallback
```

- Routes are matched **exact by default** in React Router v6/v7.
- `RequireAuth` is a layout-route: it renders an `<Outlet/>` only when authenticated, otherwise `<Navigate to="/login"/>`. Because it wraps `AppShell`, every child route inherits both the guard and the shell.
- `replace` on the fallback means the bad URL is replaced in history — pressing Back won't return to the dead URL.

---

## 4. `features/landing/pages/LandingPage.jsx` (31 lines) — page composition

| Line(s) | Code | Explanation |
|---|---|---|
| 1 | `import React from 'react'` | Provides JSX runtime context. (With Vite's automatic JSX transform this import is technically optional, but it is harmless and conventional.) |
| 2 | `import Navbar from '../../../components/layout/Navbar.jsx'` | The shared glassmorphic navbar. Path climbs 3 levels: `landing/pages/` → `landing/` → `features/` → `src/`, then into `components/layout/`. |
| 3–11 | Section imports | One import per landing section. All live in `../components/` (i.e. `features/landing/components/`). |
| 12 | `import '../styles/landing.scss'` | The entire landing stylesheet. Vite's SCSS plugin compiles it to CSS and injects it — importing it here guarantees the styles load exactly when the landing page is used. |
| 14 | `export default function LandingPage()` | Default export so route files can `import LandingPage from '...'` without braces. A plain function component — no props, no state. |
| 16 | `<div className="landing">` | Root wrapper. `.landing` sets the page background, text color, base font, and `overflow-x: hidden` (clips any accidental horizontal overflow from the rotated hero cards). All landing CSS is scoped under `.landing` so it cannot leak into the authenticated app. |
| 17 | `<Navbar />` | Fixed-position nav (out of normal flow — hence the hero's large top padding). |
| 18–27 | `<main>` + 8 sections | `<main>` is a landmark — screen readers jump to it with the main-content shortcut. Sections render in visual order; each one carries its own `id` anchor (`#pain`, `#features`, `#process`, `#results`, `#pricing`, `#faq`) that the navbar and footer links scroll to. |
| 28 | `<LandingFooter />` | `<footer>` landmark, after the main content. |

**Why no `React.memo`?** Nothing here re-renders frequently — the parent never changes props, so memoization would add noise with zero benefit.

---

## 5. `features/landing/hooks/useReveal.js` (32 lines) — scroll-reveal hook

**Purpose:** every section fades/slides in the first time it enters the viewport. Returns a ref you attach to the element that should reveal.

```js
import { useEffect, useRef } from 'react'                   // L1 — the two hooks we need

export default function useReveal() {                       // L5 — custom hook (name starts with "use" so React's lint rules recognize it)
  const ref = useRef(null)                                  // L6 — a stable box to hold a DOM node across renders.
                                                            //      useRef does NOT trigger a re-render when set — exactly what we want for DOM refs.

  useEffect(() => {                                         // L8 — runs AFTER mount (DOM node exists), and again only if the deps array changes
    const el = ref.current                                  // L9 — read the attached DOM element
    if (!el) return undefined                               // L10 — defensive: ref not attached (shouldn't happen) → do nothing.
                                                            //       Returning undefined keeps the effect's return type consistent (a cleanup function or nothing).

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                                                            // L12 — media query: has the user asked the OS to minimize motion?
      el.classList.add('is-visible')                       // L13 — yes → skip the animation entirely: show content immediately
      return undefined                                     // L14 — and never start an observer (accessibility, not decoration)
    }

    const observer = new IntersectionObserver(             // L17 — browser API that fires a callback when an element's
                                                           //      visibility crosses thresholds — WITHOUT scroll events.
      ([entry]) => {                                       // L18 — callback receives a list of records; we observe one element, so destructure the first
        if (entry.isIntersecting) {                        // L19 — true when any part of the element is inside the viewport
          el.classList.add('is-visible')                   // L20 — add the class; CSS transitions opacity/transform from hidden → shown
          observer.disconnect()                            // L21 — stop observing: the reveal runs ONCE. Without this, the class
                                                           //       add would fire on every scroll pass (harmless but wasteful).
        }
      },
      { threshold: 0.15 }                                  // L24 — fire when ≥15% of the element is visible.
                                                           //       0 = the instant one pixel appears (too twitchy);
                                                           //       1 = wait for the whole element (never fires for tall sections).
    )

    observer.observe(el)                                   // L27 — start watching the element
    return () => observer.disconnect()                     // L28 — CLEANUP: when the component unmounts (or deps change),
  }, [])                                                   // L29 — tear down the observer. Empty deps = run once on mount.
                                                           //       Skipping this cleanup is the classic IntersectionObserver memory leak.

  return ref                                               // L31 — hand the ref to the caller: <div ref={ref} className="reveal">
}
```

**How it connects to CSS** (`landing.scss` L65–74):
```scss
.reveal { opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s ease; }
.reveal.is-visible { opacity: 1; transform: translateY(0); }
```
The element starts invisible and shifted down 14px. When `.is-visible` lands, the transition animates both properties over 0.6s. The hook only toggles a class — all motion lives in CSS, which is why `prefers-reduced-motion` can neutralize it in one media query.

**Why IntersectionObserver instead of a scroll listener?** Scroll listeners run on every scroll frame and force layout reads (`getBoundingClientRect`). The observer is asynchronous, runs off the main rendering path, and is the standard tool for "did this element become visible" logic.

---

## 6. `features/landing/components/Hero.jsx` (65 lines) — hero section

**Your manual edits reflected here:** the inline blue glyph inside the headline and the bottom "Pain" pill were removed; the headline is now plain text.

| Line(s) | Code | Explanation |
|---|---|---|
| 1 | `import React from 'react'` | JSX runtime. |
| 2 | `import { Link } from 'react-router-dom'` | Router-aware anchor. `<Link to="/login">` does client-side navigation (no full page reload) and keeps the SPA state alive — a raw `<a href="/login">` would reload the whole app. |
| 3–11 | lucide-react imports | `Send` (paper-plane CTA icon), `Sparkles` (badge icon), and `Circle, Layers, Triangle, Hexagon, Aperture` — the five fake partner-logo glyphs. lucide-react ships tree-shakeable ES modules, so only these icons are bundled. |
| 12 | `import HeroVisual from './HeroVisual.jsx'` | The right-column floating-cards composition (section 7). |
| 13 | `import useReveal from '../hooks/useReveal.js'` | Scroll-reveal hook (section 5). |
| 15–21 | `const LOGOS = [...]` | Module-level constant — created **once when the module loads**, not on every render (it never changes, so it must not live inside the component). Each entry pairs a display name with a lucide icon **component** (`Icon` is a capitalized property so it can be rendered as `<logo.Icon/>` — JSX requires capitalized elements to treat a variable as a component). |
| 23 | `export default function Hero()` | The section component. |
| 24 | `const ref = useReveal()` | Gets the reveal ref for the copy column. |
| 27 | `<section className="lp-hero">` | Section wrapper. `.lp-hero` is a full-viewport flex column (`min-height: 100vh`) with 150px top padding so content clears the fixed navbar. |
| 28 | `<div className="lp-container lp-hero-grid">` | `.lp-container` = centered 1240px max-width column. `.lp-hero-grid` = the two-column grid (`1.02fr 0.98fr`) that places copy left, visual right. |
| 29 | `<div className="lp-hero-copy reveal" ref={ref}>` | Left column; starts hidden (`.reveal`) and the hook adds `.is-visible` on first view. |
| 30–33 | Badge | `<span className="lp-hero-badge">` is the blue-tinted pill. `<Sparkles size={14} strokeWidth={2.4}/>` renders an inline SVG (lucide props: `size` sets width/height, `strokeWidth` the stroke thickness). `<em>` holds the italic serif text — `.lp-hero-badge em` styles it with Instrument Serif italic in brand blue. `<em>` (not `<i>`) because it also carries semantic emphasis. |
| 34–38 | Headline | `<h1>` — exactly one per page (SEO + accessibility). `<br/>` forces the two-line break: "Payroll That Does" / "The Heavy Lifting". `.lp-hero-title` uses `clamp(44px, 5.2vw, 78px)` — fluid type that scales with the viewport between bounds. |
| 39–42 | Subcopy | `<p className="lp-hero-sub">` — max-width 470px keeps the line length readable (~60 characters). |
| 43–49 | CTA pair | `<Link to="/login">` primary button (client-side nav to the app). `<a href="#features">` secondary — a plain in-page anchor; the browser jumps to the element with `id="features"`, and `html { scroll-behavior: smooth }` (landing.scss L11–13) makes the jump animated. |
| 50–59 | Logo strip | Outer `.lp-logo-strip` has `overflow: hidden` + a CSS `mask-image` gradient (transparent → opaque → transparent) so logos fade out at both edges. Inner `.lp-logo-track` is `width: max-content` (as wide as its content) with an infinite `lpMarquee` animation. `[...LOGOS, ...LOGOS]` (L52) duplicates the array — the marquee translates the track −50%, so with the list doubled the loop is seamless (when the first copy fully exits, the second copy is exactly where the first started). `key={`${logo.name}-${index}`}` (L53) — name alone would collide across the two copies, so the index makes every key unique (React uses keys to match list items between renders). `<logo.Icon/>` (L54) renders the stored icon component; lowercase `logo.` with capitalized `.Icon` is what makes JSX treat it as a component. The whole strip is `aria-hidden="true"` (L50) — it is decorative fiction, so screen readers skip it. |
| 61 | `<HeroVisual />` | Right column composition (next section). |

---

## 7. `features/landing/components/HeroVisual.jsx` (77 lines) — floating cards + chart

| Line(s) | Code | Explanation |
|---|---|---|
| 1 | `import React from 'react'` | JSX runtime — no other imports; this component is pure markup. |
| 3–20 | `const PAYRUN_ROWS` | Module constant: two demo rows for the "Payrun" card. Each row: `initials` (avatar text), `tone` (avatar color class), `name`, `role`, `pill` (status text), `pillClass` (pill color class). |
| 22–39 | `const LEAVE_ROWS` | Same shape for the "Leave" card — note `pillClass: 'fv-pill--dark'` on the last row, which is why one pill renders dark instead of blue. |
| 41 | `const BARS = [42, 68, 55, 82, 48, 92, 60]` | Seven bar heights as **percentages** of the chart height — the irregular pattern is what makes it read as a real chart rather than a decoration. |
| 43–59 | `function PersonCard({ title, rows })` | Reusable card — one definition renders both cards. |
| 45 | `` className={`fv-card fv-card--${title.toLowerCase()}`} `` | Template literal builds the BEM modifier from the title: `"Payrun"` → `fv-card--payrun`, `"Leave"` → `fv-card--leave`. The SCSS uses those exact modifiers for position and rotation, so **the title string doubles as the layout instruction**. |
| 46 | `<div className="fv-card-title">{title}</div>` | The gray card heading. |
| 47–56 | Row list | `rows.map(...)` renders one `.fv-row` per person: `key={row.name}` (names are unique within a card), avatar span with initials + tone class, name/role block, and the status pill with its color class. |
| 62 | `export default function HeroVisual()` | The composition root. |
| 64 | `<div className="lp-hero-visual" aria-hidden="true">` | `aria-hidden="true"` hides the entire composition from screen readers — it is decorative marketing imagery containing fake data; announcing it would be noise. `.lp-hero-visual` is `position: relative; min-height: 560px` — the positioning context the absolute cards anchor to. |
| 65–66 | Two `<PersonCard/>` | "Payrun" (top-right, rotated +7°, z-index 3) and "Leave" (mid-left, rotated −5°, z-index 2) — the overlap + opposite rotations create the floating collage depth. |
| 67–74 | Chart | `.fv-chart` is absolutely positioned along the bottom. `<span className="fv-chart-label">Payroll</span>` is the ghost watermark (italic serif, 16% opacity). `BARS.map(...)` renders seven `.fv-bar` spans; `style={{ height: `${height}%` }}` sets each bar's height inline from the constant (inline because the value is data-driven — the pattern would otherwise need seven CSS classes). Bars are `flex: 1` so they share width equally, and their gradient fades to transparent at the bottom. |

---

## 8. `features/landing/components/PainSection.jsx` (47 lines) — problem cards

| Line(s) | Code | Explanation |
|---|---|---|
| 2 | `import { FolderX, Calculator, CalendarX } from 'lucide-react'` | The three card icons. |
| 5–21 | `const PAINS = [...]` | Module constant: icon component + title + body per card. Keeping copy in a data array means the JSX below is a single `.map()` — adding a fourth pain card is a one-line data change. |
| 23–24 | Component + `useReveal()` | Same reveal pattern as the hero. |
| 27 | `<section id="pain" ...>` | The `id="pain"` anchor is what the navbar's "Pain"-era links and any `#pain` hash target scroll to. `scroll-margin-top: 120px` (on `.lp-section`) stops the fixed navbar from covering the heading after an anchor jump. |
| 30–31 | Eyebrow + heading | `.lp-eyebrow` = small uppercase blue label ("THE PROBLEM"); `.lp-heading` = the section `<h2>`. Heading levels step down correctly: one `h1` (hero) → `h2` per section → `h3` per card. |
| 33 | `{PAINS.map(({ icon: Icon, title, body }) => ...)}` | Destructures each pain object **and renames `icon` → `Icon`** in the pattern — capitalizing it so line 36 can render `<Icon/>` as a component. |
| 34 | `<article className="lp-card" key={title}>` | `<article>` = a self-contained composition (semantically better than `<div>` for a card). `key={title}` — titles are unique and stable. |
| 35–41 | Card internals | Icon in a tinted square (`.lp-card-icon`), `<h3>` title, `<p>` body. |

---

## 9. `features/landing/components/FeatureBlocks.jsx` (128 lines) — feature rows with mini mockups

| Line(s) | Code | Explanation |
|---|---|---|
| 4 | `const inr = (n) => ...` | Indian-rupee formatter: `` `\u20B9${n.toLocaleString('en-IN')}` `` — `\u20B9` is the ₹ character escape; `toLocaleString('en-IN')` applies Indian digit grouping (50000 → "50,000"; 63000 → "63,000"). Module-level because it is pure and stateless. |
| 6–32 | `function EmployeeMini()` | Static mini employee card: avatar circle with initials, name/role header, then three `.mini-row` rows (Contracts / Attendance / Leave balance). `mini-row--end` right-aligns the meta text (the SCSS modifier). All data is hardcoded — it is a picture of the product, not the product. |
| 34–40 | `const RULE_ROWS` | The spec's canonical salary example as data: BASIC 50,000 (wage) → HRA 10,000 (20% of BASIC) → GROSS 63,000 → PF −6,000 (12% of BASIC) → NET 55,000. `\u2212` is the typographic minus sign. This is the exact sequence the real engine executes — the marketing mockup and the backend contract show the same numbers. |
| 42–57 | `function RulesMini()` | Renders `RULE_ROWS` as code/meta/amount rows. Line 51 is the interesting one: `` className={`amt${rule.amount < 0 ? ' amt--neg' : ''}`} `` — a conditional class: deductions get `amt--neg` (red). The amount itself renders via `inr(rule.amount)`; negative values display as "−₹6,000" because `toLocaleString` keeps the sign. |
| 59–71 | `function PayrunMini()` | Static payrun card: caption + three state chips (`mini-step--done` ×2 green, `mini-step--current` blue) + an amber warning strip — visually teaching the Compute → Validate → Mark Paid lifecycle and the warnings feature. |
| 73–92 | `const FEATURES` | The three feature rows as data. `Mock` holds a **component reference** (`EmployeeMini` etc.) — same capitalization trick as `logo.Icon`. |
| 94–95 | Component + reveal | Standard pattern. |
| 98 | `<section id="features" className="lp-section lp-section--tint">` | `--tint` gives this section the light-gray background so alternating sections create rhythm. This is the `#features` anchor the hero's "Learn more" button targets. |
| 105 | `{FEATURES.map(({ title, body, chips, Mock }) => ...)}` | Destructures including the `Mock` component. |
| 106–120 | Row rendering | `.lp-feature-row` is a 2-column grid; the SCSS `&:nth-child(even) { .lp-feature-copy { order: 2 } }` flips the copy/mock sides on every second row (the alternating editorial pattern) purely in CSS. `<Mock />` renders whichever mini mockup the data assigned. |
| 122–124 | Proof strip | Centered pill with the three trust claims. |

---

## 10. `features/landing/components/ProcessSteps.jsx` (49 lines) — 4-step how-it-works

The simplest section — the pattern to learn from:

- **L4–25 `const STEPS`** — four objects with `num` (the printed "01"–"04"), `title`, `body`.
- **L27–28** — component + reveal ref.
- **L31** — `<section id="process">` (the navbar's "How It Works" target).
- **L37–44** — `STEPS.map(...)` renders `.lp-step` cards: the big blue number (`.lp-step-num`), `<h3>` title, `<p>` body. `key={step.num}` — the numbers are unique and stable.

No state, no effects, no icons — pure data → markup mapping.

---

## 11. `features/landing/components/StatsBand.jsx` (84 lines) — animated count-up

The most logic-dense component. Two effects + one render.

**L4–8 `const STATS`** — three stat objects. The values are product truths (100% rule-driven, 5 roles, 0 static dashboard numbers), not vanity metrics.

**L10 `const COUNT_DURATION_MS = 1200`** — animation length in ms. Named constant instead of a magic number buried in the effect.

**L12–16 — state setup**
```jsx
const sectionRef = useReveal()          // L13 — reveal for the whole block (same hook as everywhere else)
const statsRef = useRef(null)           // L14 — separate ref on the stats grid; the count-up triggers when THIS becomes visible
const [started, setStarted] = useState(false)            // L15 — has the count-up been triggered?
const [display, setDisplay] = useState(() => STATS.map(() => 0))  // L16 — the numbers currently on screen
```
- L16 uses a **lazy initializer** — the function form `useState(() => ...)` runs the factory once on the first render only, instead of computing the initial array on every render. (Trivial cost here, but it is the correct habit.)
- Two refs on purpose: `sectionRef` drives the fade-in; `statsRef` drives the counting. They fire at different thresholds, so they are separate concerns.

**L18–39 — Effect 1: trigger when visible**
```jsx
useEffect(() => {
  const el = statsRef.current                    // L19 — the grid node
  if (!el) return undefined                      // L20 — guard
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setStarted(true)                             // L23 — reduced motion → skip straight to "started",
    return undefined                             // L24 —   and effect 2 will snap values to their finals
  }
  const observer = new IntersectionObserver(
    ([entry]) => {                               // L28
      if (entry.isIntersecting) {
        setStarted(true)                         // L30 — flip the switch; effect 2 (dep: [started]) runs next
        observer.disconnect()                    // L31 — fire once only
      }
    },
    { threshold: 0.4 }                           // L34 — wait until 40% of the grid is visible (deliberately later than the reveal's 15% — numbers start counting when the user is actually looking at them)
  )
  observer.observe(el)
  return () => observer.disconnect()             // L38 — cleanup on unmount
}, [])                                           // L39 — empty deps: set up once
```
The two effects communicate through the `started` flag — effect 1 observes, effect 2 animates. Splitting them keeps each effect single-purpose (easier to explain and test).

**L41–61 — Effect 2: the count-up**
```jsx
useEffect(() => {
  if (!started) return undefined                 // L42 — do nothing until effect 1 flips the flag

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setDisplay(STATS.map((stat) => stat.value))  // L45 — reduced motion → jump straight to final values
    return undefined
  }

  let frame                                      // L49 — holds the requestAnimationFrame id for cleanup
  const startTime = performance.now()            // L50 — high-resolution timestamp (unlike Date.now(), monotonic and sub-ms)

  const tick = (now) => {                        // L52 — one animation frame
    const progress = Math.min((now - startTime) / COUNT_DURATION_MS, 1)  // L53 — 0→1 over 1200ms, clamped (Math.min) so it can never overshoot
    const eased = 1 - Math.pow(1 - progress, 3)  // L54 — ease-out cubic: fast at the start, decelerating at the end (feels natural; linear counting feels mechanical)
    setDisplay(STATS.map((stat) => Math.round(stat.value * eased)))      // L55 — every stat interpolates from 0 toward its final value
    if (progress < 1) frame = requestAnimationFrame(tick)                // L56 — schedule the next frame until progress hits 1
  }

  frame = requestAnimationFrame(tick)            // L59 — start the loop
  return () => cancelAnimationFrame(frame)       // L60 — cleanup: if the component unmounts mid-animation, cancel the pending frame
}, [started])                                    // L61 — re-runs ONLY when `started` flips false→true
```
Why `requestAnimationFrame` instead of `setInterval`? rAF fires once per screen repaint (≈60fps), pauses when the tab is hidden, and self-synchronizes with the browser's render cycle — `setInterval` would fire at an arbitrary rate, jank the UI, and keep burning CPU in a background tab.

Note the final state: `progress` reaches exactly 1 → `eased = 1` → `display = value` — the last frame renders the true finals, so no "off-by-one" residue is possible.

**L63–82 — render**
- L64: `<section id="results" ... lp-section--tint>` — the `#results` anchor, tinted background.
- L69: `<div className="lp-stat-grid" ref={statsRef}>` — the observed element.
- L70–78: `STATS.map(...)` renders each card: `{display[index]}` (the animated number) followed by `{stat.suffix}` (`%` for the first, empty for the others). Because the third stat's value is `0`, its count-up is a no-op — it simply renders "0", which is the point of the claim.

---

## 12. `features/landing/components/PricingCards.jsx` (90 lines) — plans

| Line(s) | Code | Explanation |
|---|---|---|
| 2 | `import { Link } from 'react-router-dom'` | For the internal `/login` CTA. |
| 3 | `import { Check } from 'lucide-react'` | The green checklist icon. |
| 6–41 | `const PLANS` | Two plan objects. Fields that drive the render: `featured` (boolean → card highlight + flag), `to` (internal route) **or** `href` (external `mailto:`), `features` (checklist strings). |
| 53–57 | Card wrapper | `` className={`lp-price-card${plan.featured ? ' lp-price-card--featured' : ''}`} `` — conditional BEM modifier: the featured plan gets the blue border + glow. `key={plan.name}`. |
| 58 | `{plan.featured && <span className="lp-price-flag">Most popular</span>}` | Short-circuit rendering: the flag span exists only when `featured` is true (`false && ...` renders nothing). |
| 61–64 | Price row | `{plan.price}` ("Free" / "Custom") + `<span className="per">` ("while in beta" / "pricing"). |
| 65–73 | Conditional CTA | `plan.to ? <Link ...> : <a href={plan.href} ...>` — internal plans get a router `<Link>`, external ones a real anchor. This is why one map renders both card types correctly. |
| 74–81 | Checklist | `plan.features.map(...)` — each `<li>` is a `Check` icon + text. `key={feature}` — feature strings are unique within a plan. |
| 85 | Fine print | The honesty note that pricing is a demo placeholder. |

---

## 13. `features/landing/components/FaqAccordion.jsx` (71 lines) — accessible accordion

**L5–26 `const FAQS`** — five `{ q, a }` objects; the answers mirror real product behavior (rule-driven payslips, warnings, period contracts, RBAC, live dashboard) so the FAQ doubles as a product pitch.

**L28–30 — state**
```jsx
const ref = useReveal()                       // scroll reveal as usual
const [openIndex, setOpenIndex] = useState(0) // which FAQ is open; 0 = first item open on load.
                                              // A single number (not an array) enforces "one open at a time".
```

**L39–65 — render loop**
```jsx
{FAQS.map((faq, index) => {
  const isOpen = openIndex === index          // L40 — computed once per item per render
  return (
    <div className={`lp-faq-item${isOpen ? ' is-open' : ''}`} key={faq.q}>
                                                            // L42 — conditional class drives the blue border + chevron rotation
      <button
        type="button"                                       // L44 — explicit: never submits a form
        className="lp-faq-q"
        id={`faq-button-${index}`}                          // L46 — referenced by aria-labelledby below
        aria-expanded={isOpen}                              // L47 — screen readers announce "expanded"/"collapsed"
        aria-controls={`faq-panel-${index}`}                // L48 — links the button to the panel it controls
        onClick={() => setOpenIndex(isOpen ? -1 : index)}   // L49 — the toggle logic:
                                                            //      clicking the open item → -1 (all closed)
                                                            //      clicking a closed item → its index (and the previously
                                                            //      open one closes automatically, because openIndex is a single value)
      >
        <span>{faq.q}</span>
        <ChevronDown size={18} className="lp-faq-chevron" />  // L52 — rotates 180° via CSS when .is-open
      </button>
      <div
        id={`faq-panel-${index}`}                           // L55 — matches aria-controls
        role="region"                                       // L56 — landmark for the panel
        aria-labelledby={`faq-button-${index}`}             // L57 — panel is announced with its question as the label
        className="lp-faq-a"
        hidden={!isOpen}                                    // L59 — the actual open/close mechanism: the HTML `hidden`
                                                            //      attribute removes the panel from display AND from the
                                                            //      accessibility tree. Using the attribute (not CSS display)
                                                            //      means the browser guarantees both.
      >
        <p>{faq.a}</p>
      </div>
    </div>
  )
})}
```
Why a `<button>` for the question? Because it is an interactive control — buttons are focusable and Enter/Space-activatable for free. A `<div onClick>` would need manual keyboard handling and would fail accessibility review.

---

## 14. `features/landing/components/CtaBand.jsx` (31 lines) — closing call-to-action

- **L7** — reveal ref (attached directly to the band, L12).
- **L12** — `.lp-cta-inner` is the tinted rounded band.
- **L19–22** — primary `<Link to="/login">` with `ArrowRight` icon.
- **L23–25** — secondary `<a href="mailto:hello@pay365.dev">` — a plain anchor is correct here: mailto is handled by the OS, not the router.

---

## 15. `features/landing/components/LandingFooter.jsx` (66 lines) — footer

| Line(s) | Code | Explanation |
|---|---|---|
| 3 | `import logo from '../../../assets/logo.svg'` | Vite import of a static asset: in a JS file, importing an image returns its **bundled URL** (hashed filename in production), which is why `<img src={logo}>` works and survives caching/builds. |
| 5–10 | `const PRODUCT_LINKS` | Anchor links mirroring the navbar. |
| 14 | `<footer className="lp-footer">` | `<footer>` landmark. |
| 16 | `.lp-footer-grid` | 4-column grid: brand (2fr) + three link columns (1fr each). |
| 18–27 | Brand block | Logo in tinted square, wordmark, one-line tagline. `&amp;` is the JSX-safe way to write "&" in text. |
| 29–38 | Product column | `PRODUCT_LINKS.map(...)` — `key={link.href}` (hrefs unique). |
| 39–49 | Get Started column | Two `<Link to="/login">` items — router links, not anchors, because they leave the page. |
| 50–57 | Contact column | mailto anchor. |
| 59–62 | Bottom row | Copyright + hackathon-brief credit, separated by a hairline border. `&copy;` renders ©. |

---

## 16. `components/layout/Navbar.jsx` (shared, used by the landing page)

| Line(s) | Code | Explanation |
|---|---|---|
| 1–2 | React + `ArrowRight` icon | |
| 3 | `import { Link, useNavigate } from 'react-router-dom'` | `Link` for the brand; `useNavigate` is the programmatic-navigation hook (returns a function that changes route without reloading). |
| 4 | `import logo from '../../assets/logo.svg'` | Bundled asset URL (same mechanism as the footer). |
| 6–11 | `const NAV_LINKS` | Label + anchor-target pairs: Features → `#features`, How It Works → `#process`, Pricing → `#pricing`, FAQ → `#faq`. |
| 13 | `const Navbar = ({ onGetStarted })` | Optional prop — lets a parent override CTA behavior. |
| 14 | `const [scrolled, setScrolled] = useState(false)` | Tracks whether the page has scrolled past the threshold; drives the shrink animation. |
| 16–25 | Scroll effect | `useEffect` registers a `scroll` listener with `{ passive: true }` (tells the browser the handler won't call `preventDefault`, so scrolling is never blocked — better performance). Sets `scrolled` when `window.scrollY > 60`. The cleanup removes the listener on unmount — without it, every mount would stack another listener. |
| 27–33 | `smoothScrollTo(e, targetId)` | `e.preventDefault()` stops the browser's instant hash jump; `document.querySelector(targetId)` finds the section; `scrollIntoView({ behavior: 'smooth' })` animates the scroll. (CSS `scroll-margin-top` on sections keeps the heading clear of the fixed nav.) |
| 35–41 | `handleGetStarted` | If a parent passed `onGetStarted`, call it; otherwise `navigate('/login')`. This makes the component self-sufficient while staying overridable. |
| 45 | `` className={`navbar ${scrolled ? 'navbar--shrunk' : ''}`} `` | Conditional modifier — the shrunk state (smaller max-width, tighter padding, stronger shadow) is pure CSS. |
| 48–56 | Smooth-scroll links | `NAV_LINKS.map(...)` — each link calls `smoothScrollTo` on click. |
| 58–66 | CTA button | Real `<button>` (it performs an action, not a navigation-by-URL), gradient pill, arrow icon that nudges right on hover (CSS). |
| 68–72 | Responsive note | Below 680px the SCSS hides the center links; the CTA remains — matching the reference site's minimal mobile nav. |

---

## 17. `features/landing/styles/landing.scss` — every rule block explained

**Conventions used throughout:** BEM naming (`.block`, `.block__modifier` written as `.block--modifier`), SCSS nesting (`.a { .b {} }` compiles to `.a .b {}`), `&` = the parent selector, design tokens from `_variables.scss` (`$color-primary`, `$shadow-md`, `$radius-lg`…), and `clamp()` for fluid sizes.

| Line(s) | Block | What it does |
|---|---|---|
| 7 | `@use '../../../styles/variables' as *;` | Imports the design-token file; `as *` puts every variable directly in scope (so `$color-primary`, not `variables.$color-primary`). Three levels up because this file sits in `features/landing/styles/`. |
| 9 | `$font-accent: 'Instrument Serif', Georgia, serif;` | Local token for the italic serif accents (badge, chart watermark). Georgia is the fallback so text is readable before the webfont loads. |
| 11–13 | `html { scroll-behavior: smooth; }` | Makes every anchor jump (`#features`, `#pain`…) animate instead of teleporting. |
| 15–20 | `.landing` | Page scope: white background, primary text color, base font, `overflow-x: hidden` (the rotated hero cards would otherwise cause a horizontal scrollbar). |
| 22–26 | `.lp-container` | The shared width wrapper: `max-width: 1240px`, auto margins (centering), 24px side padding. |
| 28–35 | `.lp-section` (+ `--tint`) | 96px vertical padding for every section; `scroll-margin-top: 120px` reserves space for the fixed navbar on anchor jumps; `--tint` switches the background to the light app gray. |
| 37–45 | `.lp-eyebrow` | Small uppercase blue section label: 13px, 600 weight, `letter-spacing: 0.08em` (tracking), `text-transform: uppercase` (copy stays written normally in JSX). |
| 47–54 | `.lp-heading` | Section `h2`: `clamp(28px, 3.4vw, 40px)` — fluid between 28px and 40px, scaling with 3.4% of viewport width; negative letter-spacing tightens large type (standard editorial practice). |
| 56–62 | `.lp-subhead` | Section subtitle: 17px, 1.6 line-height, capped at 640px width for readability. |
| 65–74 | `.reveal` / `.is-visible` | The scroll-reveal pair the hook toggles: starts at `opacity: 0` + 14px down; transitions both over 0.6s when the class lands. |
| 77–131 | `.lp-btn` (+ `--primary`, `--soft`, `--ghost`) | Shared button. Base: inline-flex (icon + text align), 14px radius, 0.3s transition. `--primary`: white text on the `135deg` blue gradient, blue glow shadow; hover darkens the gradient, deepens the shadow, lifts 2px; `:active` resets the lift (press feedback). `--soft`: borderless white with a two-layer soft shadow (the reference's "Learn more"). `--ghost`: hairline border, gray hover fill. |
| 137–143 | `.lp-hero` | Full-viewport flex column: `min-height: 100vh`, 150px top padding (clears the fixed nav), 28px bottom. |
| 145–152 | `.lp-hero-grid` | The two columns: `1.02fr 0.98fr` (copy fractionally wider), 48px gap, `align-items: center` (columns vertically centered), `flex: 1` (fills the hero's leftover height). |
| 154–156 | `.lp-hero-copy` | Left alignment (the reference is left-aligned, not centered). |
| 158–177 | `.lp-hero-badge` | The pill: inline-flex, 8px gap, `#EEF3FF` background, translucent blue border, pill radius. `svg` → brand blue; `em` → Instrument Serif italic 15.5px blue. |
| 179–187 | `.lp-hero-title` | `clamp(44px, 5.2vw, 78px)`, weight 700, `-0.03em` tracking, `line-height: 1.05` — tight editorial leading for the two-line headline. |
| 189–206 | `.lp-hero-glyph` | **Currently unused** (the inline headline icon was removed from `Hero.jsx`). Kept documented: it sized the squircle in `em` units (0.92em — scales with the font), `border-radius: 24%` (squircle look), vertical-align −0.12em (optical centering against caps), gradient background + glow. Candidate for deletion or reuse. |
| 208–214 | `.lp-hero-sub` | 18px, 1.65 line-height, max-width 470px. |
| 216–221 | `.lp-hero-ctas` | Flex row, wrap (buttons stack on narrow screens), 14px gap. |
| 224–262 | Logo marquee | `.lp-logo-strip`: `overflow: hidden` + `mask-image` linear-gradient (transparent → black → transparent) — the edge fade. `.lp-logo-track`: `width: max-content` (never wraps) + `animation: lpMarquee 22s linear infinite`. `.lp-logo-item`: gray wordmark at 75% opacity. `@keyframes lpMarquee`: `translateX(0) → translateX(-50%)` — exactly half the doubled track, which is what makes the loop seamless. |
| 265–268 | `.lp-hero-visual` | `position: relative` (the anchor for every absolutely-positioned child) + `min-height: 560px` (reserves the composition's space). |
| 270–277 | `.fv-card` | White card, hairline border, 18px radius, two-layer shadow (neutral drop + faint blue ambient). |
| 279–293 | `.fv-card--payrun` / `--leave` | The composition: payrun top-right rotated **+7°** (z-index 3, on top), leave mid-left rotated **−5°** (z-index 2). Opposite rotations + overlap = the floating collage. |
| 295–300 | `.fv-card-title` | Gray 15px card heading. |
| 302–307 | `.fv-row` | Flex row for one person: avatar + person + pill, 10px gap. |
| 309–338 | `.fv-avatar` (+ `--a`…`--d`) | 34px circle, bold initials; four color tones from status tokens (blue tint, green tint, amber tint, slate tint). |
| 340–356 | `.fv-person` | `flex: 1` (fills the middle); name 13.5px/600, role 11.5px muted. |
| 358–375 | `.fv-pill` (+ `--blue`, `--dark`) | Status pills: 11px/600, pill radius, `white-space: nowrap` (never wraps mid-label). `--blue`: solid brand blue + glow; `--dark`: near-black. |
| 377–383 | `.fv-chart` | Absolute along the bottom, 300px tall, inset 5% from the left. |
| 385–391 | `.fv-bars` | Flex, `align-items: flex-end` (bars grow up from the baseline), 14px gap, full height. |
| 393–402 | `.fv-bar` | `flex: 1` (equal widths); top-only border radius; vertical gradient from 95% blue → 35% → fully transparent — the fade-out-at-the-bottom effect from the reference. |
| 404–412 | `.fv-chart-label` | The "Payroll" watermark: absolute at 32%/36%, Instrument Serif italic 24px, 16% opacity. |
| 414–431 | `.lp-section-pill` | **Currently unused** (the bottom-of-hero pill was removed from `Hero.jsx`). Styled as the reference's outline pill: centered via `align-self: center` (works because `.lp-hero` is a flex column), blue border/text, tinted hover. Candidate for deletion or reuse. |
| 433–479 | Pain section | `.lp-pain-grid`: 3 equal columns, 20px gap. `.lp-card`: white, hairline border, hover = blue border + shadow + 3px lift. `.lp-card-icon`: 44px tinted square. Title/body typography. |
| 481–546 | Feature blocks | `.lp-features`: 72px row gap. `.lp-feature-row`: 2-column grid; `&:nth-child(even) { .lp-feature-copy { order: 2 } }` — every second row swaps copy/mock sides (the alternating pattern) with zero JSX changes. `.lp-chip`: tinted pill. `.lp-proof-strip`/`.lp-proof-pill`: centered trust pill. |
| 548–674 | Mini mockups | `.mini`: white card + large shadow. `.mini-caption`: uppercase micro-label. `.mini-head/avatar/name/role`: employee header. `.mini-row`: flex row with nested `.code` (bold), `.meta` (flex: 1, muted), `.amt` (right-aligned, `font-variant-numeric: tabular-nums` so digits align down the column), `.amt--neg` (red for deductions). `.mini-step` (+ `--done`, `--current`): the lifecycle chips. `.mini-warning`: amber strip. |
| 676–719 | Process steps | 4-column grid; `.lp-step` cards with hover lift; `.lp-step-num`: 38px/800 blue number. |
| 721–752 | Stats band | 3-column grid; `.lp-stat`: white card, 40px padding; `.lp-stat-value`: 56px/800 blue (the count-up target); `.lp-stat-label`: capped-width caption. |
| 754–853 | Pricing | `.lp-pricing-grid`: 2 columns, max-width 980px, auto margins. `.lp-price-card`: flex column (so the CTA and list stack); `--featured`: blue border + glow. `.lp-price-flag`: absolute pill overlapping the card's top edge (`top: -12px`). `.lp-price-amount .per`: nested muted suffix. `.lp-price-list li`: flex with green check icons (`flex-shrink: 0` so icons never squash). |
| 855–914 | FAQ | `.lp-faq`: 760px centered column. `.lp-faq-item.is-open`: blue border. `.lp-faq-q`: full-width button reset (no default button chrome), `:focus-visible` blue outline (keyboard accessibility). `.lp-faq-chevron`: rotates 180° when the parent `.is-open` (the `.is-open &` selector compiles to `.lp-faq-item.is-open .lp-faq-chevron`). `.lp-faq-a`: answer panel with the `lpFadeSlide` entrance animation. |
| 916–946 | CTA band | Tinted rounded inner band; fluid title via `clamp(26px, 3vw, 34px)`; centered actions. |
| 948–1036 | Footer | 4-column grid (2fr brand + 3×1fr); logo tile; column headers uppercase; links with blue hover; bottom row with hairline divider. |
| 1038–1048 | `@keyframes lpFadeSlide` | FAQ answer entrance: 4px drop + fade over 0.25s. |
| 1050–1143 | Responsive | **1024px:** hero un-stacks (`min-height: auto`, single column), visual caps at 560px and centers, steps grid 4→2. **900px:** pricing 2→1, footer 4→2. **768px:** section padding 96→64, pain/stats/steps →1 column, feature rows stack (copy first — `order: 0` resets the desktop flip), footer →1 column, CTA padding shrinks. **640px:** hero padding trims, visual 420px, floating cards shrink to 280px, chart 300→220px. |
| 1145–1167 | Reduced motion | `scroll-behavior: auto` (no smooth scrolling); `.reveal` forced visible with no transition; logo marquee stopped; and a blanket `animation-duration/transition-duration: 0.01ms !important` scoped to `.landing` — everything becomes effectively instant for users who asked the OS to minimize motion. |

---

## 18. Reviewer Q&A — likely questions, short answers

**Q: Why `IntersectionObserver` instead of a scroll event listener?**
Scroll listeners execute on every scroll frame and typically call `getBoundingClientRect` (forced layout). The observer is callback-based, batched by the browser, and expresses intent ("tell me when this is visible") directly. It also needs explicit cleanup, which the hook does.

**Q: Why `requestAnimationFrame` for the count-up instead of `setInterval`?**
rAF fires once per repaint (~60Hz), auto-pauses in hidden tabs, and stays in sync with rendering. `setInterval` fires at wall-clock intervals regardless of rendering, causing jank and background-tab battery drain.

**Q: Why does the marquee list get duplicated (`[...LOGOS, ...LOGOS]`)?**
The animation translates the track by −50%. With the content doubled, the moment the first copy has fully scrolled out, the second copy occupies exactly the starting position — so the loop point is invisible.

**Q: Why `key` props everywhere?**
React uses keys to match elements between renders and preserve DOM state. Without them, list mutations can cause incorrect reuse. Keys must be unique among siblings and stable across renders — hence `${logo.name}-${index}` for the doubled list.

**Q: Why `aria-hidden="true"` on the hero visual and logo strip?**
They are decorative fiction (fake names, fake logos). Hiding them from the accessibility tree prevents screen readers from announcing meaningless content.

**Q: Why `hidden={!isOpen}` in the FAQ instead of conditional rendering?**
The HTML `hidden` attribute removes the element from both display and the accessibility tree, and keeps the DOM stable (no mount/unmount per toggle). The entrance animation still plays because the attribute flips before the CSS animation runs on newly-shown content.

**Q: Why is `useState(() => STATS.map(() => 0))` written with a function?**
The lazy-initializer form computes the initial value once, on first render, instead of recomputing on every render. Correct habit for any non-primitive initial state.

**Q: Why does every effect return a cleanup?**
`IntersectionObserver.disconnect()`, `removeEventListener`, and `cancelAnimationFrame` prevent leaks and "setState on unmounted component" bugs. React runs the cleanup before re-running the effect and on unmount. StrictMode double-invokes effects in dev specifically to catch missing cleanups.

**Q: Why BEM class names and one SCSS file?**
`.lp-*` / `.fv-*` prefixes namespace the landing page so its styles can never collide with the authenticated app's styles. One file per feature keeps the cascade predictable; tokens come from the shared `_variables.scss`.

**Q: Why `clamp()` instead of media queries for font sizes?**
`clamp(min, preferred, max)` is continuous — type scales smoothly at every viewport width with a single declaration, instead of jumping at breakpoints.

**Q: Why `font-variant-numeric: tabular-nums` on money columns?**
Proportional digits make "₹63,000" and "₹55,000" misalign vertically in a column. Tabular figures give every digit the same width, so amounts line up like a real payslip table.

---

## 19. Known Dead Code (honest notes)

| Item | Location | Status |
|---|---|---|
| `.lp-hero-glyph` styles | `landing.scss` L189–206 | The inline headline icon was removed from `Hero.jsx`; the styles remain. Safe to delete or reuse. |
| `.lp-section-pill` styles | `landing.scss` L414–431 | The bottom-of-hero "Pain" pill was removed from `Hero.jsx`; the styles remain. Safe to delete or reuse. |
| `$font-accent` | `landing.scss` L9 | Still used by `.lp-hero-badge em` and `.fv-chart-label` — live, not dead. |

Everything else documented above is live code verified against the working tree on this date.
