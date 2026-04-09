'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  LogOut, ShieldCheck, Users, FileText,
  ArrowLeft, Search, ChevronLeft, ChevronRight,
  Ban, UserCheck, ArrowUpCircle, ArrowDownCircle,
  Trash2, AlertTriangle, Loader2
} from 'lucide-react'
import { logoutUser } from '@/app/actions/auth'
import {
  getAllUsers,
  deleteAnyPost,
  setUserRole,
  setBanStatus,
  getAllPostsAdmin,
  checkAdminStatus,
} from '@/app/actions/admin'

type Tab = 'users' | 'posts'

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  school: string | null
  profile_photo_url: string | null
  created_at: string
  role: 'user' | 'admin'
  is_banned: boolean
  post_count: number
}

interface Post {
  id: string
  title: string
  description: string
  is_open: boolean
  compensation_type: string
  compensation_amount: number | null
  participants_needed: number | null
  created_at: string
  user_id: string
  profiles: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface AdminDashboardProps {
  adminEmail: string
  adminId: string
}

const ROWS_PER_PAGE = 10

export function AdminDashboard({ adminEmail, adminId }: AdminDashboardProps) {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState<Tab>('users')

  // Data
  const [users, setUsers] = useState<Profile[]>([])
  const [posts, setPosts] = useState<Post[]>([])

  // Loading / errors
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)

  // Search
  const [userSearch, setUserSearch] = useState('')
  const [postSearch, setPostSearch] = useState('')

