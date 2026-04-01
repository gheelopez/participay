import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

const SESSION_TIMEOUT_MINUTES = parseInt(
  process.env.SESSION_TIMEOUT_MINUTES || '30',
  10
)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Update session first
  const response = await updateSession(request)

  // Create Supabase client to check auth status
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Not needed for read-only operations
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  // Session timeout check
  if (user && session?.expires_at) {
    const now = Date.now()
    const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000
    // Supabase default expiry is 1hr from issue, so issued_at ≈ expires_at - 3600
    const issuedAt = (session.expires_at - 3600) * 1000
    const sessionAge = now - issuedAt
    if (sessionAge > timeoutMs) {
      console.log(
        `[${new Date().toISOString()}] [INFO] [AUTH] session_timeout user=${user.id}`
      )
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL('/login?reason=timeout', request.url)
      )
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect unauthenticated users away from protected pages
  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/account'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect /admin routes — only allow users with role = 'admin'
  if (user && pathname.startsWith('/admin')) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = data as { role: 'user' | 'admin' } | null

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}