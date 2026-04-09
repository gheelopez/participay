# ParticiPay — Features to Implement

This document maps each project requirement to a concrete feature for the ParticiPay platform.

---

## Requirement 1 — Save and Display Text Input with ≥2 Numeric Inputs

**Feature: Extend Research Post Form with Numeric Fields**

Add two numeric fields to the research post creation and edit form:

- `compensation_amount` — monetary compensation in Philippine Peso (e.g., ₱500). Displayed on the study listing card.
- `participants_needed` — total number of participant slots available (e.g., 20). Displayed alongside study details.

**Scope:**
- Supabase DB migration: add `compensation_amount (integer)` and `participants_needed (integer)` columns to `research_posts`
- Update `createResearchPostSchema` and `updateResearchPostSchema` in `src/lib/validations/research-post.ts`
- Update `src/types/database.types.ts`
- Update the post creation/edit form UI in the account page
- Display both values on study listing cards

---

## Requirement 2 — Regular Users: ≥3 Actions

Regular users (researchers and participants) can perform the following actions:

| # | Action | Description |
|---|--------|-------------|
| 1 | **Post a study** | Create a research post with title, description, link, compensation type/amount, and participant count |
| 2 | **Edit a study** | Update any field of their own research post |
| 3 | **Delete a study** | Remove their own research post permanently |
| 4 | **Open / close a study** | Toggle `is_open` to stop or resume accepting participants |
| 5 | **Edit profile** | Update first name, last name, phone number, and school |
| 6 | **Update profile photo** | Upload a new JPEG/PNG profile photo (with magic byte validation) |

Actions 1–4 are already wired in `src/app/actions/research-post.ts`. Actions 5–6 are in `src/app/actions/auth.ts`. The account page UI at `/account` needs to fully expose all of these.

---

## Requirement 3 — Admin Users: ≥3 Admin-Only Actions

Implement a functional admin dashboard at `/admin` replacing the current placeholder.

| # | Action | Description |
|---|--------|-------------|
| 1 | **View all users** | Paginated table of all profiles — name, email, role, join date, post count |
| 2 | **Delete any research post** | Remove any post regardless of ownership (moderation) |
| 3 | **Promote / demote user role** | Toggle a user's `role` between `'user'` and `'admin'` |
| 4 | **Ban / unban a user** | Set an `is_banned` flag on the profile; blocked users are rejected at login |
| 5 | **View audit logs** | Read and display recent entries from the application log |

**Scope:**
- Add `is_banned (boolean, default false)` column to `profiles` in Supabase
- Add admin server actions in `src/app/actions/admin.ts`: `getAllUsers`, `deleteAnyPost`, `setUserRole`, `setBanStatus`
- Update `src/proxy.ts` to reject login for banned users
- Build admin dashboard UI with tabs: Users, Posts, Logs

---

## Requirement 4 — Logging (Auth, Transactions, Admin Actions → File)

**Feature: Centralized Application Logger**

Create `src/lib/logger.ts` that appends structured log entries to `logs/app.log`.

**Log categories and events:**

| Category | Events |
|----------|--------|
| `AUTH` | Register, login success, login failure, logout, session expired, banned user blocked |
| `TRANSACTION` | Study created, study edited, study deleted, study opened/closed, profile updated, photo updated |
| `ADMIN` | User promoted/demoted, user banned/unbanned, post deleted by admin, logs viewed |

**Log entry format:**
```
[2026-03-17T10:45:00.000Z] [INFO] [AUTH] Login success — user: user@example.com ip: 123.45.67.89
[2026-03-17T10:45:05.000Z] [WARN] [AUTH] Login failed — email: user@example.com ip: 123.45.67.89 attempts: 2
[2026-03-17T10:46:00.000Z] [INFO] [TRANSACTION] Study created — post_id: abc123 user_id: xyz789
[2026-03-17T10:47:00.000Z] [INFO] [ADMIN] User banned — target_id: abc user_id: adminxyz
```

**Scope:**
- `src/lib/logger.ts` — logger with `log(level, category, message, metadata?)` function
- File writes using Node.js `fs.appendFileSync` to `logs/app.log`
- Add `logs/` to `.gitignore`
- Call the logger inside all relevant server actions and middleware

---

## Requirement 5 — Session Timeout

**Feature: Idle Session Timeout**

Automatically log out users after a period of inactivity.

- Timeout duration: 30 minutes (configurable via `SESSION_TIMEOUT_MINUTES` env var)
- Server-side: `src/proxy.ts` checks if the Supabase session's `expires_at` is past the idle threshold and redirects to `/login` with a `?reason=timeout` query param
- Client-side: a `useIdleTimeout` hook tracks mouse/keyboard activity; on timeout, calls `logoutUser()` and redirects
- Show a dismissable warning toast 2 minutes before the session expires
- Log the timeout event under `AUTH` category

---

## Requirement 6 — Error Messaging (Debug vs. Production)

**Feature: Environment-Aware Error Handler**

Control error detail based on the `DEBUG` environment variable.

- `DEBUG=true` — server actions return the full error message and stack trace in the `error` field
- `DEBUG=false` (default/production) — server actions return only a generic message: `"An unexpected error occurred"`

**Scope:**
- Add `DEBUG=false` to `.env.local` (and document in `.env.example`)
- Create `src/lib/error-handler.ts` with a `handleError(error, context?)` utility used in all `catch` blocks
- The utility checks `process.env.DEBUG === 'true'` to decide what to return
- For client-side, add an error boundary component that shows stack traces only in development (`NODE_ENV === 'development'`)

---

## Requirement 7 — Syslog Transport

**Feature: Remote Syslog Forwarding**

Extend the logger to optionally forward log entries to a remote syslog server over UDP using RFC 5424 format.

**Controlled by environment variables:**
```
SYSLOG_ENABLED=true
SYSLOG_HOST=192.168.1.100
SYSLOG_PORT=514
SYSLOG_APP_NAME=participay
```

**Scope:**
- Extend `src/lib/logger.ts` to include a syslog transport alongside the file transport
- When `SYSLOG_ENABLED=true`, each log entry is also sent as a UDP datagram to `SYSLOG_HOST:SYSLOG_PORT`
- Use Node.js built-in `dgram` module (no extra dependencies)
- If the UDP send fails, fall back silently and continue writing to file — syslog failure must never crash the app
- Syslog severity levels map from app levels: `INFO→6`, `WARN→4`, `ERROR→3`
