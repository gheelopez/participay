"use client"

import { useIdleTimeout } from "@/hooks/useIdleTimeout"

const TIMEOUT_MINUTES = parseInt(
  process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || "30",
  10
)

export function SessionManager() {
  useIdleTimeout({
    timeoutMinutes: TIMEOUT_MINUTES,
    warningMinutes: 2,
  })

  return null
}
