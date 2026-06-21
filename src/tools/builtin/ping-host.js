import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { defineTool } from '../base.js';

const execFileAsync = promisify(execFile);
const DEFAULT_DATA_URL = new URL('../data/host.json', import.meta.url);

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeName(value) {
  return normalize(value).replace(/[^\w-]/g, '');
}

function pingArgs(ip, timeoutMs) {
  if (process.platform === 'win32') {
    return ['-n', '1', '-w', String(timeoutMs), ip];
  }

  return ['-c', '1', '-W', String(Math.ceil(timeoutMs / 1000)), ip];
}

async function defaultPingHost(ip, timeoutMs = 1000) {
  await execFileAsync('ping', pingArgs(ip, timeoutMs), { timeout: timeoutMs + 500 });
  return true;
}

async function loadHosts(dataUrl = DEFAULT_DATA_URL) {
  const content = await fs.readFile(dataUrl, 'utf-8');
  return JSON.parse(content);
}

function findHost(hosts, input = {}) {
  const query = normalize(input.query || Object.values(input).filter((value) => typeof value === 'string').join(' '));
  const requestedName = normalizeName(input.name || input.host || input.hostname || input.equipo);

  return hosts.find((host) => {
    const hostName = normalizeName(host.name);

    return hostName === requestedName || (query && query.includes(hostName));
  });
}

export const pingHostTool = defineTool({
  name: 'pingHost',
  description: 'Hace ping a un equipo registrado por nombre.',
  instructions: 'Si el usuario pide hacer ping o verificar si responde un equipo registrado, usa esta tool. Envia input.query con el mensaje original completo.',
  shouldUse({ message } = {}) {
    const text = normalize(message);

    return /\bping\b/.test(text) || text.includes('responde el equipo');
  },
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Nombre del equipo registrado.'
      },
      query: {
        type: 'string',
        description: 'Mensaje original del usuario para extraer el nombre del equipo.'
      }
    },
    required: []
  },
  async execute(input = {}, context = {}) {
    const hosts = await loadHosts(context.config?.hostsDataUrl || DEFAULT_DATA_URL);
    const host = findHost(hosts, input);

    if (!host) {
      return {
        ok: true,
        data: {
          found: false,
          answer: 'No se encontro el equipo indicado para hacer ping.'
        }
      };
    }

    const pingHost = context.config?.pingHost || context.pingHost || defaultPingHost;
    const timeoutMs = context.config?.pingTimeoutMs || 1000;
    let reachable = false;

    try {
      reachable = await pingHost(host.ip, timeoutMs, host);
    } catch {
      reachable = false;
    }

    return {
      ok: true,
      data: {
        found: true,
        reachable,
        host,
        answer: reachable
          ? `${host.name} (${host.ip}) responde OK.`
          : `${host.name} (${host.ip}) no responde al ping.`
      }
    };
  }
});

export default pingHostTool;
