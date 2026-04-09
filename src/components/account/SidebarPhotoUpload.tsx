'use client'

import { useRef, useTransition } from 'react'
import { Pencil, Loader2, CircleUser } from 'lucide-react'
import { updateProfilePhoto } from '@/app/actions/auth'

interface SidebarPhotoUploadProps {
  photoUrl: string | null
  onPhotoUpdated: (newUrl: string) => void
  onError: (message: string) => void
}

export function SidebarPhotoUpload({ photoUrl, onPhotoUpdated, onError }: SidebarPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_FILE_SIZE = 1 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png']

    if (file.size > MAX_FILE_SIZE) {
      onError('File must be less than 1MB')
      e.target.value = ''
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      onError('Only JPG and PNG files are allowed')
      e.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('profilePhoto', file)

    startTransition(async () => {
      const result = await updateProfilePhoto(formData)
      if (result.success && result.data) {
        const newUrl = `${result.data.photoUrl}?t=${Date.now()}`
        onPhotoUpdated(newUrl)
        window.dispatchEvent(
          new CustomEvent('profile-photo-updated', {
            detail: { photoUrl: newUrl },
          })
        )
      } else {
        onError(result.error || 'Failed to update photo')
      }
    })

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="relative w-24 h-24 mx-auto">
      {/* Circle photo */}
      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100">
        {photoUrl ? (
          <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#132660]">
            <CircleUser className="w-12 h-12" />
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      {/* Pencil button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#132660] hover:bg-[#a5c4d4] text-white flex items-center justify-center shadow transition-colors duration-200 disabled:opacity-50"
        aria-label="Change profile photo"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
