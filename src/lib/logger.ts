import fs from "fs";
import os from "os";
import path from "path";
import dgram from "dgram";

export type LogLevel = "INFO" | "WARN" | "ERROR";
export type LogCategory = "AUTH" | "TRANSACTION" | "ADMIN";

const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

const SEVERITY_MAP: Record<LogLevel, number> = {
  INFO: 6,
  WARN: 4,
  ERROR: 3,
};

function formatMetadata(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" ");
}

function sendToSyslog(
  level: LogLevel,
  message: string,
  timestamp: string
): void {
  const enabled = process.env.SYSLOG_ENABLED === "true";
  if (!enabled) return;

  const host = process.env.SYSLOG_HOST;
  const port = parseInt(process.env.SYSLOG_PORT || "514", 10);
  const appName = process.env.SYSLOG_APP_NAME || "participay";

  if (!host) return;

  try {
    const facility = 1; // user-level
    const severity = SEVERITY_MAP[level];
    const priority = facility * 8 + severity;
    const hostname = os.hostname();
    const pid = process.pid;

    const syslogMessage = `<${priority}>1 ${timestamp} ${hostname} ${appName} ${pid} - - ${message}`;
    const buffer = Buffer.from(syslogMessage);

    const client = dgram.createSocket("udp4");
    client.send(buffer, 0, buffer.length, port, host, () => {
      client.close();
    });
  } catch {
    // Silently swallow all syslog errors
  }
}

export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const metaString = metadata ? ` — ${formatMetadata(metadata)}` : "";
  const logLine = `[${timestamp}] [${level}] [${category}] ${message}${metaString}\n`;

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, logLine);
  } catch {
    console.error(logLine);
  }

  sendToSyslog(level, `[${category}] ${message}${metaString}`, timestamp);
}
