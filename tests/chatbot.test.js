import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('exports públicos', () => {
  it('debe exportar createChatbot, OllamaProvider, FileResourceProvider, MemorySessionProvider, FileSessionProvider', async () => {
    const mod = await import('../src/index.js');
    assert.equal(typeof mod.createChatbot, 'function');
    assert.equal(typeof mod.OllamaProvider, 'function');
    assert.equal(typeof mod.FileResourceProvider, 'function');
    assert.equal(typeof mod.MemorySessionProvider, 'function');
    assert.equal(typeof mod.FileSessionProvider, 'function');
  });
});

describe('createChatbot', () => {
  it('debe crear sesión cuando no se envía sessionId', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const llmProvider = { generate: mock.fn(() => 'respuesta') };
    const resourceProvider = {
      loadResources: mock.fn(() => 'recursos'),
      loadSystemPrompt: mock.fn(() => 'system prompt')
    };
    const sessionProvider = {
      createSession: mock.fn(async (data) => ({ id: 's1', summary: '', messages: [], ...data })),
      getSession: mock.fn(() => null),
      addMessage: mock.fn(),
      saveSession: mock.fn(),
      getHistory: mock.fn(() => []),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({ llmProvider, resourceProvider, sessionProvider });
    const result = await chatbot.sendMessage({ message: 'Hola' });

    assert.equal(result.sessionId, 's1');
    assert.equal(result.answer, 'respuesta');
    assert.equal(sessionProvider.createSession.mock.callCount(), 1);
  });

  it('debe reutilizar sesión cuando se envía sessionId', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const existingSession = { id: 's1', summary: '', messages: [] };
    const llmProvider = {
      generate: mock.fn(({ prompt }) => prompt?.startsWith('Resume la conversacion')
        ? 'Resumen semantico actualizado'
        : 'respuesta')
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(),
      getSession: mock.fn(async () => existingSession),
      addMessage: mock.fn(),
      saveSession: mock.fn(),
      getHistory: mock.fn(() => []),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({ llmProvider, resourceProvider, sessionProvider });
    const result = await chatbot.sendMessage({ message: 'Hola', sessionId: 's1' });

    assert.equal(result.sessionId, 's1');
    assert.equal(sessionProvider.getSession.mock.callCount(), 1);
    assert.equal(sessionProvider.createSession.mock.callCount(), 0);
  });

  it('debe guardar mensaje del usuario y respuesta del asistente', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const messages = [];
    const llmProvider = { generate: mock.fn(() => 'respuesta') };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(async (data) => ({ id: 's1', summary: '', messages: [], ...data })),
      getSession: mock.fn(() => null),
      addMessage: mock.fn(async (id, msg) => { messages.push(msg); }),
      saveSession: mock.fn(),
      getHistory: mock.fn(() => messages),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({ llmProvider, resourceProvider, sessionProvider });
    await chatbot.sendMessage({ message: 'Hola' });

    assert.equal(sessionProvider.addMessage.mock.callCount(), 2);
    assert.equal(messages[0].role, 'user');
    assert.equal(messages[0].content, 'Hola');
    assert.equal(messages[1].role, 'assistant');
    assert.equal(messages[1].content, 'respuesta');
  });

  it('debe guardar el mensaje del usuario aunque falle el LLM', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const messages = [];
    const llmProvider = { generate: mock.fn(async () => { throw new Error('LLM caído'); }) };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(async (data) => ({ id: 's1', summary: '', messages: [], ...data })),
      getSession: mock.fn(() => null),
      addMessage: mock.fn(async (id, msg) => { messages.push(msg); }),
      saveSession: mock.fn(),
      getHistory: mock.fn(() => messages),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({ llmProvider, resourceProvider, sessionProvider });

    await assert.rejects(() => chatbot.sendMessage({ message: 'Hola' }), /LLM caído/);
    assert.equal(sessionProvider.addMessage.mock.callCount(), 1);
    assert.equal(messages[0].role, 'user');
    assert.equal(messages[0].content, 'Hola');
  });

  it('debe devolver { sessionId, answer }', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const llmProvider = { generate: mock.fn(() => 'respuesta') };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(async () => ({ id: 's1', summary: '', messages: [] })),
      getSession: mock.fn(() => null),
      addMessage: mock.fn(),
      saveSession: mock.fn(),
      getHistory: mock.fn(() => []),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({ llmProvider, resourceProvider, sessionProvider });
    const result = await chatbot.sendMessage({ message: 'Hola' });

    assert.ok(result.sessionId);
    assert.ok(result.answer);
    assert.equal(Object.keys(result).length, 2);
  });

  it('debe validar mensaje requerido', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const { MessageRequiredError } = await import('../src/errors/chatbot.js');
    const llmProvider = { generate: mock.fn() };
    const resourceProvider = { loadResources: mock.fn(), loadSystemPrompt: mock.fn() };
    const sessionProvider = {
      createSession: mock.fn(), getSession: mock.fn(), addMessage: mock.fn(),
      saveSession: mock.fn(), getHistory: mock.fn(), getSummary: mock.fn(), updateSummary: mock.fn()
    };

    const chatbot = createChatbot({ llmProvider, resourceProvider, sessionProvider });
    await assert.rejects(() => chatbot.sendMessage({}), MessageRequiredError);
  });

  it('debe validar longitud máxima de mensaje', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const { MessageTooLongError } = await import('../src/errors/chatbot.js');
    const llmProvider = { generate: mock.fn() };
    const resourceProvider = { loadResources: mock.fn(), loadSystemPrompt: mock.fn() };
    const sessionProvider = {
      createSession: mock.fn(), getSession: mock.fn(), addMessage: mock.fn(),
      saveSession: mock.fn(), getHistory: mock.fn(), getSummary: mock.fn(), updateSummary: mock.fn()
    };

    const chatbot = createChatbot({
      llmProvider, resourceProvider, sessionProvider,
      maxMessageLength: 5
    });
    await assert.rejects(() => chatbot.sendMessage({ message: 'mensaje muy largo' }), MessageTooLongError);
  });

  it('debe compactar historial cuando supera maxHistoryMessages', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const initialMessages = [];
    for (let i = 0; i < 12; i++) {
      initialMessages.push({ role: 'user', content: `msg${i}`, createdAt: new Date().toISOString() });
      initialMessages.push({ role: 'assistant', content: `res${i}`, createdAt: new Date().toISOString() });
    }

    let sessionData = { id: 's1', summary: '', messages: [...initialMessages] };
    const llmProvider = {
      generate: mock.fn(({ prompt }) => prompt?.startsWith('Resume la conversacion')
        ? 'Resumen semantico actualizado'
        : 'respuesta')
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(async () => sessionData),
      getSession: mock.fn(() => null),
      addMessage: mock.fn(async (id, msg) => { sessionData.messages.push(msg); }),
      saveSession: mock.fn(async (session) => { sessionData = session; }),
      getHistory: mock.fn(() => initialMessages),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({
      llmProvider, resourceProvider, sessionProvider,
      maxHistoryMessages: 10
    });

    await chatbot.sendMessage({ message: 'otro' });
    assert.ok(sessionData);
    assert.ok(sessionData.messages.length < 26);
    assert.equal(sessionData.summary, 'Resumen semantico actualizado');
    assert.equal(llmProvider.generate.mock.callCount(), 2);
    assert.match(llmProvider.generate.mock.calls[1].arguments[0].prompt, /Mensajes a incorporar:/);
  });

  it('debe compactar historial al llegar a maxHistoryMessages', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const initialMessages = [];
    for (let i = 0; i < 4; i++) {
      initialMessages.push({ role: 'user', content: `msg${i}`, createdAt: new Date().toISOString() });
      initialMessages.push({ role: 'assistant', content: `res${i}`, createdAt: new Date().toISOString() });
    }

    let sessionData = { id: 's1', summary: '', messages: [...initialMessages] };
    const llmProvider = {
      generate: mock.fn(({ prompt }) => prompt?.startsWith('Resume la conversacion')
        ? 'Resumen semantico actualizado'
        : 'respuesta')
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(async () => sessionData),
      getSession: mock.fn(() => sessionData),
      addMessage: mock.fn(async (id, msg) => { sessionData.messages.push(msg); }),
      saveSession: mock.fn(async (session) => { sessionData = session; }),
      getHistory: mock.fn(() => initialMessages),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({
      llmProvider, resourceProvider, sessionProvider,
      maxHistoryMessages: 10
    });

    await chatbot.sendMessage({ message: 'mensaje nuevo', sessionId: 's1' });

    assert.equal(sessionData.messages.length, 5);
    assert.equal(sessionData.summary, 'Resumen semantico actualizado');
    assert.equal(llmProvider.generate.mock.callCount(), 2);
    assert.equal(sessionData.messages.at(-1).content, 'respuesta');
  });
});
