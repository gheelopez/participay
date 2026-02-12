# Input Validation

## Overview

Validation in this app runs in two places: the **client** (browser) and the **server** (Next.js server actions). These serve different purposes.

- **Client-side validation** is UX — it gives users immediate feedback without a round trip to the server. It is not trusted for security because it runs in attacker-controlled code.
- **Server-side validation** is the authoritative security check. It runs in Next.js server actions on the server and cannot be bypassed by the client.

All security-relevant validation happens server-side. Client-side validation is a convenience layer only.

---

## Validation Stack

| Layer | Tool | Location |
|-------|------|----------|
| Client — forms | Manual React state checks + Zod | `src/components/auth/` |
| Client — file picker | MIME type + size checks | `src/hooks/use-file-upload.ts`, `src/components/auth/file-upload.tsx` |
| Server — schema | Zod | `src/lib/validations/auth.ts`, `src/lib/validations/research-post.ts` |
| Server — file content | Magic byte detection | `src/app/actions/auth.ts` |
| Server — filename | Sanitization | `src/app/actions/auth.ts` |
| Server — auth errors | Generic message mapping | `src/app/actions/auth.ts` |
| Database | Row Level Security (RLS) | Supabase |

---

## Registration

### Client-side (UX only)

**Step 1** — `src/components/auth/register-form.tsx`, `handleContinue()`

| Field | Rules |
|-------|-------|
| `firstName` | Required, non-empty |
| `lastName` | Required, non-empty |
| `email` | Required, basic regex (`/\S+@\S+\.\S+/`) |
| `phoneNumber` | Required, exactly 10 digits (the +63 prefix is added before submission) |
| `password` | Min 8 chars, 1 uppercase, 1 number, 1 special character |
| `confirmPassword` | Must match `password` |

**Step 2** — `handleSubmit()`

| Field | Rules |
|-------|-------|
| `profilePhoto` | Required |

Before submitting, the full Zod schema is also run client-side as a final check.

**File picker** — `src/hooks/use-file-upload.ts`, `validateFile()`

- MIME type must be `image/jpeg`, `image/jpg`, or `image/png`
- Max size: 5 MB

These checks prevent the file picker from accepting clearly wrong files, but they are not security controls.

---

### Server-side (authoritative)

All of the following run inside `registerUser()` in `src/app/actions/auth.ts` before any data reaches Supabase.

#### Step 1 — Zod schema validation

Schema: `registerSchema` in `src/lib/validations/auth.ts`

| Field | Rules | Error |
|-------|-------|-------|
| `firstName` | min 1, max 50 chars | "First name is required" / "First name is too long" |
| `lastName` | min 1, max 50 chars | "Last name is required" / "Last name is too long" |
| `email` | Valid email format | "Invalid email address" |
| `phoneNumber` | Regex `/^\+63\d{10}$/` (Philippine format) | "Phone number must be exactly 10 digits after +63" / "Invalid phone number format" |
| `password` | Min 8 chars, regex requiring uppercase, lowercase, number, special char | "Password must be at least 8 characters" / complexity message |
| `confirmPassword` | Must match `password` | "Passwords don't match" |
| `profilePhoto` | Max 5 MB, MIME must be `image/jpeg`, `image/jpg`, or `image/png` | "File size must be less than 5MB" / "Only JPEG and PNG images are accepted" |

If Zod validation fails, the first error message is returned and execution stops. Nothing is written to the database.

#### Step 2 — Magic byte detection

After Zod passes, the file's binary content is verified. This is the security-critical file check. See [file-type-detection.md](./file-type-detection.md) for full detail.

```typescript
async function validateFileSignature(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  return isJpeg || isPng
}
```

**Why this matters:** The MIME type reported by the browser (`file.type`) is user-controlled and can be spoofed. Magic byte detection checks the actual binary content of the file, making it impossible to pass an executable or other file type by renaming it to `.jpg`.

If the signature check fails: `"Invalid file: content does not match an image format"`

#### Step 3 — Filename sanitization

Before the file is stored in Supabase, the filename is sanitized:

```typescript
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}
```

This strips all characters except alphanumerics, dots, and hyphens — preventing path traversal attacks (e.g. `../../etc/passwd.jpg`) and other filename-based injection. The file is also stored under a UUID-namespaced path: `{userId}/{timestamp}-{sanitizedFilename}`.

#### Step 4 — Duplicate account handling

If Supabase returns `'User already registered'`, the server returns a generic error without confirming the email exists:

> "Unable to create account. Please check your details or try logging in."

This prevents **user enumeration** — an attacker submitting emails to the registration endpoint cannot determine which emails are already registered.

---

## Login

### Client-side (UX only)

`src/components/auth/login-form.tsx` runs `loginSchema.safeParse()` before submission to catch obviously malformed input.

### Server-side (authoritative)

Inside `loginUser()` in `src/app/actions/auth.ts`:

#### Step 1 — Zod schema validation

Schema: `loginSchema` in `src/lib/validations/auth.ts`

| Field | Rules | Error |
|-------|-------|-------|
| `email` | Valid email format | "Invalid email address" |
| `password` | Required (min 1 char) | "Password is required" |

#### Step 2 — Authentication error mapping

Supabase returns `'Invalid login credentials'` for **both** of these cases:
- The email does not exist
- The email exists but the password is wrong

This is intentional Supabase behaviour that prevents distinguishing the two cases. The server maps this to a single message:

> "Incorrect email or password"

`'Email not confirmed'` is also mapped to the same message — this prevents an attacker from learning that an unconfirmed account exists for a given email.

---

## Research Posts

### Server-side (authoritative)

All post mutations run in `src/app/actions/research-post.ts` with two layers of protection:

#### Layer 1 — Zod schema validation

Schema: `createResearchPostSchema` in `src/lib/validations/research-post.ts`

| Field | Rules |
|-------|-------|
| `title` | min 5, max 200 chars |
| `description` | min 20, max 2000 chars |
| `registration_link` | Valid URL |
| `compensation_type` | Enum: `'food'`, `'money'`, `'both'`, `'none'` |
| `compensation_details` | Max 500 chars, optional |

Updates use `updateResearchPostSchema`, which makes all fields optional (for partial updates).

#### Layer 2 — Authentication + Row Level Security

Every mutation checks that a session exists before touching the database:

```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { success: false, error: 'You must be logged in' }
```

Even if this check were bypassed, Supabase Row Level Security (RLS) enforces at the database level that users can only modify rows they own. A user cannot update or delete another user's post regardless of what the server action does.

---

## Why Two Layers of Validation

Client-side validation runs in the browser, which the user controls. Any client-side check can be disabled, modified, or bypassed entirely by sending a raw HTTP request directly to the server action. This is trivial with tools like `curl`.

Server actions run on the server and are not visible or accessible to the client. They are the only place where validation can be trusted as a security control.

The relationship is:
- **Client validation** → improves UX, reduces unnecessary server round trips
- **Server validation** → enforces security, is the single source of truth
- **Database RLS** → last line of defence, enforces ownership at the data layer regardless of application logic
