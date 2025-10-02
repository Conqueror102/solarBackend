/**
 * Custom error classes and error handling utilities
 */

export class AppError extends Error {
  statusCode: number;
  status: "fail" | "error";
  isOperational: boolean;
  code: string;

  constructor(message: string, statusCode: number, code = "SERVER_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.code = code;

    // Node-safe stack capture
    if (typeof (Error as any).captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Invalid input",
    code: keyof typeof ERROR_CODES = "VALIDATION_ERROR"
  ) {
    super(message, 400, code);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message = "Authentication failed",
    code: keyof typeof ERROR_CODES = "AUTHENTICATION_ERROR"
  ) {
    // IMPORTANT: pass the message through
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message = "Not authorized to access this resource",
    code: keyof typeof ERROR_CODES = "AUTHORIZATION_ERROR"
  ) {
    // IMPORTANT: pass the message through
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, message?: string) {
    super(message ?? `${resource} not found`, 404, "NOT_FOUND");
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, message?: string) {
    super(message ?? `${resource} already exists`, 409, "DUPLICATE_ERROR");
  }
}

/** Safe, client-facing messages that don’t leak internals */
export const SAFE_ERROR_MESSAGES = {
  USER_NOT_FOUND: "Invalid credentials",
  INVALID_PASSWORD: "Invalid credentials",
  EMAIL_IN_USE: "Unable to create account with these credentials",
  INVALID_TOKEN: "Your session has expired, please log in again",
  SERVER_ERROR: "An unexpected error occurred",
  VALIDATION_FAILED: "The provided data is invalid",
  ACCOUNT_LOCKED: "Account access temporarily restricted",
  PASSWORD_EXPIRED: "Password update required",
  INVALID_2FA: "Invalid authentication code",
  EMAIL_NOT_VERIFIED: "Please verify your email to continue",
} as const;

/** Stable, machine-readable error codes */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_ERROR: "DUPLICATE_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  PASSWORD_EXPIRED: "PASSWORD_EXPIRED",
  INVALID_2FA: "INVALID_2FA",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
