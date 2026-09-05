# Pay365 — 5-Minute Demo Rehearsal Script (Scenario A & B)

This document provides the authoritative, step-by-step demonstration walkthrough for Pay365, verifying zero console errors, live PostgreSQL database integration, and UI polish.

---

## 🎯 Demo Credentials & Roles

| Role | Email | Password | Primary Responsibilities |
|---|---|---|---|
| **Admin / Payroll Manager** | `payroll.manager@pay365.dev` | `Password@123` | Employee management, contract setup, payrun creation, salary computation, payslip PDF generation |
| **HR Manager** | `hr.manager@pay365.dev` | `Password@123` | Employee onboarding, leave allocation review, time off approval/refusal |
| **Standard Employee** | `employee@pay365.dev` | `Password@123` | Self-service attendance logging, time off requests, leave balance tracking, payslip view |

---

## 🎬 Scenario A: Employee Onboarding to Payslip & PDF Generation

**Persona:** Payroll Manager (`payroll.manager@pay365.dev`)  
**Objective:** Navigate real employee database, verify contracts and salary structure, execute a monthly payroll run, and download/inspect the generated PDF payslip with Indian Currency Number-to-Words.

### Step 1: Login & Navigation
1. Open `http://localhost:5173/login`.
2. Enter email: `payroll.manager@pay365.dev` and password: `Password@123`.
3. Click **Sign In**.
4. Land on the **Payroll Dashboard** — observe the live KPIs (Headcount, Active Contracts, Monthly Payroll Liability).

### Step 2: Employee Kanban & Live Data Inspection
1. Click **Employees** in the top navigation bar.
2. Skeletons briefly render while live records are fetched from `GET /api/v1/employees`.
3. Toggle between **Kanban** view and **List** view:
   - Verify active department badges (Engineering, Sales, Marketing, HR, Finance).
   - Filter by status pill: `Active`, `Probation`, `On Leave`.
4. Click on **Rahul Verma (EMP-003)**:
   - Land on `EmployeeProfilePage`.
   - Inspect **Personal & Overview**, **Job & Organization**, **Salary & CTC Structure**, and **Contracts & Documents**.
   - Notice live salary components calculated from the contract wage (Basic, HRA, Special Allowance, PF, PT, TDS).

### Step 3: Contracts Management
1. Click **Contracts** in the navigation bar.
2. Skeletons render as live contracts are retrieved from `GET /api/v1/contracts`.
3. Observe active contracts, reference codes (`CNT-2026-003`), start dates, and monthly wage liabilities.

### Step 4: Payrun Creation & Batch Computation
1. Click **Payroll** in the navigation bar.
2. Click **Create Payrun**:
   - Title: `September 2026 Regular Payroll`
   - Period: `2026-09-01` to `2026-09-30`
   - Salary Structure: `Standard Indian Payroll (STD_INR)`
3. Click **Compute Payrun**:
   - The platform calculates payroll for all eligible employees in the background.
   - Status transitions from `DRAFT` $\rightarrow$ `COMPUTING` $\rightarrow$ `COMPUTED`.
   - Batch summary shows Total Gross Pay, Total Deductions (PF/PT/TDS), and Net Pay.

### Step 5: Payslip Inspection & PDF Generation
1. Click on **Rahul Verma's Payslip** in the payrun table.
2. Verify line-by-line earnings and deductions:
   - Basic Pay: ₹22,500
   - HRA: ₹11,250
   - Special Allowance: ₹6,750
   - PF Deduction (12% of Basic): ₹2,700
   - Professional Tax: ₹200
   - Net Salary: ₹40,100
3. Click **Download / View PDF**:
   - Payslip renders with professional Pay365 branding, legal compliance disclaimer, breakdown table, and formatted words:  
     `"Rupees Forty Thousand One Hundred Only"`.

---

## 🌴 Scenario B: Leave Allocation $\rightarrow$ Time Off Request $\rightarrow$ Approval & Balance Deduction

**Persona:** Employee (`employee@pay365.dev`) + HR Manager (`hr.manager@pay365.dev`)  
**Objective:** Submit a real leave request from the employee portal, verify time off calendar, approve it as HR Manager, and observe the atomic balance deduction in PostgreSQL.

### Step 1: Employee Submits Time Off Request
1. Log in as `employee@pay365.dev` / `Password@123`.
2. Navigate to **Time Off** (`/time-off`).
3. Skeletons render while loading `/api/v1/time-off/types` and `/api/v1/time-off/requests`.
4. Click **New Request** (or click any interactive timeline cell):
   - Employee: `Rahul Verma (EMP-003)`
   - Leave Type: `Casual Leave (CL)`
   - From Date: `2026-09-07`
   - To Date: `2026-09-08` (2 days)
   - Reason: `Family medical appointment`
5. Click **Submit Request**:
   - Toast notification confirms successful submission: *"Time off request (2 days) submitted successfully!"*.
   - A pending leave card appears on the timeline with a clock icon.

### Step 2: HR Manager Approves Request
1. Log in (or switch profile) to `hr.manager@pay365.dev` / `Password@123`.
2. Navigate to **Time Off** $\rightarrow$ Click **See all requests**.
3. Locate Rahul Verma's pending request (`2026-09-07 → 2026-09-08 · PENDING`).
4. Click **Approve**:
   - Backend endpoint `POST /api/v1/time-off/requests/:id/approve` executes atomically.
   - Status updates to `APPROVED`.
   - Toast confirms approval and allocation deduction.

### Step 3: Verify Balance Deduction
1. Navigate to **Employees** $\rightarrow$ `Rahul Verma` $\rightarrow$ **Attendance & Leaves** tab.
2. Observe Casual Leave balance updated in real-time (`4 / 6 days remaining`).

---

## ✅ Quality Assurance Verification Checklist

- [x] **Zero Mock Data:** All `INITIAL_*` fallback constants removed.
- [x] **Loading States:** Modern `<Skeleton />` shimmering placeholders displayed during network requests.
- [x] **Empty States:** Clear, actionable `<EmptyState />` components when search or filters return zero matches.
- [x] **Toast Alerts:** Non-blocking `<Toast />` notifications on every write, mutation, or error event.
- [x] **Unit & Integration Tests:** 51/51 Vitest test suites green.
