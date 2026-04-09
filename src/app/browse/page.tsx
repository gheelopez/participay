import { getAllResearchPosts } from '@/app/actions/research-post'
import { AccountPageWrapper } from '@/components/AccountPageWrapper'
import { BrowseList } from './BrowseList'

export const dynamic = 'force-dynamic'

export default async function BrowsePage() {
  const result = await getAllResearchPosts()

  return (
    <AccountPageWrapper>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-[#132660]">
            Browse Studies
          </h1>
          <p className="mt-2 text-gray-500 text-base">
            Discover research opportunities from verified researchers.
          </p>
        </div>

        {!result.success ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            {result.error || 'Failed to load studies. Please try again later.'}
          </div>
        ) : (
          <BrowseList posts={result.data || []} />
        )}
      </main>
    </AccountPageWrapper>
  )
}
