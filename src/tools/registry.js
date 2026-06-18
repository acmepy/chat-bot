import { validateTool } from './base.js';

export class ToolRegistry {
  constructor(tools = []) {
    this._tools = new Map();
    this.registerMany(tools);
  }

  register(tool) {
    validateTool(tool);

    if (this._tools.has(tool.name)) {
      throw new Error(`Tool duplicada: ${tool.name}`);
    }

    this._tools.set(tool.name, tool);
    return tool;
  }

  registerMany(tools = []) {
    if (!Array.isArray(tools)) {
      throw new Error('tools debe ser un array');
    }

    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(name) {
    return this._tools.get(name) || null;
  }

  list() {
    return Array.from(this._tools.values());
  }

  getMetadata() {
    return this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

}
