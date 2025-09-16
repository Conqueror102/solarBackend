/**
 * Custom error classes and error handling utilities
 */

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super("Authentication failed", 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Not authorized to access this resource") {
    super("Not authorized to access this resource", 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string) {
    super(`${resource} already exists`, 409, "DUPLICATE_ERROR");
  }
}

// Safe error messages that don't leak sensitive information
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
} as const;

// Error codes for client-side handling
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
} as const;
