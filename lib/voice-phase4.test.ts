import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getToolDefinition, requiresConfirmation } from './voice/policy';
import { initializeToolRegistry } from './voice/tools/registry';

describe('Voice Orchestration & Policy Engine', () => {
  initializeToolRegistry();

  it('should correctly classify read tools as not requiring confirmation', () => {
    assert.strictEqual(requiresConfirmation('search_city'), false);
    assert.strictEqual(requiresConfirmation('search_products'), false);
    assert.strictEqual(requiresConfirmation('get_order_status'), false);
    assert.strictEqual(requiresConfirmation('get_cart'), false);
  });

  it('should correctly classify reversible tools as not requiring confirmation', () => {
    assert.strictEqual(requiresConfirmation('add_to_cart'), false);
    assert.strictEqual(requiresConfirmation('update_cart_quantity'), false);
  });

  it('should correctly classify financial/irreversible tools as requiring confirmation', () => {
    assert.strictEqual(requiresConfirmation('confirm_checkout'), true);
    assert.strictEqual(requiresConfirmation('confirm_service_request'), true);
  });

  it('should ensure prepare tools do not require confirmation themselves', () => {
    assert.strictEqual(requiresConfirmation('prepare_checkout'), false);
    assert.strictEqual(requiresConfirmation('prepare_service_request'), false);
  });

  it('should have standard DTO definitions for all tools', () => {
    const searchTool = getToolDefinition('search_products');
    assert.ok(searchTool);
    assert.strictEqual(searchTool.riskLevel, 'read');
    
    const confirmTool = getToolDefinition('confirm_service_request');
    assert.ok(confirmTool);
    assert.strictEqual(confirmTool.riskLevel, 'irreversible');
  });
});
