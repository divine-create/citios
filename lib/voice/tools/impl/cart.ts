import { VoiceToolDefinition } from '../../core/policy';
import { getVoiceCart, addVoiceCartItem, updateVoiceCartQuantity, removeVoiceCartItem, prepareVoiceCheckout, confirmVoiceCheckout } from '@/lib/voice/cart';
import { getVoiceContext, updateVoiceContext } from '../../core/context';

export const getCart: VoiceToolDefinition = {
  name: 'get_cart',
  description: 'View the resident\'s voice shopping cart.',
  domain: 'commerce',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: { type: "object", properties: {} },
  execute: async (args, session) => {
    const { cart, subtotal } = await getVoiceCart(session.user.personId);
    return {
      ok: true,
      data: {
        itemCount: cart.items.length,
        subtotal,
        items: cart.items.map((i: any) => ({
          productId: i.productId,
          name: i.product?.name || 'Unknown',
          price: i.product?.price || 0,
          quantity: i.quantity,
        })),
        pendingCheckout: !!cart.checkout
      }
    };
  }
};

export const addToCart: VoiceToolDefinition = {
  name: 'add_to_cart',
  description: 'Add a product to the cart. Requires product_id.',
  domain: 'commerce',
  riskLevel: 'reversible',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      product_id: { type: "string", description: "Optional. The ID of the product. Omit if it's clear from context." },
      quantity: { type: "number", description: "The quantity to add" }
    }
  },
  execute: async (args, session) => {
    const qty = args.quantity ? parseInt(args.quantity) : 1;
    let productId = args.product_id;
    
    if (!productId) {
      const ctx = await getVoiceContext(session.user.personId);
      if (ctx.recentEntities && ctx.recentEntities.length > 0) {
        const prod = ctx.recentEntities.find(e => e.type === 'PRODUCT');
        if (prod) productId = prod.id;
      }
    }
    
    if (!productId) return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Product ID is missing or unclear.' } };

    const res = await addVoiceCartItem(session.user.personId, productId, qty);
    return { ok: true, data: { message: 'Item added.', newSubtotal: res.subtotal } };
  }
};

export const updateCartQuantity: VoiceToolDefinition = {
  name: 'update_cart_quantity',
  description: 'Update the quantity of an item in the cart.',
  domain: 'commerce',
  riskLevel: 'reversible',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      product_id: { type: "string", description: "Optional. The ID of the product." },
      quantity: { type: "number", description: "The new quantity (0 to remove)" }
    },
    required: ["quantity"]
  },
  execute: async (args, session) => {
    let productId = args.product_id;
    if (!productId) {
      const ctx = await getVoiceContext(session.user.personId);
      if (ctx.recentEntities && ctx.recentEntities.length > 0) {
        const prod = ctx.recentEntities.find(e => e.type === 'PRODUCT');
        if (prod) productId = prod.id;
      }
    }

    if (!productId) return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Product ID is missing or unclear.' } };
    
    const qty = parseInt(args.quantity);
    if (isNaN(qty)) return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Quantity is invalid.' } };
    
    const res = await updateVoiceCartQuantity(session.user.personId, productId, qty);
    return { ok: true, data: { message: 'Quantity updated.', newSubtotal: res.subtotal } };
  }
};

export const removeFromCart: VoiceToolDefinition = {
  name: 'remove_from_cart',
  description: 'Remove an item from the cart.',
  domain: 'commerce',
  riskLevel: 'reversible',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      product_id: { type: "string", description: "Optional. The ID of the product to remove." }
    }
  },
  execute: async (args, session) => {
    let productId = args.product_id;
    if (!productId) {
      const ctx = await getVoiceContext(session.user.personId);
      if (ctx.recentEntities && ctx.recentEntities.length > 0) {
        const prod = ctx.recentEntities.find(e => e.type === 'PRODUCT');
        if (prod) productId = prod.id;
      }
    }

    if (!productId) return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Product ID is missing or unclear.' } };

    const res = await removeVoiceCartItem(session.user.personId, productId);
    return { ok: true, data: { message: 'Item removed.', newSubtotal: res.subtotal } };
  }
};

export const prepareCheckout: VoiceToolDefinition = {
  name: 'prepare_checkout',
  description: 'Calculates the final cart total and prepares for confirmation.',
  domain: 'commerce',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: { type: "object", properties: {} },
  execute: async (args, session) => {
    const res = await prepareVoiceCheckout(session.user.personId);
    
    // Phase 6: Explicitly start workflow
    const { startWorkflow } = await import('../../core/context');
    await startWorkflow(session.user.personId, res.checkoutId, {
      workflowId: res.checkoutId,
      action: 'confirm_checkout',
      domain: 'commerce',
      confirmationId: res.checkoutId,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString()
    });
    
    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'AWAITING_CONFIRMATION', currentWorkflowId: res.checkoutId }
    });

    return { 
      ok: true, 
      data: {
        checkoutId: res.checkoutId, 
        totalAmount: res.totalAmount,
        instruction: 'State the total amount and ask the user to explicitly confirm they want to place this order.' 
      }
    };
  }
};

export const confirmCheckout: VoiceToolDefinition = {
  name: 'confirm_checkout',
  description: 'Confirm and execute a pending checkout.',
  domain: 'commerce',
  riskLevel: 'financial',
  requiresConfirmation: true, // Requires the policy engine to know this is a protected step
  requiresAuthentication: true,
  orchestrationEligible: false, // Cannot be loosely orchestrated, it's a strict confirmation step
  inputSchema: {
    type: "object",
    properties: {
      checkout_id: { type: "string", description: "Optional. The checkout ID." }
    }
  },
  execute: async (args, session) => {
    const { endWorkflow } = await import('../../core/context');
    const ctx = await getVoiceContext(session.user.personId);
    let checkoutId = args.checkout_id;

    if (!checkoutId && ctx.activeWorkflows) {
      for (const key of Object.keys(ctx.activeWorkflows)) {
        if (ctx.activeWorkflows[key].action === 'confirm_checkout') {
          checkoutId = ctx.activeWorkflows[key].confirmationId;
          break;
        }
      }
    }

    if (!checkoutId) return { ok: false, error: { code: 'MISSING_CHECKOUT_ID', message: 'Checkout ID is required.' } };
    
    const res = await confirmVoiceCheckout(session.user.personId, checkoutId);
    
    // Cleanup workflow
    await endWorkflow(session.user.personId, checkoutId);
    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'COMPLETED' }
    });
    
    return { ok: true, data: { message: 'Order placed successfully.', orderData: res } };
  }
};
