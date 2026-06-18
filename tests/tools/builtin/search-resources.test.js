import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('searchResourcesTool', () => {
  it('debe devolver coincidencias en resources', async () => {
    const { searchResourcesTool } = await import('../../../src/tools/builtin/search-resources.js');

    const result = await searchResourcesTool.execute(
      { query: 'consultar stock' },
      {
        resources: [
          'Fuente: faq.md\n# FAQ\nEl stock se consulta desde Stock > Reportes > Existencia de Articulos.',
          '# Otro\nNo relacionado.'
        ].join('\n\n---\n\n')
      }
    );

    assert.equal(result.ok, true);
    assert.equal(result.data.matches.length, 1);
    assert.equal(result.data.matches[0].source, 'faq.md');
    assert.match(result.data.matches[0].content, /stock/i);
  });

  it('debe devolver matches vacio sin query', async () => {
    const { searchResourcesTool } = await import('../../../src/tools/builtin/search-resources.js');

    const result = await searchResourcesTool.execute({}, { resources: 'contenido' });

    assert.deepEqual(result.data.matches, []);
  });
});
