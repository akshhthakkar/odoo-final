# Pay365 — Master Implementation Plan

**Project:** Pay365 HR & Payroll
**Date:** 2026-09-05
**Status:** Approved — Architecture Baseline v1.1 (Payroll Calculation Engine moved from dedicated Python service to in-process TypeScript module inside the Node.js backend)
**Reference Spec:** `docs/Others/Pay365 HR & Payroll.md`

---

## 1. Executive Summary

Pay365 is an integrated HR & Payroll platform covering the full employee-to-payslip lifecycle: employee master data, contracts, working schedules, attendance, time off, configurable salary structures/rules, two-step payrun processing, payslip PDF generation, bulk email delivery, and a live payroll dashboard.

The architecture is a **3-tier system**:

| Tier | Technology | Responsibility |
|---|---|---|
| Frontend | React 19 + JavaScript (JSX) + Vite + SCSS (SPA) | Show it — screens, dashboards, wizards |
| API Layer | Node.js + Express + JavaScript (ES Modules) (incl. in-process Payroll Calculation Engine) | Control it — auth, RBAC, workflows, orchestration; Calculate it — salary rule execution engine (pure module, no DB, no I/O) |
| Database | PostgreSQL 16 + Prisma ORM | Store it — all HR/payroll data |

**Core rule:** React never talks to PostgreSQL and never calculates salary. Payroll math lives in a dedicated **Payroll Calculation Engine module** inside the Node.js backend: it is a pure function library (no database, no HTTP, no I/O) invoked directly by the payroll-run service, which persists the result. Same input → same output, always.

---

## 2. Technology Stack (Decided)

| Concern | Choice | Notes |
|---|---|---|
| Frontend framework | React 19 + JavaScript (JSX), Vite build | SPA, client-side rendering |
| Server state | TanStack React Query v5 | All API data fetching/caching |
| Client state | Redux Toolkit (RTK) | Auth session + UI state only |
| UI | SCSS (SASS/SCSS modular styles) + custom components | Clean, modular CSS design system |
| Forms | react-hook-form + zod | Zod schemas shared shape with API validation |
| Charts | Recharts | Dashboard charts |
| API framework | Express 5 + JavaScript (ES Modules) | Layered: routes → controllers → services → repositories |
| ORM | Prisma | PostgreSQL access via Prisma Client JS, migrations |
| Auth | JWT access (15 min) + refresh (7 days, httpOnly cookie) | 5 roles, RBAC middleware |
| Validation | zod on every endpoint | Never trust client input |
| Payroll engine | In-process module (`src/engine/`) inside the Express app | Pure calculation library — no DB, no HTTP, no I/O |
| Formula evaluation | Grammar-whitelisted parser/evaluator (NO eval / NO new Function) | Safe formula salary rules |
| Decimal precision | decimal.js (ROUND_HALF_UP, 2 dp) | Exact money math |
| PDF | pdfkit (Node-side, HTML→PDF template) | Payslip PDF from persisted line data |
| Email | nodemailer + SMTP env config | Ethereal test SMTP in dev |
| Testing | Vitest (API units + engine units) + Supertest (API integration) | P0 flows covered |
| Dev infra | docker-compose: postgres, api, web | One-command startup |

---

## 3. Repository Structure (Monorepo)

```
odoo-final/
├── backend/                      # Node + Express + JavaScript backend
│   ├── src/
│   │   ├── config/          # Env config (validated at startup)
│   │   ├── engine/          # PAYROLL CALCULATION ENGINE (pure module)
│   │   │   ├── executor/    # sequenced rule executor
│   │   │   ├── formula/     # safe formula parser/evaluator (no eval)
│   │   │   ├── validator/   # rule-set validation (validateRules)
│   │   │   └── types/       # compute request/response schemas (zod)
│   │   ├── modules/
│   │   │   ├── auth/        # login, JWT, refresh
│   │   │   ├── users/       # admin user management
│   │   │   ├── employees/   # employees, departments, jobs
│   │   │   ├── contracts/
│   │   │   ├── schedules/   # working schedules + lines
│   │   │   ├── attendance/
│   │   │   ├── timeoff/     # types, allocations, requests
│   │   │   ├── payroll-config/  # structures, rules
│   │   │   ├── payroll-run/ # payruns, payslips, warnings (calls engine)
│   │   │   ├── reports/     # dashboard aggregates
│   │   │   └── notifications/ # PDF + email
│   │   ├── middleware/      # auth, rbac, validate, errors, request-id
│   │   ├── shared/          # errors, logger, pagination, helpers
│   │   └── server.js
│   └── prisma/              # schema.prisma, migrations, seed.js
├── frontend/                     # React SPA
│   └── src/
│       ├── app/             # router, providers, layout
│       ├── features/        # per-module: pages + components + api hooks
│       ├── components/ui/   # reusable presentational components
│       ├── store/           # Redux store, authSlice, uiSlice
│       ├── styles/          # SCSS design system (variables, mixins, main.scss)
│       └── lib/             # api client, format, query-client
├── docs/
│   ├── Implementation plan/     # ← this document set
│   └── adr/
├── docker-compose.yml           # postgres + api + web
└── README.md
```

---

## 4. Document Index

