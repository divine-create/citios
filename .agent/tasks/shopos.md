# ShopOS Agent Task

Branch:

agent/shopos

Mission:

Make the existing ShopOS implementation production-ready and end-to-end complete.

IMPORTANT:
Do NOT assume ShopOS is missing.
Audit the existing repository first.

Audit:

- routes
- components
- server actions
- database models
- authentication
- tenant isolation
- merchant registration
- shop configuration
- products
- categories
- variants
- inventory
- pricing
- discounts
- cart
- checkout
- payment
- orders
- fulfillment
- logistics integration
- merchant dashboard
- resident experience
- notifications
- analytics
- tests

Target lifecycle:

Discover
→ Shop
→ Product
→ Cart
→ Checkout
→ Payment
→ Order
→ Merchant Processing
→ Fulfillment
→ Delivery
→ Completion
→ Settlement
→ Analytics

Do not rebuild working functionality.

Identify:

- implemented
- partially implemented
- broken
- missing

Then implement the highest-value gaps.
