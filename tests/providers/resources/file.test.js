import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('FileResourceProvider', () => {
  let FileResourceProvider;
  let ResourceProviderError;
  let tmpDir;

  before(async () => {
    const mod = await import('../../../src/providers/resources/file.js');
    FileResourceProvider = mod.FileResourceProvider;
    const errors = await import('../../../src/errors/chatbot.js');
    ResourceProviderError = errors.ResourceProviderError;
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'resources-test-'));
  });

  afterEach(async () => {
    const entries = await fs.readdir(tmpDir).catch(() => []);
    for (const entry of entries) {
      await fs.rm(path.join(tmpDir, entry), { recursive: true, force: true });
    }
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('debe cargar archivos markdown', async () => {
    await fs.writeFile(path.join(tmpDir, 'test.md'), '# Test Resource');
    const provider = new FileResourceProvider({ resourcesPath: tmpDir });
    const result = await provider.loadResources();
    assert.ok(result.includes('# Test Resource'));
  });

  it('debe ignorar archivos no soportados', async () => {
    await fs.writeFile(path.join(tmpDir, 'data.csv'), 'a,b,c');
    await fs.writeFile(path.join(tmpDir, 'data.txt'), 'texto');
    await fs.writeFile(path.join(tmpDir, 'valid.md'), '# Válido');
    const provider = new FileResourceProvider({ resourcesPath: tmpDir });
    const result = await provider.loadResources();
    assert.ok(result.includes('# Válido'));
    assert.ok(!result.includes('a,b,c'));
    assert.ok(!result.includes('texto'));
  });

  it('debe cargar system prompt', async () => {
    const provider = new FileResourceProvider({ resourcesPath: tmpDir });
    const result = await provider.loadSystemPrompt();
    assert.ok(result.includes('Eres un asistente del sistema.'));
    assert.ok(result.includes('No reutilices el procedimiento de una pantalla parecida'));
  });

  it('debe retornar vacio si el system prompt configurado no existe', async () => {
    const provider = new FileResourceProvider({
      resourcesPath: tmpDir,
      systemPromptPath: path.join(tmpDir, 'no-existe.md')
    });
    const result = await provider.loadSystemPrompt();
    assert.equal(result, '');
  });

  it('debe manejar carpeta inexistente con error propio', async () => {
    const inexistente = path.join(tmpDir, 'no-existe');
    const provider = new FileResourceProvider({ resourcesPath: inexistente });
    await assert.rejects(() => provider.loadResources(), ResourceProviderError);
  });
});
