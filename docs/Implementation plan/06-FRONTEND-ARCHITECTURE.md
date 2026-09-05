# Pay365 — Frontend Architecture (React 19 + JavaScript + Vite + SCSS)

**Date:** 2026-09-05 · **Rendering:** CSR SPA (ADR-002) — authenticated operational app, SEO irrelevant.

---

## 1. Component Taxonomy

| Category | Purpose | State | May import | Naming / Location |
|---|---|---|---|---|
| Pages | Route-level screens | Compose features | features, ui, lib | `PascalCase.jsx` in `src/features/<module>/pages/` |
| Features | Business composites (PayrunWizard, PayslipTable, EmployeeSmartButtons) | Local + query hooks | own module's api/hooks, ui | `src/features/<module>/components/` |
| UI components | Reusable, stateless (DataTable, Modal, Badge, KpiCard, EmptyState, FormField) | Stateless props-in | nothing app-specific | `src/components/ui/` |
| Layout | AppShell (top nav, role-aware menu), AuthLayout | — | ui, lib | `src/app/layout/` |
| Providers | QueryClientProvider, Provider (Redux), ToastProvider | Global | lib | `src/app/providers.jsx` |

**Dependency rule:** pages → features → ui. Never the reverse. Features never import other features' internals — shared things move to `components/ui` or `lib`.

## 2. State Management

| State type | Solution | Examples |
|---|---|---|
| Server state | TanStack React Query (all GET/POST via api client hooks) | employees, payruns, dashboard |
| Global UI/session | Redux Toolkit (`authSlice`, `uiSlice`) | user+role, sidebar, toasts |
| Local | useState | form drafts, modal open |
| URL state | React Router search params | list filters, page, payrun wizard step |
| Forms | react-hook-form + zod resolvers | employee form, rule editor, wizard |

Query keys: `[module, params]` e.g. `["payslips", { payrunId }]`. Mutations invalidate their module key. `staleTime: 30_000`.

## 3. Route Map

| Path | Page | Roles | Notes |
|---|---|---|---|
| /login | Login | Public | redirects to / if authed |
| / | Dashboard | HR_MANAGER+ (widgets vary by role) | KPI cards, charts, alerts, filters (period/department/employee type) |
| /employees | EmployeeList | HR_MANAGER | view toggle Kanban/List; search + filters |
| /employees/new | EmployeeForm | HR_MANAGER | |
| /employees/:id | EmployeeDetail (form as hub) | HR_MANAGER | smart buttons → /employees/:id/contracts, /attendance, /time-off (filtered lists) |
| /contracts | ContractList | HR_MANAGER | active contract highlighted |
| /contracts/:id | ContractForm | HR_MANAGER | overlap errors surfaced inline |
| /schedules | ScheduleList + ScheduleForm | HR_MANAGER | line editor; weekly hours computed live as lines change |
| /attendance | AttendanceList | HR_MANAGER (Employee: own) | check-in/out, worked hours, status; manual-edit badge |
| /time-off/requests | TimeOffRequestList | Authenticated (scope by role) | approve/refuse actions for HR |
| /time-off/allocations | AllocationList | HR_MANAGER | remaining/validity columns |
| /time-off/types | TimeOffTypeList | HR_MANAGER | policy config |
| /payroll/payruns | PayrunList | HR_PAYROLL_USER | NEW → wizard |
| /payroll/payruns/new | PayrunWizard | HR_PAYROLL_USER | Step 1 scope → Step 2 selection (see §5) |
| /payroll/payruns/:id | PayrunDetail | HR_PAYROLL_USER | actions: Compute, Validate, Mark Paid, Send Payslips; warnings panel |
| /payroll/payslips | PayslipList | HR_PAYROLL_USER | |
| /payroll/payslips/:id | PayslipDetail | HR_PAYROLL_USER (Employee: own) | computation table + Print PDF |
| /settings/salary-structures | StructureList | HR_PAYROLL_USER (R) / MANAGER (W) | |
| /settings/salary-structures/:id | StructureForm + RuleEditor | HR_PAYROLL_MANAGER | drag-order rule sequencing; Test button → /payslips/preview dry-run |
| /admin/users | UserManagement | ADMIN | role assignment |

