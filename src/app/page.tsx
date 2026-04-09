import { createClient } from '@/lib/supabase/server'
import HomeClient from './home-client'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profilePhotoUrl: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_photo_url')
      .eq('id', user.id)
      .single()
    profilePhotoUrl = (profile as { profile_photo_url: string | null } | null)?.profile_photo_url ?? null
  }

  return (
    <HomeClient
      initialIsLoggedIn={!!user}
      initialProfilePhotoUrl={profilePhotoUrl}
    />
  )
}
