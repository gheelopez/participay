import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 30 requests per minute per IP
    const limit = await checkRateLimit('captcha', 30, 60)
    if (!limit.allowed) {
      return NextResponse.json({ success: false, message: limit.error }, { status: 429 })
    }

    const body = await request.json();

    // 1. Zod Validation (Checks email, password, AND token)
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, captchaToken } = validation.data;

    // 2. Google Verification
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
      { method: "POST" }
    );

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "CAPTCHA verification failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Authorized" });

  } catch (error) {
    // Catch network errors or JSON parsing errors
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}