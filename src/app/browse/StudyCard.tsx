'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Users } from 'lucide-react'

export interface BrowsePost {
  id: string
  title: string
  description: string
  registration_link: string
  compensation_type: 'food' | 'money' | 'both' | 'none'
  compensation_amount: number | null
  participants_needed: number | null
  is_open: boolean
  profiles?: {
    first_name: string | null
    last_name: string | null
    school: string | null
  } | null
}

const DESCRIPTION_TRUNCATE_LIMIT = 180

export function StudyCard({ post }: { post: BrowsePost }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const compensationLabel =
    post.compensation_type === 'none'
      ? 'No compensation'
      : post.compensation_type.charAt(0).toUpperCase() + post.compensation_type.slice(1)

  const ownerName = [post.profiles?.first_name, post.profiles?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  const isLong = post.description.length > DESCRIPTION_TRUNCATE_LIMIT
  const displayedDescription =
    isLong && !isExpanded
      ? post.description.slice(0, DESCRIPTION_TRUNCATE_LIMIT).trimEnd() + '…'
      : post.description

  return (
    <div className="bg-white rounded-4xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold text-[#132660] text-lg leading-snug">
            {post.title}
          </h2>
          <span
            className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full border px-3 py-1 ${
              post.is_open
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
          >
            {post.is_open ? 'Open' : 'Closed'}
          </span>
        </div>

        {(ownerName || post.profiles?.school) && (
          <p className="mt-1 text-xs text-gray-500">
            {ownerName || 'Researcher'}
            {post.profiles?.school ? ` · ${post.profiles.school}` : ''}
          </p>
        )}
      </div>

      <div className="px-5 pb-3 flex-1">
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {displayedDescription}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Show more <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="mx-5 mt-1 py-4 border-t border-gray-200 flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-white border border-gray-200 rounded-4xl px-3 py-1.5 text-gray-500">
          {compensationLabel}
        </span>

        {post.compensation_amount != null && post.compensation_amount > 0 && (
          <span className="bg-blue-50 border border-blue-200 text-blue-700 rounded-4xl px-3 py-1.5 font-medium">
            &#8369;{post.compensation_amount.toLocaleString()}
          </span>
        )}

        {post.participants_needed != null && (
          <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-4xl px-3 py-1.5">
            <Users className="w-3 h-3" />
            {post.participants_needed}
          </span>
        )}
      </div>

      <div className="px-5 pb-5">
        <a
          href={post.registration_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-4xl px-4 py-2.5 text-sm font-medium text-white bg-[#132660] border border-transparent hover:text-[#132660] hover:border-[#132660] hover:bg-transparent transition-colors duration-200"
        >
          Register
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
