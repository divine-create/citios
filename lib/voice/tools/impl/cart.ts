import { VoiceToolDefinition } from '../../core/policy';
import { getVoiceCart, addVoiceCartItem, updateVoiceCartQuantity, removeVoiceCartItem, prepareVoiceCheckout, confirmVoiceCheckout } from '@/lib/voice/cart';
import { getVoiceContext, updateVoiceContext } from '../../core/context';

export const getCart: VoiceToolDefinition = {
  name: 'commerce.get_cart', aliases: ['get_cart'],
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
          productId: i.retailProductId || i.menuItemId,
          name: (i.kind === 'retail' ? i.product?.name : i.menuItem?.name) || 'Unknown',
          price: (i.kind === 'retail' ? i.product?.price : i.menuItem?.price) || 0,
          quantity: i.quantity,
          kind: i.kind
        })),
        pendingCheckout: !!cart.checkout
      }
    };
  }
};

export const addToCart: VoiceToolDefinition = {
  name: 'commerce.add_to_cart', aliases: ['add_to_cart'],
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
      quantity: { type: "number", description: "The quantity to add" },
      kind: { type: "string", description: "The type of product: 'retail' or 'food'. Defaults to 'retail'." }
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

    const kind = args.kind === 'food' ? 'food' : 'retail';
    const res = await addVoiceCartItem(session.user.personId, productId, qty, kind);
    return { ok: true, data: { message: 'Item added.', newSubtotal: res.subtotal } };
  }
};

export const updateCartQuantity: VoiceToolDefinition = {
  name: 'commerce.update_cart_quantity', aliases: ['update_cart_quantity'],
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
      quantity: { type: "number", description: "The new quantity (0 to remove)" },
      kind: { type: "string", description: "The type of product: 'retail' or 'food'. Defaults to 'retail'." }
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
    
    const kind = args.kind === 'food' ? 'food' : 'retail';
    const res = await updateVoiceCartQuantity(session.user.personId, productId, qty, kind);
    return { ok: true, data: { message: 'Quantity updated.', newSubtotal: res.subtotal } };
  }
};

export const removeFromCart: VoiceToolDefinition = {
  name: 'commerce.remove_from_cart', aliases: ['remove_from_cart'],
  description: 'Remove an item from the cart.',
  domain: 'commerce',
  riskLevel: 'reversible',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      product_id: { type: "string", description: "Optional. The ID of the product to remove." },
      kind: { type: "string", description: "The type of product: 'retail' or 'food'. Defaults to 'retail'." }
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

    const kind = args.kind === 'food' ? 'food' : 'retail';
    const res = await removeVoiceCartItem(session.user.personId, productId);
    return { ok: true, data: { message: 'Item removed.', newSubtotal: res.subtotal } };
  }
};

export const prepareCheckout: VoiceToolDefinition = {
  name: 'commerce.prepare_checkout', aliases: ['prepare_checkout'],
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
  name: 'commerce.confirm_checkout', aliases: ['confirm_checkout'],
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
