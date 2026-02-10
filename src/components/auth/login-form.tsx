'use client'

import { useState, FormEvent } from 'react'
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
      const validation = loginSchema.safeParse(formData)

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
        router.push('/landing')
      } else {
        setErrors({ form: result.error || 'Login failed' })
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ form: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
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
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Password reset functionality coming soon!')
                }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isLoading}
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                autoComplete="current-password"
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
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
