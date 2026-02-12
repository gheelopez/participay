import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; error: string }

export async function checkRateLimit(
  endpoint: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : (headersList.get('x-real-ip') ?? '127.0.0.1')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_ip: ip,
    p_endpoint: endpoint,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    // Fail open — don't block users if the rate limit check itself errors
    console.error('Rate limit check failed:', error)
    return { allowed: true }
  }

  if (!data) {
    return { allowed: false, error: 'Too many requests. Please try again later.' }
  }

  return { allowed: true }
}
