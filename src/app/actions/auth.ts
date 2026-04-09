'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { registerSchema, loginSchema, updateProfileSchema } from '@/lib/validations/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
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

//Helper function to check if login requires CAPTCHA based on failed attempts
export async function getLoginStatus(email: string): Promise<{ requiresCaptcha: boolean }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('failed_attempts')
    .eq('email', email)
    .single()

  return { requiresCaptcha: (data?.failed_attempts ?? 0) >= 3 }
}

// Helper function to verify CAPTCHA token with Google reCAPTCHA
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
export async function validateFileSignature(file: File): Promise<boolean> {
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
    // Rate limit: 5 attempts per hour per IP
    const registerLimit = await checkRateLimit('register', 5, 3600)
    if (!registerLimit.allowed) {
      return { success: false, error: registerLimit.error }
    }

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

    // 5. Check for duplicate phone number
    const { data: existingPhone } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', validation.data.phoneNumber)
      .maybeSingle()

    if (existingPhone) {
      // Generic message — does not reveal that the phone number is already taken
      return { success: false, error: 'Unable to create account. Please check your details or try logging in.' }
    }

    // 6. Sign up user with Supabase
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
    logger.info('AUTH', 'register_success', { userId, email: validation.data.email })
    return { success: true, data: authData.user }
  } catch (error) {
    logger.error('AUTH', 'register_error', { details: { error: String(error) } })
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

// 2. LOGIN USER
export async function loginUser(input: LoginInput): Promise<ActionResponse<any>> {
  try {
    // Rate limit: 10 attempts per 15 minutes per IP
    const loginLimit = await checkRateLimit('login', 10, 900)
    if (!loginLimit.allowed) {
      return { success: false, error: loginLimit.error }
    }

    // 1. Validate input
    const validation = loginSchema.safeParse(input)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Validation failed',
      }
    }

    const supabase = await createClient()

    // 2. get failure count and ban status from db
    const { data: profileData } = await supabase
      .from('profiles')
      .select('failed_attempts, is_banned')
      .eq('email', validation.data.email)
      .single();

    const {email, password, captchaToken} = validation.data;
    const attempts = (profileData as any)?.failed_attempts || 0;

    // 2b. Ban enforcement — block banned users with a generic error
    if ((profileData as any)?.is_banned) {
      logger.warn('SECURITY', 'login_blocked_banned', { email })
      return { success: false, error: 'Incorrect email or password' }
    }

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
      logger.warn('AUTH', 'login_failure', { email, details: { attemptCount: attempts + 1 } })
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

    logger.info('AUTH', 'login_success', { userId: data.user.id, email })
    return { success: true, data: { user: data.user, role: (profile as any)?.role ?? 'user' } }
  } catch (error) {
    logger.error('AUTH', 'login_error', { details: { error: String(error) } })
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

// 3. LOGOUT USER
export async function logoutUser(): Promise<ActionResponse> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error('AUTH', 'logout_error', { userId: user?.id, details: { error: error.message } })
      return { success: false, error: 'Failed to logout' }
    }

    logger.info('AUTH', 'logout', { userId: user?.id })
    return { success: true }
  } catch (error) {
    logger.error('AUTH', 'logout_error', { details: { error: String(error) } })
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

// 5. UPDATE PROFILE
export async function updateProfile(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  let userId: string | undefined
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { success: false, error: 'Not authenticated' }
    userId = user.id

    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      school: formData.get('school') as string,
    }

    const validation = updateProfileSchema.safeParse(data)
    if (!validation.success) {
      const firstError = Object.values(validation.error.flatten().fieldErrors).flat()[0]
      return { success: false, error: firstError || 'Validation failed' }
    }

    const { data: existingPhone } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', validation.data.phoneNumber)
      .neq('id', user.id)
      .maybeSingle()

    if (existingPhone) return { success: false, error: 'Phone number is already in use' }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: validation.data.firstName,
        last_name: validation.data.lastName,
        phone_number: validation.data.phoneNumber,
        school: validation.data.school,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('AUTH', 'profile_update_failed', { userId, details: { error: updateError.message } })
      return { success: false, error: 'Failed to update profile' }
    }

    logger.info('AUTH', 'profile_updated', { userId })
    return { success: true }
  } catch (error) {
    logger.error('AUTH', 'profile_update_error', { userId, details: { error: String(error) } })
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// 6. UPDATE PROFILE PHOTO
export async function updateProfilePhoto(formData: FormData): Promise<ActionResponse<{ photoUrl: string }>> {
  const supabase = await createClient()
  let userId: string | undefined
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { success: false, error: 'Not authenticated' }
    userId = user.id

    const file = formData.get('profilePhoto') as File
    if (!file || file.size === 0) return { success: false, error: 'No file provided' }

    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) return { success: false, error: 'File size must be less than 5MB' }

    const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return { success: false, error: 'Only JPEG and PNG images are accepted' }

    const isValidSignature = await validateFileSignature(file)
    if (!isValidSignature) return { success: false, error: 'Invalid file: content does not match an image format' }

    const sanitizedFilename = sanitizeFilename(file.name)
    const fileName = `${user.id}/${Date.now()}-${sanitizedFilename}`

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (uploadError) {
      logger.error('AUTH', 'profile_photo_upload_failed', { userId, details: { error: uploadError.message } })
      return { success: false, error: 'Failed to upload photo. Please try again.' }
    }

    const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(fileName)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ profile_photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (profileError) {
      logger.error('AUTH', 'profile_photo_db_update_failed', { userId, details: { error: profileError.message } })
      return { success: false, error: 'Failed to update profile photo' }
    }

    logger.info('AUTH', 'profile_photo_updated', { userId })
    return { success: true, data: { photoUrl: publicUrl } }
  } catch (error) {
    logger.error('AUTH', 'profile_photo_update_error', { userId, details: { error: String(error) } })
    return { success: false, error: 'An unexpected error occurred' }
  }
}


