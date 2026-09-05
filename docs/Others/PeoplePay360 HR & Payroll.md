

# **Pay365: HR & Payroll** 

_An Integrated Human Resource and Payroll Operations Platform_ 

This hackathon project is an HR and Payroll platform called **“HR & Payrollˮ** , designed to handle: 

- Complete employee management including employee profiles, contracts, salary information, and employment history 

- Attendance and working schedule management with check-in, check-out, worked hours and attendance corrections 

- Time off management covering leave requests, approvals, allocations, leave balances, and configurable time off types 

- Payroll processing through Payruns and Payslips, including salary computation, warnings, validation, payment status, and payroll history 

- Configurable Salary Structures and Salary Rules for calculating earnings, allowances, deductions, contributions, and final net salary 

- Payslip PDF generation, bulk employee email delivery, and a Payroll Dashboard that combines employee, attendance, leave, contract, and payroll information 

## **1) Project Overview** 

Many basic HR tools store employee details, attendance, leave, and salary data as separate records. Real HR and payroll teams need these records to work together. An employee may have multiple contracts over time, but payroll must use the contract that applies to the payroll period. Working hours come from an assigned schedule, attendance contains exceptions that may need review, leave balances depend on allocations and approved requests, and payroll must transform all of that into understandable payslips before payment. 

The goal of this project is to build an HR and Payroll platform that goes beyond simple employee CRUD screens and becomes a connected operational flow. The Employee record acts as the central hub, related Contracts and Working Schedules provide payroll context, Attendance and Time Off capture day-to-day HR activity, Salary Structures and Rules define salary computation, and Payruns turn eligible employee records into validated payslips that can be printed as PDF and sent to employees. 

Teams are free to use any programming language, framework, or database technology to build this solution. The focus is on the business logic, data relationships, payroll calculation flow, and end-to-end user experience, not on any specific platform or vendor. 

## **2) Goals & Scope** 

##### **Main Goal** 

Develop an integrated HR and payroll platform managing the full employee lifecycle-from master data and time tracking to payroll calculation and reporting. 

##### **Key Outcomes** 

- **Unified HR Flow:** Centralized employee records with seamless navigation to Contracts, Attendance, and Time Off. 

- **Contract Management:** Maintain historical records while ensuring payroll uses only the active, period-specific contract. 

- **Operational Tracking:** Implement flexible Working Schedules, attendance tracking (with exception handling), and comprehensive Time Off (requests/allocations). 

- **Payroll Processing:** Enable a two-step pay run workflow: select scope/period, then select employees. Generate payslips with clear breakdowns (Basic, Allowances, Deductions) and validation warnings. 

- **Reporting:** A centralized Payroll Dashboard aggregating HR/Payroll data across Periods, Departments, and Employee types. 

## **3) User Roles** 

##### **Employee** 

- View own employee details, attendance records, and leave balances 

- Create attendance entries and Time Off Requests, with no payroll or HR administration access 

##### **HR Manager** 

- Full CRUD access to Employees, Attendance, Contracts, Working Schedules, and Time Off modules 

- Approve or refuse Time Off Requests, with no access to payroll features 

##### **HR Payroll User** 

- All HR Manager permissions plus Create, Read, and Update access to Payruns and Payslips 

- Read-only access to Salary Structures and Salary Rules 

##### **HR Payroll Manager** 

- All HR Payroll User permissions with full CRUD access to Payruns, Payslips, Salary Structures, and Salary Rules. 

- Full control over HR and payroll-related records and configurations 

##### **Admin** 

- Full access to all modules and models across the platform 

- User management, role assignment, permission updates, and complete system administration 

## **4) Modules / Features Breakdown** 

#### **A) HR Backend (Configuration & Master Data Area)** 

##### **A1) Employee Master Management** 

- Support Kanban, List, and Form views for employee records. 

- Capture essential work details like department, manager, schedule, job position, and status on the employee form. 

- Provide quick list-view access and direct links from the employee form to filter and view related Contracts, Attendance, and Time Off records. 

##### **A2) Contract Management** 

- Maintain historical contract records linked to employees to track changes over time. 

- List view must display key contract details like dates, wages, and status, clearly highlighting the active contract. 

- Contract forms should capture employment terms including duration, department, position, wage, and salary structure. 

- Ensure payroll processes only the contract applicable to the selected period, avoiding concurrent active contracts. 

##### **A3) Working Schedule Setup** 

- Implement List and Form views for scheduling; list view should show key metrics like name, type, and weekly hours. 

