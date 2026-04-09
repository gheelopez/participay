'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { updateProfile } from '@/app/actions/auth'

interface Profile {
  first_name: string | null
  last_name: string | null
  email: string
  phone_number: string | null
  school: string | null
}

interface ProfileFormProps {
  profile: Profile
}

function deriveInitial(profile: Profile) {
  const raw = profile.phone_number ?? ''
  const digits = raw.startsWith('+63') ? raw.slice(3) : raw
  return {
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    phoneDigits: digits,
    school: profile.school ?? '',
  }
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isPhoneFocused, setIsPhoneFocused] = useState(false)

  const original = deriveInitial(profile)
  const [form, setForm] = useState(original)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value
      if (field === 'phoneDigits') {
        value = value.replace(/\D/g, '').slice(0, 10)
      }
      setForm((prev) => ({ ...prev, [field]: value }))
      setSuccess(null)
      setError(null)
    }
  }

  function handleDiscard() {
    setForm(original)
    setSuccess(null)
    setError(null)
  }

  function handleSave() {
    setSuccess(null)
    setError(null)

    const data = new FormData()
    data.append('firstName', form.firstName)
    data.append('lastName', form.lastName)
    data.append('phoneNumber', '+63' + form.phoneDigits)
    data.append('school', form.school)

    startTransition(async () => {
      const result = await updateProfile(data)
      if (result.success) {
        setSuccess('Profile updated successfully.')
        router.refresh()
      } else {
        setError(result.error || 'Failed to update profile')
      }
    })
  }

  const showPrefix = isPhoneFocused || form.phoneDigits.length > 0

  const formatPHNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10)
    const parts = []
    if (digits.length > 0) parts.push(digits.slice(0, 3))
    if (digits.length >= 4) parts.push(digits.slice(3, 6))
    if (digits.length >= 7) parts.push(digits.slice(6, 10))
    return parts.join(" ")
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm rounded-4xl p-6">
        <CardHeader className="text-left">
          <CardTitle className="text-xl mt-6">
            <h1>Profile Information</h1>
          </CardTitle>
          <CardDescription>
            Update your personal details below.
          </CardDescription>

        </CardHeader>
        <CardContent>
          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-4 pb-4">
            {/* First Name */}
            <div className="space-y-2">
              <div className="relative w-full">
                <input
                  id="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={handleChange('firstName')}
                  disabled={isPending}
                  className="
                    peer w-full
                    rounded-full
                    px-6 pt-5 pb-2
                    text-black text-base
                    bg-white
                    transition-all duration-300
                    border
                    border-gray-200
                    focus-visible:ring-[#132660]
                  "
                />
                <label
                  htmlFor="firstName"
                  className={`
                    absolute left-6
                    transition-all duration-300 ease-out
                    pointer-events-none
                    top-2 translate-y-0 text-xs
                    text-gray-400
                  `}
                >
                  First Name
                </label>
              </div>
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <div className="relative w-full">
                <input
                  id="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange('lastName')}
                  disabled={isPending}
                  className="
                    peer w-full
                    rounded-full
                    px-6 pt-5 pb-2
                    text-black text-base
                    bg-white
                    transition-all duration-300
                    border
                    border-gray-200
                    focus-visible:ring-[#132660]
                  "
                />
                <label
                  htmlFor="lastName"
                  className={`
                    absolute left-6
                    transition-all duration-300 ease-out
                    pointer-events-none
                    top-2 translate-y-0 text-xs
                    text-gray-400
                  `}
                >
                  Last Name
                </label>
              </div>
            </div>
          </div>

          {/* Email (read-only) */}
            <div className="pb-4">
              <div className="relative w-full">
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  readOnly
                  disabled
                  className="
                    peer w-full
                    rounded-full
                    px-6 pt-5 pb-2
                    text-gray-500 text-base
                    bg-gray-50
                    transition-all duration-300
                    border
                    border-gray-200
                    focus-visible:ring-[#132660]
                  "
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-4xl px-3 py-1.5">
                  Verified
                </span>
                <label
                  htmlFor="email"
                  className={`
                    absolute left-6
                    transition-all duration-300 ease-out
                    pointer-events-none
                    top-2 translate-y-0 text-xs
                    text-gray-400
                  `}
                >
                  Email
                </label>
              </div>
            </div>

          {/* Phone */}
            <div className="pb-4">
              <div className="relative w-full">
                <span
                  className="
                    absolute
                    left-6
                    top-[1.56rem]
                    -translate-y-1
                    text-base
                    text-gray-700
                    pointer-events-none
                    select-none
                  "
                >
                  +63
                </span>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={formatPHNumber(form.phoneDigits)}
                  onChange={handleChange('phoneDigits')}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  disabled={isPending}
                  className="
                    peer w-full
                    rounded-full
                    px-15 pt-5 pb-2
                    text-black text-base
                    bg-white
                    transition-all duration-300
                    border
                    border-gray-200
                    focus-visible:ring-[#132660]
                  "
                />
                <label
                  htmlFor="phoneNumber"
                  className={`
                    absolute left-6
                    transition-all duration-300 ease-out
                    pointer-events-none
                    top-2 translate-y-0 text-xs
                    text-gray-400
                  `}
                >
                  Phone Number
                </label>
              </div>
            </div>
            
          {/* School */}
            <div className="pb-10">
              <div className="relative w-full">
                <input
                  id="school"
                  value={form.school}
                  onChange={handleChange('school')}
                  disabled={isPending}
                  className="
                    peer w-full
                    rounded-full
                    px-6 pt-5 pb-2
                    text-black text-base
                    bg-white
                    transition-all duration-300
                    border
                    border-gray-200
                    focus-visible:ring-[#132660]
                  "
                />
                <label
                  htmlFor="school"
                  className={`
                    absolute left-6
                    transition-all duration-300 ease-out
                    pointer-events-none
                    top-2 translate-y-0 text-xs
                    text-gray-400
                  `}
                >
                  School/University
                </label>
              </div>
            </div>

          <div className="flex items-center justify-between gap-4 mb-6">
          
          {/* Message */}
          <div className="min-h-[50px] flex items-center">
            {success && (
              <Alert className="rounded-4xl border-green-200 bg-green-50 text-green-600">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="rounded-4xl border-red-200 bg-red-50 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-600">{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="pillOutline"
              size="lg"
              onClick={handleDiscard}
              disabled={isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="pillOutline"
              size="lg"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>

        </CardContent>
      </Card>
    </div>
  )
}