Route guards: `<RequireRole roles={[...]}>` wrapper reads Redux auth state (`useSelector(selectAuth)`); unauthorized → friendly 403 page. API remains the real enforcement.

## 4. API Client

- Axios instance, `baseURL = import.meta.env.VITE_API_URL` (validated at boot).
- Request interceptor: attach Bearer token, generate `X-Request-Id`.
- Response interceptor: on 401 → single `POST /auth/refresh` attempt → retry original → else clear store + redirect /login.
- Error normalization: unwrap `error.code/message/details` for toasts/forms.
- Retry (React Query): 1 retry on network/5xx, never on 4xx; compute timeout 60 s.

## 5. Payrun Wizard UX Spec (FR-10)

```
/payroll/payruns/new
Step 1 — Scope:   name (auto-suggested "Regular Payroll — Sep 2026"),
                  Salary Structure (select, active only), Period (month picker or date range).
                  [Continue] → no record created yet; eligibility fetch:
                  GET /payruns/eligible-employees → table of ACTIVE employees with
                  eligibility flags (✓ contract for period, ⚠ no contract, structure mismatch).
Step 2 — Select:  checkbox list (default: all eligible); ineligible rows disabled with reason.
                  [Create Payrun] → POST /payruns → navigate to PayrunDetail.
PayrunDetail:     header (name, structure, period, status badge), action bar
                  (Compute → Validate → Mark Paid → Send Payslips; Cancel for DRAFT/COMPUTED),
                  Warnings panel (severity color-coded; VALIDATE disabled while ERROR warnings exist),
                  Payslips table (employee, gross, deductions, net, status, email_sent_at) → PayslipDetail.
PayslipDetail:    identity block (employee, structure, run, period, worked days),
                  computation table grouped: earnings → gross subtotal → deductions → net,
                  [Print PDF] (opens /payslips/:id/pdf).
```

## 6. Reusable Patterns (mandatory)

- **Loading:** skeleton rows in DataTable; button spinners on mutations; no layout shift.
- **Empty states:** illustration + primary action ("No employees yet — Add Employee").
- **Errors:** toast for action failures; inline field errors from `error.details`; ErrorBoundary per route with retry.
- **Toasts:** success (green) on every mutation; error (red) with API message; 4 s auto-dismiss.
- **Money formatting:** `Intl.NumberFormat('en-IN', { style:'currency', currency: p.currency })`.
- **Optimistic updates:** only for low-risk toggles; never for payrun state transitions.
- **Role gating:** `useRole()` hook + `<Can roles>` wrapper for action buttons; UI hides what the role can't do.

## 7. SCSS & Styling Architecture

- **Engine:** SASS / SCSS compiled via Vite's native SCSS plugin (`sass`).
- **Global Design Tokens (`src/styles/_variables.scss`):** Color palette (primary indigo, background dark/light, status colors), font stacks, spacing metrics, border radiuses, shadows.
- **Mixins (`src/styles/_mixins.scss`):** Responsive breakpoints, flex/grid aligners, button variants, card containers.
- **Base & Main (`src/styles/main.scss`):** Global CSS resets, typography base, scrollbar styling, utility classes.
- **Component / Feature Styles:** Co-located `.scss` files (or `.module.scss`) per component and feature screen.

## 8. Folder Structure

```
frontend/src/
├── app/            # router.jsx, providers.jsx, layout/, guards/
├── components/ui/  # DataTable.jsx, Modal.jsx, Badge.jsx, KpiCard.jsx, FormField.jsx…
├── store/          # store.js, slices/ (authSlice.js, uiSlice.js)
├── lib/            # api.js (axios), format.js, query-client.js
├── styles/         # main.scss, _variables.scss, _mixins.scss, _base.scss
├── features/
│   ├── auth/  dashboard/  employees/  contracts/  schedules/
│   ├── attendance/  timeoff/  payroll-config/  payroll-run/  admin/
│   └── (each: pages/ components/ api/ hooks/ styles.scss)
```
