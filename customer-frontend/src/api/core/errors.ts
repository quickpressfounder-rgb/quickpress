/**
 * One error type for every QuickPress API call, mock or real.
 *
 * Screens render `error.userMessage`; they never need to know whether the
 * failure came from the mock router or a live FastAPI response.
 */

export type ApiErrorKind =
  | "offline"
  | "timeout"
  | "network"
  | "http"
  | "parse"
  | "unconfigured"
  | "unauthorized"
  | "not-found"
  | "validation"
  | "conflict"
  | "cancelled";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }

  /** Copy suitable for showing in an error state. */
  get userMessage(): string {
    switch (this.kind) {
      case "offline":
        return "You're offline. Reconnect to load the latest updates.";
      case "timeout":
        return "That took too long. Please try again.";
      case "network":
        return "We couldn't reach QuickPress. Please try again.";
      case "unauthorized":
        return "Your session expired. Please sign in again.";
      case "not-found":
        return "We couldn't find that anymore.";
      case "validation":
        return this.message || "Please check the details and try again.";
      case "conflict":
        return this.message || "That action is no longer possible.";
      case "cancelled":
        return this.message || "This operation was cancelled.";
      case "http":
        return this.status && this.status >= 500
          ? "QuickPress is having a moment. Please try again."
          : "We couldn't load this right now.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Best-effort user copy for any thrown value. */
export function errorMessageOf(value: unknown): string {
  if (value instanceof ApiError) return value.userMessage;
  if (value instanceof Error && value.message) return value.message;
  return "Something went wrong. Please try again.";
}