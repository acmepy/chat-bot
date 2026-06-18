export function defineTool(tool) {
  validateTool(tool);
  return tool;
}

export function validateTool(tool) {
  if (!tool || typeof tool !== 'object') {
    throw new Error('Tool invalida');
  }
  if (!tool.name || typeof tool.name !== 'string') {
    throw new Error('Tool invalida: name es requerido');
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
    throw new Error(`Tool invalida: nombre no permitido ${tool.name}`);
  }
  if (!tool.description || typeof tool.description !== 'string') {
    throw new Error(`Tool invalida: description es requerido para ${tool.name}`);
  }
  if (!tool.parameters || typeof tool.parameters !== 'object') {
    throw new Error(`Tool invalida: parameters es requerido para ${tool.name}`);
  }
  if (typeof tool.execute !== 'function') {
    throw new Error(`Tool invalida: execute es requerido para ${tool.name}`);
  }
  if (tool.instructions !== undefined && typeof tool.instructions !== 'string') {
    throw new Error(`Tool invalida: instructions debe ser string para ${tool.name}`);
  }
}
