import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('getCurrentDateTool', () => {
  it('debe devolver fecha actual y timezone', async () => {
    const { getCurrentDateTool } = await import('../../../src/tools/builtin/get-current-date.js');

    const result = await getCurrentDateTool.execute({}, {
      context: { timezone: 'America/Asuncion' }
    });

    assert.equal(result.ok, true);
    assert.ok(Date.parse(result.data.now));
    assert.equal(result.data.timezone, 'America/Asuncion');
  });
});
