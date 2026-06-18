import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('PromptBuilder', () => {
  it('debe indicar uso de getCurrentDate para preguntas de fecha u hora', async () => {
    const { PromptBuilder } = await import('../../src/core/prompt-builder.js');
    const builder = new PromptBuilder();
    const prompt = builder.build({
      message: 'Que hora es?',
      tools: [{
        name: 'getCurrentDate',
        description: 'Devuelve la fecha y hora actual.',
        instructions: 'Si el usuario pregunta la hora, fecha, dia actual o momento actual, usa esta tool.',
        parameters: { type: 'object', properties: {}, required: [] }
      }]
    });

    assert.match(prompt, /getCurrentDate: Si el usuario pregunta la hora/);
  });

  it('debe indicar que data.answer se responde exactamente', async () => {
    const { PromptBuilder } = await import('../../src/core/prompt-builder.js');
    const builder = new PromptBuilder();
    const prompt = builder.build({
      message: 'Que hora es?',
      toolResult: {
        ok: true,
        tool: 'getCurrentDate',
        data: {
          answer: 'La hora actual es 08:00:00 del 18/06/2026 (America/Asuncion).'
        }
      }
    });

    assert.match(prompt, /data\.answer/);
    assert.match(prompt, /responde exactamente ese texto/);
  });
});
