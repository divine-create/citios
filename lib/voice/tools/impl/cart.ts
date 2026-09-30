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
  description: 'Add a food menu item or retail product to the cart. Always pass the product_id from the most recent search result. Also pass kind: "food" for restaurant items or "retail" for shop products.',
  domain: 'commerce',
  riskLevel: 'reversible',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      product_id: { type: "string", description: "The ID of the product or menu item from the search result." },
      quantity: { type: "number", description: "The quantity to add. Defaults to 1." },
      kind: { type: "string", enum: ["retail", "food"], description: "Required. 'food' for restaurant menu items, 'retail' for shop products." }
    },
    required: ["product_id", "kind"]
  },
  execute: async (args, session) => {
    const qty = args.quantity ? parseInt(args.quantity) : 1;
    const productId = args.product_id;

    if (!productId) return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'product_id is required. Run a search first to get the item ID.' } };

    // Auto-detect kind from DB if LLM fails to provide it
    let kind: 'retail' | 'food' = args.kind === 'food' ? 'food' : 'retail';
    if (!args.kind) {
      const { db } = await import('@/src/prisma/db');
      const menuItem = await db.orm.public.MenuItem.where({ id: productId }).first();
      if (menuItem) kind = 'food';
    }

    const res = await addVoiceCartItem(session.user.personId, productId, qty, kind);
    return { ok: true, data: { message: `Item added to cart (${kind}).`, newSubtotal: res.subtotal } };
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
  description: 'Calculates the final cart total and prepares for confirmation. If the user wants delivery, also pass delivery_address.',
  domain: 'commerce',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      delivery_address: { type: "string", description: "Optional. The full delivery address if the resident wants the order delivered." }
    }
  },
  execute: async (args, session) => {
    const res = await prepareVoiceCheckout(session.user.personId);
    let deliveryAddress: string | undefined = typeof args.delivery_address === 'string' ? args.delivery_address.trim() : undefined;
    
    // Auto-fetch from profile if not explicitly passed
    if (!deliveryAddress) {
      const { db } = await import('@/src/prisma/db');
      const profile = await db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first();
      if (profile?.defaultDeliveryAddress) {
        deliveryAddress = profile.defaultDeliveryAddress;
      }
    }

    // Phase 6: Explicitly start workflow
    const { startWorkflow } = await import('../../core/context');
    await startWorkflow(session.user.personId, res.checkoutId, {
      workflowId: res.checkoutId,
      action: 'confirm_checkout',
      domain: 'commerce',
      confirmationId: res.checkoutId,
      deliveryAddress,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString()
    });
    
    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'AWAITING_CONFIRMATION', currentWorkflowId: res.checkoutId }
    });

    const deliveryNote = deliveryAddress ? ` Delivery to: ${deliveryAddress}.` : ' Pickup/Takeout order.';
    return { 
      ok: true, 
      data: {
        checkoutId: res.checkoutId, 
        totalAmount: res.totalAmount,
        itemCount: res.itemCount,
        deliveryAddress: deliveryAddress || null,
        instruction: `State the total of ${res.totalAmount} and ask the user to confirm.${deliveryNote}` 
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
    let deliveryAddress: string | undefined;

    if (ctx.activeWorkflows) {
      for (const key of Object.keys(ctx.activeWorkflows)) {
        const wf = ctx.activeWorkflows[key];
        if (wf.action === 'confirm_checkout') {
          if (!checkoutId) checkoutId = wf.confirmationId;
          if (wf.deliveryAddress) deliveryAddress = wf.deliveryAddress;
          break;
        }
      }
    }

    if (!checkoutId) return { ok: false, error: { code: 'MISSING_CHECKOUT_ID', message: 'Checkout ID is required.' } };
    
    const res = await confirmVoiceCheckout(session.user.personId, checkoutId, deliveryAddress);
    
    // Cleanup workflow
    await endWorkflow(session.user.personId, checkoutId);
    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'COMPLETED' }
    });

    const deliveryMsg = deliveryAddress ? ` A delivery has been dispatched to ${deliveryAddress}.` : '';
    return { ok: true, data: { message: `Order placed successfully.${deliveryMsg}`, orderData: res } };
  }
};
