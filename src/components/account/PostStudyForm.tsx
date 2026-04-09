'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, CheckCircle2, Loader2, Trash2,
  ToggleLeft, ToggleRight, PenLine, X, Users,
  Clock, ExternalLink, Search, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  createResearchPost,
  getUserResearchPosts,
  deleteResearchPost,
  togglePostStatus,
  updateResearchPost,
} from '@/app/actions/research-post'
import type { CreateResearchPostInput } from '@/lib/validations/research-post'

interface ResearchPost {
  id: string
  title: string
  description: string
  registration_link: string
  compensation_type: 'food' | 'money' | 'both' | 'none'
  compensation_details: string | null
  compensation_amount: number | null
  participants_needed: number | null
  is_open: boolean
  created_at: string
}

const COMPENSATION_TYPES = [
  { value: 'money', label: 'Money' },
  { value: 'food', label: 'Food' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None' },
] as const

type CompensationType = 'food' | 'money' | 'both' | 'none'

interface FormState {
  title: string
  description: string
  registration_link: string
  compensation_type: CompensationType
  compensation_details: string
  compensation_amount: string
  participants_needed: string
}

const emptyForm: FormState = {
  title: '',
  description: '',
  registration_link: '',
  compensation_type: 'none',
  compensation_details: '',
  compensation_amount: '',
  participants_needed: '',
}

function postToFormState(post: ResearchPost): FormState {
  return {
    title: post.title,
    description: post.description,
    registration_link: post.registration_link,
    compensation_type: post.compensation_type,
    compensation_details: post.compensation_details ?? '',
    compensation_amount: post.compensation_amount?.toString() ?? '',
    participants_needed: post.participants_needed?.toString() ?? '',
  }
}

export function PostStudyForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<ResearchPost | null>(null)

  useEffect(() => {
    const isOpen = isComposerOpen || !!editingPost
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isComposerOpen, editingPost])

  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [posts, setPosts] = useState<ResearchPost[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getUserResearchPosts().then((res) => {
      if (res.success && res.data) setPosts(res.data)
    })
  }, [])

  function handleChange(field: keyof FormState, isEdit = false) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (isEdit) {
        setEditForm((prev) => ({ ...prev, [field]: e.target.value }))
        setEditError(null)
      } else {
        setForm((prev) => ({ ...prev, [field]: e.target.value }))
        setError(null)
      }
      setSuccess(null)
    }
  }

  function handleSubmit() {
    setSuccess(null)
    setError(null)

    const input: CreateResearchPostInput = {
      title: form.title,
      description: form.description,
      registration_link: form.registration_link,
      compensation_type: form.compensation_type,
      compensation_details: form.compensation_details || null,
      compensation_amount: form.compensation_amount ? parseInt(form.compensation_amount, 10) : null,
      participants_needed: parseInt(form.participants_needed, 10) || 0,
    }

    startTransition(async () => {
      const result = await createResearchPost(input)
      if (result.success) {
        setSuccess('Study posted successfully!')
        setForm(emptyForm)
        setIsComposerOpen(false)
        const postsResult = await getUserResearchPosts()
        if (postsResult.success && postsResult.data) setPosts(postsResult.data)
        router.refresh()
      } else {
        setError(result.error || 'Failed to create post')
      }
    })
  }

  function handleEditSubmit() {
    if (!editingPost) return
    setEditError(null)

    const input = {
      title: editForm.title,
      description: editForm.description,
      registration_link: editForm.registration_link,
      compensation_type: editForm.compensation_type,
      compensation_details: editForm.compensation_details || null,
      compensation_amount: editForm.compensation_amount ? parseInt(editForm.compensation_amount, 10) : null,
      participants_needed: parseInt(editForm.participants_needed, 10) || 0,
    }

    startTransition(async () => {
      const result = await updateResearchPost(editingPost.id, input)
      if (result.success) {
        setSuccess('Study updated successfully!')
        setEditingPost(null)
        const postsResult = await getUserResearchPosts()
        if (postsResult.success && postsResult.data) setPosts(postsResult.data)
        router.refresh()
      } else {
        setEditError(result.error || 'Failed to update post')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteResearchPost(id)
      if (result.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
      }
    })
  }

  function handleToggle(id: string, currentOpen: boolean) {
    startTransition(async () => {
      const result = await togglePostStatus(id, !currentOpen)
      if (result.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_open: !currentOpen } : p))
        )
      }
    })
  }

  function openEdit(post: ResearchPost) {
    setEditingPost(post)
    setEditForm(postToFormState(post))
    setEditError(null)
  }

  const showAmount = form.compensation_type === 'money' || form.compensation_type === 'both'
  const showEditAmount = editForm.compensation_type === 'money' || editForm.compensation_type === 'both'

  const filteredPosts = searchQuery
    ? posts.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts

  // Reusable form fields renderer
  function renderFormFields(
    f: FormState,
    onChange: (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void,
    showAmt: boolean
  ) {
    return (
      <div className="px-6 py-5 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Study Title</Label>
          <Input value={f.title} onChange={onChange('title')} disabled={isPending}
            placeholder="e.g. Survey on Student Mental Health"
            className="rounded-xl border-gray-200 focus-visible:ring-[#132660]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Description</Label>
          <textarea value={f.description} onChange={onChange('description')} disabled={isPending}
            placeholder="Describe your study, eligibility criteria, and what participants will do..."
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#132660]/50 focus-visible:border-[#132660] disabled:opacity-50 resize-none" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Registration Link</Label>
          <Input type="url" value={f.registration_link} onChange={onChange('registration_link')} disabled={isPending}
            placeholder="https://forms.google.com/..."
            className="rounded-xl border-gray-200 focus-visible:ring-[#132660]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Compensation</Label>
            <select value={f.compensation_type} onChange={onChange('compensation_type')} disabled={isPending}
              className="w-full h-9 rounded-xl border border-gray-200 px-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#132660]/50 focus-visible:border-[#132660] disabled:opacity-50">
              {COMPENSATION_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Participants needed</Label>
            <Input type="number" min={1} value={f.participants_needed} onChange={onChange('participants_needed')}
              disabled={isPending} placeholder="e.g. 50"
              className="rounded-xl border-gray-200 focus-visible:ring-[#132660]" />
          </div>
        </div>
        {showAmt && (
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Amount per participant</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none select-none">&#8369;</span>
              <Input type="number" min={0} value={f.compensation_amount} onChange={onChange('compensation_amount')}
                disabled={isPending} placeholder="0"
                className="rounded-xl border-gray-200 focus-visible:ring-[#132660] pl-8" />
            </div>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Compensation Details <span className="text-gray-300">(optional)</span></Label>
          <Input value={f.compensation_details} onChange={onChange('compensation_details')} disabled={isPending}
            placeholder="e.g. Free lunch after the session"
            className="rounded-xl border-gray-200 focus-visible:ring-[#132660]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your studies..."
            className="rounded-full border-gray-200 pl-9 focus-visible:ring-[#132660]" />
        </div>
        <Button type="button" onClick={() => setIsComposerOpen(true)}
          className="rounded-full px-5 bg-[#132660] text-white hover:bg-[#a5c4d4] transition-colors duration-200 font-semibold shrink-0">
          <PenLine className="w-4 h-4 mr-1.5" />
          Post Study
        </Button>
      </div>

      {/* Post modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsComposerOpen(false); setForm(emptyForm); setError(null) } }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-[#132660]">Post Study</h3>
              <button type="button" onClick={() => { setIsComposerOpen(false); setForm(emptyForm); setError(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <div className="px-6 pt-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}
            {renderFormFields(form, (field) => handleChange(field, false), showAmount)}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <Button type="button" onClick={handleSubmit} disabled={isPending}
                className="rounded-full px-6 bg-[#132660] text-white hover:bg-[#a5c4d4] transition-colors duration-200">
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</> : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) { setEditingPost(null); setEditError(null) } }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-[#132660]">Edit Study</h3>
              <button type="button" onClick={() => { setEditingPost(null); setEditError(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {editError && (
              <div className="px-6 pt-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{editError}</AlertDescription>
                </Alert>
              </div>
            )}
            {renderFormFields(editForm, (field) => handleChange(field, true), showEditAmount)}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setEditingPost(null); setEditError(null) }}
                disabled={isPending} className="rounded-full px-5 border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </Button>
              <Button type="button" onClick={handleEditSubmit} disabled={isPending}
                className="rounded-full px-6 bg-[#132660] text-white hover:bg-[#a5c4d4] transition-colors duration-200">
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Timeline */}
      {filteredPosts.length > 0 && (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <TimelineCard key={post.id} post={post}
              onDelete={handleDelete} onToggle={handleToggle}
              onEdit={openEdit} disabled={isPending} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {searchQuery ? (
            <><Search className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No studies match &ldquo;{searchQuery}&rdquo;</p></>
          ) : (
            <><PenLine className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No studies posted yet. Create your first one above!</p></>
          )}
        </div>
      )}
    </div>
  )
}

function TimelineCard({
  post, onDelete, onToggle, onEdit, disabled,
}: {
  post: ResearchPost
  onDelete: (id: string) => void
  onToggle: (id: string, isOpen: boolean) => void
  onEdit: (post: ResearchPost) => void
  disabled: boolean
}) {
  const timeAgo = formatRelativeTime(new Date(post.created_at))
  const compensationLabel =
    post.compensation_type === 'none'
      ? 'No compensation'
      : post.compensation_type.charAt(0).toUpperCase() + post.compensation_type.slice(1)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-[#132660] text-[15px]">{post.title}</h4>
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              post.is_open ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}>
              {post.is_open ? 'Open' : 'Closed'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" /><span>{timeAgo}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={() => onEdit(post)} disabled={disabled}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-50"
            title="Edit study">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onToggle(post.id, post.is_open)} disabled={disabled}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-50"
            title={post.is_open ? 'Close study' : 'Open study'}>
            {post.is_open ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button type="button" onClick={() => onDelete(post.id)} disabled={disabled}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete study">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="px-5 pb-3">
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-4">{post.description}</p>
      </div>
      <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-gray-500">
          <span className="bg-white border border-gray-200 rounded-full px-2.5 py-0.5">{compensationLabel}</span>
        </span>
        {post.compensation_amount != null && post.compensation_amount > 0 && (
          <span className="bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2.5 py-0.5 font-medium">
            &#8369;{post.compensation_amount.toLocaleString()}
          </span>
        )}
        {post.participants_needed != null && (
          <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-2.5 py-0.5">
            <Users className="w-3 h-3" />{post.participants_needed}
          </span>
        )}
        <a href={post.registration_link} target="_blank" rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[#132660] hover:underline font-medium">
          Registration<ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}