# Password Hashing and Salting

## Overview

The app never stores, logs, or processes passwords beyond passing them to Supabase over an encrypted connection. All hashing, salting, and verification is handled entirely by **Supabase Auth** (built on [GoTrue](https://github.com/supabase/auth)), which uses the **bcrypt** algorithm.

---

## How the Password Flows Through the App

### Registration

In `src/app/actions/auth.ts`, the plaintext password is:

1. Received from the form via `FormData` in the server action
2. Validated by Zod (length and complexity rules only — not stored)
3. Passed directly to Supabase:

```typescript
await supabase.auth.signUp({
  email: validation.data.email,
  password: validation.data.password,  // plaintext, sent over HTTPS to Supabase
})
```

4. Supabase hashes it and stores only the hash. The plaintext password is never written anywhere.

### Login

```typescript
await supabase.auth.signInWithPassword({
  email: validation.data.email,
  password: validation.data.password,  // plaintext, sent over HTTPS to Supabase
})
```

Supabase hashes the submitted password and compares it against the stored hash. The app receives back either a session token (success) or an error — it never sees the stored hash.

---

## What Supabase Does: bcrypt

Supabase Auth uses **bcrypt** with a cost factor of **10**.

### What bcrypt does

bcrypt is a password hashing function designed specifically for storing passwords. Unlike general-purpose hash functions (MD5, SHA-256), bcrypt is intentionally slow and computationally expensive, making brute-force attacks impractical.

It does three things in one operation:

1. **Generates a unique random salt** (16 bytes of cryptographic randomness) per password
2. **Hashes the password + salt** using the Blowfish cipher in a repeated key schedule
3. **Embeds the salt into the output hash string** so no separate salt storage is needed

### The output format

A bcrypt hash looks like this:

```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

Breaking it down:

| Segment | Value | Meaning |
|---------|-------|---------|
| `$2a$` | Algorithm identifier | bcrypt version 2a |
| `10` | Cost factor | 2¹⁰ = 1,024 iterations of the key schedule |
| Next 22 chars | Salt | The random salt, Base64-encoded |
| Remaining chars | Hash | The derived hash, Base64-encoded |

The salt is stored inside the hash string itself — there is no separate salt column in the database.

### The cost factor

The cost factor of `10` means the hashing algorithm runs **1,024 rounds** of its key derivation function. Increasing the cost by 1 doubles the work. At cost 10, a single hash takes roughly 100ms on modern server hardware.

This is significant for security: an attacker who obtains the hash database would need ~100ms per password guess, making large-scale brute-force attacks expensive. For comparison, SHA-256 can compute billions of hashes per second on consumer hardware.

### Salting

Each password gets a **unique random salt**, generated fresh at registration time. This means:

- Two users with the same password produce completely different hashes
- Precomputed rainbow table attacks are defeated — an attacker cannot build a table of password → hash mappings that works against this database
- A breach of one hash reveals nothing about other accounts, even if they share the same password

---

## Where the Hash Lives

Supabase stores the hash in the `auth.users` table in PostgreSQL, inside the `encrypted_password` column. This table lives in the `auth` schema, which is:

- Separate from the `public` schema where application data lives
- Not accessible via the standard Supabase client from your application code
- Only accessible by the Supabase Auth service itself and direct database admin access

Your application code has no query access to `auth.users`. It can only interact with auth through the Supabase Auth API.

---

## Verification at Login

When a user logs in, Supabase:

1. Looks up the stored hash for the submitted email
2. Extracts the salt from the hash string
3. Hashes the submitted password with that same salt using the same cost factor
4. Compares the result to the stored hash using a **constant-time comparison**

The constant-time comparison is important: it takes the same amount of time whether the comparison succeeds or fails, preventing timing attacks where an attacker could infer partial hash matches from response time differences.

---

## What the App Is Responsible For

Supabase handles everything after the password leaves the server action. The app's responsibilities are:

| Responsibility | Where |
|----------------|-------|
| Enforce password complexity before it reaches Supabase | `src/lib/validations/auth.ts` — Zod schema |
| Never log the plaintext password | `src/app/actions/auth.ts` — `console.error` calls log error objects, never input data |
| Transmit the password only over HTTPS | Enforced by Supabase client + deployment environment |
| Return generic error messages on failure | `mapAuthError()` in `src/app/actions/auth.ts` — never reveals whether email or password was wrong |

---

## Summary

| Property | Value |
|----------|-------|
| Algorithm | bcrypt |
| Cost factor | 10 |
| Salt | Random, unique per password, embedded in hash |
| Hash storage | `auth.users.encrypted_password` (Supabase `auth` schema) |
| App access to hash | None |
| Brute-force resistance | ~100ms per guess at cost factor 10 |
| Rainbow table resistance | Per-password random salt defeats precomputed tables |
