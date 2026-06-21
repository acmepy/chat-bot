import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

const customerBalances = [
  {
    customerCode: 'CLI-001',
    ruc: '80012345-6',
    name: 'Comercial San Miguel S.A.',
    currency: 'PYG',
    pendingInvoices: [
      { number: '001-001-0000123', dueDate: '2026-05-15', amount: 1250000 },
      { number: '001-001-0000124', dueDate: '2026-06-10', amount: 840000 }
    ]
  },
  {
    customerCode: 'CLI-002',
    ruc: '1234567-8',
    name: 'Cliente Demo',
    currency: 'PYG',
    pendingInvoices: [
      { number: '001-002-0000340', dueDate: '2026-05-21', amount: 320000 }
    ]
  }
];

describe('exports públicos', () => {
  it('debe exportar la API publica', async () => {
    const mod = await import('../src/index.js');
    assert.equal(typeof mod.createChatbot, 'function');
    assert.equal(typeof mod.OllamaProvider, 'function');
    assert.equal(typeof mod.FileResourceProvider, 'function');
    assert.equal(typeof mod.MemorySessionProvider, 'function');
    assert.equal(typeof mod.FileSessionProvider, 'function');
    assert.equal(typeof mod.ToolRegistry, 'function');
    assert.equal(typeof mod.ToolRunner, 'function');
    assert.equal(typeof mod.searchResourcesTool, 'object');
    assert.equal(typeof mod.getCurrentDateTool, 'object');
    assert.equal(typeof mod.createCustomerBalanceDetailTool, 'function');
    assert.equal(typeof mod.createPingHostTool, 'function');
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

  it('debe funcionar sin tools', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const llmProvider = { generate: mock.fn(() => 'respuesta sin tools') };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
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

    assert.equal(result.answer, 'respuesta sin tools');
    assert.equal(llmProvider.generate.mock.callCount(), 1);
  });

  it('debe registrar y ejecutar tools opcionales', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const tool = {
      name: 'lookup',
      description: 'Busca informacion de prueba.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: mock.fn(async () => ({ ok: true, data: { value: 'dato' } }))
    };
    const llmProvider = {
      generate: mock.fn(({ prompt }) => prompt.includes('RESULTADO DE TOOL')
        ? 'respuesta final con dato'
        : JSON.stringify({ tool: 'lookup', input: {} }))
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
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

    const chatbot = createChatbot({ llmProvider, resourceProvider, sessionProvider, tools: [tool] });
    const result = await chatbot.sendMessage({ message: 'Usa una tool' });

    assert.equal(result.answer, 'respuesta final con dato');
    assert.equal(tool.execute.mock.callCount(), 1);
    assert.equal(llmProvider.generate.mock.callCount(), 2);
  });

  it('debe responder normal cuando la seleccion de tool devuelve null', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const tool = {
      name: 'lookup',
      description: 'Busca informacion de prueba.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: mock.fn(async () => ({ ok: true, data: { value: 'dato' } }))
    };
    const llmProvider = {
      generate: mock.fn(({ prompt }) => prompt.includes('SELECCION DE TOOL')
        ? JSON.stringify({ tool: null, input: {} })
        : 'respuesta normal')
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
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

    const chatbot = createChatbot({ llmProvider, resourceProvider, sessionProvider, tools: [tool] });
    const result = await chatbot.sendMessage({ message: 'Hola' });

    assert.equal(result.answer, 'respuesta normal');
    assert.equal(tool.execute.mock.callCount(), 0);
    assert.equal(llmProvider.generate.mock.callCount(), 2);
    assert.equal(llmProvider.generate.mock.calls[0].arguments[0].options.format, 'json');
  });

  it('debe ejecutar getCurrentDate cuando el LLM solicita la tool', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const tool = {
      name: 'getCurrentDate',
      description: 'Devuelve la fecha y hora actual.',
      instructions: 'Usar para preguntas de hora.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: mock.fn(async () => ({
        ok: true,
        data: {
          now: '2026-06-18T12:00:00.000Z',
          localNow: '18/6/2026, 08:00:00 hora de Paraguay',
          timezone: 'America/Asuncion',
          answer: 'Son las 08:00 en America/Asuncion.'
        }
      }))
    };
    const llmProvider = {
      generate: mock.fn(() => '```json\n{"tool":"getCurrentDate","input":{"query":"Que hora es?"}}\n```')
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
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

    const chatbot = createChatbot({
      llmProvider,
      resourceProvider,
      sessionProvider,
      tools: [tool],
      timezone: 'America/Asuncion'
    });
    const result = await chatbot.sendMessage({ message: 'Que hora es?' });

    assert.equal(result.answer, 'Son las 08:00 en America/Asuncion.');
    assert.equal(tool.execute.mock.callCount(), 1);
    assert.deepEqual(tool.execute.mock.calls[0].arguments[0], { query: 'Que hora es?' });
    assert.equal(llmProvider.generate.mock.callCount(), 1);
  });

  it('debe ejecutar getCustomerBalanceDetail cuando el LLM solicita la tool', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const tool = {
      name: 'getCustomerBalanceDetail',
      description: 'Devuelve el detalle de saldo de un cliente.',
      instructions: 'Usar para consultas de saldo de cliente.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: mock.fn(async (input) => ({
        ok: true,
        data: {
          found: true,
          query: input.query,
          answer: 'Detalle de saldo del cliente.'
        }
      }))
    };
    const llmProvider = {
      generate: mock.fn(() => JSON.stringify({
        tool: 'getCustomerBalanceDetail',
        input: { query: 'Cuales son las facturas pendientes del RUC 80012345-6?' }
      }))
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
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

    const chatbot = createChatbot({
      llmProvider,
      resourceProvider,
      sessionProvider,
      tools: [tool]
    });
    const result = await chatbot.sendMessage({
      message: 'Cuales son las facturas pendientes del RUC 80012345-6?'
    });

    assert.equal(result.answer, 'Detalle de saldo del cliente.');
    assert.equal(tool.execute.mock.callCount(), 1);
    assert.deepEqual(tool.execute.mock.calls[0].arguments[0], {
      query: 'Cuales son las facturas pendientes del RUC 80012345-6?'
    });
    assert.equal(llmProvider.generate.mock.callCount(), 1);
  });

  it('debe responder data.answer de la tool aunque el resumen diga que no habia informacion', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const session = {
      id: 's1',
      summary: 'Saldo de CLI-002: No se tiene informacion disponible.',
      messages: []
    };
    const tool = {
      name: 'getCustomerBalanceDetail',
      description: 'Devuelve el detalle de saldo de un cliente.',
      instructions: 'Usar para consultas de saldo de cliente.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: mock.fn(async (input) => ({
        ok: true,
        data: {
          found: true,
          query: input.query,
          answer: 'Detalle de saldo de Cliente Demo.'
        }
      }))
    };
    const llmProvider = {
      generate: mock.fn(() => JSON.stringify({
        tool: 'getCustomerBalanceDetail',
        input: { query: 'cual es el saldo de CLI-002' }
      }))
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(),
      getSession: mock.fn(async () => session),
      addMessage: mock.fn(),
      saveSession: mock.fn(),
      getHistory: mock.fn(() => []),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({
      llmProvider,
      resourceProvider,
      sessionProvider,
      tools: [tool]
    });
    const result = await chatbot.sendMessage({
      message: 'cual es el saldo de CLI-002',
      sessionId: 's1'
    });

    assert.equal(result.answer, 'Detalle de saldo de Cliente Demo.');
    assert.equal(tool.execute.mock.callCount(), 1);
    assert.deepEqual(tool.execute.mock.calls[0].arguments[0], {
      query: 'cual es el saldo de CLI-002'
    });
    assert.equal(llmProvider.generate.mock.callCount(), 1);
  });

  it('debe usar la tool de saldos en una pregunta de seguimiento con codigo de cliente', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const { createCustomerBalanceDetailTool } = await import('../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers: customerBalances });
    const session = { id: 's1', summary: '', messages: [] };
    const llmProvider = {
      generate: mock.fn(() => 'No tengo esa respuesta en la informacion disponible.')
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(async () => session),
      getSession: mock.fn(async () => session),
      addMessage: mock.fn(async (id, msg) => {
        session.messages.push(msg);
      }),
      saveSession: mock.fn(),
      getHistory: mock.fn(() => []),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({
      llmProvider,
      resourceProvider,
      sessionProvider,
      tools: [getCustomerBalanceDetailTool]
    });

    await chatbot.sendMessage({
      message: 'cual es el saldo del cliente CLI-002',
      sessionId: 's1'
    });
    const result = await chatbot.sendMessage({
      message: 'y del cliente CLI-001',
      sessionId: 's1'
    });

    assert.match(result.answer, /Comercial San Miguel/);
    assert.match(result.answer, /Total pendiente/);
    assert.equal(llmProvider.generate.mock.callCount(), 0);
  });

  it('debe usar la tool de saldos aunque el resumen previo diga que no habia informacion', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const { createCustomerBalanceDetailTool } = await import('../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers: customerBalances });
    const session = {
      id: 's1',
      summary: 'Saldo de Cliente Cli-001: No disponible',
      messages: [
        { role: 'assistant', content: 'No tengo esa respuesta en la informacion disponible.' }
      ]
    };
    const llmProvider = {
      generate: mock.fn(() => 'No tengo esa respuesta en la informacion disponible.')
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
    };
    const sessionProvider = {
      createSession: mock.fn(),
      getSession: mock.fn(async () => session),
      addMessage: mock.fn(async (id, msg) => {
        session.messages.push(msg);
      }),
      saveSession: mock.fn(),
      getHistory: mock.fn(() => []),
      getSummary: mock.fn(() => null),
      updateSummary: mock.fn()
    };

    const chatbot = createChatbot({
      llmProvider,
      resourceProvider,
      sessionProvider,
      tools: [getCustomerBalanceDetailTool]
    });

    const result = await chatbot.sendMessage({
      message: 'cual es el saldo de cliente cli-001',
      sessionId: 's1'
    });

    assert.match(result.answer, /Comercial San Miguel/);
    assert.match(result.answer, /2\.090\.000/);
    assert.equal(llmProvider.generate.mock.callCount(), 0);
  });

  it('debe usar la tool de ping y responder el answer directo', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const { createPingHostTool } = await import('../src/tools/builtin/ping-host.js');
    const llmProvider = {
      generate: mock.fn(() => 'No tengo esa respuesta en la informacion disponible.')
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
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
    const pingHost = mock.fn(async () => true);
    const pingHostTool = createPingHostTool({
      hosts: [{ ip: '192.168.1.2', name: 'servidor-villeta' }],
      pingHost
    });

    const chatbot = createChatbot({
      llmProvider,
      resourceProvider,
      sessionProvider,
      tools: [pingHostTool]
    });

    const result = await chatbot.sendMessage({ message: 'ping servidor-villeta' });

    assert.equal(result.answer, 'servidor-villeta (192.168.1.2) responde OK.');
    assert.equal(pingHost.mock.callCount(), 1);
    assert.equal(llmProvider.generate.mock.callCount(), 0);
  });

  it('no debe ejecutar tools si toolsEnabled es false', async () => {
    const { createChatbot } = await import('../src/core/chatbot.js');
    const tool = {
      name: 'lookup',
      description: 'Busca informacion de prueba.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: mock.fn(async () => ({ ok: true, data: { value: 'dato' } }))
    };
    const llmProvider = {
      generate: mock.fn(() => JSON.stringify({ tool: 'lookup', input: {} }))
    };
    const resourceProvider = {
      loadResources: mock.fn(() => ''),
      loadSystemPrompt: mock.fn(() => '')
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

    const chatbot = createChatbot({
      llmProvider,
      resourceProvider,
      sessionProvider,
      tools: [tool],
      toolsEnabled: false
    });
    const result = await chatbot.sendMessage({ message: 'Usa una tool' });

    assert.equal(result.answer, JSON.stringify({ tool: 'lookup', input: {} }));
    assert.equal(tool.execute.mock.callCount(), 0);
    assert.equal(llmProvider.generate.mock.callCount(), 1);
  });
});
