'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error to the console in dev; server-side logs capture the rest.
    console.error(error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4] px-6 py-16">
      <div className="w-full max-w-xl bg-white rounded-4xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#132660] leading-tight">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              An unexpected error occurred. You can try again, or head back to
              the homepage.
            </p>
          </div>
        </div>

        {isDev && (
          <pre className="mt-6 max-h-64 overflow-auto rounded-2xl bg-gray-900 text-gray-100 text-xs p-4 whitespace-pre-wrap break-words">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
            {error.digest ? `\n\ndigest: ${error.digest}` : ''}
          </pre>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#132660] text-white hover:bg-[#0f1d4a] px-6"
          >
            Try again
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[#132660] text-[#132660] hover:bg-gray-50 px-6"
          >
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
