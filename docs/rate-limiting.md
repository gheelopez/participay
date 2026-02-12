# Rate Limiting

## Overview

Rate limiting caps how many requests a single IP address can make to sensitive endpoints within a time window. When the limit is exceeded the request is rejected immediately — before any authentication logic, database queries, or external API calls run.

The implementation uses a Supabase `rate_limits` table and a PostgreSQL RPC function for atomic counter management, with the utility living in `src/lib/rate-limit.ts`.

---

## Limits

| Endpoint | Limit | Window | File |
|----------|-------|--------|------|
| `loginUser` (server action) | 10 requests | 15 minutes | `src/app/actions/auth.ts` |
| `registerUser` (server action) | 5 requests | 1 hour | `src/app/actions/auth.ts` |
| `POST /api/captcha` | 30 requests | 1 minute | `src/app/api/captcha/route.ts` |

---

## How It Works

### 1. IP extraction

Every incoming request carries the caller's IP address in HTTP headers. The utility reads it server-side — the client has no way to influence or suppress this:

```typescript
const forwarded = headersList.get('x-forwarded-for')
const ip = forwarded
  ? forwarded.split(',')[0].trim()
  : (headersList.get('x-real-ip') ?? '127.0.0.1')
```

- `x-forwarded-for` is set by Vercel's edge network and contains a comma-separated chain of IPs when a request passes through multiple proxies. Taking the first value gives the original client IP.
- `x-real-ip` is a fallback for other proxy configurations.
- `127.0.0.1` is the fallback for local development, where no proxy headers are present.

### 2. The `rate_limits` table

One row exists per `(ip, endpoint)` pair:

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  ip           text        NOT NULL,
  endpoint     text        NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, endpoint)
);
```

The `window_start` column marks when the current counting window began. When it is older than the window duration, the window is expired and the counter resets.

### 3. The atomic RPC function

The counter is incremented and checked inside a single PostgreSQL `INSERT ... ON CONFLICT DO UPDATE`, which runs as one atomic database operation:

```sql
INSERT INTO rate_limits (ip, endpoint, count, window_start)
VALUES (p_ip, p_endpoint, 1, now())
ON CONFLICT (ip, endpoint) DO UPDATE
SET
  count = CASE
    WHEN rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
    THEN 1        -- window expired: reset
    ELSE rate_limits.count + 1  -- still in window: increment
  END,
  window_start = CASE
    WHEN rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
    THEN now()    -- start a new window
    ELSE rate_limits.window_start
  END
RETURNING count INTO v_count;

RETURN v_count <= p_limit;
```

Step by step for a request from `1.2.3.4` to `login`:

1. If no row exists → insert with `count = 1`, return `true` (1 ≤ 10).
2. If a row exists and the window is still active → increment `count`, return `count <= 10`.
3. If a row exists but the window has expired → reset `count` to 1 and `window_start` to now, return `true`.

### 4. Fail-open on error

If the database call itself fails (e.g. Supabase is temporarily unreachable), the utility returns `allowed: true` rather than blocking all users:

```typescript
if (error) {
  console.error('Rate limit check failed:', error)
  return { allowed: true }
}
```

The error is logged so it can be investigated, but legitimate users are not locked out due to an infrastructure issue.

### 5. Early rejection

The rate limit check is placed at the very top of each function body, before validation, CAPTCHA verification, or any Supabase auth call:

```typescript
// loginUser
const loginLimit = await checkRateLimit('login', 10, 900)
if (!loginLimit.allowed) {
  return { success: false, error: loginLimit.error }
}
```

```typescript
// POST /api/captcha
const limit = await checkRateLimit('captcha', 30, 60)
if (!limit.allowed) {
  return NextResponse.json({ success: false, message: limit.error }, { status: 429 })
}
```

Blocked requests are cheap — one database upsert and an early return. No Google reCAPTCHA call, no Supabase auth call, no password hashing.

---

## How It Prevents Brute Force

### Credential stuffing and password guessing

Without rate limiting, an attacker can submit thousands of `(email, password)` pairs per minute to `loginUser`. The only cost is network round-trips.

With rate limiting, after 10 attempts in 15 minutes from the same IP, every subsequent login attempt returns `"Too many requests. Please try again later."` and exits before touching Supabase Auth. The attacker must wait out the 15-minute window before trying again — reducing throughput from thousands of attempts per minute to at most 10 per 15 minutes.

### Account enumeration via registration

`registerUser` is limited to 5 per hour. An attacker cannot rapidly probe whether email addresses are already registered by watching for different error messages at scale.

### CAPTCHA endpoint abuse

The `/api/captcha` route verifies Google reCAPTCHA tokens. Without a limit, an attacker could flood it to probe token validity or to cause Google API costs. The 30-per-minute limit makes mass probing impractical.

### Defence in depth

Rate limiting is one layer of a multi-layer defence:

| Layer | Mechanism |
|-------|-----------|
| IP rate limiting | This implementation — throttles requests per IP |
| Per-account lockout | `failed_attempts` counter on the `profiles` table |
| CAPTCHA | Required after 4 failed login attempts per account |
| Generic error messages | Login errors do not reveal whether the email exists |
| Server-side validation | Zod schemas reject malformed input before any auth work |
| Magic byte detection | File uploads validated by binary content, not MIME type |

An attacker who bypasses the IP rate limit (e.g. by rotating IPs) still hits the per-account CAPTCHA trigger. An attacker who solves CAPTCHAs still cannot exceed the per-account failed attempts before being shown the CAPTCHA on every attempt.

---

## Fixed Window vs. Sliding Window

This implementation uses a **fixed window**: the counter resets at a fixed interval from when the first request in that window arrived.

The trade-off is a minor edge case: an attacker could make 10 requests at 10:14:59, then 10 more at 10:15:01 after the window resets — effectively 20 requests in 2 seconds. This is acceptable here because:

- The per-account CAPTCHA kicks in at 4 failed attempts regardless of IP.
- Supabase Auth has its own internal rate limiting.
- A sliding window would require storing per-request timestamps, significantly increasing storage and query complexity.

---

## What This Does Not Cover

- **Distributed attacks** — an attacker using many different IP addresses (a botnet) can collectively exceed these limits without any single IP being blocked. Mitigating this requires additional signals (device fingerprinting, behavioural analysis, CAPTCHA challenges for all requests).
- **IPv6 rotation** — a single attacker with a large IPv6 allocation could rotate addresses. The limits are still meaningful friction, but not a complete defence against a sophisticated attacker with large IP resources.
- **Authenticated endpoints** — rate limiting here is IP-based and applies only to the listed unauthenticated endpoints. Authenticated actions should be rate-limited by user ID rather than IP.
