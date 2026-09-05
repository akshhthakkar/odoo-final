# Pay365 — End-to-End Manual Testing Guide

A comprehensive, role-by-role, module-by-module testing guide for **Pay365**. This document provides test cases, expected outcomes, API endpoints hit, and database verification points for all personas across the system.

---

## 1. Test Credentials & Role Matrix

| Role | Email | Password | Primary Permissions / Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@pay365.dev` | `Password@123` | Full system access: User management, all HR & Payroll operations, config, audit logs. |
| **HR Manager** | `hr.manager@pay365.dev` | `Password@123` | Employee lifecycle, contracts, schedules, attendance corrections, leave approvals. *(No payrun finalization)* |
| **HR Payroll Manager** | `payroll.manager@pay365.dev` | `Password@123` | Full payroll lifecycle: Salary structures/rules, Payrun create/compute/validate/mark-paid, dispatches. |
| **HR Payroll User** | `payroll.user@pay365.dev` | `Password@123` | Payrun create & compute, payslip inspection. *(Read-only config; cannot Validate/Mark-Paid)* |
| **Employee** | `employee@pay365.dev` | `Password@123` | Self-Service only: Today's check-in/out, personal leave requests & balances, own payslips & PDF download. |

---

## 2. Module-by-Module Testing Guide

---

### Module 1: Authentication & Session Management

#### Test Case 1.1 — Standard Login & Session Cookie Verification
- **Role:** Any persona (e.g. `admin@pay365.dev`)
- **Steps:**
  1. Navigate to `http://localhost:5173/login`.
  2. Enter valid Email and Password. Click **Sign In**.
  3. Inspect Browser DevTools $\rightarrow$ **Application** $\rightarrow$ **Cookies** $\rightarrow$ `http://localhost:5173`.
- **Expected Result:**
  - Login succeeds with a success toast.
  - Redirects to `/dashboard`.
  - An `httpOnly`, `SameSite=lax` session cookie (`sid`) is stored.
  - Request to `GET /api/v1/auth/me` returns `{ user: { id, email, role, full_name }, employee }`.

#### Test Case 1.2 — Invalid Credentials Handling
- **Role:** Public / Unauthenticated
- **Steps:**
  1. Navigate to `http://localhost:5173/login`.
  2. Enter `admin@pay365.dev` with an incorrect password `WrongPass!`.
  3. Click **Sign In**.
- **Expected Result:**
  - Login fails with error banner: *"Invalid email or password"*.
  - No session cookie is created. User remains on `/login`.

#### Test Case 1.3 — Role-Based Route Protection & Redirection
- **Role:** `employee@pay365.dev`
- **Steps:**
  1. Log in as `employee@pay365.dev`.
  2. Manually type `http://localhost:5173/payruns` or `/salary-config` or `/admin` into the browser URL bar.
- **Expected Result:**
  - Frontend router redirects cleanly back to `/dashboard` (or blocks access via `RequireRole`).
  - Direct API requests return `403 Forbidden`.

#### Test Case 1.4 — Logout & Session Destruction
- **Role:** Any persona
- **Steps:**
  1. Click on User Profile Avatar in the top navigation bar.
  2. Click **Log Out**.
- **Expected Result:**
  - Calls `POST /api/v1/auth/logout`.
  - `sid` cookie is cleared.
  - User is redirected to `/login`. Pressing browser "Back" button does not reveal authenticated pages.

---

### Module 2: Dashboard & Analytics

#### Test Case 2.1 — Executive HR & Payroll Dashboard (Admin / Managers)
- **Role:** `admin@pay365.dev` or `payroll.manager@pay365.dev`
- **Steps:**
  1. Navigate to `/dashboard`.
- **Expected Result:**
  - **KPI Cards:** Display live aggregate values:
    - *Total Employees* (Active count from DB).
    - *Monthly Net Payroll* (Aggregated from latest paid/computed payruns).
    - *Attendance Rate* (Live percentage of employees checked in today).
    - *Pending Leaves* (Count of `TO_APPROVE` requests).
  - **Charts:** Payroll Cost Distribution & Attendance Breakdown render with live data.

#### Test Case 2.2 — Employee Self-Service Dashboard
- **Role:** `employee@pay365.dev`
- **Steps:**
  1. Log in as `employee@pay365.dev` $\rightarrow$ Navigate to `/dashboard`.
- **Expected Result:**
  - Admin executive metrics are bypassed (zero `403` errors).
  - **Today's Attendance Widget:** Displays current punch status with live **Check In** / **Check Out** button.
  - **Leave Balances Card:** Displays progress bars for Paid Time Off, Sick Leave, and Casual Leave.
  - **My Recent Payslips:** Displays personal payslips with direct **Download PDF** button.

---

### Module 3: Employee Master & Profile

