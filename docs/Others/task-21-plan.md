# TASK-021 — Kanban Views, UX Polish & Demo Rehearsal — Detailed Plan

**Priority:** P1 · **Deps:** TASK-016 · **Contract:** `08-ROADMAP-AND-TASKS.md` TASK-021, §Business Scenario Test Specifications

## Goal

Polished, demo-ready UI: Employee Kanban on live data, loading skeletons, empty states,
toast notifications — and a rehearsed 5-minute walkthrough of both demo scenarios with
**zero console errors and zero visible mock data**.

## Acceptance Criteria (from the roadmap)

1. Scenario A (Employee → Payslip) and Scenario B (Leave Allocation → Request → Balance
   Deduction) execute smoothly, no console errors, no broken navigation
2. Zero mock data visible in the demo flow

## Audit findings (current state, drives this plan)

| Finding | Where | Consequence |
|---|---|---|
| Mock fallbacks | `EmployeesPage` (+`data/employeesData.js`), `ContractsPage`, `AttendancePage`, `TimeOffPage`, `EmployeeProfilePage` — all import `INITIAL_*` constants and fall back with `console.warn` | AC violation; console noise |
| Kanban exists | `EmployeesPage` `viewMode: 'kanban' | 'list'` | Polish + real-data wiring only |
| No skeletons / toasts / empty states anywhere | whole `src/components/ui/` | Build 3 small zero-dependency primitives |
| **Backend time-off module is an EMPTY router** | `modules/timeoff/timeoff.routes.js` = `export default router;` | **Scenario B impossible** until TASK-008/009/010 (teammate's lane) |
| Silent metadata failures | `api.get('/employees/departments').catch(() => null)` in EmployeesPage | Kanban grouping silently degrades |

**Decisions recorded (user defaults):** (a) I implement the minimal backend time-off
slice so Scenario B is demonstrable (teammate can refine later); (b) I proceed editing
shared frontend pages, keeping changes minimal and pattern-consistent; (c) toasts and
skeletons are hand-rolled — no new dependencies.

## Phase 0 — Dry-run audit (read-only, ~30 min)

Boot the stack, walk both scenarios as each role, record every failure:

```
A1 login payroll.manager / Password@123
A2 Employees page — kanban groups populated from real departments?
A3 employee row -> profile -> contract visible?
A4 Payroll page -> create payrun -> COMPUTE -> payslip detail -> PDF opens
B1 login employee -> TimeOff page -> ??? (backend 404s today)
```

Output: a fix-list feeding Phases 1-3. Also `grep` the frontend for `console.log/error/warn`
that could pollute the demo console.

## Phase 1 — "Zero mock data" cleanup (frontend, 5 pages)

Rule: **API success -> live rows; API failure -> EmptyState + toast; NEVER mock data.**

1. In each of the 5 pages: remove `INITIAL_*` imports, remove fallback branches
   (`setEmployees(INITIAL_EMPLOYEES)` / `console.warn('...fallback...')`)
2. Failure path: `setError` + toast "Could not load employees" + EmptyState with Retry
3. DELETE `frontend/src/features/employees/data/employeesData.js` and any sibling mock
   files in attendance/contracts/timeoff/features (they are dead code after this)
4. Backend-side check: any page calling an endpoint that returns 403 for the logged-in
   role shows the EmptyState (e.g. EMPLOYEE opening admin-only pages — guard already
   exists via `RequireRole.jsx`; verify route guards match demo roles)

## Phase 2 — UX primitives (3 new components, 0 dependencies)

### NEW `frontend/src/components/ui/Skeleton.jsx` (+ `.scss`)
```jsx
<Skeleton variant="text|row|card|circle" count={3} />   // shimmer via CSS keyframes
```
- pure CSS (`_mixins.scss` shimmer mixin), no library
- used in every demo-path page while `loading` is true

### NEW `frontend/src/components/ui/Toast.jsx` + `toast/ToastContext.jsx`
```jsx
const { showToast } = useToast();          // context + provider in AppShell
showToast('Saved', 'success' | 'error' | 'info', { autoCloseMs: 3500 })
```
- fixed bottom-right stack, role="status", CSS transition, auto-dismiss, no external lib
- replace any `alert(...)`/`console.error(...)` user-facing patterns in demo pages

### NEW `frontend/src/components/ui/EmptyState.jsx`
```jsx
<EmptyState title="No employees yet" hint="Add your first employee" action={<Button/>} />
```

### Kanban wiring (EmployeesPage)
- group key: department name (live from `/employees/departments`) × status pill
- department fetch failure no longer silent: toast + "Unknown" group
- card data straight from `GET /employees` response (name/code/status/department)
- list view keeps working; view toggle preserved

## Phase 3 — Backend support for Scenario B (time-off minimal slice)

**Scope discipline: smallest slice that makes Scenario B run end-to-end.**

`modules/timeoff/` (backend — currently empty):

1. `GET /time-off-types` — list active types (unit/name/code) — HR_PAYROLL_USER+ / EMPLOYEE read
2. `GET /employees/:id/time-off-balances` — per-type allocated/taken/remaining
   (already specified in `04-API-CONTRACTS.md` §132 — this endpoint is *in contract*)
3. `POST /time-off-requests` — employee requests N days in a window; zod: date range,
   `days` computed from date span; status TO_APPROVE (422 if overlaps an existing
   request; 409 INSUFFICIENT_BALANCE per contract §— balance check at create)
4. `GET /time-off-requests?employee_id=&status=` — list with filters
5. `POST /time-off-requests/:id/status-changes` — body `{action: APPROVE|REFUSE}`;
   HR_MANAGER (contract §4); 409 STATE_ERROR if not TO_APPROVE; 403 self-approval;
   **APPROVE atomically: `allocation.taken_days += days` in the same tx** (contract:
   deducts balance on APPROVE; INSUFFICIENT_BALANCE if remaining < days)
6. Seed: one time-off type (Casual Leave), 10-day approved allocation for the demo
   employee linked to `employee@pay365.dev`

Response of approve (contract §4): `{ request: {...}, allocation: {allocated_days, taken_days, remaining} }`

## Phase 4 — Rehearsal scripts + verification (the AC itself)

### NEW `docs/Others/demo-script.md` — the 5-minute walkthroughs

**Scenario A — Employee to Payslip (payroll.manager)**
1. Login (`payroll.manager@pay365.dev`) — no console errors
2. Employees → Kanban groups by department/status — live data, skeletons while loading
3. Open DEMO employee → contract visible → back
4. Payroll page → select structure STD_INR → eligibility-checks → create payrun
   (Sep 2026) → COMPUTE → payslip lines visible (BASIC/HRA/TRANSPORT/GROSS/PF/TAX/NET)
5. Open payslip PDF → renders header/lines/net-in-words
6. Console: zero errors; every navigation lands

**Scenario B — Leave Allocation → Request → Balance (employee + hr.manager)**
1. Login employee → TimeOff page: balance card shows 10 days allocated / 0 taken
2. Request 3 days → TO_APPROVE
3. Login hr.manager → approve the request
4. Login employee again → balance now taken=3 / remaining=7 (smart-button parity
   with `/employees/:id/time-off-balances`)
5. Console: zero errors through both logins

### Verification checklist
- [ ] Both scenarios complete with **zero console errors/warnings**
- [ ] No mock strings anywhere on screen (`grep INITIAL_` returns nothing after Phase 1)
- [ ] Every list page shows skeleton while loading, EmptyState when empty
- [ ] Toast appears on: login failure, save success, compute done, approve, errors
- [ ] Kill the API mid-demo → pages show EmptyState+toast, not mock rows (resilience proof)
- [ ] `npm test` (backend 37+ tests) still green — Phase 3 doesn't regress engine/payrun
- [ ] Scenario 3/4/5 backend parity from the QA spec re-verified by curl:
      rule math 63000/55000, EMPLOYEE 403s, recompute-replace vs DUPLICATE_PAYSLIP

## Files

### Backend (Scenario B slice — 5 files in `modules/timeoff/`, 1 modify)
| File | Content |
|---|---|
| NEW `timeoff/schemas.js` | create-request + status-change zod schemas |
| NEW `timeoff/timeoff.service.js` | types list, balances, request create (balance check), approve/refuse tx |
| NEW `timeoff/timeoff.controller.js` | thin handlers |
| REPLACE `timeoff/timeoff.routes.js` | 5 routes + roles |
| MODIFY `prisma/seed.demo-payrun.js` | + Casual Leave type + 10-day APPROVED allocation for the demo employee |

### Frontend (7 new, 7 modified, 2 deleted)
| File | Content |
|---|---|
| NEW `components/ui/Skeleton.jsx/.scss` | shimmer primitives |
| NEW `components/ui/Toast.jsx` + `toast/ToastContext.jsx` (+scss) | toast stack + provider |
| NEW `components/ui/EmptyState.jsx` (+scss) | empty state card |
| MODIFY `AppShell.jsx` | wrap with ToastProvider |
| MODIFY 5 pages (Employees/Contracts/Attendance/TimeOff/EmployeeProfile) | remove mocks, add skeleton/empty/toast, kanban wiring |
| DELETE `features/employees/data/employeesData.js` + sibling mock files | dead code removal |
| NEW `docs/Others/demo-script.md` | rehearsal script + checklists |

## Verification of the whole task = Phase 4 checklist (both scenarios, console clean)

## Explicit non-goals (deferred)

- Full employee CRUD UI polish (teammate's TASK-004 surface) — only mock removal + primitives
- Drag-and-drop Kanban reordering — grouping view only (dnd libraries = slop for demo)
- Optimistic updates / caching layer (React Query is present; simple invalidation only)
- Dark mode, i18n, responsive tablet polish
- Schedules/Attendance deep flows — outside the two demo scenarios
