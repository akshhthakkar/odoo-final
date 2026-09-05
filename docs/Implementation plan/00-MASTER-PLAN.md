# PeoplePay360 — Master Implementation Plan

**Project:** PeoplePay360 HR & Payroll
**Date:** 2026-09-05
**Status:** Approved — Architecture Baseline v1.0
**Reference Spec:** `docs/Others/PeoplePay360 HR & Payroll.md`

---

## 1. Executive Summary

PeoplePay360 is an integrated HR & Payroll platform covering the full employee-to-payslip lifecycle: employee master data, contracts, working schedules, attendance, time off, configurable salary structures/rules, two-step payrun processing, payslip PDF generation, bulk email delivery, and a live payroll dashboard.

The architecture is a **4-tier system**:

| Tier | Technology | Responsibility |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite (SPA) | Show it — screens, dashboards, wizards |
| API Layer | Node.js + Express + TypeScript | Control it — auth, RBAC, workflows, orchestration |
| Database | PostgreSQL 16 + Prisma ORM | Store it — all HR/payroll data |
| Calculation | Python 3.12 + FastAPI Payroll Engine | Calculate it — salary rule execution engine |

**Core rule:** React never talks to PostgreSQL and never calculates salary. Node never computes payroll math — it delegates to Python and persists the result. Python is stateless: it receives full computation context and returns a breakdown; it owns no database.

---

## 2. Technology Stack (Decided)

| Concern | Choice | Notes |
|---|---|---|
| Frontend framework | React 19 + TypeScript, Vite build | SPA, client-side rendering |
| Server state | TanStack React Query v5 | All API data fetching/caching |
| Client state | Zustand | Auth session + UI state only |
| UI | Tailwind CSS 4 + shadcn/ui-style components | Fast hackathon velocity |
| Forms | react-hook-form + zod | Zod schemas shared shape with API validation |
| Charts | Recharts | Dashboard charts |
| API framework | Express 5 + TypeScript | Layered: routes → controllers → services → repositories |
| ORM | Prisma | Type-safe PostgreSQL access, migrations |
| Auth | JWT access (15 min) + refresh (7 days, httpOnly cookie) | 5 roles, RBAC middleware |
| Validation | zod on every endpoint | Never trust client input |
| Payroll engine | FastAPI + uvicorn | Stateless JSON service |
| Formula evaluation | Python AST-whitelist evaluator (NO eval/exec) | Safe formula salary rules |
| PDF | pdfkit (Node-side, HTML→PDF template) | Payslip PDF from persisted line data |
| Email | nodemailer + SMTP env config | Ethereal test SMTP in dev |
| Testing | Vitest (API units) + Supertest (API integration) + pytest (engine) | P0 flows covered |
| Dev infra | docker-compose: postgres, api, engine, web | One-command startup |

---

## 3. Repository Structure (Monorepo)

