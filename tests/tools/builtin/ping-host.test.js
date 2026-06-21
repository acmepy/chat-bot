import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('pingHostTool', () => {
  it('debe declarar instrucciones de uso', async () => {
    const { pingHostTool } = await import('../../../src/tools/builtin/ping-host.js');

    assert.match(pingHostTool.instructions, /ping/);
    assert.equal(pingHostTool.shouldUse({ message: 'ping servidor-villeta' }), true);
    assert.equal(pingHostTool.shouldUse({ message: 'hola' }), false);
  });

  it('debe hacer ping a un equipo por query y responder OK', async () => {
    const { pingHostTool } = await import('../../../src/tools/builtin/ping-host.js');
    const pingHost = mock.fn(async () => true);

    const result = await pingHostTool.execute({ query: 'ping servidor-villeta' }, {
      config: { pingHost }
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.reachable, true);
    assert.equal(result.data.host.name, 'servidor-villeta');
    assert.equal(pingHost.mock.callCount(), 1);
    assert.equal(pingHost.mock.calls[0].arguments[0], '192.168.1.2');
    assert.match(result.data.answer, /responde OK/);
  });

  it('debe responder cuando el equipo no responde', async () => {
    const { pingHostTool } = await import('../../../src/tools/builtin/ping-host.js');
    const pingHost = mock.fn(async () => false);

    const result = await pingHostTool.execute({ name: 'servidor-central' }, {
      config: { pingHost }
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.reachable, false);
    assert.match(result.data.answer, /no responde/);
  });

  it('debe responder cuando no encuentra el equipo', async () => {
    const { pingHostTool } = await import('../../../src/tools/builtin/ping-host.js');
    const pingHost = mock.fn(async () => true);

    const result = await pingHostTool.execute({ query: 'ping servidor-inexistente' }, {
      config: { pingHost }
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, false);
    assert.equal(pingHost.mock.callCount(), 0);
    assert.match(result.data.answer, /No se encontro/);
  });
});
