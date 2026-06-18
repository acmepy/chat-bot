import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ToolRunner', () => {
  it('debe ejecutar una tool existente', async () => {
    const { ToolRegistry } = await import('../../src/tools/registry.js');
    const { ToolRunner } = await import('../../src/core/tool-runner.js');
    const registry = new ToolRegistry([{
      name: 'sumar',
      description: 'Suma valores.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async (input) => ({ ok: true, data: { total: input.a + input.b } })
    }]);
    const runner = new ToolRunner({ registry });

    const result = await runner.run('sumar', { a: 2, b: 3 });

    assert.deepEqual(result, {
      ok: true,
      tool: 'sumar',
      data: { total: 5 }
    });
  });

  it('debe devolver error al ejecutar tool inexistente', async () => {
    const { ToolRegistry } = await import('../../src/tools/registry.js');
    const { ToolRunner } = await import('../../src/core/tool-runner.js');
    const runner = new ToolRunner({ registry: new ToolRegistry() });

    const result = await runner.run('noExiste', {});

    assert.equal(result.ok, false);
    assert.equal(result.tool, 'noExiste');
    assert.equal(result.error.code, 'TOOL_NOT_FOUND');
  });

  it('debe capturar errores de ejecucion', async () => {
    const { ToolRegistry } = await import('../../src/tools/registry.js');
    const { ToolRunner } = await import('../../src/core/tool-runner.js');
    const registry = new ToolRegistry([{
      name: 'falla',
      description: 'Falla.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => {
        throw new Error('fallo controlado');
      }
    }]);
    const runner = new ToolRunner({ registry });

    const result = await runner.run('falla', {});

    assert.equal(result.ok, false);
    assert.equal(result.error.message, 'fallo controlado');
    assert.equal(result.error.code, 'TOOL_EXECUTION_ERROR');
  });

  it('debe respetar resultados ok false de una tool', async () => {
    const { ToolRegistry } = await import('../../src/tools/registry.js');
    const { ToolRunner } = await import('../../src/core/tool-runner.js');
    const registry = new ToolRegistry([{
      name: 'rechaza',
      description: 'Devuelve error controlado.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({
        ok: false,
        error: { message: 'rechazado', code: 'REJECTED' }
      })
    }]);
    const runner = new ToolRunner({ registry });

    const result = await runner.run('rechaza', {});

    assert.equal(result.ok, false);
    assert.equal(result.error.message, 'rechazado');
    assert.equal(result.error.code, 'REJECTED');
  });
});