#### Test Case 3.1 — Employee Directory & Filtering
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. Navigate to `/employees`.
  2. Test Search by Name/Code (e.g. `Rahul` or `EMP-003`).
  3. Filter by Department (e.g. `Engineering`, `Sales`).
  4. Toggle between Grid and List views.
- **Expected Result:**
  - Calls `GET /api/v1/employees`.
  - Filtered results update instantly in the UI.

#### Test Case 3.2 — Employee Onboarding (Create Employee)
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. On `/employees`, click **+ Add Employee**.
  2. Fill in:
     - First Name: `Vikram`, Last Name: `Malhotra`
     - Email: `vikram.malhotra@pay365.dev`
     - Employee Code: `EMP-999`
     - Department, Job Title, Hire Date, Working Schedule.
  3. Click **Create Employee**.
- **Expected Result:**
  - Submits `POST /api/v1/employees`.
  - Success toast appears: *"Employee created successfully"*.
  - New employee card appears in the list without requiring a page refresh.

#### Test Case 3.3 — Detailed Profile & Tabs Inspection
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. Click on an employee card (e.g. `EMP-001` Arjun Nair).
  2. Navigate through the 5 Profile Tabs:
     - **Personal & Overview:** Legal Name, Contact, PAN, Aadhaar, UAN.
     - **Job & Organization:** Designation, Department, Reporting Manager, Shift.
     - **Salary & CTC Structure:** Monthly Gross, Deductions, Net breakdown.
     - **Attendance & Leaves:** Real leave balances and recent attendance logs.
     - **Contracts & Documents:** Active employment agreements.
- **Expected Result:**
  - Real database records are displayed in all tabs with zero dummy placeholders.

---

### Module 4: Contracts Management

#### Test Case 4.1 — Contract List & Active Resolution
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. Navigate to `/contracts`.
  2. Filter by status (`ACTIVE`, `DRAFT`, `EXPIRED`).
- **Expected Result:**
  - Calls `GET /api/v1/contracts`.
  - Displays Reference (e.g. `CNT-2023-001`), Monthly Wage (`₹92,000`), Contract Type, and Period.

#### Test Case 4.2 — Create Contract with Overlap Prevention
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. Click **+ New Contract**.
  2. Select an employee who already has an `ACTIVE` contract for the current date.
  3. Set status to `ACTIVE` with overlapping date range. Click **Save Contract**.
- **Expected Result:**
  - Backend rejects with `400/409 Conflict`: *"An active contract already exists for this employee during the specified period"*.
  - UI displays informative error toast without crashing.

---

### Module 5: Working Schedules

#### Test Case 5.1 — Inspect & Create Working Schedules
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. Navigate to `/schedules`.
  2. View existing schedules (e.g. `Standard 40h (Mon-Fri 09:00 - 18:00)`).
  3. Click **+ New Schedule**. Enter Name `Flexible 35h`, select Mon–Fri 09:00 to 17:00 (1h break).
  4. Click **Save Schedule**.
- **Expected Result:**
  - Submits `POST /api/v1/schedules`.
  - Auto-computes weekly hours (`35.00 hrs/wk`). Persists schedule lines in PostgreSQL `schedule_lines` table.

---

### Module 6: Attendance Tracking & Punch Management

#### Test Case 6.1 — Live Self-Service Check-In / Check-Out
- **Role:** `employee@pay365.dev`
- **Steps:**
  1. Log in as `employee@pay365.dev`.
  2. On `/dashboard`, click **Check In**.
  3. Verify status badge updates to **Present**.
  4. Click **Check Out**.
- **Expected Result:**
  - Calls `POST /api/v1/attendance/check-in` and `check-out`.
  - Persists check-in/out timestamps in Asia/Kolkata (`+05:30`) in PostgreSQL `attendance` table.

#### Test Case 6.2 — HR Attendance Logs & Manual Correction
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. Navigate to `/attendance`.
  2. Filter by Date or Employee.
  3. Click **+ Record Attendance** (or click Edit icon on an existing log).
  4. Set Check-In `09:00` and Check-Out `18:30` (9.5h worked, 1.5h overtime). Click **Save**.
- **Expected Result:**
  - Calls `POST /api/v1/attendance` (or `PATCH /api/v1/attendance/:id`).
  - Calculates worked hours (`9.5h`) and overtime (`+1.5h`).
  - Updates list immediately.

---

### Module 7: Time Off Management & Leave Workflow

#### Test Case 7.1 — Submit Leave Request
- **Role:** `employee@pay365.dev`
- **Steps:**
  1. Navigate to `/timeoff`.
  2. Click **+ Request Leave** (or click a cell on the calendar).
  3. Select Leave Type (e.g. `Paid Time Off`), Date From `2026-11-02` to `2026-11-04` (3 working days), Reason: `Vacation`.
  4. Click **Submit Request**.
