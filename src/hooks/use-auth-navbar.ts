'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logoutUser } from '@/app/actions/auth'

interface UseAuthNavbarOptions {
  initialIsLoggedIn?: boolean
  initialProfilePhotoUrl?: string | null
}

export function useAuthNavbar(options: UseAuthNavbarOptions = {}) {
  const [isLoggedIn, setIsLoggedIn] = useState(options.initialIsLoggedIn ?? false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(
    options.initialProfilePhotoUrl ?? null
  )
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setIsLoggedIn(true)

        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_photo_url')
          .eq('id', user.id)
          .single()

        setProfilePhotoUrl(profile?.profile_photo_url ?? null)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true)

        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_photo_url')
          .eq('id', session.user.id)
          .single()

        setProfilePhotoUrl(profile?.profile_photo_url ?? null)
      } else {
        setIsLoggedIn(false)
        setProfilePhotoUrl(null)
      }
    })

    function handleProfilePhotoUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ photoUrl: string }>
      setProfilePhotoUrl(customEvent.detail.photoUrl)
    }

    window.addEventListener('profile-photo-updated', handleProfilePhotoUpdated)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('profile-photo-updated', handleProfilePhotoUpdated)
    }
  }, [])

  const handleLogout = async () => {
    await logoutUser()
    setIsLoggedIn(false)
    setProfilePhotoUrl(null)
    router.refresh()
  }

  return {
    isLoggedIn,
    profilePhotoUrl,
    handleLogout,
  }
}