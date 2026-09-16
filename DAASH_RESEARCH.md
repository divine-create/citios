# Daash — Authorized Product Teardown

Research for CityConnect / ShopOS strategy. Conducted 16 Sep 2026 against the **live production** Daash product, on an **authorized account**, using read-only (GET) API calls, the official marketing site, and the production front-end bundles — not just marketing assumptions.

## Method & provenance

- **Marketing site**: `https://daashapp.co/` (hero, features, benefits, pricing, testimonials, FAQ, footer) — full text captured 16 Sep 2026.
- **Live merchant app**: Nuxt SPA at `https://app.daashapp.co/`; all UI copy below mined from the production JS bundles; merchant behavior exercised via the JSON API at `/api/v1/*` (Nitro proxy) against a fresh, authorized test business.
- **Ground-truth shapes** come from successful live responses (e.g. `orders`, `customers`, `financial/wallet`, `invoice/settings`, `subscription/plans`, `delivery`, `menu/collections`, `inventory/categories`, `inventory/units`, `ai-chat/conversations`, `orders/export` CSV).
- **Limits**: no rendered screenshots (CLI-only session); the account is brand-new, so some parts (products, discounts, invoices paid) were validated from UI copy + endpoints rather than populated flows; several guessed routes 404 and some feature clusters return 500 serverside (noted where relevant — that is itself a product finding).

Use the section numbering below as the 15-part breakdown.

---

## 1. Company summary & market positioning

Daash is a Nigerian "commerce operating system" for small retail and food businesses: online storefront + inventory + orders + physical POS + customer CRM + finance, all in one dashboard.

- **Hero**: *"Run your Retail store business like a pro"*; sub-copy *"Sell online and in-store with Daash. Create your online store, track inventory, manage orders, and record offline sales with POS, all from one dashboard."* Primary CTA: *"Try Daash free"*.
- **Channels**: web (Nuxt SPA) + mobile-responsive; positioning line on site: *"Full power on mobile. Full power on web. One unified dashboard that moves with you."*
- **Market**: *"Used by retail stores, food brands, and small businesses across Nigeria to manage sales, stock, and orders."* Demo customer logos: Grill Shack, Spicy Corner, Wings Bistro, Papa's Grill, City Subs. Testimonial from *Oluwadamilola Asumah, CEO, Wings Bistro*.
- **Keyboard facts**: `© 2026 Daash`, *"Built for teams that move fast."* Contact: `+234 806 4432 187`, `hello@daashapp.co`. Docs at `docs.daashapp.co`; freshness: account created 15 Sep 2026 — actively signing up users.
- **Business model**: 4-tier freemium SaaS in NGN (see §9), auto-renewal defaulted on.

## 2. Product overview (what it actually is)

Two connected surfaces under one brand:

