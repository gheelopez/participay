import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/auth'
import { AccountLayout } from '@/components/account/AccountLayout'
import { AccountPageWrapper } from '@/components/AccountPageWrapper'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function AccountPage({ searchParams }: PageProps) {
  const result = await getCurrentUser()

  if (!result.success || !result.data) {
    redirect('/login')
  }

  const profile = result.data.profile
  const { tab } = await searchParams
  const activeTab = tab === 'post-study' ? 'post-study' : 'profile'

  return (
    <AccountPageWrapper
      initialIsLoggedIn={true}
      initialProfilePhotoUrl={profile?.profile_photo_url ?? null}
    >
      <AccountLayout profile={profile} activeTab={activeTab} />
    </AccountPageWrapper>
  )
}