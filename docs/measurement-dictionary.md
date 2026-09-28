# CityOS Measurement Dictionary

This document defines the canonical metrics exposed in the HQ Analytics Dashboard to ensure consistency across the platform.

## Architectural Principles

1. **Canonical Records > Behavioral Events**: Whenever possible, analytics are derived from actual business records (e.g., `Person`, `Organization`, `Payment`).
2. **Behavioral Layer**: `MeasurementEvent` is strictly reserved for actions that do not produce permanent state changes (e.g., searches, views).
3. **No Surveillence**: HQ does not track raw behavioral histories per user unless strictly for authorized operational debugging.

---

## 1. Platform Metrics

### Total Users
* **Definition**: Number of canonical `Person` records.
* **Source**: `db.orm.public.Person`
* **Type**: Canonical business metric.
* **Timestamp**: `createdAt`

### Total Organizations
* **Definition**: Number of canonical `Organization` records.
* **Source**: `db.orm.public.Organization`
* **Type**: Canonical business metric.
* **Timestamp**: `createdAt`

---

## 2. Financial Metrics

### Payment Volume
* **Definition**: Total monetary value of all `Payment` records created within the period, regardless of successful final settlement.
* **Source**: `db.orm.public.Payment.amount`
* **Type**: Canonical financial metric.
* **Timestamp**: `createdAt`

### Payment Count
* **Definition**: Total number of `Payment` records initialized in the period.
* **Source**: `db.orm.public.Payment`
* **Type**: Canonical financial metric.
* **Timestamp**: `createdAt`

---

## 3. Commerce Metrics

### Retail Orders
* **Definition**: Number of orders placed via ShopOS/CityMart.
* **Source**: `db.orm.public.RetailOrder`
* **Type**: Canonical business metric.
* **Timestamp**: `createdAt`

### Restaurant Orders
* **Definition**: Number of orders placed via RestaurantOS.
* **Source**: `db.orm.public.RestaurantOrder`
* **Type**: Canonical business metric.
* **Timestamp**: `createdAt`

---

## 4. Search Intelligence

### Search Count
* **Definition**: Number of times the universal discovery search was executed.
* **Source**: `db.orm.public.MeasurementEvent` (where `eventType = 'SEARCH_PERFORMED'`)
* **Type**: Behavioral event.
* **Timestamp**: `occurredAt`

### Zero-Result Rate
* **Definition**: Percentage of searches that returned zero matching organizations or products.
* **Source**: `MeasurementEvent.metadata.zeroResult === true`
* **Type**: Derived behavioral metric.

### Top Search Terms
* **Definition**: Most frequently queried terms in discovery.
* **Source**: `MeasurementEvent.metadata.query`
* **Type**: Derived behavioral metric.
* **Privacy Considerations**: Query strings are stored, but stripped of user attribution when displayed in aggregates.
