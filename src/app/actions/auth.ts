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
}

// Helper function to map Supabase auth errors to user-friendly messages
function mapAuthError(error: AuthError): string {
  const errorMap: Record<string, string> = {
    'User already registered': 'An account with this email already exists',
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Please verify your email before logging in',
    'Password should be at least 8 characters': 'Password is too weak',
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
      profilePhoto: formData.get('profilePhoto') as File,
    }

    // 2. Validate with Zod
    const validation = registerSchema.safeParse(data)
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Validation failed',
      }
    }

    const supabase = await createClient()

    // 3. Sign up user with Supabase
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
      return { success: false, error: mapAuthError(authError) }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user account' }
    }

    const userId = authData.user.id

    // 4. Upload profile photo to storage
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

    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName)

    // 6. Update profile with photo URL (profile already created by trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        profile_photo_url: publicUrl,
      } as any)
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return { success: false, error: 'Failed to update user profile' }
    }

    // 7. Return success (user is auto-logged in by Supabase)
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
        error: validation.error.errors[0]?.message || 'Validation failed',
      }
    }

    const supabase = await createClient()

    // 2. Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    })

    if (error) {
      console.error('Login error:', error)
      return { success: false, error: mapAuthError(error) }
    }

    if (!data.user) {
      return { success: false, error: 'Login failed' }
    }

    return { success: true, data: data.user }
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