  // Pagination
  const [userPage, setUserPage] = useState(1)
  const [postPage, setPostPage] = useState(1)

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    const result = await getAllUsers()
    if (result.success && result.data) {
      setUsers(result.data)
    } else {
      setError(result.error || 'Failed to load users')
    }
    setLoadingUsers(false)
  }, [])

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true)
    const result = await getAllPostsAdmin()
    if (result.success && result.data) {
      setPosts(result.data)
    } else {
      setError(result.error || 'Failed to load posts')
    }
    setLoadingPosts(false)
  }, [])

  // Load initial data (users + posts for stats)
  useEffect(() => {
    fetchUsers()
    fetchPosts()
  }, [fetchUsers, fetchPosts])

  // Poll admin status — redirect immediately if demoted
  useEffect(() => {
    const interval = setInterval(async () => {
      const { isAdmin } = await checkAdminStatus()
      if (!isAdmin) {
        router.replace('/')
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [router])

  // --- ACTION HANDLERS ---
  async function handleSetRole(userId: string, role: 'user' | 'admin') {
    setActionLoading(userId)
    setError(null)
    const result = await setUserRole(userId, role)
    if (result.success) {
      await fetchUsers()
    } else {
      setError(result.error || 'Failed to change role')
    }
    setActionLoading(null)
  }

  async function handleSetBan(userId: string, isBanned: boolean) {
    setActionLoading(userId)
    setError(null)
    const result = await setBanStatus(userId, isBanned)
    if (result.success) {
      await fetchUsers()
    } else {
      setError(result.error || 'Failed to update ban status')
    }
    setActionLoading(null)
  }

  async function handleDeletePost(postId: string) {
    setActionLoading(postId)
    setError(null)
    const result = await deleteAnyPost(postId)
    if (result.success) {
      await fetchPosts()
    } else {
      setError(result.error || 'Failed to delete post')
    }
    setActionLoading(null)
    setConfirmAction(null)
  }

  async function handleLogout() {
    await logoutUser()
    router.push('/login')
  }

  // --- FILTERS ---
  const filteredUsers = users.filter((u) => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
    const q = userSearch.toLowerCase()
    return name.includes(q) || u.email.toLowerCase().includes(q)
  })

  const filteredPosts = posts.filter((p) => {
    const owner = `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''} ${p.profiles?.email || ''}`.toLowerCase()
    const q = postSearch.toLowerCase()
    return p.title.toLowerCase().includes(q) || owner.includes(q)
  })

  // --- PAGINATION ---
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE))
  const paginatedUsers = filteredUsers.slice((userPage - 1) * ROWS_PER_PAGE, userPage * ROWS_PER_PAGE)

  const totalPostPages = Math.max(1, Math.ceil(filteredPosts.length / ROWS_PER_PAGE))
  const paginatedPosts = filteredPosts.slice((postPage - 1) * ROWS_PER_PAGE, postPage * ROWS_PER_PAGE)

  // --- STATS ---
  const totalUsers = users.length
  const totalPosts = posts.length
  const adminCount = users.filter((u) => u.role === 'admin').length
  const bannedCount = users.filter((u) => u.is_banned).length

  // --- TAB CONFIG ---
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'posts', label: 'Posts', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmAction.message}</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmAction(null)}
                className="rounded-xl bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmAction.onConfirm}
                className="rounded-xl"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#132660] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#132660] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#132660] tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">ParticiPay Management Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{adminEmail}</span>
            </span>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="rounded-xl bg-white text-gray-700 border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm font-medium">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: totalUsers, icon: Users, color: '#132660' },
            { label: 'Research Posts', value: totalPosts, icon: FileText, color: '#2563eb' },
            { label: 'Admins', value: adminCount, icon: ShieldCheck, color: '#16a34a' },
            { label: 'Banned', value: bannedCount, icon: Ban, color: '#dc2626' },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}12` }}
                  >
                    <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab navigation + Content */}
        <div className="flex gap-6 items-start">
          {/* Tab sidebar */}
          <nav className="w-[200px] shrink-0 bg-white rounded-2xl shadow-sm p-3 flex flex-col gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setCurrentTab(id)
                  setError(null)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  currentTab === id
                    ? 'bg-[#132660] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <main className="flex-1 min-w-0">
            {/* USERS TAB */}
            {currentTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value)
                        setUserPage(1)
                      }}
                      className="pl-9 rounded-xl border-gray-200 bg-white text-sm"
                    />
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Email</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Role</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Joined</th>
                            <th className="text-center px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Posts</th>
                            <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedUsers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-gray-400">
                                {userSearch ? 'No users match your search.' : 'No users found.'}
                              </td>
                            </tr>
                          ) : (
                            paginatedUsers.map((user) => (
                              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3.5">
                                  <a
                                    href={`/admin/users/${user.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 group"
                                  >
                                    {user.profile_photo_url ? (
                                      <img
                                        src={user.profile_photo_url}
                                        alt=""
                                        className="w-7 h-7 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-semibold">
                                        {(user.first_name?.[0] || '?').toUpperCase()}
                                      </div>
                                    )}
                                    <span className="font-medium text-gray-900 group-hover:text-[#132660] group-hover:underline transition-colors">
                                      {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                                    </span>
                                  </a>
                                </td>
                                <td className="px-5 py-3.5 text-gray-600">{user.email}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    user.role === 'admin'
                                      ? 'bg-[#132660]/10 text-[#132660]'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {user.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    user.is_banned
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {user.is_banned ? 'Banned' : 'Active'}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-gray-500 text-xs">
                                  {new Date(user.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="px-5 py-3.5 text-center text-gray-600 font-medium">
                                  {user.post_count}
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Promote / Demote */}
                                    {user.role === 'user' ? (
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() =>
                                          setConfirmAction({
                                            message: `Promote ${user.first_name || user.email} to admin?`,
                                            onConfirm: () => {
                                              setConfirmAction(null)
                                              handleSetRole(user.id, 'admin')
                                            },
                                          })
                                        }
                                        disabled={actionLoading === user.id}
                                        className="text-[#132660] hover:bg-[#132660]/10 rounded-lg"
                                        title="Promote to admin"
                                      >
                                        {actionLoading === user.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <ArrowUpCircle className="w-3.5 h-3.5" />
                                        )}
                                      </Button>
                                    ) : (
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() =>
                                          setConfirmAction({
                                            message: `Demote ${user.first_name || user.email} to regular user? ${
                                              user.id === adminId ? '⚠️ This is your own account!' : ''
                                            }`,
                                            onConfirm: () => {
                                              setConfirmAction(null)
                                              handleSetRole(user.id, 'user')
                                            },
                                          })
                                        }
                                        disabled={actionLoading === user.id}
                                        className="text-amber-600 hover:bg-amber-50 rounded-lg"
                                        title="Demote to user"
                                      >
                                        {actionLoading === user.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <ArrowDownCircle className="w-3.5 h-3.5" />
                                        )}
                                      </Button>
                                    )}

                                    {/* Ban / Unban */}
                                    {user.id !== adminId && (
                                      user.is_banned ? (
                                        <Button
                                          size="xs"
                                          variant="ghost"
                                          onClick={() => handleSetBan(user.id, false)}
                                          disabled={actionLoading === user.id}
                                          className="text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                          title="Unban user"
                                        >
                                          {actionLoading === user.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <UserCheck className="w-3.5 h-3.5" />
                                          )}
                                        </Button>
                                      ) : (
                                        <Button
                                          size="xs"
                                          variant="ghost"
                                          onClick={() =>
                                            setConfirmAction({
                                              message: `Ban ${user.first_name || user.email}? They will not be able to log in.`,
                                              onConfirm: () => {
                                                setConfirmAction(null)
                                                handleSetBan(user.id, true)
                                              },
                                            })
                                          }
                                          disabled={actionLoading === user.id}
                                          className="text-red-500 hover:bg-red-50 rounded-lg"
                                          title="Ban user"
                                        >
                                          {actionLoading === user.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Ban className="w-3.5 h-3.5" />
                                          )}
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {filteredUsers.length > ROWS_PER_PAGE && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Showing {(userPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(userPage * ROWS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={userPage <= 1}
                            onClick={() => setUserPage((p) => p - 1)}
                            className="rounded-lg"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-xs text-gray-500 px-2">
                            {userPage} / {totalUserPages}
                          </span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={userPage >= totalUserPages}
                            onClick={() => setUserPage((p) => p + 1)}
                            className="rounded-lg"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* POSTS TAB */}
            {currentTab === 'posts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Research Posts</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by title or owner..."
                      value={postSearch}
                      onChange={(e) => {
                        setPostSearch(e.target.value)
                        setPostPage(1)
                      }}
                      className="pl-9 rounded-xl border-gray-200 bg-white text-sm"
                    />
                  </div>
                </div>

                {loadingPosts ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Title</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Owner</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Compensation</th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Created</th>
                            <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPosts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-gray-400">
                                {postSearch ? 'No posts match your search.' : 'No posts found.'}
                              </td>
                            </tr>
                          ) : (
                            paginatedPosts.map((post) => (
                              <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3.5">
                                  <a
                                    href={`/admin/posts/${post.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-gray-900 line-clamp-1 hover:text-[#132660] hover:underline transition-colors"
                                  >
                                    {post.title}
                                  </a>
                                </td>
                                <td className="px-5 py-3.5">
                                  <div>
                                    <p className="text-gray-900 text-xs font-medium">
                                      {[post.profiles?.first_name, post.profiles?.last_name].filter(Boolean).join(' ') || '—'}
                                    </p>
                                    <p className="text-gray-400 text-xs">{post.profiles?.email}</p>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    post.is_open
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {post.is_open ? 'Open' : 'Closed'}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-gray-600 text-xs capitalize">
                                  {post.compensation_type}
                                  {post.compensation_amount != null && (
                                    <span className="ml-1 text-gray-400">₱{post.compensation_amount}</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-gray-500 text-xs">
                                  {new Date(post.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex justify-end">
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      onClick={() =>
                                        setConfirmAction({
                                          message: `Delete "${post.title}"? This action cannot be undone.`,
                                          onConfirm: () => handleDeletePost(post.id),
                                        })
                                      }
                                      disabled={actionLoading === post.id}
                                      className="text-red-500 hover:bg-red-50 rounded-lg"
                                      title="Delete post"
                                    >
                                      {actionLoading === post.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {filteredPosts.length > ROWS_PER_PAGE && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Showing {(postPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(postPage * ROWS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={postPage <= 1}
                            onClick={() => setPostPage((p) => p - 1)}
                            className="rounded-lg"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-xs text-gray-500 px-2">
                            {postPage} / {totalPostPages}
                          </span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={postPage >= totalPostPages}
                            onClick={() => setPostPage((p) => p + 1)}
                            className="rounded-lg"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  )
}
