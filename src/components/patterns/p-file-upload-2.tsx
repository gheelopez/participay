"use client"

import {
  formatBytes,
  useFileUpload,
  type FileWithPreview,
} from "@/hooks/use-file-upload"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { AlertCircle, Upload, ImagePlus } from "lucide-react"

interface AvatarUploadProps {
  maxSize?: number
  className?: string
  onFileChange?: (file: FileWithPreview | null) => void
  defaultAvatar?: string
}

export function AvatarUpload({
  maxSize = 5 * 1024 * 1024, // 5MB
  className,
  onFileChange,
  defaultAvatar,
}: AvatarUploadProps) {
  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize,
    accept: "image/jpeg,image/jpg,image/png",
    multiple: false,
    onFilesChange: (files) => {
      onFileChange?.(files[0] || null)
    },
  })

  const currentFile = files[0]
  const previewUrl = currentFile?.preview || defaultAvatar

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Avatar Preview */}
      <div className="relative">
        <div
          className={cn(
            "relative h-81 w-81 cursor-pointer overflow-hidden rounded-full transition-all duration-200",
            isDragging
              ? "ring-2 ring-[#132660] ring-offset-2 scale-105"
              : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-2",
            !previewUrl && "border-2 border-dashed",
            !previewUrl && isDragging
              ? "border-[#132660] bg-blue-50"
              : !previewUrl
              ? "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
              : ""
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input {...getInputProps()} className="sr-only" />

          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
              {/* Hover / drag overlay on existing photo */}
              <div className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity duration-200 bg-black/40",
                isDragging ? "opacity-100" : "opacity-0 hover:opacity-100"
              )}>
                <ImagePlus className="size-8 text-white" />
                <span className="text-xs text-white font-medium">
                  {isDragging ? "Drop to replace" : "Change photo"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
              <Upload className={cn(
                "size-10 transition-colors",
                isDragging ? "text-[#132660]" : "text-gray-400"
              )} />
              <div>
                <p className={cn(
                  "text-sm font-medium transition-colors",
                  isDragging ? "text-[#132660]" : "text-gray-500"
                )}>
                  {isDragging ? "Drop here" : "Drag photo here"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Upload Instructions */}
      <p className="text-muted-foreground text-xs text-center">
        PNG, JPG up to {formatBytes(maxSize)}
      </p>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload error</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
