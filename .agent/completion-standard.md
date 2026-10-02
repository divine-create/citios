# CityOS OS Completion Standard

Every applicable OS must be evaluated end-to-end.

Required business lifecycle checks:

1. Discovery
2. Registration
3. Configuration
4. Operations
5. Transaction
6. Payment
7. Fulfillment
8. Tracking
9. Completion
10. Settlement
11. Analytics

Also require verification of:

- authentication
- authorization
- tenant isolation
- location isolation
- validation
- error handling
- loading states
- empty states
- concurrency
- idempotency
- transaction integrity
- server-side calculations
- notifications
- responsive UI
- accessibility where applicable
- deterministic tests

Require:

npm run test

and:

npm run build

before an agent can report COMPLETE.

Require regression tests for confirmed bugs.

Reject:

- mock production data
- hardcoded users
- hardcoded organization IDs
- client authorization
- fake payment confirmation
- fake order completion
- development-only bypasses

Definition of Done must require:

- audit completed
- existing functionality preserved
- missing functionality implemented
- broken functionality fixed
- security reviewed
- tests added
- tests passing
- build passing
- cross-domain dependencies documented
- no unrelated vertical changes
- branch ready for integration
