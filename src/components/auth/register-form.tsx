'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerUser } from '@/app/actions/auth'
import { registerSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { AvatarUpload } from '@/components/patterns/p-file-upload-2'
import type { FileWithPreview } from '@/hooks/use-file-upload'

interface FormData {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  // username: string
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
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    // username: '',
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
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const handleContinue = (e: React.SyntheticEvent) => {
    e.preventDefault()
    const clientErrors: FormErrors = {}
    if (!formData.firstName.trim()) clientErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) clientErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) {
      clientErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      clientErrors.email = 'Please enter a valid email'
    }
    if (!formData.phoneNumber.trim()) {
      clientErrors.phoneNumber = 'Phone number is required'
    } else if (formData.phoneNumber.length !== 10) {
      clientErrors.phoneNumber = 'Phone number must be 10 digits'
    }
    if (!formData.password) {
      clientErrors.password = 'Password is required'
    } else {
      const missing = []
      if (formData.password.length < 8) missing.push('at least 8 characters')
      if (!/[A-Z]/.test(formData.password)) missing.push('one uppercase letter')
      if (!/\d/.test(formData.password)) missing.push('one number')
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) missing.push('one special character')
      if (missing.length > 0) {
        clientErrors.password = `Password must contain ${missing.join(', ')}`
      }
    }
    if (!formData.confirmPassword) {
      clientErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      clientErrors.confirmPassword = "Passwords don't match"
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }
    setErrors({})
    setCurrentStep(2)
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setErrors({})

    const clientErrors: FormErrors = {}
    if (!formData.profilePhoto) {
      clientErrors.profilePhoto = 'Please upload a profile photo'
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setIsLoading(true)

    try {
      const validation = registerSchema.safeParse({
        ...formData,
        phoneNumber: '+63' + formData.phoneNumber,
      })

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

      const data = new FormData()
      data.append('firstName', formData.firstName)
      data.append('lastName', formData.lastName)
      data.append('email', formData.email)
      data.append('phoneNumber', '+63' + formData.phoneNumber)
      // data.append('username', formData.username)
      data.append('password', formData.password)
      data.append('confirmPassword', formData.confirmPassword)
      if (formData.profilePhoto) {
        data.append('profilePhoto', formData.profilePhoto)
      }

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
          <h1>{currentStep === 1 ? 'Create an account' : 'Add a profile photo'}</h1>
        </CardTitle>
        <CardDescription className="text-base text-black leading-[1.2] mt-1">
          {currentStep === 1
            ? 'Join our research community today.'
            : 'This will be visible to other members.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={currentStep === 1 ? handleContinue : handleSubmit} className="space-y-6">
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

              {/* First Name & Last Name */}
              <div className={`grid grid-cols-2 gap-4 ${errors.firstName || errors.lastName ? 'pb-2' : ''}`}>
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
                        ${errors.firstName ? "text-destructive" : "text-gray-400"}
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
                        ${errors.lastName ? "text-destructive" : "text-gray-400"}
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
              <div className={`space-y-2 ${errors.email ? 'pb-2' : ''}`}>
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
                      ${errors.email ? "text-destructive" : "text-gray-400"}
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
              <div className={`space-y-2 ${errors.phoneNumber ? 'pb-2' : ''}`}>
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
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
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
                      ${errors.phoneNumber ? "text-destructive" : "text-gray-400"}
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

              <div className="space-y-3">
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
                        border
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
                        ${errors.password ? "text-destructive" : "text-gray-400"}
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
                      {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 ml-6 mr-2 text-xs text-destructive">
                      {errors.password}
                    </p>
                  )}
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
                        border
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
                        ${errors.confirmPassword ? "text-destructive" : "text-gray-400"}
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
                      {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 ml-6 text-xs text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="
                  w-full
                  rounded-full
                  py-6
                  mt-4
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

          {/* Step 2: Profile Photo */}
          {currentStep === 2 && (
            <div className="space-y-5 mt-10">
              <p className="text-base text-gray-400 mb-3 ml-3">Profile Photo</p>

              <AvatarUpload
                onFileChange={(fileWithPreview) => {
                  const file = fileWithPreview?.file instanceof File ? fileWithPreview.file : null
                  setFormData({ ...formData, profilePhoto: file })
                  if (errors.profilePhoto) setErrors({ ...errors, profilePhoto: '' })
                }}
              />
              {errors.profilePhoto && (
                <p className="text-xs text-destructive text-center">{errors.profilePhoto}</p>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setCurrentStep(1); setErrors({}) }}
                  disabled={isLoading}
                  className="flex-1 rounded-full py-6 text-base font-medium border-gray-200 bg-white text-black hover:bg-gray-50 hover:text-black"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="
                    flex-1
                    rounded-full
                    py-6
                    text-base
                    font-medium
                    bg-[#132660]
                    text-white
                    transition-all duration-300 ease-out
                    hover:text-white
                    hover:bg-[#a5c4d4]
                    hover:shadow-lg
                    active:scale-[0.98]
                    disabled:opacity-60
                    cursor-pointer
                  "
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </div>
                  ) : (
                    <b>Sign Up</b>
                  )}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-black hover:text-[#a5c4d4] hover:underline font-medium">
              Log In
            </Link>
          </p>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              currentStep >= 1 ? 'bg-[#132660] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className={`h-0.5 w-12 transition-colors ${
              currentStep >= 2 ? 'bg-[#132660]' : 'bg-gray-200'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              currentStep >= 2 ? 'bg-[#132660] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
