import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

describe('MemorySessionProvider', () => {
  let MemorySessionProvider;

  before(async () => {
    const mod = await import('../../../src/providers/sessions/memory.js');
    MemorySessionProvider = mod.MemorySessionProvider;
  });

  it('createSession debe crear una sesión', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession();
    assert.ok(session.id);
    assert.equal(session.summary, '');
    assert.deepEqual(session.messages, []);
    assert.ok(session.createdAt);
    assert.ok(session.updatedAt);
  });

  it('createSession debe aceptar metadata', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession({ metadata: { userId: '123' } });
    assert.equal(session.metadata.userId, '123');
  });

  it('getSession debe retornar null si no existe', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.getSession('no-existe');
    assert.equal(session, null);
  });

  it('getSession debe retornar la sesión', async () => {
    const provider = new MemorySessionProvider();
    const created = await provider.createSession();
    const retrieved = await provider.getSession(created.id);
    assert.deepEqual(retrieved, created);
  });

  it('getAllSessions debe listar todas las sesiones', async () => {
    const provider = new MemorySessionProvider();
    await provider.createSession();
    await provider.createSession();
    const all = await provider.getAllSessions();
    assert.equal(all.length, 2);
  });

  it('saveSession debe actualizar la sesión', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession();
    session.summary = 'nuevo resumen';
    await provider.saveSession(session);
    const retrieved = await provider.getSession(session.id);
    assert.equal(retrieved.summary, 'nuevo resumen');
  });

  it('deleteSession debe eliminar la sesión', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession();
    await provider.deleteSession(session.id);
    const retrieved = await provider.getSession(session.id);
    assert.equal(retrieved, null);
  });

  it('addMessage debe agregar un mensaje', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession();
    const message = { role: 'user', content: 'Hola', createdAt: new Date().toISOString() };
    await provider.addMessage(session.id, message);
    const history = await provider.getHistory(session.id);
    assert.equal(history.length, 1);
    assert.equal(history[0].content, 'Hola');
  });

  it('getHistory debe retornar el historial', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession();
    const history = await provider.getHistory(session.id);
    assert.deepEqual(history, []);
  });

  it('getSummary debe retornar null si no hay resumen', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession();
    const summary = await provider.getSummary(session.id);
    assert.equal(summary, null);
  });

  it('getSummary debe retornar el resumen', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession();
    await provider.updateSummary(session.id, 'resumen de prueba');
    const summary = await provider.getSummary(session.id);
    assert.equal(summary, 'resumen de prueba');
  });

  it('updateSummary debe actualizar el resumen', async () => {
    const provider = new MemorySessionProvider();
    const session = await provider.createSession();
    await provider.updateSummary(session.id, 'nuevo resumen');
    const summary = await provider.getSummary(session.id);
    assert.equal(summary, 'nuevo resumen');
  });
});
