'use server'

import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

const LOG_FILE = path.join(process.cwd(), 'logs', 'app.log')

/**
 * Read the last N lines from logs/app.log.
 * Admin-only. Logs the ADMIN logs-viewed event.
 */
export async function getRecentLogs(lines: number = 200): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as any)?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: admin access required' }
    }

    // Log the logs-viewed event
    logger.info('ADMIN', 'logs_viewed', { userId: user.id })

    // Read log file
    if (!fs.existsSync(LOG_FILE)) {
      return { success: true, data: 'No log file found. Logs will appear here once events are generated.' }
    }

    const content = fs.readFileSync(LOG_FILE, 'utf-8')
    const allLines = content.split('\n').filter((line) => line.trim() !== '')

    // Return last N lines
    const lastLines = allLines.slice(-lines).join('\n')

    return { success: true, data: lastLines || 'Log file is empty.' }
  } catch (error) {
    logger.error('ADMIN', 'logs_read_error', { details: { error: String(error) } })
    return { success: false, error: 'Failed to read log file' }
  }
}
