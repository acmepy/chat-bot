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
      parts.push('Tienes herramientas disponibles y puedes usarlas para responder la consulta del usuario.');
      parts.push('Las herramientas registradas son parte de la informacion disponible.');
      parts.push('Herramientas disponibles:');
      parts.push(JSON.stringify(tools, null, 2));
      parts.push('');
      parts.push('Si una herramienta corresponde a la consulta, responde unicamente con JSON valido para solicitar su ejecucion:');
      parts.push('{');
      parts.push('  "tool": "nombreDeTool",');
      parts.push('  "input": {}');
      parts.push('}');
      parts.push('');
      parts.push('No expliques el JSON.');
      parts.push('No uses herramientas que no esten listadas.');
      parts.push('No inventes herramientas.');
      parts.push('No uses herramientas para ejecutar acciones reales si no estan permitidas.');
      parts.push('Antes de responder desde recursos o decir que no tienes informacion, revisa si alguna herramienta listada puede responder la consulta.');
      parts.push('Si una herramienta listada corresponde a la consulta del usuario, debes pedir esa herramienta con JSON.');
      parts.push('Cuando uses una herramienta, incluye el mensaje original del usuario en input.query salvo que la herramienta indique otro formato obligatorio.');
      for (const tool of tools) {
        if (tool.instructions) {
          parts.push(`${tool.name}: ${tool.instructions}`);
        }
      }
      parts.push('Si no necesitas herramienta, responde normalmente.');
      parts.push('');
    }

    if (toolResult) {
      parts.push('=== RESULTADO DE TOOL ===');
      parts.push(JSON.stringify(toolResult, null, 2));
      parts.push('');
      parts.push('Si el resultado contiene data.answer, responde exactamente ese texto y no agregues explicaciones.');
      parts.push('Usa este resultado para responder al usuario. No vuelvas a pedir otra tool.');
      parts.push('');
    }

    parts.push('=== MENSAJE DEL USUARIO ===');
    parts.push(message);

    return parts.join('\n');
  }

  buildToolSelection({
    systemPrompt = '',
    resources = '',
    context = '',
    summary = '',
    history = [],
    message,
    tools = []
  } = {}) {
    const parts = [];

    parts.push(systemPrompt || this._systemPrompt || 'Eres un asistente del sistema.');
    parts.push('');
    parts.push('=== SELECCION DE TOOL ===');
    parts.push('Tu tarea es decidir si corresponde usar una herramienta registrada para responder el mensaje del usuario.');
    parts.push('Las herramientas registradas son parte de la informacion disponible.');
    parts.push('Si una herramienta corresponde, responde solo JSON valido con el nombre de la herramienta y el input.');
    parts.push('Si ninguna herramienta corresponde, responde solo JSON valido con tool en null.');
    parts.push('');
    parts.push('Formato cuando corresponde una herramienta:');
    parts.push('{');
    parts.push('  "tool": "nombreDeTool",');
    parts.push('  "input": { "query": "mensaje original del usuario" }');
    parts.push('}');
    parts.push('');
    parts.push('Formato cuando no corresponde ninguna herramienta:');
    parts.push('{');
    parts.push('  "tool": null,');
    parts.push('  "input": {}');
    parts.push('}');
    parts.push('');
    parts.push('No expliques el JSON. No uses markdown. No respondas al usuario en este paso.');
    parts.push('No uses herramientas que no esten listadas. No inventes herramientas.');
    parts.push('');
    parts.push('Herramientas disponibles:');
    parts.push(JSON.stringify(tools, null, 2));
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
