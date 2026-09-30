import { test } from 'node:test';
import assert from 'node:assert';
import { moduleRegistry, RegisteredVoiceTool } from './registry';
import { executeTool } from './orchestrator';
import { VoiceModule, VoiceToolDefinition } from './policy';

test('Voice Contract Hardening & Registry Tests', async (t) => {
  // Clear registry for clean state if needed, though we can just use fresh module IDs
  
  await t.test('Registry rejects duplicate canonical tool names', () => {
    const modA: VoiceModule = {
      id: 'modA', name: 'Module A', description: '', version: '1.0.0',
      tools: [{
        name: 'test.duplicate',
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: false,
        orchestrationEligible: false,
        inputSchema: { type: 'object' },
        execute: async () => ({ ok: true })
      }]
    };
    const modB: VoiceModule = {
      id: 'modB', name: 'Module B', description: '', version: '1.0.0',
      tools: [{
        name: 'test.duplicate',
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: false,
        orchestrationEligible: false,
        inputSchema: { type: 'object' },
        execute: async () => ({ ok: true })
      }]
    };

    moduleRegistry.registerModule(modA);
    assert.throws(() => moduleRegistry.registerModule(modB), /Tool conflict/);
  });

  await t.test('Registry rejects alias colliding with canonical name', () => {
    const modC: VoiceModule = {
      id: 'modC', name: 'Module C', description: '', version: '1.0.0',
      tools: [{
        name: 'test.new_tool',
        aliases: ['test.duplicate'], // Collides with modA
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: false,
        orchestrationEligible: false,
        inputSchema: { type: 'object' },
        execute: async () => ({ ok: true })
      }]
    };
    assert.throws(() => moduleRegistry.registerModule(modC), /Alias conflict|Tool conflict/);
  });

  await t.test('Registry ignores disabled modules', () => {
    const modDisabled: VoiceModule = {
      id: 'modDisabled', name: 'Disabled Module', description: '', version: '1.0.0', enabled: false,
      tools: [{
        name: 'test.disabled_tool',
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: false,
        orchestrationEligible: false,
        inputSchema: { type: 'object' },
        execute: async () => ({ ok: true })
      }]
    };
    moduleRegistry.registerModule(modDisabled);
    const tool = moduleRegistry.getTool('test.disabled_tool');
    assert.strictEqual(tool, undefined);
  });
});

test('Orchestrator Execution Contract', async (t) => {
  const modAuth: VoiceModule = {
    id: 'modAuth', name: 'Auth Module', description: '', version: '1.0.0',
    authorize: async (session) => {
      return session?.user?.role === 'ADMIN';
    },
    tools: [
      {
        name: 'test.protected',
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: true,
        orchestrationEligible: false,
        inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
        execute: async () => ({ ok: true })
      },
      {
        name: 'test.public',
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: false,
        orchestrationEligible: false,
        inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
        execute: async () => ({ ok: true })
      }
    ]
  };
  moduleRegistry.registerModule(modAuth);

  await t.test('Rejects unauthenticated caller if requiresAuthentication is true', async () => {
    const res = await executeTool('test.protected', { q: 'hello' }, null);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error.code, 'UNAUTHENTICATED');
  });

  await t.test('Rejects unauthorized caller if module.authorize fails', async () => {
    const session = { user: { personId: '123', role: 'USER' } }; // Not ADMIN
    const res = await executeTool('test.protected', { q: 'hello' }, session);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error.code, 'FORBIDDEN');
  });

  await t.test('Allows authorized caller', async () => {
    const session = { user: { personId: '123', role: 'ADMIN' } };
    const res = await executeTool('test.protected', { q: 'hello' }, session);
    assert.strictEqual(res.ok, true);
  });

  await t.test('Validates input schema: missing field', async () => {
    const session = { user: { personId: '123', role: 'ADMIN' } };
    const res = await executeTool('test.protected', { }, session);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error.code, 'INVALID_INPUT');
  });

  await t.test('Validates input schema: unknown field (strict)', async () => {
    const session = { user: { personId: '123', role: 'ADMIN' } };
    const res = await executeTool('test.protected', { q: 'hello', malicious: 'data' }, session);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error.code, 'INVALID_INPUT');
  });

  await t.test('Validates input schema: invalid type', async () => {
    const session = { user: { personId: '123', role: 'ADMIN' } };
    const res = await executeTool('test.protected', { q: 123 }, session); // Should be string
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error.code, 'INVALID_INPUT');
  });
});
