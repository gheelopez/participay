# ParticiPay — Development Timeline

Features are ordered sequentially so that each phase builds on the previous one.
Infrastructure and core utilities come first; UI and dependent features follow.

---

## Phase 1 — Logger & Error Handler
*Foundation for all other phases — must be done first so logging can be added as each feature is built.*

### Step 1: Logger utility (`src/lib/logger.ts`)
- Implement `log(level, category, message, metadata?)` function
- Write to `logs/app.log` using `fs.appendFileSync`
- Add `logs/` to `.gitignore`

### Step 2: Syslog transport
- Extend `src/lib/logger.ts` with UDP syslog forwarding via Node.js `dgram`
- Read `SYSLOG_ENABLED`, `SYSLOG_HOST`, `SYSLOG_PORT`, `SYSLOG_APP_NAME` from env
- Silent fallback if UDP send fails

### Step 3: Error handler utility (`src/lib/error-handler.ts`)
- Implement `handleError(error, context?)` that checks `process.env.DEBUG`
- `DEBUG=true` → return message + stack trace
- `DEBUG=false` → return generic message
- Add `DEBUG=false` to `.env.local`

---

## Phase 2 — Database Schema Updates
*Must happen before any feature that depends on new columns.*

### Step 4: Add numeric fields to `research_posts`
- Supabase migration: add `compensation_amount (integer, nullable)` and `participants_needed (integer, min 1)`
- Update `src/types/database.types.ts`

### Step 5: Add `is_banned` to `profiles`
- Supabase migration: add `is_banned (boolean, default false)` to `profiles`
- Update `src/types/database.types.ts`

---

## Phase 3 — Auth & Session Hardening
*Depends on Phase 1 (logger) and Phase 2 (`is_banned` column).*

### Step 6: Log existing auth events
- Add `logger` calls to `registerUser`, `loginUser`, `logoutUser` in `src/app/actions/auth.ts`
- Log: register, login success, login failure (with attempt count), logout

### Step 7: Ban enforcement at login
- In `loginUser`, after successful credential check, query `is_banned` on the profile
- If banned, log the blocked attempt and return a generic error

### Step 8: Session timeout — server side
- In `src/proxy.ts`, read `SESSION_TIMEOUT_MINUTES` from env (default 30)
- Compare current time to session `expires_at`; redirect to `/login?reason=timeout` if expired
- Log `AUTH` session timeout event

### Step 9: Session timeout — client side
- Create `src/hooks/useIdleTimeout.ts` tracking mouse/keyboard activity
- On idle threshold reached, call `logoutUser()` and redirect
- Show a warning toast 2 minutes before expiry

---

## Phase 4 — Research Post Enhancements
*Depends on Phase 2 (new DB columns) and Phase 1 (logger).*

### Step 10: Update validation schemas
- Add `compensation_amount: z.number().int().min(0)` and `participants_needed: z.number().int().min(1)` to `createResearchPostSchema` and `updateResearchPostSchema` in `src/lib/validations/research-post.ts`

### Step 11: Update post server actions
- Update `createResearchPost` and `updateResearchPost` in `src/app/actions/research-post.ts` to handle the new fields
- Add `TRANSACTION` log calls: study created, edited, deleted, toggled

### Step 12: Update post form UI
- Add `compensation_amount` (number input, ₱) and `participants_needed` (number input) to the post creation/edit form in the account page
- Display both fields on study listing cards

---

## Phase 5 — Admin Dashboard
*Depends on Phase 2 (`is_banned`), Phase 1 (logger), and Phase 3 (ban enforcement).*

### Step 13: Admin server actions (`src/app/actions/admin.ts`)
- `getAllUsers()` — fetch all profiles with post count
- `deleteAnyPost(postId)` — delete any post regardless of owner
- `setUserRole(userId, role)` — promote or demote
- `setBanStatus(userId, isBanned)` — ban or unban
- Add `ADMIN` log calls to each action

### Step 14: Admin dashboard UI — Users tab
- Replace the placeholder in `/admin` with a real paginated users table
- Columns: name, email, role, status, joined, post count
- Actions per row: promote/demote, ban/unban

### Step 15: Admin dashboard UI — Posts tab
- List all research posts with owner info and status
- Action per row: delete post

### Step 16: Admin dashboard UI — Logs tab
- Read last N lines from `logs/app.log` via a server action
- Display in a scrollable, monospace log viewer
- Log the `ADMIN` logs-viewed event when an admin opens this tab

---

## Phase 6 — Account Page Polish
*Depends on Phase 4 (post features) and Phase 3 (auth logging).*

### Step 17: Log profile and photo update actions
- Add `TRANSACTION` log calls to `updateProfile` and `updateProfilePhoto` in `src/app/actions/auth.ts`

### Step 18: Confirm all user actions are exposed in the UI
- Verify `/account` page surfaces: post study, edit study, delete study, toggle open/closed, edit profile, update photo
- Ensure error messages from `handleError` are displayed correctly in all forms

---

## Environment Variables Reference

Add the following to `.env.local`:

```
# Logging
DEBUG=false
SYSLOG_ENABLED=false
SYSLOG_HOST=
SYSLOG_PORT=514
SYSLOG_APP_NAME=participay

# Session
SESSION_TIMEOUT_MINUTES=30
```
