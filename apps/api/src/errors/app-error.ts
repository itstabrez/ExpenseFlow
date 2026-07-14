export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown | undefined;

  public constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  public constructor(message = "Validation failed", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class AuthenticationError extends AppError {
  public constructor(message = "Invalid credentials") {
    super(401, "AUTHENTICATION_FAILED", message);
  }
}

export class AuthorizationError extends AppError {
  public constructor(message = "You are not allowed to perform this action") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  public constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  public constructor(message = "The record has changed. Please reload and try again.") {
    super(409, "CONFLICT", message);
  }
}

export class WorkflowError extends AppError {
  public constructor(message = "This claim is no longer actionable.", code = "CLAIM_NOT_ACTIONABLE") {
    super(409, code, message);
  }
}
