# CityOS Schema Change Protocol

src/prisma/contract.prisma

is the canonical database contract.

Before modifying schema, an agent must determine:

1. why existing schema is insufficient
2. whether existing model can be reused
3. whether change belongs to its domain
4. whether another agent depends on it
5. whether change affects shared infrastructure

Schema requests go in:

.agent/schema-requests/

Use:

YYYY-MM-DD-agent-short-description.md

# Request

## Agent

## Problem

## Existing Models

## Proposed Change

## Reason

## Dependencies

## Migration Risk

## Alternatives Considered

## Testing

Explicitly prohibit casually:

- deleting shared fields
- renaming shared models
- creating duplicate identity models
- creating duplicate payment models
- creating duplicate wallet models
- removing constraints to make tests pass

After approved changes:

npm run contract:emit
npm run test
npm run build
