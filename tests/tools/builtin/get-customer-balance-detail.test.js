import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('getCustomerBalanceDetailTool', () => {
  const customers = [
    {
      customerCode: 'CLI-001',
      ruc: '80012345-6',
      name: 'Comercial San Miguel S.A.',
      currency: 'PYG',
      pendingInvoices: [
        { number: '001-001-0000123', dueDate: '2026-05-15', amount: 1250000 },
        { number: '001-001-0000124', dueDate: '2026-06-10', amount: 840000 }
      ]
    },
    {
      customerCode: 'CLI-002',
      ruc: '1234567-8',
      name: 'Cliente Demo',
      currency: 'PYG',
      pendingInvoices: [
        { number: '001-002-0000340', dueDate: '2026-05-21', amount: 320000 }
      ]
    }
  ];

  it('debe declarar instrucciones de uso', async () => {
    const { createCustomerBalanceDetailTool } = await import('../../../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers });

    assert.match(getCustomerBalanceDetailTool.instructions, /saldo/);
    assert.match(getCustomerBalanceDetailTool.instructions, /seguimiento/);
    assert.equal(getCustomerBalanceDetailTool.shouldUse({ message: 'cual es el saldo del cliente cli-001' }), true);
    assert.equal(getCustomerBalanceDetailTool.shouldUse(
      { message: 'y del cliente cli-002' },
      { history: [{ role: 'user', content: 'cual es el saldo del cliente cli-001' }] }
    ), true);
    assert.equal(getCustomerBalanceDetailTool.shouldUse({ message: 'hola' }), false);
  });

  it('debe extraer RUC desde query', async () => {
    const { createCustomerBalanceDetailTool } = await import('../../../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers });

    const result = await getCustomerBalanceDetailTool.execute({
      query: 'Cuales son las facturas pendientes del RUC 80012345-6?'
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.customer.ruc, '80012345-6');
  });

  it('debe devolver facturas pendientes por RUC', async () => {
    const { createCustomerBalanceDetailTool } = await import('../../../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers });

    const result = await getCustomerBalanceDetailTool.execute({ ruc: '80012345-6' });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.customer.ruc, '80012345-6');
    assert.equal(result.data.pendingInvoices.length, 2);
    assert.equal(result.data.totalPending, 2090000);
    assert.match(result.data.answer, /Facturas pendientes/);
  });

  it('debe devolver facturas pendientes por codigo de cliente', async () => {
    const { createCustomerBalanceDetailTool } = await import('../../../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers });

    const result = await getCustomerBalanceDetailTool.execute({ customerCode: 'CLI-002' });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.customer.code, 'CLI-002');
    assert.equal(result.data.pendingInvoices.length, 1);
  });

  it('debe aceptar alias y puntuacion en codigo de cliente', async () => {
    const { createCustomerBalanceDetailTool } = await import('../../../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers });

    const result = await getCustomerBalanceDetailTool.execute({ codigoCliente: 'cli-001.' });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.customer.code, 'CLI-001');
    assert.equal(result.data.pendingInvoices.length, 2);
  });

  it('debe responder cuando no encuentra cliente', async () => {
    const { createCustomerBalanceDetailTool } = await import('../../../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers });

    const result = await getCustomerBalanceDetailTool.execute({ ruc: 'no-existe' });

    assert.equal(result.ok, true);
    assert.equal(result.data.found, false);
    assert.match(result.data.answer, /No se encontro/);
  });

  it('debe pedir identificador si no recibe RUC ni codigo', async () => {
    const { createCustomerBalanceDetailTool } = await import('../../../src/tools/builtin/get-customer-balance-detail.js');
    const getCustomerBalanceDetailTool = createCustomerBalanceDetailTool({ customers });

    const result = await getCustomerBalanceDetailTool.execute({});

    assert.equal(result.ok, true);
    assert.equal(result.data.found, false);
    assert.match(result.data.answer, /RUC o codigo de cliente/);
  });
});
