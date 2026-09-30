# Voice Workflow Contract

To make a tool eligible for automated Workflow Planning, it must be properly declared in its `VoiceModule`.

## Eligibility

A tool is orchestration-eligible by default unless explicitly disabled:
```ts
export const addVoiceCartItem: VoiceToolDefinition = {
  name: 'commerce.add_cart_item',
  description: 'Add a product to the resident\'s cart. Be sure you know the exact productId.',
  orchestrationEligible: true, // Enables the LLM planner to include it in a workflow
  // ...
};
```

Set `orchestrationEligible: false` for system tools (like cancellation or starting a workflow itself) that the AI should call directly but not weave into multi-step plans.

## Handling Ambiguity / Clarification

If your tool cannot proceed because it needs more information, do NOT fail the workflow. Instead, return a `MISSING_INFORMATION` error code:

```ts
if (!args.productId) {
  return { 
    ok: false, 
    error: { 
      code: 'MISSING_INFORMATION', 
      message: 'Which specific product would you like to add?', 
      missingFields: ['productId'] 
    } 
  };
}
```
The Workflow Engine will catch this, pause the workflow (`WAITING_FOR_INPUT`), and have the Voice LLM ask the user the question in `message`.

## Confirmation Barriers

If the tool modifies state irreversibly (e.g., checkout, bookings), you must flag it with:
```ts
riskLevel: 'irreversible',
requiresConfirmation: true
```
The underlying `executeTool` orchestrator natively halts execution and returns `CONFIRMATION_REQUIRED` before your `execute` function even runs. The Workflow Engine will catch this, pause the workflow (`WAITING_FOR_CONFIRMATION`), and wait for the user to say "Yes".

Once the user says "Yes", a single-use token is generated, the step runs, and the token is instantly destroyed to prevent replay attacks.
