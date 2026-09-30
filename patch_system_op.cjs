const fs = require('fs');

let code = fs.readFileSync('lib/voice/tools/impl/system.ts', 'utf8');

code += `
export const getOperationStatus: VoiceToolDefinition = {
  name: 'get_operation_status',
  description: 'Checks the reconciliation status of a previously initiated operation (e.g., checkout, service request) if a timeout or unknown result occurred.',
  domain: 'system',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      operation_id: { type: "string", description: "The operation ID or idempotency key to check." }
    },
    required: ["operation_id"]
  },
  execute: async (args, session) => {
    // Phase 6 Reconciliation logic
    // Check Orders for idempotency
    const order = await db.orm.public.Order.where({ idempotencyKey: args.operation_id, personId: session.user.personId }).first();
    if (order) {
      return { ok: true, data: { status: 'COMPLETED', safeToRetry: false, message: 'The transaction was successfully processed.' } };
    }
    
    // Check pending checkouts
    const pendingCheckout = await db.orm.public.CartCheckout.where({ idempotencyKey: args.operation_id }).first();
    if (pendingCheckout) {
      return { ok: true, data: { status: 'PENDING', safeToRetry: true, message: 'The transaction has not been confirmed yet.' } };
    }

    return { ok: true, data: { status: 'UNKNOWN', safeToRetry: false, message: 'Could not find a deterministic outcome for this operation. A human operator may need to review.' } };
  }
};
`;

fs.writeFileSync('lib/voice/tools/impl/system.ts', code);
