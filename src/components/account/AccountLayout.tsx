'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, LayoutDashboard } from 'lucide-react'
import { SidebarPhotoUpload } from './SidebarPhotoUpload'
import { ProfileForm } from './ProfileForm'
import { PostStudyForm } from './PostStudyForm'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  phone_number: string | null
  school: string | null
  profile_photo_url: string | null
  role: 'user' | 'admin'
}

type Tab = 'profile' | 'post-study'

interface AccountLayoutProps {
  profile: Profile
  activeTab: Tab
}

export function AccountLayout({ profile, activeTab }: AccountLayoutProps) {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState<Tab>(activeTab)
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile.profile_photo_url)
  const [photoError, setPhotoError] = useState<string | null>(null)

  function switchTab(tab: Tab) {
    setCurrentTab(tab)
    router.push(`/account?tab=${tab}`, { scroll: false })
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your Name'
  const school = profile.school || ''

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'post-study', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: Settings },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#132660] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="flex gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-[280px] shrink-0 bg-white rounded-4xl shadow-sm p-6 flex flex-col items-center gap-4">
          {/* Photo upload */}
          <SidebarPhotoUpload
            photoUrl={photoUrl}
            onPhotoUpdated={(url) => {
              setPhotoUrl(url)
              setPhotoError(null)
            }}
            onError={(msg) => setPhotoError(msg)}
          />

          {photoError && (
            <p className="text-xs text-red-500 text-center">{photoError}</p>
          )}

          {/* Name + School */}
          <div className="text-center">
            <p className="font-semibold text-[#132660] text-base leading-tight">{fullName}</p>
            {school && <p className="text-sm text-gray-500 mt-0.5">{school}</p>}
          </div>

          {/* Tab nav */}
          <nav className="w-full mt-2 flex flex-col gap-3">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-4xl text-sm font-medium transition-colors duration-150 ${
                  currentTab === id
                    ? 'bg-[#132660] text-white'
                    : 'text-gray-600 border border-transparent hover:border-[#132660] hover:text-[#132660]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {currentTab === 'profile' && (
            <ProfileForm profile={profile} />
          )}

          {currentTab === 'post-study' && (
            <PostStudyForm />
          )}
        </main>
      </div>
    </div>
  )
}
