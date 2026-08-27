export class ApiError extends Error {
  public statusCode: number;
  public success: boolean = false;
  public errors: unknown[];
  public data: null = null;

  constructor(statusCode: number, message = "Something went wrong", errors: unknown[] = [], stack?: string) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    if (stack) this.stack = stack;
    else Error.captureStackTrace(this, this.constructor);
  }
}
