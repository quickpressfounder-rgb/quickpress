/**
 * QuickPress Application Error Reporting & Diagnostics
 */

export interface ErrorReportOptions {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
}

export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  const stack = error instanceof Error ? error.stack : undefined;

  // Log to standard diagnostics console
  console.error("[QuickPress Error Boundary]", {
    message,
    stack,
    context,
    route: window.location.pathname,
    timestamp: new Date().toISOString(),
  });
}

// Backward-compatible alias
export const reportLovableError = reportAppError;
