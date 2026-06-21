import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('pingHostTool', () => {
  const hosts = [
    { ip: '192.100.100.100', name: 'servidor-central' },
    { ip: '192.168.1.2', name: 'servidor-villeta' }
  ];

  it('debe declarar instrucciones de uso', async () => {
    const { createPingHostTool } = await import('../../../src/tools/builtin/ping-host.js');
    const pingHostTool = createPingHostTool({ hosts });

    assert.match(pingHostTool.instructions, /ping/);
    assert.equal(pingHostTool.shouldUse({ message: 'ping servidor-villeta' }), true);
    assert.equal(pingHostTool.shouldUse({ message: 'hola' }), false);
  });

  it('debe hacer ping a un equipo por query y responder OK', async () => {
    const pingHost = mock.fn(async () => true);
    const { createPingHostTool } = await import('../../../src/tools/builtin/ping-host.js');
    const pingHostTool = createPingHostTool({ hosts, pingHost });

    const result = await pingHostTool.execute({ query: 'ping servidor-villeta' });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.reachable, true);
    assert.equal(result.data.host.name, 'servidor-villeta');
    assert.equal(pingHost.mock.callCount(), 1);
    assert.equal(pingHost.mock.calls[0].arguments[0], '192.168.1.2');
    assert.match(result.data.answer, /responde OK/);
  });

  it('debe responder cuando el equipo no responde', async () => {
    const pingHost = mock.fn(async () => false);
    const { createPingHostTool } = await import('../../../src/tools/builtin/ping-host.js');
    const pingHostTool = createPingHostTool({ hosts, pingHost });

    const result = await pingHostTool.execute({ name: 'servidor-central' });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.reachable, false);
    assert.match(result.data.answer, /no responde/);
  });

  it('debe responder cuando no encuentra el equipo', async () => {
    const pingHost = mock.fn(async () => true);
    const { createPingHostTool } = await import('../../../src/tools/builtin/ping-host.js');
    const pingHostTool = createPingHostTool({ hosts, pingHost });

    const result = await pingHostTool.execute({ query: 'ping servidor-inexistente' });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, false);
    assert.equal(pingHost.mock.callCount(), 0);
    assert.match(result.data.answer, /No se encontro/);
  });
});
