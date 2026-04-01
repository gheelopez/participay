type LogLevel = 'INFO' | 'WARN' | 'ERROR'

type LogCategory = 'AUTH' | 'SECURITY' | 'SYSTEM'

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  event: string
  userId?: string
  email?: string
  ip?: string
  details?: Record<string, unknown>
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level}]`,
    `[${entry.category}]`,
    entry.event,
  ]
  if (entry.userId) parts.push(`user=${entry.userId}`)
  if (entry.email) parts.push(`email=${entry.email}`)
  if (entry.ip) parts.push(`ip=${entry.ip}`)
  if (entry.details) parts.push(JSON.stringify(entry.details))
  return parts.join(' ')
}

function log(
  level: LogLevel,
  category: LogCategory,
  event: string,
  meta?: Omit<LogEntry, 'timestamp' | 'level' | 'category' | 'event'>
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    event,
    ...meta,
  }

  const message = formatEntry(entry)

  switch (level) {
    case 'ERROR':
      console.error(message)
      break
    case 'WARN':
      console.warn(message)
      break
    default:
      console.log(message)
  }
}

export const logger = {
  info: (category: LogCategory, event: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'category' | 'event'>) =>
    log('INFO', category, event, meta),
  warn: (category: LogCategory, event: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'category' | 'event'>) =>
    log('WARN', category, event, meta),
  error: (category: LogCategory, event: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'category' | 'event'>) =>
    log('ERROR', category, event, meta),
}