```
odoo-final/
├── apps/
│   ├── api/                     # Node + Express + TypeScript backend
│   │   ├── src/
│   │   │   ├── config/          # Env config (validated at startup)
│   │   │   ├── modules/
│   │   │   │   ├── auth/        # login, JWT, refresh
│   │   │   │   ├── users/       # admin user management
│   │   │   │   ├── employees/   # employees, departments, jobs
│   │   │   │   ├── contracts/
│   │   │   │   ├── schedules/   # working schedules + lines
│   │   │   │   ├── attendance/
│   │   │   │   ├── timeoff/     # types, allocations, requests
│   │   │   │   ├── payroll-config/  # structures, rules
│   │   │   │   ├── payroll-run/ # payruns, payslips, warnings
│   │   │   │   ├── reports/     # dashboard aggregates
│   │   │   │   └── notifications/ # PDF + email
│   │   │   ├── middleware/      # auth, rbac, validate, errors, request-id
│   │   │   ├── shared/          # errors, logger, pagination, helpers
│   │   │   └── server.ts
│   │   └── prisma/              # schema.prisma, migrations, seed.ts
│   ├── web/                     # React SPA
│   │   └── src/
│   │       ├── app/             # router, providers, layout
│   │       ├── features/        # per-module: pages + components + api hooks
│   │       ├── components/ui/   # reusable presentational components
│   │       ├── lib/             # api client, auth store, utils
│   │       └── types/
│   └── (shared zod/ts types via packages/shared if time permits)
├── services/
│   └── payroll-engine/          # Python FastAPI
│       ├── app/
│       │   ├── main.py
│       │   ├── engine/          # rule executor, formula evaluator
│       │   └── schemas/         # pydantic request/response models
│       └── tests/
├── docs/
│   ├── Implementation plan/     # ← this document set
│   └── adr/
├── docker-compose.yml           # postgres + api + engine + web
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
| `05-PAYROLL-ENGINE-CONTRACT.md` | Python service spec, compute contract, formula DSL, warning codes |
| `06-FRONTEND-ARCHITECTURE.md` | Routes, component taxonomy, state, patterns, payrun wizard UX |
| `07-SECURITY-RBAC.md` | Auth strategy, full RBAC permission matrix, security standards |
| `08-ROADMAP-AND-TASKS.md` | Phased task board with Agent-2-ready task specs and acceptance criteria |

---

## 5. Delivery Phases

| Phase | Theme | Tasks | Outcome |
|---|---|---|---|
| **P0** | Foundation & scaffolding | TASK-001 → 004 | Monorepo runs, DB schema migrated, auth works |
| **P1** | HR core | TASK-005 → 009 | Employees, contracts, schedules, attendance, time off |
| **P2** | Payroll core | TASK-010 → 014 | Salary config, Python engine, payrun compute, payslips |
| **P3** | Payroll completion | TASK-015 → 018 | Validate/paid flow, warnings, PDF, email, dashboard |
| **P4** | Demo readiness | TASK-019 → 021 | Seed data, polish, two E2E demo scenarios |

Full task specifications with acceptance criteria: see `08-ROADMAP-AND-TASKS.md`.

---

## 6. Status Board (live — update as work progresses)

| Task | Feature | Priority | Status | Depends On |
|---|---|---|---|---|
| TASK-001 | Monorepo scaffolding + docker-compose | P0 | Not Started | — |
| TASK-002 | Database schema + migrations | P0 | Not Started | TASK-001 |
| TASK-003 | Auth (JWT, refresh, /me) | P0 | Not Started | TASK-002 |
| TASK-004 | RBAC middleware + audit log | P0 | Not Started | TASK-003 |
| TASK-005 | Web app shell: login, nav, layout | P0 | Not Started | TASK-003 |
| TASK-006 | Employees + departments + jobs CRUD | P0 | Not Started | TASK-004, 005 |
| TASK-007 | Contracts CRUD + active-contract rules | P0 | Not Started | TASK-006 |
| TASK-008 | Working schedules + schedule lines | P1 | Not Started | TASK-006 |
| TASK-009 | Attendance CRUD + corrections | P0 | Not Started | TASK-006 |
| TASK-010 | Time off types + allocations | P1 | Not Started | TASK-006 |
| TASK-011 | Time off requests + approve/refuse flow | P0 | Not Started | TASK-010 |
| TASK-012 | Salary structures + rules config | P0 | Not Started | TASK-006 |
| TASK-013 | Python payroll engine | P0 | Not Started | TASK-012 (contract only) |
| TASK-014 | Payrun wizard + compute + payslips | P0 | Not Started | TASK-007, 009, 011, 012, 013 |
| TASK-015 | Payrun validate / mark paid / state machine | P0 | Not Started | TASK-014 |
| TASK-016 | Payroll warnings surfacing | P0 | Not Started | TASK-014 |
| TASK-017 | Payslip PDF generation | P1 | Not Started | TASK-014 |
| TASK-018 | Bulk payslip email | P1 | Not Started | TASK-017 |
| TASK-019 | Payroll dashboard (KPIs, charts, alerts) | P0 | Not Started | TASK-015 |
| TASK-020 | Seed/demo dataset | P0 | Not Started | TASK-012 |
| TASK-021 | Kanban view + UI polish + demo walkthrough | P1 | Not Started | TASK-019 |

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
| Technical versatility | 4-tier polyglot stack (TS + Python) with clean service contracts |
| Systems architecture | RBAC (5 roles), layered API, stateless calculation service, audit logging |
| Data relationships | 19-table schema with historical contracts, parent-child payrun→payslips, warnings |
| Live dashboard | Aggregates computed from real records via dedicated report queries — no static data |