- Form view defines the weekly pattern using Day, Start Time, End Time, and Break. 

- Calculate total weekly hours automatically from the defined schedule rather than entering them manually. 

- Assign working schedules to employees or contracts to standardize attendance and payroll expectations. 

##### **A4) Time Off Type & Allocation Setup** 

- Time Off is accessible via the main navigation, housing Requests, Allocations, and configured Time Off Types. 

- Time Off Types define leave policies including units (days/hours), allocation requirements, approval workflows, and payroll integration. 

- Allocations manage employee balances, requiring approval before availability, and tracking detailed metrics like taken, remaining, and validity periods. 

- Approved leave requests automatically deduct from assigned allocations, ensuring balances are accurately consumed and transparently linked. 

##### **A5) Salary Structure Setup** 

- Salary Structures act as containers for organized collections of Salary Rules, such as a "Regular Salary" structure. 

- Structures require List and Form views to display associated details like the number of rules, employees, and active status. 

- The form view manages included salary rules and their execution sequence. 

- Selected structures on a Payrun dictate the specific set of rules applied to calculate employee payslips. 

##### **A6) Salary Rule Setup** 

- Salary Rules define how earnings and deductions are calculated, utilizing List and Form views to manage attributes like Name, Code, Category, and Sequence. 

- Categories allow for the clear distinction of salary components, including Basic, Allowances, Gross, Deductions, and Net salary. 

- Rules are processed in a specific sequence to ensure dependencies are respected, allowing complex totals to build upon earlier calculations. 

- Flexible computation methods-including fixed amounts, percentages, and formulas-drive the actual salary calculations visible on final payslips. 

##### **A7) Reporting & Dashboard Configuration** 

- The Payroll Dashboard integrates data from HR and Payroll modules, displaying live metrics derived from actual system records. 

- Flexible filtering by Period and Department allows users to analyze salary costs, attendance, and leave patterns across specific timeframes or business units. 

- Employee Type filters enable focused analysis, restricting dashboard data to specific groups like full-time or contract staff. 

#### **B) HR & Payroll Frontend (Operational Experience)** 

##### **B1) Main Navigation & Employee Views** 

- Top navigation exposes Employees, Contracts, Attendance, Time Off, Payroll, and Reports 

- Employees can be accessed via Kanban or List views, both leading to a unified Employee Form acting as the operational hub 

##### **B2) Employee Form & Related Record Navigation** 

- Employee Form displays identity, role, department, manager, schedule, and active status 

- Smart-button actions display counts and open filtered views for related Contracts, Attendance, Time Off, and Allocations 

##### **B3) Attendance List & Form** 

- Attendance is accessible globally from the main menu or directly from an individual Employee Form 

- List view displays Check In, Check Out, Worked Hours, and Status for quick review of entries and exceptions 

- Attendance Form provides detailed records and supports manual corrections restricted to authorized users 

- Attendance data remains available for reporting and Payroll Dashboard insights 

##### **B4) Time Off Requests** 

- Requests are accessed exclusively via Time Off → Requests in the top navigation 

- Request List provides an overview of Employee, Type, Dates, Duration, and Status 

- Request Form details the request and supports a simple approval or refusal workflow 

- Approved requests automatically reduce balances for leave types requiring allocation 

##### **B5) Payrun Creation Wizard** 

- Clicking NEW launches a setup wizard instead of immediately creating a record 

- Step 1 defines scope including Salary Structure, and Period 

- Clicking Continue moves to employee selection without creating the Payrun 

- Step 2 filters eligible staff for explicit user selection 

- Create Payrun initializes the batch containing only selected employees and opens the processing view 

##### **B6) Payrun Processing Screen** 

- Payruns group generated Payslips for a specific payroll period 

- Payrun Form provides processing actions: Compute, Validate, Mark Paid, and Send Payslips 

- Displays run name, structure, period, status, and summary list of payslips 

- Highlights warnings such as missing bank details or duplicate payslips prior to finalization 

- Preserves finalized or paid payroll batches as historical records 

##### **B7) Payslip & Salary Computation Screen** 

- Payslips can be accessed via parent Payruns or from the dedicated Payslips list view 

- Displays key identification attributes: Employee, Structure, Pay Run, Period, Status, and Worked Days 

- Salary Computation section details individual rule breakdowns including Basic, Allowances, Deductions, Gross, and Net amounts 

- Computation logic automatically uses the applicable period contract alongside the Payrun's assigned Salary Structure 

##### **B8) Payslip PDF & Employee Delivery** 

- Print Payslip action generates a printable PDF document for individual employees 

