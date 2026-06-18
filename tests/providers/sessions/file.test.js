import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('FileSessionProvider', () => {
  let FileSessionProvider;
  let tmpDir;

  before(async () => {
    const mod = await import('../../../src/providers/sessions/file.js');
    FileSessionProvider = mod.FileSessionProvider;
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sessions-test-'));
  });

  afterEach(async () => {
    const entries = await fs.readdir(tmpDir).catch(() => []);
    for (const entry of entries) {
      await fs.rm(path.join(tmpDir, entry), { recursive: true, force: true });
    }
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('debe crear directorio automáticamente si no existe', async () => {
    const subDir = path.join(tmpDir, 'nuevo-dir');
    const provider = new FileSessionProvider({ path: subDir });
    const session = await provider.createSession();
    assert.ok(session.id);
    const dirExists = await fs.stat(subDir).then(() => true).catch(() => false);
    assert.ok(dirExists);
  });

  it('debe guardar sesión en JSON', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    const session = await provider.createSession({ metadata: { userId: '123' } });
    const filePath = path.join(tmpDir, `${session.id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    assert.equal(parsed.id, session.id);
    assert.equal(parsed.metadata.userId, '123');
  });

  it('debe recuperar sesión por id', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    const session = await provider.createSession();
    const retrieved = await provider.getSession(session.id);
    assert.equal(retrieved.id, session.id);
  });

  it('debe retornar null si la sesión no existe', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    const session = await provider.getSession('id-inexistente');
    assert.equal(session, null);
  });

  it('getAllSessions debe listar todas las sesiones', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    await provider.createSession();
    await provider.createSession();
    const all = await provider.getAllSessions();
    assert.equal(all.length, 2);
  });

  it('debe actualizar sesión existente', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    const session = await provider.createSession();
    session.summary = 'resumen actualizado';
    await provider.saveSession(session);
    const retrieved = await provider.getSession(session.id);
    assert.equal(retrieved.summary, 'resumen actualizado');
  });

  it('debe eliminar sesión', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    const session = await provider.createSession();
    await provider.deleteSession(session.id);
    const retrieved = await provider.getSession(session.id);
    assert.equal(retrieved, null);
  });

  it('debe agregar mensajes', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    const session = await provider.createSession();
    await provider.addMessage(session.id, { role: 'user', content: 'Hola', createdAt: new Date().toISOString() });
    const history = await provider.getHistory(session.id);
    assert.equal(history.length, 1);
  });

  it('debe recuperar historial', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    const session = await provider.createSession();
    const history = await provider.getHistory(session.id);
    assert.deepEqual(history, []);
  });

  it('debe actualizar resumen', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    const session = await provider.createSession();
    await provider.updateSummary(session.id, 'resumen de prueba');
    const summary = await provider.getSummary(session.id);
    assert.equal(summary, 'resumen de prueba');
  });

  it('debe evitar path traversal', async () => {
    const provider = new FileSessionProvider({ path: tmpDir });
    await assert.rejects(() => provider.getSession('../etc/passwd'));
  });
});