| File | Contents |
|---|---|
| `00-MASTER-PLAN.md` | This file — stack, structure, phases, status board |
| `01-REQUIREMENTS.md` | Personas, functional/non-functional requirements, priorities, assumptions |
| `02-SYSTEM-ARCHITECTURE.md` | Architecture decisions, module boundaries, data flows, integrations |
| `03-DATABASE-DESIGN.md` | Full schema: entities, fields, relationships, indexes, constraints |
| `04-API-CONTRACTS.md` | API standards, endpoint catalog, detailed contracts for critical endpoints |
| `05-PAYROLL-ENGINE-CONTRACT.md` | TypeScript engine module spec, compute contract, formula DSL, warning codes |
| `06-FRONTEND-ARCHITECTURE.md` | Routes, component taxonomy, state, patterns, payrun wizard UX |
| `07-SECURITY-RBAC.md` | Auth strategy, full RBAC permission matrix, security standards |
| `08-ROADMAP-AND-TASKS.md` | Phased task board with Agent-2-ready task specs and acceptance criteria |

---

## 5. Delivery Phases

| Phase | Theme | Tasks | Outcome |
|---|---|---|---|
| **P0** | Critical Core Business Flow | TASK-001 → 016 | Complete flow: Auth → Org → Employees → Contracts → Schedules → Attendance → Leave Allocation/Request → Salary Rules → Payrun → Pure Engine → Payslips → Warnings/Validation |
| **P1** | Finishing & Polish Layer | TASK-017 → 021 | PDF export, Bulk Email dispatch, Live Operations Dashboard, Advanced Reporting, Kanban & UI Polish |

Full task specifications with acceptance criteria: see `08-ROADMAP-AND-TASKS.md`.

---

## 6. Status Board (live — update as work progresses)

| Task | Feature | Priority | Status | Depends On |
|---|---|---|---|---|
| TASK-001 | Foundation / Auth & Scaffolding | P0 | Not Started | — |
| TASK-002 | Departments & Jobs CRUD | P0 | Not Started | TASK-001 |
| TASK-003 | Users + 5-Role RBAC Model | P0 | Not Started | TASK-001, 002 |
| TASK-004 | Employees Master Data & Smart-Button Hub | P0 | Not Started | TASK-002, 003 |
| TASK-005 | Contracts CRUD + Active-Contract Period Logic | P0 | Not Started | TASK-004 |
| TASK-006 | Working Schedules + Lines (Weekly Hours Calculation) | P0 | Not Started | TASK-004 |
| TASK-007 | Attendance CRUD + Corrections & Status Logic | P0 | Not Started | TASK-004, 006 |
| TASK-008 | Time Off Types | P0 | Not Started | TASK-004 |
| TASK-009 | Time Off Allocations & Balance Tracking | P0 | Not Started | TASK-008 |
| TASK-010 | Time Off Requests & Automatic Balance Deduction | P0 | Not Started | TASK-009 |
| TASK-011 | Salary Structures CRUD | P0 | Not Started | TASK-004 |
| TASK-012 | Salary Rules Configuration & Sequencing | P0 | Not Started | TASK-011 |
| TASK-013 | Payrun Wizard & Orchestration Service | P0 | Not Started | TASK-005, 007, 010, 012 |
| TASK-014 | Pure In-Process TypeScript Payroll Engine Module | P0 | Not Started | TASK-012 (contract only) |
| TASK-015 | Payslips Generation & Line Assembly | P0 | Not Started | TASK-013, 014 |
| TASK-016 | Payroll Validation, Warnings & State Machine | P0 | Not Started | TASK-015 |
| TASK-017 | Payslip PDF Generation (`pdfkit`) | P1 | Not Started | TASK-015 |
| TASK-018 | Bulk Payslip Email Dispatch (`nodemailer`) | P1 | Not Started | TASK-017 |
| TASK-019 | Live Operations Dashboard (Strictly mapped SQL metrics) | P1 | Not Started | TASK-016 |
| TASK-020 | Advanced Reporting & Analytics Breakdown | P1 | Not Started | TASK-019 |
| TASK-021 | Kanban Views, UX Polish & Demo Rehearsal | P1 | Not Started | TASK-016 |

---

## 7. Demo Scenario Mapping (Deliverable Requirement)

The spec requires a 5-minute walkthrough of two end-to-end scenarios:

**Scenario A — Employee to Payslip:**
1. HR Manager logs in → Employees (Kanban) → open employee form
2. View smart buttons: Contracts / Attendance / Time Off counts
3. Payroll → New Payrun wizard: Step 1 pick structure + period → Step 2 select employees → Create
4. Payrun screen: Compute → warnings shown → Validate → Mark Paid
5. Open a payslip: rule-by-rule breakdown (BASIC, HRA, TRANSPORT, PF, TAX, Gross, Net)
6. Print Payslip PDF → Send Payslips (bulk email)

**Scenario B — Leave Allocation to Request:**
1. HR Manager creates a Time Off Type ("Casual Leave", days, requires allocation)
2. Creates an Allocation for an employee → approves it → balance visible
3. Employee (or HR on behalf) submits a Time Off Request
4. HR approves → balance automatically deducted → smart-button counts update on the employee form
5. Dashboard reflects approved time-off and attendance health

**Judge criteria → architectural response:**

| Criterion | How the architecture serves it |
|---|---|
| Functionality & completeness | Every spec module A1–A7, B1–B9 has a task and an API contract |
| Business logic quality | Period-based contract selection, leave balance deduction, rule sequencing, duplicate-payslip warnings — all modeled explicitly |
| Technical versatility | Modern JavaScript stack (React 19 + SCSS + Node/Express) with a cleanly separated pure calculation engine and explicit module contracts |
| Systems architecture | RBAC (5 roles), layered API, pure in-process calculation engine, audit logging |
| Data relationships | 19-table schema with historical contracts, parent-child payrun→payslips, warnings |
| Live dashboard | Aggregates computed from real records via dedicated report queries — no static data |
