'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  value: File | null
  onChange: (file: File | null) => void
  error?: string
}

export function FileUpload({ value, onChange, error }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are accepted'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    return null
  }

  const handleFile = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      onChange(null)
      setPreview(null)
      alert(validationError)
      return
    }

    onChange(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleRemove = () => {
    onChange(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <div className="rounded-lg border-2 border-border overflow-hidden">
            <img
              src={preview}
              alt="Profile preview"
              className="w-full h-48 object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${error ? 'border-destructive' : ''}
          `}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm font-medium mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP (max 5MB)
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
