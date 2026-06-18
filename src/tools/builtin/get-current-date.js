import { defineTool } from '../base.js';

export const getCurrentDateTool = defineTool({
  name: 'getCurrentDate',
  description: 'Devuelve la fecha y hora actual.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  async execute(input = {}, context = {}) {
    const timezone = context.context?.timezone || context.config?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();

    return {
      ok: true,
      data: {
        now: now.toISOString(),
        timezone
      }
    };
  }
});

export default getCurrentDateTool;
