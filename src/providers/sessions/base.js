import crypto from 'crypto';
import { SessionProviderError } from '../../errors/chatbot.js';

export class BaseSessionProvider {
  async _buildSession(data = {}) {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    return {
      id,
      summary: '',
      messages: [],
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
      expiresAt: data.expiresAt || null
    };
  }

  async _getSessionOrThrow(id) {
    const session = await this.getSession(id);
    if (!session) {
      throw new SessionProviderError({ message: `Sesión no encontrada: ${id}` });
    }
    return session;
  }

  async createSession(data = {}) {
    const session = await this._buildSession(data);
    await this.saveSession(session);
    return session;
  }

  async addMessage(id, message) {
    const session = await this._getSessionOrThrow(id);
    session.messages.push(message);
    await this.saveSession(session);
  }

  async getHistory(id) {
    const session = await this._getSessionOrThrow(id);
    return session.messages;
  }

  async getSummary(id) {
    const session = await this._getSessionOrThrow(id);
    return session.summary || null;
  }

  async updateSummary(id, summary) {
    const session = await this._getSessionOrThrow(id);
    session.summary = summary;
    await this.saveSession(session);
  }
}
