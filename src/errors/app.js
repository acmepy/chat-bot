export class AppError extends Error {
  constructor({ message, status = 500, code = 'UNKNOWN_ERROR', errors, isOperational = true } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.isOperational = isOperational;
  }
}
