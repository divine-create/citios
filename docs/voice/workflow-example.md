# CityOS Workflow Example: Commerce

This document illustrates how the CityOS Voice Workflow engine safely coordinates a multi-step commerce request without bypassing Phase 8.1 protections.

## The Request
**Resident:** *"Find bottled water and add two to my cart."*

## 1. Intent Capture & Planning
Instead of executing a single hardcoded tool, the `system.start_workflow` tool is called by the LLM. 
The internal Gemini 2.5 Planner takes the intent and generates a bounded `WorkflowPlan`:

```json
{
  "workflowType": "commerce_search_and_add",
  "steps": [
    {
      "id": "search_step",
      "toolName": "commerce.search_products",
      "arguments": { "query": "bottled water" }
    },
    {
      "id": "add_step",
      "toolName": "commerce.add_cart_item",
      "arguments": { "productId": "{{search_step.output.products.0.id}}", "quantity": 2 },
      "dependsOn": ["search_step"]
    }
  ]
}
```

## 2. Server-Controlled Execution
The Workflow Engine (`workflow-engine.ts`) receives the plan and creates a database-locked `VoiceWorkflow` state.

It executes the steps sequentially, passing the resolved arguments to the `executeTool` orchestrator.
1. **Search**: Runs `executeTool("commerce.search_products")`.
2. **Handoff**: The engine maps `{{search_step.output.products.0.id}}` to the actual product ID found in the first step.
3. **Execution**: Runs `executeTool("commerce.add_cart_item")`.

## 3. Dealing with Ambiguity
If the search result returned multiple equally probable matches, `commerce.add_cart_item` might receive ambiguous data. If the tool is designed safely, it returns a `MISSING_INFORMATION` error rather than mutating state. 
The Engine transitions the workflow to `WAITING_FOR_INPUT` and the Voice LLM explicitly asks the user which one they meant.

## 4. Revalidation of Stale State
Because `executeTool` invokes the underlying `commerce.add_cart_item` function organically, the tool queries the Prisma backend in real-time. If the product price changed or inventory dropped between the planner running and the step executing, the actual backend logic rejects or updates the cart properly.

## 5. Final Result
The workflow returns a `COMPLETED` state and the final outputs are passed back to AssemblyAI, allowing the Voice Agent to say:
*"I've found the Spring Bottled Water and added 2 to your cart. Is there anything else?"*