1. **Merchant admin ("Daash Admin")** — the thick-client retail management app (this teardown's focus): catalog/menu, inventory, orders, delivery, discounts, customers, loyalty, marketing messages, finance (wallet/payment links/invoices), team & roles, branches (multi-location with an HQ concept), reports, settings, and an AI assistant chat.
2. **Storefront ("Sub website")** — a per-branch public online store that "pulls directly from" the catalog/menu. Set-up is a small wizard: **General / Branding / Delivery** (+ domains & site settings). Custom domains on Growth+, custom branding on Pro. Branches can be hidden/shown on the storefront.

Supporting rails seen live:
- **Payments**: Paystack (inline/browser only), virtual accounts so customers *"pay you online"*, per-branch wallets, settlement accounts, subscription auto-charge from wallet.
- **Realtime**: Pusher presence/private channels; in-app announcement/alerts system with CTA links.
- **Integrations**: local delivery aggregators **Chowdeck** and **Glovo** (`settings/integrations/chowdeck`, `settings/integrations/glovo`).
- **AI assistant**: chat endpoints exist (`ai-chat/conversations`, `/messages`, `/search`, `/{id}/stream`) with suggested prompts (*"Analyze my sales trends and give me insights."*) — but the marketing config flag `askAiEnabled: false` means it is switched off for normal merchants today.

A fresh signed-up account arrives with: a business (type Retail, Nigeria), one HQ branch, a zero-balance wallet with no provisioned bank account yet, an invoice config (INV/0001, CN credit notes, 30-day terms, reminders 7/3/1 days, no auto-generation), an empty orders/customers/delivery/inventory, and **auto-subscribed to the free Starter plan** with the 8-task onboarding checklist open.

## 3. Merchant journeys & onboarding

Signup flow observed end-to-end:
1. Email verification → *"Email verified — let's set up your business"*.
2. Business wizard (`onboarding/business`): business name, industry/type, currency, country/state, contact, and a **discovery/marketing-source field** (`discoveryChannel` — stored values include "Pintrest" with the merchant-facing typo intact, i.e. their own form).
3. Plan step (`onboarding/plan`) → **Starter auto-subscription** present in code (`[onboarding] Starter auto-subscribe failed`) with welcome copy *"Your business is all set up. The Starter plan is free forever — upgrade any time to unlock more locations, staff, products and advanced features."* and toast *"You're on the Free plan — welcome aboard!"*
4. Admin app with the **onboarding checklist**: 8 tasks, each with an explanation and a one-tap CTA. Exact live copy:

| # | Task | Explainer (verbatim) | CTA |
|---|------|---------------------|-----|
| 1 | Add your first products | "Build your product catalogue with variants, prices, and images so customers can browse and order what you sell." | Add products |
| 2 | Track your stock levels | "Link products to inventory so Daash can automatically update stock counts when orders come in." | Set up stock |
| 3 | Activate payments | "Generate a virtual account so customers can pay you online." | Set up payments |
| 4 | Set up your storefront | "Add your logo, colours, and brand assets to your online presence." | Customise storefront |
| 5 | Create your first order | "Try the full order workflow before customers do." | Go to orders |
| 6 | Invite team members | "Add staff, assign roles, and let your team manage operations." | Invite members |
| 7 | Add your first customer | "Create a customer profile to start tracking purchase history and loyalty." | Go to customers |
| 8 | Create a discount | "Set up a promo code or automatic discount to drive your first sales." | Create discount |

Progress: *"2 of 8 tasks completed 25%"*; widget title *"Welcome, [name] — let's get you set up … You can come back any time."* The checklist is **draggable/reorderable** in code (*"Onboarding: X of Y done. Drag to move, or open setup guide."*). Merchants with no branch see *"Create your first branch to start tracking orders + inventory."*

**Takeaway for ShopOS**: Daash converts via a *friction-lowering* checklist where each step explains *why* ("so you never run short", "so customers can pay you online") and has a direct CTA. ShopOS's ShopOnboardingWidget maps 1:1 to this pattern; worth mirroring the explainer + per-task CTA + 1-tap dismiss.

## 4. POS & offline sales

- **POS channel** has its own settings surface (`pos-channel/settings`) and is alias'd in the app as *point of sale / terminal / cashier*.
- Checkout UX: tap items, **quick checkout**, **cashier mode**, **receipts** (a dedicated print routine — `window.focus(); window.print()` with a toast *"Allow pop-ups to print the receipt."*), **stock sync** after each sale.
- **Multiple payment methods** on Growth+ (cash with change calc, card, wallet; "Choose wallet or card and apply an optional coupon." is seen in checkout contexts). Paystack inline (browser-only, not server).
- In-code annotations reveal **POS order handling is a legacy code path**: *"Edit customer / delivery apply to POS orders only on the backend…"* and *"Change delivery type or address. Legacy applies this to POS orders only."* — i.e. online-order edits are newer; POS editing was bolted onto the old (legacy) backend. This is an **inherited debt / product smell** worth noting (see §11).

## 5. Information architecture & navigation

Sidebar (from the shipped dashboard shell):

```
Dashboard
Analytics
Manage        Orders  Products  Delivery
Grow          Discounts  Customers  Marketing  Customer Loyalty
Finance       Wallet  Payment links  Invoices
Apps          POS channel  Storefront  Connected apps
```

Top bar: **global search** (⌘K — *"Search. Keyboard shortcut Command K."*), **Notifications & Help** panel (keyboard-hotkey) hosting announcements with CTA link/URL + dismiss, and an **AI assistant** toggle (label present, feature flagged off).

Supporting surfaces (foundational API map, ties to IA):
- Menu/kitchen: `menu/category`, `menu/item`(+create), `menu/collections`, `menu/modifiers`(+create), `menu/overview`
- Products: `products/inventory`, `products/items`, `products/categories`, `products/collections`, `products/units`; inventory: `inventory/categories`, `inventory/items`, `inventory/units`, `inventory/sub-recipes`
- Invoices: `invoice/all-invoices`, `invoice/create`, `invoice/edit/:id`, `invoice/public/:id`, `invoice/recurring-invoices`(+create/edit), `invoice/settings`
- Storefront: `sub-website/domains`, `sub-website/set-up/{general,branding,delivery}`, `sub-website/site-settings/`
- Settings: `settings/general`, `settings/branches(/:id)`, `settings/members`, `settings/roles`, `settings/security`, `settings/notifications`, `settings/subscription`, `settings/integrations(chowdeck|glovo)`, `settings/settlement`, `settings/api-keys`, `settings/oauth-clients`, `settings/web-hook`, `settings/scripts`, `settings/preference`, `settings/profile`
- Reports: `report/sales-by-product(-final-report)`, `report/sales-by-attendant(-final-report)`, `report/product-cost(-variance)(-final-report)`, `report/inventory-end-of-day(-final-report)`, `report/inventory-variance`
- Misc: `analytics/compare`, `invites/accept`, `message/alerts`, `message/create-emails`, `apps/relay`, `pusher/auth`, `pusher/user-auth`, `pos-channel/settings`, `customer-loyalty/{manage,setup,members/}`

## 6. Orders

- List view with **status filter**, cursor pagination (`/orders` → `{orders, cursor}`), *"End of orders"* marker, and tailored empty state (*"No orders yet"* / *"New orders will appear here automatically when customers place them at this branch."*).
- Order cards carry `reference`, `customerName`, `isScheduled` (delivery-time scheduling), amount; row actions seen: **Accept order**, **Approve refund** (pending-refund state object on the order), **Void order**, **Delete order**, **Print receipt**, edit customer / edit delivery (POS-only via legacy path).
- **Rejection flow with customer-facing reason**: *"Why is this order being rejected? The customer sees this."*
- **Delivery module** (`/delivery` → deliveries + paginated meta, plus `orders/export` CSV confirmed): delivery type + address, **Delivery area (logistics tag)**, Delivery fee (NGN) per storefront, scheduled orders, over-the-top for a small-merchant POS to own delivery dispatch (ties to Citios CityDrive opportunity, §15).

## 7. Inventory

- Model depth is a **strong differentiator**:
  - Items (`inventory/items`, `products/items`) with **units** (`inventory/units`), categories, collections, variants (Growth+), **modifiers** and **sub-recipes** (composite items/recipes).
  - Item actions (live UI): Add item, View item details, Edit item, **Add more stock**, **Deduct stock**, **Transfer item**, **Deactivate item**; bulk row ops: **Bulk transfer, Bulk activate, Action deactivate**. Cross-branch copy reports counts: *"inventory (X new, Y updated, Z skipped)"*.
  - Auto-deduct on every order: *"Add ingredients and raw materials to your inventory. Daash automatically deducts stock as orders come in so you never run short."* (task copy).
  - **Recipe costing** for food merchants: *"Compare ideal product cost (from recipe) vs actual cost from sales data."* plus `report/product-cost`, `report/inventory-variance`, `report/inventory-end-of-day`.
  - Visibility controls: *"Hidden from the public storefront."* / *"Make private"*, and `publishedAt` scheduling (draft/publish/publish-time).
- Levels of openness per plan: inventory tracking & reports free; low-stock alerts Pro+; CSV inventory import & bulk product import Pro+; batch operations Growth+; branch transfers Growth+.

## 8. Storefront (Sub website)

- Per-branch public site; setup wizard **General / Branding / Delivery** (matches the 3 marketing checklist steps). Branding: *"Add your logo, colours, and brand assets to your online presence."* Domains: custom domain management + *"Custom domain included"* on Growth.
- "Just works" pitch: *"Create a clean, professional online store in minutes. Add products, share your store link, and start selling customers online, anytime, from anywhere. Instant storefront · Product catalog · Online orders · Secure checkout."*
- Merchandising controls on the branch: hide/show branch from storefront (*"The branch will be hidden from your public storefront. Existing customers + orders are unaffected."*); deactivated branches are removed from the storefront; HQ branch semantics (§12).
- Expected URL shapes exist (`sub-website/domains`, `sub-website/site-settings/`) though I could not create a live store link on a free plan from a fresh account — storefront renders from `menu/*` and `products/collections`.

## 9. Pricing

Full plan matrix **read live from the subscribed plans API** (trust-source, matches marketing site). Prices NGN.

| | Starter | Growth | Pro | Enterprise |
|---|---|---|---|---|
| Price/mo | **₦0 (free forever)** | ₦12,500 | ₦30,000 ★rec | from ₦200,000 |
| Quarterly | — | ₦31,500 | ₦81,000 | ₦540,000 |
| Annual | — | ₦114,000 | ₦300,000 | ₦1,800,000 |
| Trial | none | 14 days | 14 days | none |

**Feature gates (verbatim flags from plans API; ●=on, ○=off):**

| Feature | S | G | P | E |
|---|---|---|---|---|
| Inventory tracking / inventory reports | ● | ● | ● | ● |
| Product categories / variants | ● / ○ | ● / ● | ● / ● | ● / ● |
| Recipes: sub-recipes & modifiers (basic→advanced) | ○/○ | ●/○ | ●/● | ●/● |
| Discounts basic / coupon codes / advanced promotions / loyalty | ○ | ●/●/○/○ | ●/●/●/● | ●/●/●/● |
| POS basic / advanced / POS reports | ●/○/● | ●/●/● | ●/●/● | ●/●/● |
| Payment methods multi / gateways multi / settlement accounts | ○/○/1 | ●/●/3 | ●/●/5 | ●/●/∞ |
| Online store basic / custom / custom domain / SEO / branding | ●/○/○/○/○ | ●/●/●/●/○ | ●/●/●/●/● | ●/●/●/●/● |
| Messaging: basic / SMS / email + push notifications | ●/○/● | ●/●/● | ●/●/● | ●/●/● |
| Reports: basic / full / custom / data export / report window | ●/○/○/○/7d | ●/○/○/●/30d | ●/●/●/●/∞ | ●/●/●/●/∞ |
| Inventory: low-stock / batch ops / bulk & CSV import / branch transfers | ○ | ●/●/○/● | ●/●/●/● | ●/●/●/● |
| Locations & branches / staff per location / total members / admins | 1/0/1/1 | 2/∞/5/2 | 5/5/25/5 | ∞/∞/∞/∞ |
| Products max | 10 | ∞ | ∞ | ∞ |
| External integrations / delivery integrations | 1 / ○ | 3 / ○ | ∞ / ● | ∞ / ● |
| API: limited / full / webhooks | ○ | ○ | ●/○/○ | ●/●/● |
| Role management / advanced permissions | ○ | ●/○ | ●/● | ●/● |
| Support | email | email | priority | dedicated account manager |

Notable gates: even **basic discounts require the ₦12.5k plan**; loyalty is Pro-only; the free plan's 10-product/1-staff ceilings are the upsell levers. **Billing detail**: signup defaults `autoRenew: true`, method wallet; invoice-saved payment terms 30 days; coupon application at subscription checkout works too.

## 10. GTM, marketing funnel & positioning assets

- **Funnel**: free try (no card) → onboarding checklist → self-serve upgrade (Paystack inline) → "Contact Sales" for enterprise.
- **Demo data is deliberately Nigerian-local**: customer names (Adaeze Okafor ₦428,000, Chinedu Bello ₦214,500, Funke Adebayo ₦186,200), products (Garri (Ijebu) ₦2,400, Rice ₦3,800), KPIs (*Revenue ₦1,842,000 +12.4%, Sales today 342 +8.1%*), currency NGN — strong localization proof.
- **Team-roles demo**: Admin / Editor / Viewer invites (with emails) — three tier previews role management.
- **Layers**: hero → 3 benefit sections (Online store / Inventory & sales / POS) → 6 feature cards (store builder, customer follow-ups with example "Update sent to 248" broadcast, team roles, POS, unified dashboard, integrations) → integrations → pricing w/ Monthly/Quarterly/Yearly toggle → testimonial → community (Instagram, Facebook, **YouTube walkthroughs**) → FAQ (What is Daash / which businesses / sell online / inventory / offline sales) → footer CTA.
- **Community/cadence**: *"NEW POSTS WEEKLY"* on Instagram, Facebook for news/events, YouTube for product walkthroughs. Marketing leans on short-form video + local SMB case studies.
- **Trust/footer links**: Help Center, Status, Security, Privacy, Terms — a run-of-mill but complete trust footer.
- No reviews/ratings shown on site; no app-store presence advertising a mobile app directly (PWA-friendly web app observed instead; "app" is the web dashboard).

## 11. UX & design

- **Stack signals**: Nuxt/Vue SPA, Tailwind v4 design tokens (alert system with success/warning/information/destructive/neutral/feature variants), Combobox/Select primitives, toast provider, custom announcement system with CTA link + `announcementId`.
- **Good UX decisions**: ⌘K global search; hotkey-hinted notifications panel; explainer copy on every onboarding task; *"Orders 12"* count badges in the sidebar demo; empty states that teach the next action; receipt printing via purpose-built print view; drag-to-reorder onboarding checklist; deactivate (soft) vs remove (hard, kills sessions) distinction for members and branches.
- **Copy quality**: consistent, energetic, casual-professional brand voice; *"Built for teams that move fast."*
- **Product debt visible (signals)**: ① UI strings leak engineering terms — *"Legacy applies this to POS orders only"*, *"on the backend"*, and helpful-but-developer-y helpers like *"Pick a new suggestion to change the saved location. Renaming alone leaves the address untouched."*; ② onboarding source field stores the typo *"Pintrest"*; ③ several feature surfaces answered 500/404 to my probes (`customers/payments`, `customers/reviews`, `customers/loyalty`, `invoice/all-invoices`) — promising features that are half-wired behind the scenes; ④ the `products/items` list route didn't resolve while `inventory/categories` did (route-name drift between two backend generations — the "legacy vs new" split is a real architectural seam).
- **Accessibility/perf**: server-rendered marketing site w/ SPA app; heavy client bundles (~22MB minified chunks under the hood) — the app is not small, but it's an admin tool.

## 12. Architecture, integrations, security (observed)

- **Deployment**: Nuxt SPA on `app.daashapp.co`; Nitro proxy exposes `/api/v1/*` to the browser and fans out to **two DigitalOcean App-Platform backends**: a **legacy Express API** (`daash-legacy-api-…ondigitalocean.app`) and a newer API (`daash-api-new-…ondigitalocean.app`) — both hostnames shipped in the public Nuxt config. The legacy/new split explains the 404 drift above.
- **Auth**: email+password (class-validator shapes), short-lived JWT access cookie (**15 min**) + 30-day refresh cookie; OTP verification, two-factor (send-code/verify), sessions list, branch-switch (`auth/switch-branch`), password reset. Requests carry `X-Tenant-Id` + `X-Branch-Id` headers (multi-tenant + branch-scoped), and writes carry an **Idempotency-Key**.
- **RBAC**: server-enforced permission slugs (Super Admin = `"*"`); roles are user-definable (*"Define what this role can see and do."*); invites via token (`invites/accept`); deactivate vs remove.
- **Money rails**: Paystack (live pubkey in config), virtual accounts/DVA for payment in, per-branch wallets, settlement accounts (count per plan), subscription auto-charge from wallet, card-vw charge verification flow at card add.
- **Realtime**: Pusher private/presence channels with authorizer endpoints and client events; an internal "relay" service.
- **Integrations surface**: Chowdeck + Glovo delivery connectors; OAuth clients + API keys + webhooks + custom scripts visible in settings for API-tier plans; the marketing site lists *"Connect to 1 external app"* (Starter) / *"More external app integrations"* (Growth).
- **Trust notes**: no secrets exposed in my analysis; I did not attempt any write/payment action. The 15-min access cookie/refresh model is reasonable; the leaked backend hostnames in the public bundle lower security posture (worth calling out in competitive review).

## 13. Analytics & reporting

- Dashboard KPIs: revenue, sales today, week-over-week % deltas, top products, top customers.
- Report catalog (min. the shared surfaces): sales by product, sales by attendant (with **final-report** rollups), product cost (COGS per product over ranges), product cost variance (recipe ideal vs actual), inventory end-of-day, inventory variance; plus `analytics/compare` for period-vs-period.
- Export: CSV order export (confirmed working live); data export gated Growth+; custom reports Pro+; report history window 7d (free) / 30d (Growth) / unlimited (Pro+).
- AI assistant with sales-trend interrogation is fully designed but feature-flagged off.

## 14. Monetization, cadence & runway signals (analysis, flagged as inference)

- Pricing is tuned to Nigerian SMB price points with **free forever** ceiling-product friction (10 products, 1 member) — classic freemium-to-Growth conversion funnel.
- Trial strategy: 14-day trials on Growth/Pro only; annual discounts roughly -24%; "Recommended" flag on Pro.
- Product seemed moderately active in feature velocity (newer storefront + AI chat + enterprise API surfaces alongside legacy POS), but maintenance inconsistencies at the seams (multi-backend) suggest an early-stage team still consolidating architecture.
- Cadence/channel evidence: weekly social posts, YouTube walkthroughs, community channel strategy — content-led demand with self-serve signup; no advertising signals seen.
- *This section is my inference from the evidence above, not a company statement.*

## 15. Executive summary & implications for Citios ShopOS

**What Daash is**: a credible, Nigeria-localized, omni-channel retail commerce suite (online store + in-store POS + inventory + orders + finance + team) wrapped in a freemium tier that grows into a ₦12.5k–₦30k/mo anchored business. Its standout engineering-level insights for Citios: auto-deduct inventory tied to orders, per-branch wallet/settlement, HQ/multi-branch storefront visibility, recipe costing for food merchants, a "legacy vs new" backend that leaks into UX, and feature-gated depth (discounts/loyalty/API all upsells).

**Recommended ShopOS/ Citios actions, in priority order**:

1. **Copy the onboarding-checklist engine wholesale** (it is the biggest lever Daash uses on a new account): 8 explainer-backed tasks, one CTA each, draggable, dismissible. ShopOS already has ShopOnboardingWidget — close the gap by adding the *why* explainer text and the 1-tap CTA to the target screen for each task.
2. **Offer the money rails customers will expect**: virtual account for pay-in, per-branch wallets, settlement accounts, subscription auto-charge — Citios has Wallet/Transaction primitives; wire the same affordances so ShopOS isn't a paper POS.
3. **Own local delivery instead of integrating out**: Daash leans on Chowdeck/Glovo connectors; Citios has CityDrive (tasks/riders) built in. Bundled delivery dispatch + "Delivery area (logistics tag)" per store is a structural advantage over Daash's dependent posture.
4. **Push inventory depth as a wedge**: variants, units, sub-recipes, recipe-based COGS, low-stock alerts, bulk transfer between branches — Daash gates these; a free-forever ceiling on *capability* (not just seats/products) is a differentiated wedge for professional merchants.
5. **Multi-branch & HQ semantics out of the box** (branch storefront visibility, per-branch wallets, cross-branch inventory copy) — expected by anyone coming from Daash's 5-branch Pro tier.
6. **Pricing copy**: free tier ≈ Daash's (limit products+staff), then undercut Growth ₦12.5k with a ₦ equivalent-plus stack, and treat "Recommended" positioning + annual discounts as standard.
7. **Small differentiators worth mirroring**: ⌘K global search, per-task CTA checks, "Orders 12" count badges in nav, receipts that actually print, and local-Nigerian demo data (their Garri ₦2,400/₦1.8M revenue demo is bespoke — Citios demo data should be equally local).
8. **Do not copy**: the legacy/new backend seams leaking into UI strings, half-wired features (loyalty/reviews 500s), and the "Pintrest" typo-grade QA. Ship fewer, fully-wired modules — that polish gap is where Citios can win sellers' trust.

**Bottom line**: Daash validates the small-retailer all-in-one wedge in Nigeria. Its moat is distribution + local fit, not depth; its seams (multi-backend debt, flagged-off AI, half-wired features) are attackable. Citios's edge is a single clean platform, native wallet + delivery rails, and cross-vertical reach (grocery, restaurant, hotel, healthcare, school) — launch ShopOS as the "one dashboard, everything" bundle Daash shows in one vertical, with the onboarding-checklist engine front and center.