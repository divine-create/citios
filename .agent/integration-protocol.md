# CityOS Integration Protocol

main
├── agent/shopos
├── agent/restaurantos
├── agent/schoolos
├── agent/hotelos
├── agent/logisticsos
├── agent/healthos
├── agent/services-workos
├── agent/resident-experience
└── agent/city-core-hq

Define what each agent must provide before integration:

- summary
- existing functionality
- changes
- database changes
- shared changes
- tests
- build result
- known issues

Define merge requirements:

- build passes
- tests pass
- no unresolved TypeScript errors
- no critical security issue
- no unrelated changes
- schema changes documented
- cross-agent dependencies documented

Define conflict resolution.

Never blindly choose "ours" or "theirs".

For schema conflicts:

1. inspect both changes
2. understand requirements
3. reconcile them
4. preserve constraints
5. update dependent code
6. regenerate contract
7. test

Define cross-platform integration testing.

Examples:

Resident
→ Merchant
→ Order
→ Payment
→ Logistics
→ Delivery
→ Settlement

Resident
→ Service Provider
→ Booking
→ Payment
→ Completion
→ Settlement
