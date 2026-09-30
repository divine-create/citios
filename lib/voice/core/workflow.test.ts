import { test } from 'node:test';
import assert from 'node:assert';
import { createWorkflow, getWorkflow, advanceWorkflow, cancelWorkflow } from './workflow-engine';
import { executeTool } from './orchestrator';
import { moduleRegistry } from './registry';
import { VoiceModule } from './policy';
import { db } from '@/src/prisma/db';

test('Workflow Engine tests', async (t) => {
  const personId = 'test-resident-123';
  
  // Register a mock module for testing workflows
  const testModule: VoiceModule = {
    id: 'test_workflow_module',
    name: 'Workflow Test',
    description: 'Testing',
    version: '1.0.0',
    enabled: true,
    tools: [
      {
        name: 'test.step1',
        description: 'Test',
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: false,
        orchestrationEligible: true,
        inputSchema: { type: 'object', properties: { val: { type: 'string' } } },
        execute: async (args) => ({ ok: true, data: { result1: args.val + '-done' } })
      },
      {
        name: 'test.step2',
        description: 'Test',
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: false,
        orchestrationEligible: true,
        inputSchema: { type: 'object', properties: { inputFrom1: { type: 'string' } } },
        execute: async (args) => ({ ok: true, data: { finalResult: args.inputFrom1 + '-step2' } })
      },
      {
        name: 'test.sensitive',
        description: 'Test',
        domain: 'test',
        riskLevel: 'irreversible',
        requiresConfirmation: true, // Should trigger WAITING_FOR_CONFIRMATION
        requiresAuthentication: false,
        orchestrationEligible: true,
        inputSchema: { type: 'object' },
        execute: async () => ({ ok: true, data: { sensitiveDone: true } })
      },
      {
        name: 'test.clarify',
        description: 'Test',
        domain: 'test',
        riskLevel: 'read',
        requiresConfirmation: false,
        requiresAuthentication: false,
        orchestrationEligible: true,
        inputSchema: { type: 'object', properties: { needed: { type: 'string' } }, required: ['needed'] },
        // Instead of orchestrator catching it, let's pretend orchestrator handles it or tool returns it
        execute: async (args) => {
          if (!args.needed) {
            return { ok: false, error: { code: 'MISSING_INFORMATION', message: 'I need a value.', missingFields: ['needed'] } };
          }
          return { ok: true, data: { got: args.needed } };
        }
      }
    ]
  };
  
  moduleRegistry.registerModule(testModule);
  
  // Clean up and create test person
  await db.orm.public.VoiceContext.where({ personId }).delete();
  await db.orm.public.Person.where({ id: personId }).delete();
  await db.orm.public.Person.create({
    id: personId,
    firstName: 'Test',
    lastName: 'Resident'
  });
  
  await t.test('Sequential workflow execution with dependency resolution', async () => {
    const plan = {
      workflowType: 'test',
      steps: [
        { id: 's1', toolName: 'test.step1', arguments: { val: 'hello' } },
        { id: 's2', toolName: 'test.step2', arguments: { inputFrom1: '{{s1.output.result1}}' }, dependsOn: ['s1'] }
      ]
    };
    
    let wf: any = await createWorkflow(personId, plan);
    assert.ok(!('error' in wf));
    wf = wf as any;
    
    // Advance workflow
    const session = { user: { personId } };
    const advanced = await advanceWorkflow(personId, (wf as any).id, session) as any;
    
    assert.strictEqual(advanced.status, 'COMPLETED');
    assert.strictEqual(advanced.steps[0].status, 'COMPLETED');
    assert.strictEqual(advanced.steps[1].status, 'COMPLETED');
    
    // Check argument resolution
    assert.strictEqual(advanced.steps[1].output.finalResult, 'hello-done-step2');
  });
  
  await t.test('Confirmation barrier halts execution', async () => {
    const plan = {
      workflowType: 'sensitive',
      steps: [
        { id: 's1', toolName: 'test.sensitive', arguments: {} }
      ]
    };
    
    let wf = await createWorkflow(personId, plan) as any;
    const session = { user: { personId } };
    
    const advanced = await advanceWorkflow(personId, wf.id, session) as any;
    assert.strictEqual(advanced.status, 'WAITING_FOR_CONFIRMATION');
    assert.strictEqual(advanced.steps[0].status, 'PENDING');
    assert.ok(advanced.confirmationRequest);
    assert.strictEqual(advanced.confirmationRequest.action, 'test.sensitive');
  });
  
  await t.test('Clarification barrier halts execution', async () => {
    const plan = {
      workflowType: 'clarify',
      steps: [
        { id: 's1', toolName: 'test.clarify', arguments: {} } // missing 'needed'
      ]
    };
    
    let wf = await createWorkflow(personId, plan) as any;
    const session = { user: { personId } };
    
    const advanced = await advanceWorkflow(personId, wf.id, session) as any;
    assert.strictEqual(advanced.status, 'WAITING_FOR_INPUT');
    assert.strictEqual(advanced.steps[0].status, 'PENDING');
    assert.ok(advanced.clarificationRequest);
    assert.deepStrictEqual(advanced.clarificationRequest.missingFields, ['needed']);
  });
  
  await t.test('Workflow cancellation', async () => {
    const plan = {
      workflowType: 'cancel',
      steps: [{ id: 's1', toolName: 'test.step1', arguments: { val: 'x' } }]
    };
    let wf = await createWorkflow(personId, plan) as any;
    
    const cancelled = await cancelWorkflow(personId, wf.id) as any;
    assert.strictEqual(cancelled.status, 'CANCELLED');
    
    const advanced = await advanceWorkflow(personId, wf.id, { user: { personId } }) as any;
    assert.strictEqual(advanced.status, 'CANCELLED'); // Should not run
  });
});
