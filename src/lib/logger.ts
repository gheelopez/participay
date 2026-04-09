import fs from 'fs'
import os from 'os'
import path from 'path'
import dgram from 'dgram'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR'

export type LogCategory = 'AUTH' | 'SECURITY' | 'SYSTEM' | 'TRANSACTION' | 'ADMIN'

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

type LogMeta = Omit<LogEntry, 'timestamp' | 'level' | 'category' | 'event'>

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')

const SEVERITY_MAP: Record<LogLevel, number> = {
  INFO: 6,
  WARN: 4,
  ERROR: 3,
}

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
  } catch {
    // Silent fallback — filesystem may be read-only
  }
}

function writeToFile(message: string) {
  try {
    ensureLogDir()
    fs.appendFileSync(LOG_FILE, message + '\n', 'utf-8')
  } catch {
    // Silent fallback — do not crash if file write fails
  }
}

function sendToSyslog(level: LogLevel, message: string, timestamp: string): void {
  if (process.env.SYSLOG_ENABLED !== 'true') return

  const host = process.env.SYSLOG_HOST
  if (!host) return

  const port = parseInt(process.env.SYSLOG_PORT || '514', 10)
  const appName = process.env.SYSLOG_APP_NAME || 'participay'

  try {
    const facility = 1 // user-level
    const severity = SEVERITY_MAP[level]
    const priority = facility * 8 + severity
    const hostname = os.hostname()
    const pid = process.pid

    const syslogMessage = `<${priority}>1 ${timestamp} ${hostname} ${appName} ${pid} - - ${message}`
    const buffer = Buffer.from(syslogMessage)

    const client = dgram.createSocket('udp4')
    client.send(buffer, 0, buffer.length, port, host, () => {
      client.close()
    })
  } catch {
    // Silently swallow all syslog errors
  }
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

function writeLog(
  level: LogLevel,
  category: LogCategory,
  event: string,
  meta?: LogMeta
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    event,
    ...meta,
  }

  const message = formatEntry(entry)

  writeToFile(message)

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

  sendToSyslog(level, `[${category}] ${event}`, entry.timestamp)
}

// Legacy functional API — used by src/lib/error-handler.ts
export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata?: Record<string, unknown>
): void {
  writeLog(level, category, message, metadata ? { details: metadata } : undefined)
}

export const logger = {
  info: (category: LogCategory, event: string, meta?: LogMeta) =>
    writeLog('INFO', category, event, meta),
  warn: (category: LogCategory, event: string, meta?: LogMeta) =>
    writeLog('WARN', category, event, meta),
  error: (category: LogCategory, event: string, meta?: LogMeta) =>
    writeLog('ERROR', category, event, meta),
}
