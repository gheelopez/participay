import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { logger } from '@/lib/logger'

const SESSION_TIMEOUT_MINUTES = parseInt(
  process.env.SESSION_TIMEOUT_MINUTES || '30',
  10
)
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000
const LAST_ACTIVITY_COOKIE = 'last_activity'

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

  // Idle session timeout — cookie-based
  if (user) {
    const now = Date.now()
    const lastActivityRaw = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value
    const lastActivity = lastActivityRaw ? parseInt(lastActivityRaw, 10) : NaN

    if (!Number.isNaN(lastActivity) && now - lastActivity > SESSION_TIMEOUT_MS) {
      logger.info('AUTH', 'session_timeout', { userId: user.id })
      await supabase.auth.signOut()
      const redirectResponse = NextResponse.redirect(
        new URL('/login?reason=timeout', request.url)
      )
      redirectResponse.cookies.delete(LAST_ACTIVITY_COOKIE)
      return redirectResponse
    }

    // Refresh last_activity cookie on every request
    response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TIMEOUT_MINUTES * 60 * 2,
    })
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect unauthenticated users away from protected pages
  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/account'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // For authenticated users: check ban status + admin role (single query)
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .single()

    const profile = data as { role: 'user' | 'admin'; is_banned: boolean } | null

    // Ban enforcement — immediately sign out banned users
    if (profile?.is_banned) {
      logger.warn('SECURITY', 'banned_user_blocked', { userId: user.id })
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL('/login', request.url)
      )
    }

    // Protect /admin routes — only allow users with role = 'admin'
    if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
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
