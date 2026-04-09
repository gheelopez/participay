'use client'

import { Navbar } from '@/components/navbar'
import { useAuthNavbar } from '@/hooks/use-auth-navbar'

interface AccountPageWrapperProps {
  children: React.ReactNode
  initialIsLoggedIn?: boolean
  initialProfilePhotoUrl?: string | null
}

export function AccountPageWrapper({
  children,
  initialIsLoggedIn,
  initialProfilePhotoUrl,
}: AccountPageWrapperProps) {
  const { isLoggedIn, profilePhotoUrl, handleLogout } = useAuthNavbar({
    initialIsLoggedIn,
    initialProfilePhotoUrl,
  })

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <Navbar
        isLoggedIn={isLoggedIn}
        profilePhotoUrl={profilePhotoUrl}
        onLogout={handleLogout}
      />
      {children}
    </div>
  )
}
