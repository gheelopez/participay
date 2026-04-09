"use client"

import { useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import { logoutUser } from "@/app/actions/auth"

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
]

interface UseIdleTimeoutOptions {
  /** Idle timeout in minutes (should match SESSION_TIMEOUT_MINUTES) */
  timeoutMinutes?: number
  /** Minutes before expiry to show warning toast */
  warningMinutes?: number
  /** Redirect path after logout */
  redirectTo?: string
}

export function useIdleTimeout({
  timeoutMinutes = 30,
  warningMinutes = 2,
  redirectTo = "/login?reason=timeout",
}: UseIdleTimeoutOptions = {}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningShownRef = useRef(false)

  const handleLogout = useCallback(async () => {
    await logoutUser()
    window.location.href = redirectTo
  }, [redirectTo])

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)

    // Dismiss warning if user became active again
    if (warningShownRef.current) {
      toast.dismiss("idle-warning")
      warningShownRef.current = false
    }

    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000

    // Set warning timer
    if (warningMinutes > 0 && warningMinutes < timeoutMinutes) {
      warningRef.current = setTimeout(() => {
        warningShownRef.current = true
        toast.warning(
          `Your session will expire in ${warningMinutes} minute${warningMinutes === 1 ? "" : "s"} due to inactivity.`,
          {
            id: "idle-warning",
            duration: warningMinutes * 60 * 1000,
          }
        )
      }, warningMs)
    }

    // Set logout timer
    timeoutRef.current = setTimeout(handleLogout, timeoutMs)
  }, [timeoutMinutes, warningMinutes, handleLogout])

  useEffect(() => {
    resetTimers()

    const onActivity = () => resetTimers()

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, onActivity, { passive: true })
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, onActivity)
      }
    }
  }, [resetTimers])
}
