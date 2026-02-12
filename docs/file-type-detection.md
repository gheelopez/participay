# Server-side File Type Detection

## Overview

Profile photo uploads are validated on the server using **magic byte detection** before any file is stored. This ensures the actual binary content of a file matches a known image format, regardless of what the client claims the file is.

The implementation lives in `src/app/actions/auth.ts` in the `validateFileSignature` function.

---

## What Are Magic Bytes?

Every file format reserves the first few bytes of its binary content for a fixed signature — sometimes called a "magic number". These bytes identify the format at the data level, independent of filename or MIME type.

| Format | Hex Signature | Bytes Checked |
|--------|--------------|---------------|
| JPEG   | `FF D8 FF`   | First 3 bytes |
| PNG    | `89 50 4E 47 0D 0A 1A 0A` | First 8 bytes |

These signatures are defined by the format specifications themselves:
- The PNG signature (`\x89PNG\r\n\x1a\n`) was deliberately designed to detect common file transfer corruptions (line ending translation, null byte stripping, etc.)
- The JPEG signature is the SOI (Start of Image) marker followed by a file marker byte

---

## How It Works

```typescript
async function validateFileSignature(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // JPEG: FF D8 FF
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A

  return isJpeg || isPng
}
```

**Step by step:**

1. `file.slice(0, 8)` — reads only the first 8 bytes from the file object. The rest of the file is not loaded into memory at this point.
2. `.arrayBuffer()` — converts the slice to a raw binary buffer.
3. `new Uint8Array(buffer)` — wraps the buffer so individual bytes can be accessed by index.
4. The byte values are compared against the known signatures for JPEG and PNG.
5. Returns `true` only if one of the two signatures matches exactly.

The function is called in `registerUser` immediately after Zod validation passes, before any Supabase interaction:

```typescript
const isValidSignature = await validateFileSignature(validation.data.profilePhoto)
if (!isValidSignature) {
  return { success: false, error: 'Invalid file: content does not match an image format' }
}
```

---

## Why This Is Secure

### The problem it solves: MIME type spoofing

The browser-reported `file.type` (the MIME type) is not a trusted value. It is set by the browser based on the file extension and can be trivially overridden by an attacker using tools like `curl` or `fetch` to send a request directly, bypassing the browser entirely:

```
# An attacker can send any file with any claimed Content-Type
curl -X POST /api/register \
  -F "profilePhoto=@malicious.exe;type=image/jpeg"
```

Client-side checks (extension validation, MIME type checks in the form) are purely UX — they run in attacker-controlled code and cannot be relied upon for security.

### What magic byte detection prevents

| Attack | Client-side check | Magic byte check |
|--------|------------------|-----------------|
| Rename `malicious.exe` to `photo.jpg` | Passes (extension is `.jpg`) | Blocked (bytes are MZ header `4D 5A`, not `FF D8 FF`) |
| Send request with spoofed `Content-Type: image/jpeg` | Passes (MIME looks correct) | Blocked (binary content doesn't match) |
| Upload a GIF renamed to `.jpg` | Passes | Blocked (GIF header is `47 49 46 38`, not JPEG or PNG) |
| Upload a valid JPEG | Passes | Passes |
| Upload a valid PNG | Passes | Passes |

### Why server-side matters

The check runs inside a Next.js server action. Server actions execute on the server — they are not accessible to the client for inspection or modification. The attacker cannot see or bypass the validation logic; they can only observe the response.

### Why reading only 8 bytes is sufficient

Magic bytes are always at the start of a file. Reading 8 bytes is enough to:
- Fully verify a PNG (its signature is exactly 8 bytes)
- Verify a JPEG (only needs 3 bytes, so 8 is more than sufficient)

This also limits memory usage — the server never loads the full file into memory just for the type check.

---

## What This Does Not Cover

- **Malicious content embedded inside a valid image** — a file that is a real JPEG but also contains a polyglot payload (e.g., a PHP script appended after the image data). Magic bytes confirm the file *starts* as an image; they do not guarantee the rest of the file is safe. Supabase Storage serves files as static content, which significantly limits the risk of polyglots in this context.
- **Corrupt images** — a file could have correct magic bytes but be otherwise invalid or unrenderable. This is not a security concern for this use case.
- **Formats beyond JPEG and PNG** — WebP, AVIF, GIF, etc. would be rejected. The allowed types are intentionally narrow.
