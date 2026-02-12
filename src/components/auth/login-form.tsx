'use client'

import { useState, FormEvent, useRef} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginUser } from '@/app/actions/auth'
import { loginSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import ReCAPTCHA from "react-google-recaptcha";

interface LoginFormData {
  email: string
  password: string
}

interface FormErrors {
  [key: string]: string
}

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value })
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      // Validate with Zod
      const validation = loginSchema.safeParse({...formData, captchaToken})

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

      // Call server action
      const result = await loginUser(validation.data)

      if (result.success) {
        router.push(result.data?.role === 'admin' ? '/admin' : '/landing')
      } else {
        setErrors({ form: result.error || 'Login failed' });
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ form: 'An unexpected error occurred. Please try again.' })
      recaptchaRef.current?.reset();
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full border-none bg-transparent shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-4xl">
          <h1>Welcome back</h1>
        </CardTitle>
        <CardDescription className="text-base text-black leading-[1.2] mt-1">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 mt-16">
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
                autoComplete="email"
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
                <p className="absolute -bottom-5 left-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

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
                autoComplete="current-password"
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
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer transition-colors z-10 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? (
                  <Eye className="h-5 w-5" />
                  ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>

              {errors.password && (
                <p className="absolute -bottom-5 left-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}

              {errors.form && (
                <p className="absolute -bottom-5 left-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {errors.form}
                </p>
              )}

            </div>
            <div className="flex justify-end pr-5">
              <Link
                href="#"
                className="text-xs text-gray-600 hover:text-[#a5c4d4] hover:underline font-medium"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Password reset functionality coming soon!')
                }}
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/*CAPTCHA*/}
          <div className="flex justify-center py-2">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              onChange={(token) => setCaptchaToken(token)}
            />
          </div>

          <Button
            type="submit"
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
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging In...
              </>
            ) : (
              'Log In'
            )}
          </Button>

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-black hover:text-[#a5c4d4] hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