- **Expected Result:**
  - Submits `POST /api/v1/time-off/requests`.
  - Backend computes exact working days excluding weekends.
  - Toast displays: *"Time off request (3 day(s)) submitted successfully!"*.
  - Status shows `TO_APPROVE`.

#### Test Case 7.2 — Insufficient Balance Validation
- **Role:** `employee@pay365.dev`
- **Steps:**
  1. Request 30 consecutive days of `Casual Leave` when only 6 days are allocated.
  2. Click **Submit Request**.
- **Expected Result:**
  - Backend rejects with `422 Unprocessable Entity`: *"Insufficient leave balance. Requested: 30 days, Available: 6 days"*.
  - UI displays error message. No fake row is created.

#### Test Case 7.3 — Approve Leave & Balance Deduction
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. Log in as HR Manager $\rightarrow$ Navigate to `/timeoff`.
  2. Locate the pending `TO_APPROVE` request.
  3. Click **Approve**.
- **Expected Result:**
  - Calls `POST /api/v1/time-off/requests/:id/status-changes` with `{ action: 'APPROVE' }`.
  - Request status updates to `APPROVED`.
  - Employee's `taken_days` in `time_off_allocations` table is atomically incremented.

#### Test Case 7.4 — Refuse Leave with Mandatory Reason
- **Role:** `admin@pay365.dev` or `hr.manager@pay365.dev`
- **Steps:**
  1. Click **Refuse** on a leave request.
  2. In the Refusal Modal, leave the reason empty and click Submit.
  3. Enter reason *"Critical project deadline"* and click **Confirm Refusal**.
- **Expected Result:**
  - Empty reason is blocked with validation alert: *"A refusal reason is mandatory."*
  - On confirm, calls `POST /api/v1/time-off/requests/:id/status-changes` with `{ action: 'REFUSE', refusal_reason: '...' }`.
  - Status updates to `REFUSED` with refusal reason recorded.

---

### Module 8: Salary Structures & Salary Rules Engine

#### Test Case 8.1 — Inspect Salary Rules & Formula Syntax
- **Role:** `admin@pay365.dev` or `payroll.manager@pay365.dev`
- **Steps:**
  1. Navigate to `/salary-config`.
  2. Select `Standard India CTC Structure`.
  3. Verify the sequenced rules:
     - `BASIC` (Fixed 50% of wage)
     - `HRA` (25% of wage)
     - `SPECIAL` (15% of wage)
     - `CONVEYANCE` (10% of wage)
     - `GROSS` (Formula: `BASIC + HRA + SPECIAL + CONVEYANCE`)
     - `PF` (Deduction: `BASIC * 0.12`)
     - `PT` (Fixed Deduction: `200`)
     - `NET` (Formula: `GROSS - PF - PT - TDS`)
- **Expected Result:**
  - Rules render with their categories, computation types, and formulas.

#### Test Case 8.2 — Formula Sandbox & AST Security Test
- **Role:** `admin@pay365.dev`
- **Steps:**
  1. On `/salary-config`, click **Add Rule**.
  2. Try entering malicious formulas: `process.env`, `globalThis`, `eval("1+1")`, `wage.constructor("...")()`.
  3. Click **Save**.
- **Expected Result:**
  - The AST parser rejects the syntax immediately with an error: *"Invalid formula syntax: Unexpected character or unknown variable"*.
  - Zero arbitrary code execution can occur.

---

### Module 9: Payrun Operations & Payslip Lifecycle

#### Test Case 9.1 — 2-Step Payrun Creation Wizard
- **Role:** `admin@pay365.dev` or `payroll.manager@pay365.dev`
- **Steps:**
  1. Navigate to `/payruns`. Click **New Pay Run**.
  2. **Step 1:** Enter Name `November 2026 Payroll`, Period `2026-11-01` to `2026-11-30`, select `Standard India CTC Structure`. Click **Next: Select Employees**.
  3. **Step 2:** Click **Select All** (or pick 3 employees). Click **Create Pay Run**.
- **Expected Result:**
  - Calls `POST /api/v1/payruns`.
  - Payrun is created in `DRAFT` state.
  - Detail page opens showing the 4-step Stepper: `DRAFT` $\rightarrow$ `COMPUTED` $\rightarrow$ `VALIDATED` $\rightarrow$ `PAID`.

#### Test Case 9.2 — Compute Payrun & Verify Mathematical Parity
- **Role:** `payroll.user@pay365.dev` or `payroll.manager@pay365.dev`
- **Steps:**
  1. On the DRAFT payrun, click **Compute Pay Run**.
