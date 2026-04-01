import { log, type LogCategory } from "@/lib/logger";

interface ErrorContext {
  category?: LogCategory;
  action?: string;
  metadata?: Record<string, unknown>;
}

export function handleError(error: unknown, context?: ErrorContext): string {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  const category = context?.category ?? "AUTH";
  const action = context?.action ?? "unknown";

  log("ERROR", category, `${action}: ${errorMessage}`, {
    ...context?.metadata,
    ...(errorStack ? { stack: errorStack } : {}),
  });

  if (process.env.DEBUG === "true") {
    return errorStack ? `${errorMessage}\n${errorStack}` : errorMessage;
  }

  return "An unexpected error occurred. Please try again.";
}
