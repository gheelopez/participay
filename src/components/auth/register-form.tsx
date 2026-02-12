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
import { AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'

interface FormData {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  username: string
  password: string
  confirmPassword: string
  profilePhoto: File | null
}

interface FormErrors {
  [key: string]: string
}

export function RegisterForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    username: '',
    password: '',
    confirmPassword: '',
    profilePhoto: null,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPhoneFocused, setIsPhoneFocused] = useState(false)

  const formatPHNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10)

    const parts = []
    if (digits.length > 0) parts.push(digits.slice(0, 3))
    if (digits.length >= 4) parts.push(digits.slice(3, 6))
    if (digits.length >= 7) parts.push(digits.slice(6, 10))

    return parts.join(" ")
  }

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value
    if ((field === 'firstName' || field === 'lastName') && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1)
    }
    setFormData({ ...formData, [field]: value })
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

  const handleContinue = () => {
    // Validate step 1 fields
    const step1Errors: FormErrors = {}
    
    if (!formData.firstName.trim()) {
      step1Errors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      step1Errors.lastName = 'Last name is required'
    }
    if (!formData.email.trim()) {
      step1Errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      step1Errors.email = 'Please enter a valid email'
    }
    if (!formData.phoneNumber.trim()) {
      step1Errors.phoneNumber = 'Phone number is required'
    }
    if (Object.keys(step1Errors).length > 0) {
      setErrors(step1Errors)
      return
    }

    setCurrentStep(2)
  }

  const handleBack = () => {
    setCurrentStep(1)
    setErrors({})
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

      // Compress image before upload (if needed)
      // if (!formData.profilePhoto) {
      //   setErrors({ profilePhoto: 'Profile photo is required' })
      //   setIsLoading(false)
      //   return
      // }

      // const compressionOptions = {
      //   maxSizeMB: 1,
      //   maxWidthOrHeight: 800,
      //   useWebWorker: true,
      //   initialQuality: 0.85,
      // }

      // const compressedPhoto = await imageCompression(
      //   formData.profilePhoto,
      //   compressionOptions
      // )

      // Prepare FormData for server action
      const data = new FormData()
      data.append('firstName', formData.firstName)
      data.append('lastName', formData.lastName)
      data.append('email', formData.email)
      data.append('phoneNumber', formData.phoneNumber)
      data.append('username', formData.username)
      data.append('password', formData.password)
      data.append('confirmPassword', formData.confirmPassword)
      // data.append('profilePhoto', compressedPhoto)

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
      <CardHeader className="text-center">
        <CardTitle className="text-4xl">
          <h1>Create an account</h1>
          </CardTitle>
        <CardDescription className="text-base text-black leading-[1.2] mt-1">
          Join our research community today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.form && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Personal Details */}
          {currentStep === 1 && (
            <div className="space-y-5 mt-10">
              <p className="text-base text-gray-400 mb-3 ml-3">Personal Details</p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-2">
                  <div className="relative w-full">
                    <input
                      id="firstName"
                      type="text"
                      placeholder=" "
                      value={formData.firstName}
                      onChange={handleInputChange("firstName")}
                      disabled={isLoading}
                      className={`
                        peer w-full
                        rounded-full
                        px-6 pt-5 pb-2
                        text-black text-base
                        bg-white
                        outline-none
                        transition-all duration-300
                        border
                        ${
                          errors.firstName
                            ? "border-destructive focus:border-destructive"
                            : "focus:border-gray-300"
                        }
                      `}
                    />

                    <label
                      htmlFor="firstName"
                      className={`
                        absolute left-6
                        transition-all duration-300 ease-out
                        pointer-events-none
                        top-1/2 -translate-y-1/2 text-sm
                        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs
                        peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs
                        ${
                          errors.firstName
                            ? "text-destructive"
                            : "text-gray-400"
                        }
                      `}
                    >
                      First Name
                    </label>

                    {errors.firstName && (
                      <p className="absolute -bottom-5 left-6 text-xs text-destructive">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <div className="relative w-full">
                    <input
                      id="lastName"
                      type="text"
                      placeholder=" "
                      value={formData.lastName}
                      onChange={handleInputChange("lastName")}
                      disabled={isLoading}
                      className={`
                        peer w-full
                        rounded-full
                        px-6 pt-5 pb-2
                        text-black text-base
                        bg-white
                        outline-none
                        transition-all duration-300
                        border
                        ${
                          errors.lastName
                            ? "border-destructive focus:border-destructive"
                            : "focus:border-gray-300"
                        }
                      `}
                    />

                    <label
                      htmlFor="lastName"
                      className={`
                        absolute left-6
                        transition-all duration-300 ease-out
                        pointer-events-none
                        top-1/2 -translate-y-1/2 text-sm
                        peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs
                        peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs
                        ${
                          errors.lastName
                            ? "text-destructive"
                            : "text-gray-400"
                        }
                      `}
                    >
                      Last Name
                    </label>

                    {errors.lastName && (
                      <p className="absolute -bottom-5 left-6 text-xs text-destructive">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="relative w-full">
                  <input
                    id="email"
                    type="text"
                    placeholder=" "
                    value={formData.email}
                    onChange={handleInputChange("email")}
                    disabled={isLoading}
                    className={`
                      peer w-full
                      rounded-full
                      px-6 pt-5 pb-2
                      text-black text-base
                      bg-white
                      outline-none
                      transition-all duration-300
                      border
                      ${
                        errors.email
                          ? "border-destructive focus:border-destructive"
                          : "focus:border-gray-300"
                      }
                    `}
                  />

                  <label
                    htmlFor="email"
                    className={`
                      absolute left-6
                      transition-all duration-300 ease-out
                      pointer-events-none
                      top-1/2 -translate-y-1/2 text-sm
                      peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs
                      peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs
                      ${
                        errors.email
                          ? "text-destructive"
                          : "text-gray-400"
                      }
                    `}
                  >
                    Email
                  </label>

                  {errors.email && (
                    <p className="absolute -bottom-5 left-6 text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <div className="relative w-full">
                  <div
                    className={`
                      absolute left-6 top-[1.56rem] -translate-y-1
                      text-base
                      transition-all duration-300 ease-out
                      ${isPhoneFocused || formData.phoneNumber ? 'opacity-100' : 'opacity-0'}
                    `}
                  >
                    +63
                  </div>

                  <input
                    id="phoneNumber"
                    type="tel"
                    placeholder=" "
                    value={formatPHNumber(formData.phoneNumber)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "")
                      setFormData({ ...formData, phoneNumber: digits })
                      if (errors.phoneNumber) {
                        setErrors({ ...errors, phoneNumber: '' })
                      }
                    }}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setIsPhoneFocused(false)}
                    disabled={isLoading}
                    className={`
                      peer w-full
                      rounded-full
                      ${isPhoneFocused || formData.phoneNumber ? "pl-15" : "pl-6"}
                      pr-6 pt-5 pb-2
                      text-black text-base
                      bg-white
                      outline-none
                      transition-all duration-300
                      border
                      ${
                        errors.phoneNumber
                          ? "border-destructive focus:border-destructive"
                          : "focus:border-gray-300"
                      }
                    `}
                  />

                  <label
                    htmlFor="phoneNumber"
                    className={`
                      absolute left-6
                      transition-all duration-300 ease-out
                      pointer-events-none
                      top-1/2 -translate-y-1/2 text-sm
                      peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs
                      peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs
                      ${
                        errors.phoneNumber
                          ? "text-destructive"
                          : "text-gray-400"
                      }
                    `}
                  >
                    Phone Number
                  </label>

                  {errors.phoneNumber && (
                    <p className="absolute -bottom-5 left-6 text-xs text-destructive">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleContinue}
                disabled={isLoading}
                className="
                  w-full
                  rounded-full
                  py-6
                  mt-10
                  text-base
                  font-medium
                  bg-[#132660]
                  text-white
                  transition-all duration-300 ease-out
                  hover:text-white
                  hover:bg-[#a5c4d4]
                  hover:shadow-lg
                  active:scale-[0.98]
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                <b>Continue</b>
              </Button>
            </div>
          )}

          {/* Step 2: Account Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h3 className="text-sm font-medium text-gray-400">Account Details</h3>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <div className="relative w-full">
                  <input
                    id="username"
                    type="text"
                    placeholder=" "
                    value={formData.username}
                    onChange={handleInputChange("username")}
                    disabled={isLoading}
                    className={`
                      peer w-full
                      rounded-full
                      px-6 pt-5 pb-2
                      text-black text-base
                      bg-white
                      outline-none
                      transition-all duration-300
                      border border-gray-200
                      ${
                        errors.username
                          ? "border-destructive focus:border-destructive"
                          : "focus:border-gray-300"
                      }
                    `}
                  />

                  <label
                    htmlFor="username"
                    className={`
                      absolute left-6
                      transition-all duration-300 ease-out
                      pointer-events-none
                      top-1/2 -translate-y-1/2 text-sm
                      peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs
                      peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs
                      ${
                        errors.username
                          ? "text-destructive"
                          : "text-gray-400"
                      }
                    `}
                  >
                    Username
                  </label>

                  {errors.username && (
                    <p className="absolute -bottom-5 left-6 text-xs text-destructive">
                      {errors.username}
                    </p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="relative w-full">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder=" "
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    disabled={isLoading}
                    className={`
                      peer w-full
                      rounded-full
                      px-6 pt-5 pb-2 pr-12
                      text-black text-base
                      bg-white
                      outline-none
                      transition-all duration-300
                      border border-gray-200
                      ${
                        errors.password
                          ? "border-destructive focus:border-destructive"
                          : "focus:border-gray-300"
                      }
                    `}
                  />

                  <label
                    htmlFor="password"
                    className={`
                      absolute left-6
                      transition-all duration-300 ease-out
                      pointer-events-none
                      top-1/2 -translate-y-1/2 text-sm
                      peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs
                      peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs
                      ${
                        errors.password
                          ? "text-destructive"
                          : "text-gray-400"
                      }
                    `}
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer transition-colors z-10 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>

                  {errors.password && (
                    <p className="absolute -bottom-5 left-6 text-xs text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <div className="relative w-full">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder=" "
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    disabled={isLoading}
                    className={`
                      peer w-full
                      rounded-full
                      px-6 pt-5 pb-2 pr-12
                      text-black text-base
                      bg-white
                      outline-none
                      transition-all duration-300
                      border border-gray-200
                      ${
                        errors.confirmPassword
                          ? "border-destructive focus:border-destructive"
                          : "focus:border-gray-300"
                      }
                    `}
                  />

                  <label
                    htmlFor="confirmPassword"
                    className={`
                      absolute left-6
                      transition-all duration-300 ease-out
                      pointer-events-none
                      top-1/2 -translate-y-1/2 text-sm
                      peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs
                      peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs
                      ${
                        errors.confirmPassword
                          ? "text-destructive"
                          : "text-gray-400"
                      }
                    `}
                  >
                    Confirm Password
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer transition-colors z-10 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>

                  {errors.confirmPassword && (
                    <p className="absolute -bottom-5 left-6 text-xs text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="
                  w-full
                  rounded-full
                  py-6
                  text-base
                  font-medium
                  bg-[#a5c4d4]
                  text-black
                  transition-all duration-300 ease-out
                  hover:bg-[#8fb3c9]
                  hover:shadow-lg
                  active:scale-[0.98]
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </div>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-black hover:text-[#a5c4d4] hover:underline font-medium">
              Log In
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}