- Parent Payrun includes a Send Payslips action for bulk email distribution 

##### **B9) Payroll Dashboard** 

The Payroll Dashboard should help Payroll and HR users understand payments, staffing impact, leave patterns, attendance quality, and payroll warnings for the selected filters. 

- KPI cards display key metrics like Total Net Salary Paid, Payslips Generated, Average Salary, Approved Time Off, and Attendance Health 

- Charts plot Salary Cost by Department and Monthly Net Salary Trends using historical data 

- Operational alerts surface payroll statuses, missing required information, duplicate payslips, and contract attention items 

- Attendance and Time Off overviews track presence, overtime, approved days, pending requests, and leave balances 

- Attendance Overview can show Present, Late, Absent, Overtime, missing check-outs, manual edits, and attendance coverage 

- Department breakdown combines headcount with total salary expenditure 

- Aggregates live data across Employees, Contracts, Payroll, Attendance, and Time Off modules 

## **5) Complete Flow (End-to-End)** 

- Employees are managed via unified Kanban or List views, acting as the central hub for all HR interactions. 

- Contracts and Working Schedules are linked to employees, ensuring payroll processing uses the specific terms and time patterns valid for the current period. 

- Attendance records capture daily presence and exceptions, allowing authorized users to verify and correct entries as needed. 

- Time Off management automates the lifecycle from defining leave types and allocating balances to processing and approving individual requests. 

- Payroll configuration involves defining Salary Structures and sequencing Salary Rules to dictate how earnings, deductions, and net salary are computed. 

- Payroll officers initiate a Payrun by defining the scope and period, then selecting specific employees before finalizing the batch creation. 

- The system computes individual Payslips based on the applicable contract, defined structure, and period context. 

- Officers review computed Payslip components and system-generated warnings to ensure accuracy before validating and marking the Payrun as paid. 

- Finalized Payruns are archived for history, with options to generate individual PDF Payslips and distribute them to employees via email. 

- The Payroll Dashboard aggregates real-time data across HR, attendance, and payroll modules, offering filtered insights for strategic decision-making. 

## **6) Why This Hackathon Problem Is Important** 

- Integrates core HR and Payroll operations into one cohesive, end-to-end business flow, covering everything from employee master data to final payslip distribution. 

- Prioritizes real-world business logic such as period-based contract handling, leave allocation, and ordered salary calculations over simple interface design. 

- Encourages industry-standard system architecture, including role-based permissions, parent-child data relationships, and comprehensive historical payroll tracking. 

- Allows teams to demonstrate technical versatility by choosing their preferred stack, ensuring the focus remains on robust data relationships and accurate payroll computation. 

## **7) Technical Guidelines** 

- Teams are free to select any backend language, frontend framework, and database technology for their solution. 

- Implement essential business rules such as contract selection, schedule calculations, leave logic, and payroll computation directly in the application logic rather than using hardcoded values. 

- Ensure Salary Rules actively drive Payslip generation; configuration screens must be fully functional and integrated, not static mockups. 

- Surface potential payroll issues, such as duplicate entries or incomplete employee data, to users before finalization. 

- The Payroll Dashboard must reflect real-time, live data generated from HR and payroll operations instead of relying on static charts. 

- Include support for generating Payslip PDFs and facilitating bulk email distribution directly from the Payrun workflow. 

## **8) Deliverables** 

- **Functional platform** : Fully operational HR and payroll system populated with representative employee, contract, time, salary, and payroll data. 

- **Live demonstration** : Five-minute walkthrough showcasing two end-to-end scenarios, such as the full employee-to-payslip and leave allocation-to-request workflows. 

- **Future roadmap** : Brief summary of proposed enhancements or extensions the team would prioritize with additional development time. 

### **Why This Hackathon Problem is** 

### **Important** 

**Unified HR & Payroll Workflow:** Demonstrates an end-to-end employee-to-payslip 

process, linking contracts, attendance, leave, and payroll into a single operational flow. 

**Business Logic Complexity:** Focuses on real-world requirements like period-based contract validation, leave balance consumption, salary rule sequencing, and payroll error detection. 

**Systems Architecture:** Promotes industry-standard designs, including role-based access, comprehensive data relationships, historical record tracking, and aggregated analytics. 

**Technical Versatility:** Empowers teams to apply their preferred tech stack while 

prioritizing robust data modeling and accurate payroll computation over surface-level UI design. 

**Mockup Link:** <u>https://app.excalidraw.com/l/65VNwvy7c4X/17vHpCNFjex</u> 

