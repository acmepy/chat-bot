export class PromptBuilder {
  constructor({ systemPrompt = '', summaryPrompt = '' } = {}) {
    this._systemPrompt = systemPrompt;
    this._summaryPrompt = summaryPrompt;
  }

  build({ systemPrompt = '', resources = '', context = '', summary = '', history = [], message } = {}) {
    const parts = [];

    parts.push(systemPrompt || this._systemPrompt || 'Eres un asistente del sistema.');
    parts.push('');

    if (resources) {
      parts.push('=== RECURSOS DISPONIBLES ===');
      parts.push(resources);
      parts.push('');
    }

    if (context) {
      parts.push('=== CONTEXTO EXTERNO ===');
      parts.push(typeof context === 'string' ? context : JSON.stringify(context, null, 2));
      parts.push('');
    }

    if (summary) {
      parts.push('=== RESUMEN DE LA CONVERSACION ===');
      parts.push(summary);
      parts.push('');
    }

    if (history && history.length > 0) {
      parts.push('=== HISTORIAL RECIENTE ===');
      for (const msg of history) {
        parts.push(`${msg.role}: ${msg.content}`);
      }
      parts.push('');
    }

    parts.push('=== MENSAJE DEL USUARIO ===');
    parts.push(message);

    return parts.join('\n');
  }
}
