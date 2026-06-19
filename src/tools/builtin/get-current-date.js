import { defineTool } from '../base.js';

export const getCurrentDateTool = defineTool({
  name: 'getCurrentDate',
  description: 'Devuelve la fecha y hora actual.',
  instructions: 'Si el usuario pregunta la hora, fecha, dia actual o momento actual, usa esta tool.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  async execute(input = {}, context = {}) {
    const timezone = context.context?.timezone || context.config?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const localNow = now.toLocaleString('es-PY', { timeZone: timezone });

    return {
      ok: true,
      data: {
        now: now.toISOString(),
        localNow,
        timezone,
        answer: `La fecha y hora actual es ${localNow}`
      }
    };
  }
});

export default getCurrentDateTool;
