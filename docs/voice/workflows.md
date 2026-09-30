# CityOS Voice Workflows

The CityOS Voice Workflow Engine provides a bounded, multi-step orchestration layer on top of the Phase 8.1 Voice Module architecture. It securely transforms a resident's complex goal into a sequence of safe backend operations.

## Core Principles

1. **Bounded Execution:** Workflows have a strict maximum number of steps (10) to prevent infinite LLM loops. 
2. **Server-Controlled Transitions:** State transitions (e.g., `RUNNING` → `WAITING_FOR_CONFIRMATION` → `COMPLETED`) are strictly managed by the backend engine, not the LLM.
3. **No Auth Bypass:** The workflow engine calls `executeTool` natively, preserving all Phase 8.1 security protections (authentication, module authorization, schema validation, and confirmation barriers).
4. **Dependency-Aware Handoff:** Output from Step 1 can be dynamically injected into the input of Step 2 using the syntax `{{step-1.output.field}}`.
5. **Irreversible Action Gating:** Any step mapped to an irreversible action automatically halts the workflow and enters a `WAITING_FOR_CONFIRMATION` state. Only explicit user consent can inject the single-use token to resume execution.

## Architecture Flow

```text
User Intent
    ↓
system.start_workflow
    ↓
Workflow Planner (Gemini)
    ↓
Workflow Engine (createWorkflow & advanceWorkflow)
    ↓
Tool 1 -> Tool 2 -> Tool 3 (with dependency resolution)
    ↓
Confirmation / Clarification Barriers
    ↓
Final Result
```

## Creating a New Workflow

Developers do not need to "code" individual workflows. Instead, developers register well-defined, domain-authoritative **Tools** via `moduleRegistry`. 

If a tool has `orchestrationEligible: true`, the AI Workflow Planner can dynamically compose it into a plan when a user asks for a complex action that requires it.

See [Workflow Contract](./workflow-contract.md) for details on writing safe tools.
