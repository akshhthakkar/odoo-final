# TASK-018 — Bulk Payslip Email Dispatch (`nodemailer`) — Detailed Plan

**Priority:** P1 · **Deps:** TASK-017 (PDF renderer) · **Contract:** `04-API-CONTRACTS.md` §payruns, `07-SECURITY-RBAC.md` §87, `02-SYSTEM-ARCHITECTURE.md` §5.3/§6

## Goal

One click sends every payslip of a payrun as a PDF email attachment to its employee.
Per-recipient failures never abort the batch; every payslip gets its `email_sent_at`
stamped on success.

## Naming conflict resolved up front

- `08-ROADMAP-AND-TASKS.md` / `02-SYSTEM-ARCHITECTURE.md` say `POST /payruns/:id/send-payslips`
- `04-API-CONTRACTS.md` (the API source of truth) + `07-SECURITY-RBAC.md` say
  `POST /payruns/:id/dispatches` with body `{ "channel": "EMAIL" }`

**Decision: follow the API contract** — `POST /payruns/:id/dispatches`. The mismatch is
worth a note to the team so the roadmap doc gets a one-line fix.

## Acceptance Criteria (from the roadmap)

1. Dispatches PDF attachments to employee emails
2. Logs `email_sent_at` on payslips
3. Partial failures do **not** abort the batch
4. Restricted to `HR_PAYROLL_MANAGER` (+ ADMIN, per house pattern)

## Endpoint (1)

```
POST /api/v1/payruns/:id/dispatches
Role:   HR_PAYROLL_MANAGER, ADMIN
Body:   { "channel": "EMAIL" }        (zod-validated; only EMAIL exists in P0)
Guards: payrun must exist (404) and be in COMPUTED / VALIDATED / PAID
        (409 STATE_ERROR otherwise — a DRAFT/CANCELLED payrun has no sent-able payslips)
```

Response — per-payslip result summary (contract wording):

```json
{ "success": true, "data": {
    "payrun_id": "…", "channel": "EMAIL",
    "total": 3, "sent": 2, "failed": 1,
    "results": [
      { "payslip_id": "…", "employee_name": "Rahul Verma", "email": "demo.rahul@pay365.dev",
        "status": "SENT", "email_sent_at": "2026-09-05T…" },
      { "payslip_id": "…", "employee_name": "Nikhil Jain", "email": "bad@…",
        "status": "FAILED", "error": "…" }
    ]
} }
```

## Files (3 new, 3 modified, 1 dependency added)

### 1. MODIFY `backend/src/config/env.js` (+5 vars, all with safe dev defaults)

```
SMTP_HOST   optional   — when absent, dev mode uses a throwaway Ethereal account
SMTP_PORT   default 587
SMTP_USER   optional
SMTP_PASS   optional
SMTP_SECURE default false (true for 465)
SMTP_FROM   default "Pay365 <payslips@pay365.dev>"
```

### 2. NEW `notifications/email.service.js` (~50 lines) — the module boundary owner

The architecture table (`02-SYSTEM-ARCHITECTURE.md` §88) assigns SMTP ownership to the
**notifications module**; payrun orchestration stays in payroll-run. This split keeps
both modules single-purpose:

```js
import nodemailer from 'nodemailer';

// Lazy singleton: real SMTP when configured, else an Ethereal test account.
export async function getTransporter() {
  if (transporter) return transporter;
  transporter = env.SMTP_HOST
    ? nodemailer.createTransport({ host, port, secure, auth })
    : nodemailer.createTransport(await createEtherealAccount());  // dev-only
  return transporter;
}

export async function sendPayslipEmail({ to, employeeName, payrunName, periodLabel, netAmount, pdfBuffer }) {
  // subject:  Your payslip for <period>
  // text:     Hi <name>, your payslip for <payrunName> is attached. Net: <net>.
  //           (Ethereal preview URL logged in dev)
  // attachment: filename payslip-<code>-<period>.pdf, content pdfBuffer
  // returns { previewUrl? }  — throws on failure (caller catches per-recipient)
}
```

Ethereal (`nodemailer.createTestAccount()`): throwaway SMTP credentials generated on the
fly; `getTestMessageUrl(info)` yields a browser preview link — logged once at first send
in dev. Requires internet; documented.