- **Expected Result:**
  - Calls `POST /api/v1/payruns/:id/status-changes` with `{ action: 'COMPUTE' }`.
  - Status updates to `COMPUTED`.
  - Itemized payslips are generated for all selected employees.
  - For Rahul Verma (`Wage: ₹45,000`):
    - Gross Earnings = `₹45,000.00`
    - Deductions = `₹2,900.00` (PF ₹2,700 + PT ₹200)
    - Net Take-Home = `₹42,100.00`
  - Totals match exactly across UI, API, and DB.

#### Test Case 9.3 — Payslip Line Item Inspection Drawer
- **Role:** `payroll.user@pay365.dev` or `payroll.manager@pay365.dev`
- **Steps:**
  1. In the Payslips table, click on an employee's row.
- **Expected Result:**
  - Drawer opens showing exact earnings (`BASIC`, `HRA`, `SPECIAL`, `CONVEYANCE`) and deductions (`PF`, `PT`, `TDS`).
  - Warning badges display if any contract or attendance warnings were flagged.

#### Test Case 9.4 — Validate & Mark Paid
- **Role:** `payroll.manager@pay365.dev` (or `admin@pay365.dev`)
- **Steps:**
  1. Click **Validate Pay Run** $\rightarrow$ Status moves to `VALIDATED`.
  2. Click **Mark as Paid** $\rightarrow$ Status moves to `PAID`.
- **Expected Result:**
  - Calls `POST /api/v1/payruns/:id/status-changes` with `{ action: 'VALIDATE' }` and `{ action: 'MARK_PAID' }`.
  - Payrun is permanently locked and archived in PostgreSQL.

---

### Module 10: PDF Payslip & Email Dispatches

#### Test Case 10.1 — Vector PDF Payslip Generation & Download
- **Role:** Any persona viewing own payslip (or Payroll Manager viewing any payslip)
- **Steps:**
  1. In the Payslip table or Drawer, click **Download PDF**.
- **Expected Result:**
  - Calls `GET /api/v1/payslips/:id/pdf`.
  - Direct download of PDF file (e.g. `Payslip_Rahul_Verma_Nov2026.pdf`).
  - PDF contains:
    - Company Header & Employee Metadata (PAN, UAN, Bank A/C).
    - Working Days Summary.
    - Two-column table: Earnings vs Deductions.
    - Net Pay highlighted with Indian Rupee Words (e.g. *"Forty Two Thousand One Hundred Rupees Only"*).

#### Test Case 10.2 — Bulk Email Dispatch
- **Role:** `payroll.manager@pay365.dev` or `admin@pay365.dev`
- **Steps:**
  1. On a `COMPUTED`, `VALIDATED`, or `PAID` payrun, click **Dispatch Payslips**.
- **Expected Result:**
  - Calls `POST /api/v1/payruns/:id/dispatches` with `{ channel: 'EMAIL' }`.
  - Sends emails with payslips to employees via SMTP (Ethereal catch-all in development).
  - Database records `email_sent_at` timestamp on each payslip.
  - UI toast reports: *"Payslip email dispatch completed: X sent, 0 failed"*.

---

### Module 11: Administration & Role Management

#### Test Case 11.1 — User Directory & Role Assignment
- **Role:** `admin@pay365.dev`
- **Steps:**
  1. Navigate to `/admin`.
  2. View list of system users and their assigned roles.
  3. Click **+ Add User** $\rightarrow$ Create a new user with `HR_PAYROLL_USER` role linked to an employee record.
- **Expected Result:**
  - Submits `POST /api/v1/users`.
  - User is created and can immediately log in with their credentials.

---

## 3. Quick 5-Minute Demo Flow Script (For Judges & Presenters)

1. **Login:** Log in as `admin@pay365.dev` $\rightarrow$ Show the live Dashboard with real employee aggregates.
2. **Employee Profile:** Go to `/employees` $\rightarrow$ Click `Rahul Verma` $\rightarrow$ Show CTC Salary tab, live Leave balances, and Attendance logs.
3. **Attendance & Leave:** Go to `/timeoff` $\rightarrow$ Show approved leave request with automatic balance deduction.
4. **Payrun Wizard:** Go to `/payruns` $\rightarrow$ Click **New Pay Run** $\rightarrow$ Step 1: `Demo Payrun`, select period & structure $\rightarrow$ Step 2: Select employees $\rightarrow$ Create.
5. **Compute & Verify:** Click **Compute Pay Run** $\rightarrow$ Watch stepper advance to `COMPUTED` with live totals $\rightarrow$ Click payslip to inspect exact itemized lines.
6. **PDF & Email:** Click **Download PDF** to show formatted payslip with Indian words $\rightarrow$ Click **Dispatch Payslips** to trigger email dispatch.
7. **Employee View:** Log out $\rightarrow$ Log in as `employee@pay365.dev` $\rightarrow$ Show Employee Self-Service portal with Today's Attendance Check-in button and personal payslip download.
