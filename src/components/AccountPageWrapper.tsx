'use client'

import { Navbar } from '@/components/navbar'
import { useAuthNavbar } from '@/hooks/use-auth-navbar'

export function AccountPageWrapper({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, profilePhotoUrl, handleLogout } = useAuthNavbar()

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