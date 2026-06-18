import { BaseSessionProvider } from './base.js';
import { SessionProviderError } from '../../errors/chatbot.js';

export class MemorySessionProvider extends BaseSessionProvider {
  constructor() {
    super();
    this._sessions = new Map();
  }

  async getSession(id) {
    return this._sessions.get(id) || null;
  }

  async getAllSessions() {
    return Array.from(this._sessions.values());
  }

  async saveSession(session) {
    if (!session || !session.id) {
      throw new SessionProviderError({ message: 'La sesión debe tener un id' });
    }
    session.updatedAt = new Date().toISOString();
    this._sessions.set(session.id, session);
  }

  async deleteSession(id) {
    this._sessions.delete(id);
  }
}
