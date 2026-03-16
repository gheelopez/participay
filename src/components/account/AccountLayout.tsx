'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, Settings, FileText } from 'lucide-react'
import { SidebarPhotoUpload } from './SidebarPhotoUpload'
import { ProfileForm } from './ProfileForm'

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
    { id: 'post-study', label: 'Post a Study', icon: PenLine },
    { id: 'profile', label: 'Profile', icon: Settings },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 flex gap-8 items-start">
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
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
        <nav className="w-full mt-2 flex flex-col gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                currentTab === id
                  ? 'bg-[#132660] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
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
          <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center justify-center gap-4 text-center min-h-[300px]">
            <FileText className="w-12 h-12 text-gray-300" />
            <h2 className="text-lg font-semibold text-[#132660]">Post a Study</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              This feature is coming soon. You&apos;ll be able to create and manage research studies here.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
