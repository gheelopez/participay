'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#132660]">Personal Information</h2>
        <p className="text-sm text-gray-500 mt-1">Update your profile details below.</p>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 space-y-6">
          {/* First Name + Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                First Name
              </Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={handleChange('firstName')}
                disabled={isPending}
                placeholder="First name"
                className="rounded-xl border-gray-200 focus-visible:ring-[#132660]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={handleChange('lastName')}
                disabled={isPending}
                placeholder="Last name"
                className="rounded-xl border-gray-200 focus-visible:ring-[#132660]"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={profile.email}
                readOnly
                disabled
                className="rounded-xl border-gray-200 bg-gray-50 text-gray-500 pr-24"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                Verified
              </span>
            </div>
          </div>

          {/* Phone + School */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
                Phone Number
              </Label>
              <div className="relative">
                {showPrefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-700 pointer-events-none select-none">
                    +63
                  </span>
                )}
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={form.phoneDigits}
                  onChange={handleChange('phoneDigits')}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  disabled={isPending}
                  placeholder={showPrefix ? '' : '+63 phone number'}
                  className={`rounded-xl border-gray-200 focus-visible:ring-[#132660] ${showPrefix ? 'pl-12' : ''}`}
                  maxLength={10}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school" className="text-sm font-medium text-gray-700">
                School
              </Label>
              <Input
                id="school"
                value={form.school}
                onChange={handleChange('school')}
                disabled={isPending}
                placeholder="Your school or institution"
                className="rounded-xl border-gray-200 focus-visible:ring-[#132660]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleDiscard}
          disabled={isPending}
          className="rounded-full px-6 border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Discard Changes
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-full px-6 bg-[#132660] text-white hover:bg-[#a5c4d4] transition-colors duration-200"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}
