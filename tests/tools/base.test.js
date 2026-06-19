import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('defineTool', () => {
  it('debe devolver la tool si es valida', async () => {
    const { defineTool } = await import('../../src/tools/base.js');
    const tool = {
      name: 'validTool',
      description: 'Tool valida.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ ok: true, data: {} })
    };

    assert.equal(defineTool(tool), tool);
  });

  it('debe rechazar tools invalidas', async () => {
    const { defineTool } = await import('../../src/tools/base.js');

    assert.throws(() => defineTool({ name: 'sinDescripcion' }), /description es requerido/);
    assert.throws(() => defineTool({
      name: 'badInstructions',
      description: 'Tool invalida.',
      instructions: 1,
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ ok: true, data: {} })
    }), /instructions debe ser string/);
    assert.throws(() => defineTool({
      name: 'badShouldUse',
      description: 'Tool invalida.',
      shouldUse: true,
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ ok: true, data: {} })
    }), /shouldUse debe ser funcion/);
  });
});
