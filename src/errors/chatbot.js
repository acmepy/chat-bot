import { AppError } from './app.js';

export class ChatbotError extends AppError {
  constructor(opts = {}) {
    super({ status: 500, code: 'CHATBOT_ERROR', ...opts });
  }
}

export class MessageRequiredError extends ChatbotError {
  constructor() {
    super({ message: 'El mensaje es requerido', code: 'MESSAGE_REQUIRED', status: 400 });
  }
}

export class MessageTooLongError extends ChatbotError {
  constructor({ maxLength } = {}) {
    super({ message: `El mensaje supera la longitud máxima de ${maxLength} caracteres`, code: 'MESSAGE_TOO_LONG', status: 400 });
  }
}

export class SessionNotFoundError extends ChatbotError {
  constructor({ id } = {}) {
    super({ message: `Sesión no encontrada: ${id}`, code: 'SESSION_NOT_FOUND', status: 404 });
  }
}

export class LlmProviderError extends ChatbotError {
  constructor(opts = {}) {
    super({ code: 'LLM_PROVIDER_ERROR', status: 502, ...opts });
  }
}

export class ResourceProviderError extends ChatbotError {
  constructor(opts = {}) {
    super({ code: 'RESOURCE_PROVIDER_ERROR', status: 500, ...opts });
  }
}

export class SessionProviderError extends ChatbotError {
  constructor(opts = {}) {
    super({ code: 'SESSION_PROVIDER_ERROR', status: 500, ...opts });
  }
}
