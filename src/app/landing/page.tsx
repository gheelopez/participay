export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getCurrentUser, logoutUser } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut } from 'lucide-react'

export default async function LandingPage() {
  const result = await getCurrentUser()

  if (!result.success || !result.data) {
    redirect('/login')
  }

  const { data: userData } = result
  const profile = userData.profile

  async function handleLogout() {
    'use server'
    await logoutUser()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl">Welcome to Participay</CardTitle>
              <CardDescription>
                Your journey to meaningful research participation starts here
              </CardDescription>
            </div>
            {profile?.profile_photo_url && (
              <img
                src={profile.profile_photo_url}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-primary"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              Hello, {profile?.first_name} {profile?.last_name}!
            </h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium">Email:</span> {profile?.email}</p>
              <p><span className="font-medium">Phone:</span> {profile?.phone_number}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> The full landing page experience is coming soon.
              Stay tuned for research opportunities, your participation history, and more!
            </p>
          </div>

          <form action={handleLogout}>
            <Button type="submit" variant="outline" className="w-full text-white">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
