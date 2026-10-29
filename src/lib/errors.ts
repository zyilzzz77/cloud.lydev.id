export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "GONE"
  | "CONFLICT"
  | "ACCOUNT_EXISTS"
  | "EMAIL_UNVERIFIED"
  | "INVALID_CODE"
  | "CODE_EXPIRED"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "PLAN_LIMIT_REACHED"
  | "TRANSFER_LIMIT_REACHED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "INVALID_FILENAME"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_NOT_REQUIRED"
  | "INVALID_PASSWORD"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
