export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeft, ExternalLink, Calendar, Users as UsersIcon,
  DollarSign, ToggleRight, Clock
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminPostDetailPage({ params }: PageProps) {
  const { id } = await params

  const result = await getCurrentUser()
  if (!result.success || !result.data) redirect('/login')
  if (result.data.profile?.role !== 'admin') redirect('/')

  const supabase = await createClient()

  const { data: post, error: postError } = await supabase
    .from('research_posts')
    .select(`
      *,
      profiles:user_id (
        id,
        first_name,
        last_name,
        email,
        profile_photo_url,
        school
      )
    `)
    .eq('id', id)
    .single()

  if (postError || !post) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h1>
          <p className="text-gray-500 mb-6">The requested post does not exist.</p>
          <Link href="/admin" className="text-[#132660] hover:underline text-sm font-medium">
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const ownerName = [(post as any).profiles?.first_name, (post as any).profiles?.last_name].filter(Boolean).join(' ') || 'Unknown'
  const ownerProfile = (post as any).profiles

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#132660] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Dashboard
        </Link>

        {/* Post header */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    post.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {post.is_open ? 'Open' : 'Closed'}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{post.compensation_type}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post owner */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Posted By</h2>
            <Link
              href={`/admin/users/${ownerProfile?.id}`}
              className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              {ownerProfile?.profile_photo_url ? (
                <img
                  src={ownerProfile.profile_photo_url}
                  alt={ownerName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400">
                  {(ownerProfile?.first_name?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-[#132660]">{ownerName}</p>
                <p className="text-xs text-gray-500">{ownerProfile?.email}</p>
                {ownerProfile?.school && (
                  <p className="text-xs text-gray-400">{ownerProfile.school}</p>
                )}
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Post details */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(post.created_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(post.updated_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Compensation</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {post.compensation_type}
                    {post.compensation_amount != null && ` · ₱${post.compensation_amount}`}
                  </p>
                  {post.compensation_details && (
                    <p className="text-xs text-gray-400">{post.compensation_details}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <UsersIcon className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Participants Needed</p>
                  <p className="text-sm font-medium text-gray-900">
                    {post.participants_needed ?? '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <ToggleRight className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-medium text-gray-900">{post.is_open ? 'Open for recruitment' : 'Closed'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Registration Link</p>
                  <a
                    href={post.registration_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[#132660] hover:underline break-all"
                  >
                    {post.registration_link}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.description}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
