'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsLoggedIn(false)
        setProfilePhotoUrl(null)
      } else {
        setIsLoggedIn(true)
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
      } else {
        setIsLoggedIn(false)
        setProfilePhotoUrl(null)
      }
    }

    loadUser()
  }, [pathname])

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