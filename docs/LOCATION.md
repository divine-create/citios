# Location Architecture

## Principle: Location is NOT an Identity Boundary
A core architectural tenet of Citios is that **Platform identity is global**. Location is merely a contextual filter, not a hard partition.

- A person who lives in London and travels to Lagos must be able to use the same CityConnect app and the same underlying `User` account.
- A person must never need separate Citios accounts for different cities.

## The CityContext Model
The `City` table acts as a registry for active urban hubs.
```prisma
model City {
  id        String
  name      String
  slug      String   @unique
  country   String
  timezone  String
  currency  String
  organizations Organization[]
}
```

### Usage
1. **Discovery & Explore:** The Resident App uses the user's current or selected `City` to filter the Organizations, Events, and Community Feed posts visible on the home screen.
2. **Organization Registration:** When an `Organization` signs up, they are tied to a `City` (e.g., "CityConnect Lagos").
3. **Logistics Engine (CityDrive):** Tasks (rides, deliveries) are bound by physics to the local area, but the schema ties them to addresses, not strictly the `City` foreign key, allowing cross-city logistics if necessary.

## Financial Engine & Currency
While a `City` defines a default `currency`, a user's `Wallet` or a `Transaction` must explicitly specify its currency. The platform must support multi-currency or automatic fx conversion if a user from City A (USD) visits an organization in City B (NGN).

## Target Architecture Guidelines
Do not partition the `User` table by `City`.
Do not partition the `Wallet` table by `City`.
Do partition discovery feeds and search results by `City` via the `Organization` relation.