### 3. NEW `payroll-run/dispatch.service.js` (~80 lines) — the orchestration

```js
export async function dispatchPayrunPayslips(payrunId, actorId) {
  // 1. load payrun (404) + guard status in [COMPUTED, VALIDATED, PAID] (409 STATE_ERROR)
  // 2. load its payslips + employee email/name (payslip.employeeId -> employee.email)
  // 3. for EACH payslip (sequential, plain loop):
  //      renderPayslipPdf(payslip)        <- TASK-017, Buffer, zero recalculation
  //      try { sendPayslipEmail(...); await tx.payslip.update({ emailSentAt: new Date() });
  //            results.push(SENT) }
  //      catch (err) { results.push(FAILED, err.message) }   <- partial failure isolation (AC)
  // 4. one audit row PAYRUN_DISPATCH with {sent, failed}
  // 5. return the summary shape above
}
```

- **Sequential loop, per-recipient try/catch** — the simplest correct isolation; a dead
  SMTP connection surfaces as N FAILED rows, not a 500.
- `email_sent_at` written immediately after each successful send (not batched) so a
  mid-batch crash still records what was sent.
- Re-dispatch is allowed and overwrites `email_sent_at` (documented; no suppression
  logic — P1 demo scope).

### 4. MODIFY `payroll-run/payroll-run.controller.js` (+1 handler)

`dispatch` — thin: reads `:id`, calls the service, envelope out.

### 5. MODIFY `payroll-run/payroll-run.routes.js` (+1 route)

```js
router.post('/:id/dispatches', requireRole('HR_PAYROLL_MANAGER', 'ADMIN'),
            validateBody(dispatchSchema), controller.dispatch);
```

### 6. MODIFY `payroll-run/schemas.js` (+1 schema)

```js
export const dispatchSchema = z.object({ channel: z.literal('EMAIL') });
```

### 7. MODIFY `backend/package.json` (+1 dependency)

```
nodemailer ^7.x   (pure JS)
```

## Audit trail (RBAC doc §10 requires dispatch audit)

`PAYRUN_DISPATCH` row: `entity: 'payrun'`, payload `{ sent, failed }` — written after the
loop (dispatch is not money-mutation; one audit row per batch, not per email).

## Error mapping

| Case                         | Status | Code        |
|------------------------------|--------|-------------|
| payrun not found             | 404    | NOT_FOUND   |
| DRAFT / CANCELLED payrun     | 409    | STATE_ERROR |
| body channel !== EMAIL       | 400    | VALIDATION_ERROR |
| role missing                 | 403    | FORBIDDEN   |
| one recipient fails          | —      | row `FAILED` in summary; HTTP stays 200 |
| SMTP totally unreachable     | —      | every row FAILED; HTTP stays 200 (summary tells the story) |

## Concurrency semaphore (contract §5: "6 concurrent max") — deferred

Documented simplification: the endpoint is manager-only and idempotent-ish
(re-send overwrites); the per-recipient try/catch already contains failures.
The semaphore lands with TASK-020/021 polish if needed.

## Verification checklist

1. Container rebuild once: `docker compose up -d --build --force-recreate --renew-anon-volumes api` (new dependency)
2. `POST /payruns/:id/dispatches` on payrun 1 (2 payslips, Ethereal SMTP, internet on)
   → 200 summary `{ total: 2, sent: 2, failed: 0 }`, both rows SENT with timestamps
3. DB: `email_sent_at` populated on both payslips; second dispatch overwrites (re-send OK)
4. **Partial-failure AC**: set one employee's email to `broken@@nope` in DB → dispatch →
   `{ sent: 1, failed: 1 }`, HTTP 200, other payslip unaffected; restore email
5. Payrun in CANCELLED state → 409 STATE_ERROR
6. RBAC: PAYROLL_USER → 403; EMPLOYEE → 403; ADMIN → allowed
7. Audit row `PAYRUN_DISPATCH` present
8. Regression: `npm test` (37 engine tests) still green; payslip list shows updated `email_sent_at`

## Explicit non-goals (deferred)

- Background queue / async job runner — sequential loop is enough at demo scale
- HTML email templates — plain text + PDF attachment per AC
- Suppression of already-sent payslips — re-send allowed, timestamp overwrites
- Attachment size limits / bounce handling — SMTP provider concern
