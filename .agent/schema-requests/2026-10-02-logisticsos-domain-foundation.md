# Request

## Agent
Antigravity LogisticsOS Specialist

## Problem
LogisticsOS currently relies on a `DeliveryJob` model that is tightly coupled to `RestaurantOrder` and assumes peer-to-peer delivery (`driverId` -> `Person`). This prevents LogisticsOS from acting as a multi-vertical provider network capable of onboarding logistics companies, assigning fleets, and integrating with ShopOS, HealthOS, and ServiceOS.

## Existing Models
`DeliveryJob`: Contains `restaurantOrderId`, `driverId`.
`Task`: Exists in CITYDRIVE, but does not support B2B provider networks (only links to the originating Organization e.g. a restaurant).

## Proposed Change
1. Add `LogisticsFleet` to represent fleets owned by a Provider (`Organization`).
2. Add `LogisticsVehicle` to represent vehicles belonging to a Provider/Fleet.
3. Add `LogisticsDriverProfile` to link a canonical `Person` to a Logistics Provider.
4. Replace `DeliveryJob` with a provider-neutral abstraction (`sourceType` enum, `sourceId`) and link it to the provider.
5. Add `DeliveryAssignment`, `DeliveryTrackingEvent`, and `ProofOfDelivery` foundations.
6. Add new Enums: `DeliverySourceType`, `DeliveryStatus`, `AssignmentStatus`, `LogisticsDriverStatus`, `VehicleStatus`.
7. Keep `restaurantOrderId` and `driverId` on `DeliveryJob` as optional fields to support existing mock endpoints gracefully.

## Reason
Phase 1 of LogisticsOS requires a provider-neutral domain foundation so that subsequent phases (dispatch, pricing, tracking, and UI) have safe tenant boundaries and can accept delivery requests from any vertical.

## Dependencies
None. Cross-vertical models (ShopOS, RestaurantOS) are unmodified and the legacy `restaurantOrderId` allows `app/actions/logistics.ts` to continue functioning.

## Migration Risk
Low. Existing properties were made optional or retained for compatibility.

## Alternatives Considered
- Using `Task`: Rejected because `Task` lacked B2B provider logic, and modifying it to support multiple nested provider organizations would be messy compared to establishing clear logistics-specific fleet/vehicle structures.

## Testing
`lib/actions/logisticsos.test.ts` added to verify schema structure, single-provider constraints, and valid lifecycle enumerations.
