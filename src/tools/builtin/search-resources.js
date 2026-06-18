import { defineTool } from '../base.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildSnippet(content, queryTerms, maxLength = 300) {
  const normalizedContent = normalizeText(content);
  const firstIndex = queryTerms
    .map((term) => normalizedContent.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;

  const start = Math.max(0, firstIndex - 80);
  const snippet = String(content).slice(start, start + maxLength).replace(/\s+/g, ' ').trim();
  return start > 0 ? `...${snippet}` : snippet;
}

function splitResources(resources) {
  return String(resources || '')
    .split(/\n-{3,}\n/g)
    .map((content, index) => {
      const trimmed = content.trim();
      const sourceMatch = trimmed.match(/^Fuente:\s*(.+)$/m);
      const source = sourceMatch ? sourceMatch[1].trim() : `resource-${index + 1}`;
      const cleanContent = trimmed.replace(/^Fuente:\s*.+\n?/m, '').trim();

      return {
        source,
        content: cleanContent
      };
    })
    .filter((resource) => resource.content);
}

export const searchResourcesTool = defineTool({
  name: 'searchResources',
  description: 'Busca coincidencias simples en los recursos cargados del chatbot.',
  instructions: 'Si el usuario pide buscar o ubicar informacion en los recursos, usa esta tool.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Texto a buscar dentro de los recursos.'
      }
    },
    required: ['query']
  },
  async execute(input = {}, context = {}) {
    const query = String(input.query || '').trim();

    if (!query) {
      return {
        ok: true,
        data: {
          matches: []
        }
      };
    }

  const queryTerms = normalizeText(query).split(/\s+/).filter(Boolean);
    const resources = splitResources(context.resources);
    const matches = [];

    for (const resource of resources) {
      const normalizedContent = normalizeText(resource.content);
      const score = queryTerms.reduce((total, term) => (
        normalizedContent.includes(term) ? total + 1 : total
      ), 0);

      if (score > 0) {
        matches.push({
          source: resource.source,
          content: buildSnippet(resource.content, queryTerms),
          score
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    return {
      ok: true,
      data: {
        matches: matches.slice(0, 5).map(({ source, content }) => ({ source, content }))
      }
    };
  }
});

export default searchResourcesTool;
