import { z } from 'zod'

// File validation helper
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Phone number regex for Philippines format (+63 followed by 10 digits)
const phoneRegex = /^\+63\d{10}$/

// Password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

// Schema for user registration
export const registerSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long'),

  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name is too long'),

  email: z.string()
    .email('Invalid email address'),

  phoneNumber: z.string()
    .length(13, 'Phone number must be exactly 10 digits after +63')
    .regex(phoneRegex, 'Invalid phone number format'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),

  profilePhoto: z.instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Only JPEG, PNG, and WebP images are accepted'
    ),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Schema for user login
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address'),

  password: z.string()
    .min(1, 'Password is required'),
})

// Export types
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
