import fs from 'fs/promises';
import { defineTool } from '../base.js';

const DEFAULT_DATA_URL = new URL('../data/customer-balances.json', import.meta.url);

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeIdentifier(value) {
  return normalize(value).replace(/[^\w-]/g, '');
}

function extractInput(message) {
  const text = String(message || '');
  const ruc = text.match(/\b\d{6,9}-\d\b/)?.[0];
  const customerCode = text.match(/\b[A-Za-z]{2,5}-\d{1,8}\b/)?.[0];

  return {
    ...(ruc ? { ruc } : {}),
    ...(customerCode ? { customerCode } : {})
  };
}

function hasBalanceIntent(text) {
  return [
    'saldo',
    'saldos',
    'factura',
    'facturas',
    'pendiente',
    'pendientes',
    'deuda',
    'deudas',
    'cuenta',
    'cuentas'
  ].some((term) => text.includes(term));
}

function hasCustomerReference(text) {
  return [
    'cliente',
    'ruc',
    'codigo'
  ].some((term) => text.includes(term));
}

function hasBalanceContext(context = {}) {
  const historyText = (context.history || [])
    .slice(-4)
    .map((message) => message.content)
    .join(' ');
  const text = normalize(`${context.summary || ''} ${historyText}`);

  return hasBalanceIntent(text);
}

function shouldUseForBalanceDetail(message, context = {}) {
  const text = normalize(message);
  const hasIdentifier = Boolean(extractInput(text).ruc || extractInput(text).customerCode);

  if (hasBalanceIntent(text) && (hasCustomerReference(text) || hasIdentifier)) {
    return true;
  }

  return hasIdentifier && hasBalanceContext(context);
}

function formatAmount(value, currency) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function buildAnswer(customer, total) {
  if (!customer) {
    return 'No se encontro detalle de saldo para el cliente indicado.';
  }
  if (customer.pendingInvoices.length === 0) {
    return `${customer.name} (${customer.ruc}) no tiene facturas pendientes en los datos disponibles.`;
  }

  const invoices = customer.pendingInvoices.map((invoice) => (
    `${invoice.number}, vence ${invoice.dueDate}, saldo ${formatAmount(invoice.amount, customer.currency)}`
  ));

  return [
    `Detalle de saldo de ${customer.name} (${customer.ruc}).`,
    `Total pendiente: ${formatAmount(total, customer.currency)}.`,
    `Facturas pendientes: ${invoices.join('; ')}.`
  ].join(`\n`);
}

async function loadCustomers(dataUrl = DEFAULT_DATA_URL) {
  const content = await fs.readFile(dataUrl, 'utf-8');
  return JSON.parse(content);
}

export const getCustomerBalanceDetailTool = defineTool({
  name: 'getCustomerBalanceDetail',
  description: 'Devuelve el detalle de saldo de un cliente desde datos mockeados.',
  instructions: 'Si el usuario pide detalle de saldo, facturas pendientes, deuda o saldo pendiente de un cliente, usa esta tool. Tambien usala en preguntas de seguimiento sobre otro cliente. Envia preferentemente input.query con el mensaje original completo.',
  shouldUse({ message } = {}, context = {}) {
    return shouldUseForBalanceDetail(message, context);
  },
  parameters: {
    type: 'object',
    properties: {
      ruc: {
        type: 'string',
        description: 'RUC del cliente.'
      },
      customerCode: {
        type: 'string',
        description: 'Codigo interno del cliente.'
      },
      query: {
        type: 'string',
        description: 'Mensaje original del usuario para extraer RUC o codigo si no vienen separados.'
      }
    },
    required: []
  },
  async execute(input = {}, context = {}) {
    const query = input.query || Object.values(input).filter((value) => typeof value === 'string').join(' ');
    const extracted = extractInput(query);
    const ruc = normalizeIdentifier(input.ruc || extracted.ruc);
    const customerCode = normalizeIdentifier(
      input.customerCode ||
      input.customer_code ||
      input.codigoCliente ||
      input.codigo ||
      input.code ||
      input.customerId ||
      extracted.customerCode
    );

    if (!ruc && !customerCode) {
      return {
        ok: true,
        data: {
          found: false,
          answer: 'Indique el RUC o codigo de cliente para consultar el detalle de saldo.'
        }
      };
    }

    const customers = await loadCustomers(context.config?.customerBalancesDataUrl || DEFAULT_DATA_URL);
    const customer = customers.find((item) => (
      normalizeIdentifier(item.ruc) === ruc || normalizeIdentifier(item.customerCode) === customerCode
    ));

    if (!customer) {
      return {
        ok: true,
        data: {
          found: false,
          ruc: input.ruc || null,
          customerCode: input.customerCode || null,
          answer: buildAnswer(null)
        }
      };
    }

    const totalPending = customer.pendingInvoices.reduce((total, invoice) => total + invoice.amount, 0);

    return {
      ok: true,
      data: {
        found: true,
        customer: {
          code: customer.customerCode,
          ruc: customer.ruc,
          name: customer.name
        },
        currency: customer.currency,
        totalPending,
        pendingInvoices: customer.pendingInvoices,
        answer: buildAnswer(customer, totalPending)
      }
    };
  }
});

export default getCustomerBalanceDetailTool;
