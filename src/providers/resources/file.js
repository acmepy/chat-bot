import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ResourceProviderError } from '../../errors/chatbot.js';

const SUPPORTED_EXTENSIONS = ['.md', '.json'];
const DEFAULT_SYSTEM_PROMPT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../prompts/system.md'
);

export class FileResourceProvider {
  constructor({ resourcesPath = './resources', systemPromptPath = DEFAULT_SYSTEM_PROMPT_PATH } = {}) {
    this._resourcesPath = path.resolve(resourcesPath);
    this._systemPromptPath = path.resolve(systemPromptPath);
  }

  async loadResources() {
    try {
      const entries = await fs.readdir(this._resourcesPath, { withFileTypes: true });
      const parts = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

        const filePath = path.join(this._resourcesPath, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        parts.push(content);
      }

      return parts.join('\n\n---\n\n');
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new ResourceProviderError({ message: `Directorio de recursos no encontrado: ${this._resourcesPath}` });
      }
      throw new ResourceProviderError({ message: `Error al cargar recursos: ${err.message}` });
    }
  }

  async loadSystemPrompt() {
    try {
      const content = await fs.readFile(this._systemPromptPath, 'utf-8');
      return content;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return '';
      }
      throw new ResourceProviderError({ message: `Error al cargar system prompt: ${err.message}` });
    }
  }
}
