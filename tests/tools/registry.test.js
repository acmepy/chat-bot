import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ToolRegistry', () => {
  it('debe registrar tools validas', async () => {
    const { ToolRegistry } = await import('../../src/tools/registry.js');
    const tool = {
      name: 'testTool',
      description: 'Tool de prueba.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ ok: true, data: {} })
    };

    const registry = new ToolRegistry([tool]);

    assert.equal(registry.get('testTool'), tool);
    assert.deepEqual(registry.list(), [tool]);
  });

  it('debe rechazar tools invalidas', async () => {
    const { ToolRegistry } = await import('../../src/tools/registry.js');
    const registry = new ToolRegistry();

    assert.throws(() => registry.register({ name: 'bad' }), /description es requerido/);
  });

  it('debe rechazar nombres duplicados', async () => {
    const { ToolRegistry } = await import('../../src/tools/registry.js');
    const tool = {
      name: 'duplicada',
      description: 'Tool de prueba.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ ok: true, data: {} })
    };
    const registry = new ToolRegistry([tool]);

    assert.throws(() => registry.register(tool), /Tool duplicada/);
  });

  it('debe devolver metadata sin execute', async () => {
    const { ToolRegistry } = await import('../../src/tools/registry.js');
    const tool = {
      name: 'metadataTool',
      description: 'Tool con metadata.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ ok: true, data: {} })
    };
    const registry = new ToolRegistry([tool]);
    const metadata = registry.getMetadata();

    assert.equal(metadata[0].name, 'metadataTool');
    assert.equal(metadata[0].execute, undefined);
  });
});
