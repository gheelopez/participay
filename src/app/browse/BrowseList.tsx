'use client'

import { useMemo, useState } from 'react'
import { StudyCard, type BrowsePost } from './StudyCard'

interface BrowseListProps {
  posts: BrowsePost[]
}

export function BrowseList({ posts }: BrowseListProps) {
  const [includeClosed, setIncludeClosed] = useState(false)

  const visiblePosts = useMemo(
    () => (includeClosed ? posts : posts.filter((p) => p.is_open)),
    [posts, includeClosed]
  )

  return (
    <>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">
          Showing {visiblePosts.length} {visiblePosts.length === 1 ? 'study' : 'studies'}
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => setIncludeClosed(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-[#132660]"
          />
          Include closed studies
        </label>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No studies to display right now. Please check back later.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePosts.map((post) => (
            <StudyCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  )
}
