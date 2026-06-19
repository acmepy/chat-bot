import { LlmProviderError } from '../../errors/chatbot.js';

export class OllamaProvider {
  constructor({ baseUrl = 'http://127.0.0.1:11434', model = 'gemma4', keepAlive = '30m' } = {}) {
    this._baseUrl = baseUrl.replace(/\/+$/, '');
    this._model = model;
    this._keepAlive = keepAlive;
  }

  async generate({ prompt, systemPrompt, resources, context, summary, history, message, options } = {}) {
    const finalPrompt = prompt || this._buildPrompt({
      systemPrompt,
      resources,
      context,
      summary,
      history,
      message
    });

    const url = `${this._baseUrl}/api/generate`;
    const request = {
      model: this._model,
      prompt: finalPrompt,
      stream: false,
      keep_alive: this._keepAlive,
      options: {
        temperature: options?.temperature ?? 0,
        stop: ['\nuser:', '\nusuario:', '\nUsuario:', '\nassistant:', '\nAsistente:']
      }
    };

    if (options?.format) {
      request.format = options.format;
    }

    const body = JSON.stringify(request);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
    } catch (err) {
      throw new LlmProviderError({ message: `Error de conexion con Ollama: ${err.message}` });
    }

    if (!response.ok) {
      throw new LlmProviderError({ message: `Ollama respondio con status ${response.status}` });
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new LlmProviderError({ message: `Respuesta invalida de Ollama: ${err.message}` });
    }

    if (!data.response) {
      throw new LlmProviderError({ message: 'Ollama no devolvio respuesta' });
    }

    return data.response.trim();
  }

  _buildPrompt({ systemPrompt, resources, context, summary, history, message } = {}) {
    const promptParts = [];

    promptParts.push(systemPrompt || '');

    if (resources) {
      promptParts.push('');
      promptParts.push('Recursos disponibles:');
      promptParts.push(resources);
    }

    if (context) {
      promptParts.push('');
      promptParts.push('Contexto: ' + (typeof context === 'string' ? context : JSON.stringify(context)));
    }

    if (summary) {
      promptParts.push('');
      promptParts.push('Resumen: ' + summary);
    }

    if (history && history.length > 0) {
      promptParts.push('');
      for (const msg of history) {
        promptParts.push(`${msg.role}: ${msg.content}`);
      }
    }

    promptParts.push('');
    promptParts.push(`user: ${message}`);
    promptParts.push('assistant:');

    return promptParts.join('\n');
  }
}
