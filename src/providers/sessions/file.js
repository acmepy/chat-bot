import fs from 'fs/promises';
import path from 'path';
import { BaseSessionProvider } from './base.js';
import { SessionProviderError } from '../../errors/chatbot.js';

export class FileSessionProvider extends BaseSessionProvider {
  constructor({ path: sessionsPath = './.sessions' } = {}) {
    super();
    this._basePath = path.resolve(sessionsPath);
  }

  async _ensureDir() {
    try {
      await fs.mkdir(this._basePath, { recursive: true });
    } catch (err) {
      throw new SessionProviderError({ message: `No se pudo crear el directorio de sesiones: ${err.message}` });
    }
  }

  _sanitizeId(id) {
    if (typeof id !== 'string') {
      throw new SessionProviderError({ message: 'El id debe ser un string' });
    }
    const sanitized = id.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!sanitized || sanitized !== id) {
      throw new SessionProviderError({ message: 'El id contiene caracteres no válidos' });
    }
    return sanitized;
  }

  _filePath(id) {
    const sanitized = this._sanitizeId(id);
    const resolved = path.resolve(this._basePath, `${sanitized}.json`);
    const base = path.resolve(this._basePath);
    if (!resolved.startsWith(base)) {
      throw new SessionProviderError({ message: 'Path traversal detectado' });
    }
    return resolved;
  }

  async getSession(id) {
    try {
      const filePath = this._filePath(id);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null;
      }
      if (err instanceof SessionProviderError) {
        throw err;
      }
      throw new SessionProviderError({ message: `Error al leer sesión: ${err.message}` });
    }
  }

  async getAllSessions() {
    await this._ensureDir();
    try {
      const files = await fs.readdir(this._basePath);
      const sessions = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = await fs.readFile(path.join(this._basePath, file), 'utf-8');
          sessions.push(JSON.parse(content));
        } catch {
          continue;
        }
      }
      return sessions;
    } catch (err) {
      throw new SessionProviderError({ message: `Error al listar sesiones: ${err.message}` });
    }
  }

  async saveSession(session) {
    if (!session || !session.id) {
      throw new SessionProviderError({ message: 'La sesión debe tener un id' });
    }
    await this._ensureDir();
    session.updatedAt = new Date().toISOString();
    const filePath = this._filePath(session.id);
    try {
      await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (err) {
      throw new SessionProviderError({ message: `Error al guardar sesión: ${err.message}` });
    }
  }

  async deleteSession(id) {
    const filePath = this._filePath(id);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw new SessionProviderError({ message: `Error al eliminar sesión: ${err.message}` });
    }
  }
}
