# CityOS Voice Module SDK

The Voice Module SDK enables CityOS engineers to extend the Voice Platform without modifying the core orchestration engine. A Voice Module encapsulates capabilities (Tools), metadata, and validation policies.

## 1. Creating a Module

Every module must implement the `VoiceModule` interface defined in `lib/voice/core/policy.ts`.

Create a directory for your module under `lib/voice/modules/<name>/`.

## 2. Defining Tools

Each tool must implement the `VoiceToolDefinition` interface. 
Key properties:
- **name**: A globally unique snake_case name (e.g. \`get_city_events\`).
- **domain**: Matches your vertical (e.g. \`commerce\`, \`services\`, \`events\`).
- **riskLevel**: Dictates telemetry and rate-limiting (\`read\`, \`reversible\`, \`irreversible\`, \`financial\`, \`sensitive\`).
- **requiresConfirmation**: If true, the orchestrator will automatically enforce the \`AWAITING_CONFIRMATION\` state machine. The tool will not execute until the resident explicitly agrees.
- **inputSchema**: A JSON schema defining the arguments.
- **execute**: The asynchronous handler. It receives \`args\`, \`session\`, and an \`abortSignal\`.

## 3. Example Reference Implementation

\`\`\`typescript
// lib/voice/tools/impl/events.ts
import { VoiceToolDefinition } from '../../core/policy';
import { db } from '@/src/prisma/db';
import { pushRecentEntity } from '../../core/context';

export const getCityEvents: VoiceToolDefinition = {
  name: 'get_city_events',
  description: 'Look up upcoming public events.',
  domain: 'events',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" }
    }
  },
  execute: async (args, session, abortSignal) => {
    // Note: abortSignal can be used for long-running fetch requests
    
    // Perform authoritative backend query
    const events = await db.orm.public.Event.where({ status: 'PUBLISHED' }).all();
    const formatted = events.map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.date
    }));

    if (formatted.length > 0) {
      await pushRecentEntity(session.user.personId, {
        type: 'EVENT',
        id: formatted[0].id,
        label: formatted[0].name
      });
    }

    return { ok: true, data: formatted };
  }
};
\`\`\`

\`\`\`typescript
// lib/voice/modules/events/index.ts
import { VoiceModule } from '../../core/policy';
import { getCityEvents } from '../../tools/impl/events';

export const eventsModule: VoiceModule = {
  id: 'events',
  name: 'CityEvents Module',
  description: 'Reference module for querying events.',
  version: '1.0.0',
  tools: [getCityEvents]
};
\`\`\`

## 4. Registration

To activate your module in production, import and register it in \`lib/voice/core/orchestrator.ts\`:

\`\`\`typescript
import { eventsModule } from '../modules/events';
moduleRegistry.registerModule(eventsModule);
\`\`\`

## 5. Security Principles

1. **Never fabricate facts.** Return authoritative data.
2. **Never trust client IDs.** Always authorize operations against the \`session.user.personId\`.
3. **Use Idempotency.** Write operations must safely tolerate duplicate requests or timeouts.
