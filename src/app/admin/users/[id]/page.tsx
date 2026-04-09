export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Mail, Phone, GraduationCap, ShieldCheck,
  Ban, Calendar, FileText
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params

  const result = await getCurrentUser()
  if (!result.success || !result.data) redirect('/login')
  if (result.data.profile?.role !== 'admin') redirect('/')

  const supabase = await createClient()

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h1>
          <p className="text-gray-500 mb-6">The requested user profile does not exist.</p>
          <Link href="/admin" className="text-[#132660] hover:underline text-sm font-medium">
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Fetch user's posts
  const { data: posts } = await supabase
    .from('research_posts')
    .select('id, title, is_open, created_at, compensation_type, compensation_amount')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'No name'

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

        {/* Profile header */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-[#132660] h-24" />
          <CardContent className="relative pt-0 pb-6 px-6">
            <div className="flex items-end gap-4 -mt-10">
              {profile.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt={fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center text-2xl font-bold text-gray-400">
                  {(profile.first_name?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div className="pb-1">
                <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    profile.role === 'admin'
                      ? 'bg-[#132660]/10 text-[#132660]'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {profile.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                    {profile.role}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    profile.is_banned
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {profile.is_banned ? 'Banned' : 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{profile.phone_number || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">School</p>
                  <p className="text-sm font-medium text-gray-900">{profile.school || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
            {profile.is_banned && (
              <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 rounded-xl">
                <Ban className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700">This user is currently banned from logging in.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User's posts */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Research Posts ({posts?.length || 0})
            </h2>
            {(!posts || posts.length === 0) ? (
              <p className="text-sm text-gray-400 py-4 text-center">No posts yet.</p>
            ) : (
              <div className="space-y-2">
                {posts.map((post: any) => (
                  <Link
                    key={post.id}
                    href={`/admin/posts/${post.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#132660]" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-[#132660]">{post.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {post.compensation_amount != null && ` · ₱${post.compensation_amount}`}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {post.is_open ? 'Open' : 'Closed'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
