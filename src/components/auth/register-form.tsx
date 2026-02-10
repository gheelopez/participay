'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import imageCompression from 'browser-image-compression'
import { registerUser } from '@/app/actions/auth'
import { registerSchema } from '@/lib/validations/auth'
import { FileUpload } from './file-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

interface FormData {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  password: string
  confirmPassword: string
  profilePhoto: File | null
}

interface FormErrors {
  [key: string]: string
}

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '+639',
    password: '',
    confirmPassword: '',
    profilePhoto: null,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value })
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const handlePhotoChange = (file: File | null) => {
    setFormData({ ...formData, profilePhoto: file })
    if (errors.profilePhoto) {
      setErrors({ ...errors, profilePhoto: '' })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      // Validate with Zod
      const validation = registerSchema.safeParse(formData)

      if (!validation.success) {
        const fieldErrors: FormErrors = {}
        validation.error.issues.forEach((err) => {
          if (err.path[0]) {
            const field = err.path[0] as string
            fieldErrors[field] = err.message
          }
        })
        setErrors(fieldErrors)
        setIsLoading(false)
        return
      }

      // Compress image before upload
      if (!formData.profilePhoto) {
        setErrors({ profilePhoto: 'Profile photo is required' })
        setIsLoading(false)
        return
      }

      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        initialQuality: 0.85,
      }

      const compressedPhoto = await imageCompression(
        formData.profilePhoto,
        compressionOptions
      )

      // Prepare FormData for server action
      const data = new FormData()
      data.append('firstName', formData.firstName)
      data.append('lastName', formData.lastName)
      data.append('email', formData.email)
      data.append('phoneNumber', formData.phoneNumber)
      data.append('password', formData.password)
      data.append('profilePhoto', compressedPhoto)

      // Call server action
      const result = await registerUser(data)

      if (result.success) {
        router.push('/landing')
      } else {
        setErrors({ form: result.error || 'Registration failed' })
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ form: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full border-none bg-transparent shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Enter your information to get started with Participay
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                disabled={isLoading}
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                disabled={isLoading}
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={handleInputChange('email')}
              disabled={isLoading}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none select-none">
                +63
              </div>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="000 000 0000"
                value={formData.phoneNumber.replace(/^\+63/, '')}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setFormData({ ...formData, phoneNumber: `+63${value}` })
                  if (errors.phoneNumber) {
                    setErrors({ ...errors, phoneNumber: '' })
                  }
                }}
                disabled={isLoading}
                className={errors.phoneNumber ? 'border-destructive pl-16' : 'pl-16'}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-sm text-destructive">{errors.phoneNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isLoading}
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter Password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                disabled={isLoading}
                className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer transition-colors"
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <FileUpload
              value={formData.profilePhoto}
              onChange={handlePhotoChange}
              error={errors.profilePhoto}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
