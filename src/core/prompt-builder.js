export class PromptBuilder {
  constructor({ systemPrompt = '', summaryPrompt = '' } = {}) {
    this._systemPrompt = systemPrompt;
    this._summaryPrompt = summaryPrompt;
  }

  build({
    systemPrompt = '',
    resources = '',
    context = '',
    summary = '',
    history = [],
    message,
    tools = [],
    toolResult = null
  } = {}) {
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

    if (tools && tools.length > 0) {
      parts.push('=== TOOLS ===');
      parts.push('Tienes disponibles estas herramientas:');
      parts.push(JSON.stringify(tools, null, 2));
      parts.push('');
      parts.push('Si necesitas usar una herramienta, responde unicamente con JSON valido:');
      parts.push('{');
      parts.push('  "tool": "nombreDeTool",');
      parts.push('  "input": {}');
      parts.push('}');
      parts.push('');
      parts.push('No expliques el JSON.');
      parts.push('No uses herramientas que no esten listadas.');
      parts.push('No inventes herramientas.');
      parts.push('No uses herramientas para ejecutar acciones reales si no estan permitidas.');
      parts.push('Si no necesitas herramienta, responde normalmente.');
      parts.push('');
    }

    if (toolResult) {
      parts.push('=== RESULTADO DE TOOL ===');
      parts.push(JSON.stringify(toolResult, null, 2));
      parts.push('');
      parts.push('Usa este resultado para responder al usuario. No vuelvas a pedir otra tool.');
      parts.push('');
    }

    parts.push('=== MENSAJE DEL USUARIO ===');
    parts.push(message);

    return parts.join('\n');
  }
}
