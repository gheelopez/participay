'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { registerSchema, loginSchema } from '@/lib/validations/auth'
import type { LoginInput } from '@/lib/validations/auth'
import type { AuthError } from '@supabase/supabase-js'

// Type for our response
type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
  requiresCaptcha?: boolean
}

// Helper function to map Supabase auth errors to user-friendly messages.
// All messages are intentionally generic — do not distinguish between
// "email not found" and "wrong password" to prevent user enumeration.
function mapAuthError(error: AuthError): string {
  const errorMap: Record<string, string> = {
    // Collapsed into the same message as invalid credentials — revealing that
    // an email is unconfirmed tells an attacker the account exists.
    'Email not confirmed': 'Incorrect email or password',
    'Invalid login credentials': 'Incorrect email or password',
    'Password should be at least 8 characters': 'Password is too short',
  }

  return errorMap[error.message] || 'Authentication failed. Please try again.'
}

// Helper function to sanitize filename for storage
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

async function verifyCaptcha(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      { method: "POST" }
    );
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return false;
  }
}

// Helper function to verify file content matches JPEG or PNG magic bytes
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

// 1. REGISTER USER
export async function registerUser(formData: FormData): Promise<ActionResponse<any>> {
  try {
    // 1. Extract data from FormData
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      profilePhoto: formData.get('profilePhoto') as File,
      captchaToken: formData.get('captchaToken') as string,
    }

    // 2. Validate with Zod
    const validation = registerSchema.safeParse(data);
      if (!validation.success) {
      const formattedErrors = validation.error.flatten().fieldErrors;
      
      const firstErrorMessage = Object.values(formattedErrors).flat()[0];

      return {
        success: false,
        error: firstErrorMessage || 'Validation failed',
      };
    }

    // 3. CAPTCHA Verification
    const isHuman = await verifyCaptcha(validation.data.captchaToken);
    if (!isHuman) {
      return { success: false, error: 'CAPTCHA verification failed. Please try again.' };
    }

    // 4. Verify file content matches declared image type
    const isValidSignature = await validateFileSignature(validation.data.profilePhoto)
    if (!isValidSignature) {
      return { success: false, error: 'Invalid file: content does not match an image format' }
    }

    const supabase = await createClient()

    // 5. Sign up user with Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          first_name: validation.data.firstName,
          last_name: validation.data.lastName,
          phone_number: validation.data.phoneNumber,
        },
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      // Generic message — does not confirm whether email or phone is the
      // duplicate, or that an account exists at all.
      if (authError.message === 'User already registered') {
        return { success: false, error: 'Unable to create account. Please check your details or try logging in.' }
      }
      return { success: false, error: mapAuthError(authError) }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user account' }
    }

    const userId = authData.user.id

    // 6. Upload profile photo to storage
    const sanitizedFilename = sanitizeFilename(validation.data.profilePhoto.name)
    const fileName = `${userId}/${Date.now()}-${sanitizedFilename}`

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, validation.data.profilePhoto, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      // Note: User account is already created, but photo upload failed
      // In production, you might want to implement cleanup or retry logic
      return { success: false, error: 'Failed to upload profile photo. Please try again.' }
    }

    // 7. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName)

    // 8. Update profile with photo URL (profile already created by trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        profile_photo_url: publicUrl,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return { success: false, error: 'Failed to update user profile' }
    }

    // 9. Return success (user is auto-logged in by Supabase)
    return { success: true, data: authData.user }
  } catch (error) {
    console.error('Unexpected error during registration:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

// 2. LOGIN USER
export async function loginUser(input: LoginInput): Promise<ActionResponse<any>> {
  try {
    // 1. Validate input
    const validation = loginSchema.safeParse(input)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Validation failed',
      }
    }

    const supabase = await createClient()

    // 2. get failure count from db
    const { data: profileData } = await supabase
      .from('profiles')
      .select('failed_attempts')
      .eq('email', validation.data.email)
      .single();

    const {email, password, captchaToken} = validation.data;
    const attempts = (profileData as any)?.failed_attempts || 0;

    // 3. captcha verification after 3 failed attempts
    if (attempts >= 3) {
      if (!captchaToken) {
        return { 
          success: false, 
          error: 'Security check required.', 
          requiresCaptcha: true 
        };
      }
      const isHuman = await verifyCaptcha(captchaToken);
      if (!isHuman) {
        return { 
          success: false, 
          error: 'CAPTCHA verification failed. Please try again.', 
          requiresCaptcha: true 
        };
      }
    }

    // 4. Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    })

    if (error) {
      console.error('Login error:', error)
      //increment failed attempts
      await (supabase as any).rpc('increment_failed_attempts', { user_email: email });
      return { success: false, error: mapAuthError(error), requiresCaptcha: (attempts + 1) >= 3 }
    }

    if (!data.user) {
      return { success: false, error: 'Login failed' }
    }

    //reset failed attempts on successful login
    await (supabase as any).rpc('reset_failed_attempts', { user_id: data.user.id });

    // Fetch role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return { success: true, data: { user: data.user, role: (profile as any)?.role ?? 'user' } }
  } catch (error) {
    console.error('Unexpected error during login:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

// 3. LOGOUT USER
export async function logoutUser(): Promise<ActionResponse> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)
      return { success: false, error: 'Failed to logout' }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error during logout:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// 4. GET CURRENT USER
export async function getCurrentUser(): Promise<ActionResponse<any>> {
  try {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return { success: false, error: 'Failed to get user' }
    }

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Also fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return { success: true, data: user } // Return user even if profile fetch fails
    }

    return { success: true, data: { ...user, profile } }
  } catch (error) {
    console.error('Unexpected error getting user:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
