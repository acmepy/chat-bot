import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('getCurrentDateTool', () => {
  it('debe declarar instrucciones de uso', async () => {
    const { getCurrentDateTool } = await import('../../../src/tools/builtin/get-current-date.js');

    assert.match(getCurrentDateTool.instructions, /hora/);
  });

  it('debe devolver fecha actual y timezone', async () => {
    const { getCurrentDateTool } = await import('../../../src/tools/builtin/get-current-date.js');

    const result = await getCurrentDateTool.execute({}, {
      context: { timezone: 'America/Asuncion' }
    });

    assert.equal(result.ok, true);
    assert.ok(Date.parse(result.data.now));
    assert.equal(typeof result.data.localNow, 'string');
    assert.ok(result.data.localNow.length > 0);
    assert.equal(result.data.timezone, 'America/Asuncion');
    assert.match(result.data.answer, /La fecha y hora actual es/);
    assert.ok(result.data.answer.includes(result.data.localNow));
  });
});
