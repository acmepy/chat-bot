import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('OllamaProvider', () => {
  let OllamaProvider;
  let LlmProviderError;

  before(async () => {
    const mod = await import('../../../src/providers/llm/ollama.js');
    OllamaProvider = mod.OllamaProvider;
    const errors = await import('../../../src/errors/chatbot.js');
    LlmProviderError = errors.LlmProviderError;
  });

  it('debe armar request correcto a Ollama', async () => {
    let requestUrl = '';
    let requestBody = '';

    mock.method(globalThis, 'fetch', async (url, opts) => {
      requestUrl = url;
      requestBody = opts.body;
      return {
        ok: true,
        json: async () => ({ response: 'respuesta mockeada' })
      };
    });

    const provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'gemma4'
    });

    const result = await provider.generate({
      resources: 'Regla: responder desde recursos',
      message: 'Hola'
    });

    assert.equal(requestUrl, 'http://localhost:11434/api/generate');
    const parsed = JSON.parse(requestBody);
    assert.equal(parsed.model, 'gemma4');
    assert.equal(parsed.stream, false);
    assert.match(parsed.prompt, /Recursos disponibles:/);
    assert.match(parsed.prompt, /Regla: responder desde recursos/);
    assert.deepEqual(parsed.options.stop, ['\nuser:', '\nusuario:', '\nUsuario:', '\nassistant:', '\nAsistente:']);
    assert.equal(result, 'respuesta mockeada');

    mock.restoreAll();
  });

  it('debe usar prompt armado cuando se envia', async () => {
    let requestBody = '';

    mock.method(globalThis, 'fetch', async (url, opts) => {
      requestBody = opts.body;
      return {
        ok: true,
        json: async () => ({ response: 'respuesta mockeada' })
      };
    });

    const provider = new OllamaProvider({ model: 'gemma4' });
    await provider.generate({
      prompt: 'PROMPT FINAL',
      resources: 'esto no debe entrar',
      message: 'Hola'
    });

    const parsed = JSON.parse(requestBody);
    assert.equal(parsed.prompt, 'PROMPT FINAL');

    mock.restoreAll();
  });

  it('debe usar fetch nativo', async () => {
    const provider = new OllamaProvider();
    assert.ok(provider.generate);
  });

  it('no debe llamar Ollama real en test', async () => {
    mock.method(globalThis, 'fetch', async () => {
      return {
        ok: true,
        json: async () => ({ response: 'mock' })
      };
    });

    const provider = new OllamaProvider();
    const result = await provider.generate({ message: 'test' });
    assert.equal(result, 'mock');

    mock.restoreAll();
  });

  it('debe manejar errores de red', async () => {
    mock.method(globalThis, 'fetch', async () => {
      throw new Error('ECONNREFUSED');
    });

    const provider = new OllamaProvider();
    await assert.rejects(
      () => provider.generate({ message: 'test' }),
      LlmProviderError
    );

    mock.restoreAll();
  });

  it('debe manejar respuestas inválidas', async () => {
    mock.method(globalThis, 'fetch', async () => {
      return {
        ok: true,
        json: async () => ({})  // sin campo response
      };
    });

    const provider = new OllamaProvider();
    await assert.rejects(
      () => provider.generate({ message: 'test' }),
      LlmProviderError
    );

    mock.restoreAll();
  });

  it('debe manejar errores HTTP', async () => {
    mock.method(globalThis, 'fetch', async () => {
      return {
        ok: false,
        status: 500
      };
    });

    const provider = new OllamaProvider();
    await assert.rejects(
      () => provider.generate({ message: 'test' }),
      LlmProviderError
    );

    mock.restoreAll();
  });
});
