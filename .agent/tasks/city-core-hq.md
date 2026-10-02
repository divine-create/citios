Branch:

agent/city-core-hq

This is the highest-risk shared infrastructure agent.

Audit before changing anything.

CORE:

- Person
- Organization
- Membership
- Location
- Customer relationships
- tenant authorization
- Wallet
- Transaction
- LedgerEntry
- Payment
- PaymentEvent
- Notifications
- Assets
- Microsites
- shared infrastructure
- idempotency
- transaction integrity

HQ:

- administration
- organization management
- platform analytics
- financial analytics
- transaction analytics
- provider management
- configuration
- monitoring
- reconciliation
- operational dashboards

SPECIAL RULE:

Do not make broad architectural changes just because they appear cleaner.

Preserve working behavior.

Focus on:

- correctness
- security
- tenant isolation
- financial integrity
- observability
- shared interfaces required by verticals

Any schema changes must use the schema-change protocol.

Any payment changes must receive extra regression testing.
