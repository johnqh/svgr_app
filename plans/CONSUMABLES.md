# Consumables (Credits) System — Implementation Plan

## Context

svgr_app currently allows free unlimited SVG/PDF downloads. We're adding a credits system where users purchase credit packs (e.g., 5 credits/$5, 25 credits/$20) and spend 1 credit per SVG download. This monetizes the service while keeping conversion/preview free.

**Key decisions made:**
- RevenueCat Web Billing for web (wraps Stripe); native IAP for mobile — all via RevenueCat
- Dynamic offerings from RevenueCat; credit counts in product metadata
- Credits tied to Firebase user ID (not entity)
- Client-side balance check + async usage recording (not API-gated)
- Free credits granted to new users on first access
- Stored balance column (atomic updates) with purchase/usage audit trail
- Drizzle schema exported from library; consuming API manages migrations
- Standard "consumables" spelling; `@sudobility` npm scope

---

## Three New Projects

### 1. `consumables_service` (`./consumables_service`)

Backend library. Exports Drizzle schema creators and a `ConsumablesHelper` class with all business logic. No DB connection of its own.

**Structure:**
```
consumables_service/
  src/
    index.ts
    types/index.ts
    schema/index.ts
    helpers/
      index.ts
      ConsumablesHelper.ts
      WebhookHelper.ts
  tests/
    ConsumablesHelper.test.ts
    WebhookHelper.test.ts
  package.json, tsconfig.json, tsconfig.esm.json, eslint.config.js, CLAUDE.md
```

**Pattern reference:** `~/shapeshyft/subscription_service/package.json` — zero runtime deps, ESM, vitest, Bun build

**Schema (`src/schema/index.ts`)** — `createConsumablesSchema(pgSchema)` returns:

| Table | Columns |
|-------|---------|
| `consumable_balances` | `user_id` (PK, varchar 128), `balance` (int, default 0), `initial_credits` (int, default 0), `created_at`, `updated_at` |
| `consumable_purchases` | `id` (serial PK), `user_id`, `credits` (int), `source` (varchar: web/apple/google/free), `transaction_ref_id`, `product_id`, `price_cents`, `currency`, `created_at` |
| `consumable_usages` | `id` (serial PK), `user_id`, `filename` (varchar 500), `created_at` |

**ConsumablesHelper** — constructed with `(db, tables, config)`:
- `getBalance(userId)` — get-or-create; auto-grants `config.initialFreeCredits` on first access
- `recordPurchase(userId, request)` — insert purchase record + atomic `balance = balance + credits`
- `recordUsage(userId, filename?)` — atomic `balance = balance - 1 WHERE balance > 0` + insert usage; returns `{balance, success}`
- `getPurchaseHistory(userId, limit, offset)` — descending by created_at
- `getUsageHistory(userId, limit, offset)` — descending by created_at
- `recordPurchaseFromWebhook(userId, transactionId, ...)` — idempotent (checks `transaction_ref_id` exists)

**WebhookHelper** — `validateWebhookSignature(rawBody, signature, secret)` + `parseConsumablePurchaseEvent(event)` (extracts userId, transactionId, productId, priceCents, currency, store from RevenueCat webhook)

**Package config:** `peerDependencies: { "drizzle-orm": "..." }`, zero runtime deps, published as `@sudobility/consumables_service`

---

### 2. `consumables_client` (`./consumables_client`)

Frontend client library. Adapter pattern (web/RN), singleton + event listeners, React hooks.

**Structure:**
```
consumables_client/
  src/
    index.ts
    types/
      index.ts              # CreditPackage, CreditOffering, CreditBalance, records
      adapter.ts             # ConsumablesAdapter interface
    core/
      index.ts
      service.ts             # ConsumablesService class
      singleton.ts           # init, getters, setUserId, listeners
    network/
      ConsumablesApiClient.ts  # HTTP wrapper (getBalance, recordPurchase, recordUsage, histories)
    adapters/
      index.ts
      revenuecat-web.ts      # Web adapter (@revenuecat/purchases-js)
      revenuecat-rn.ts       # RN adapter (react-native-purchases)
    hooks/
      index.ts
      useBalance.ts
      useConsumableProducts.ts
      usePurchaseCredits.ts
      usePurchaseHistory.ts
      useUsageHistory.ts
  tests/
    ...
  package.json, tsconfig.json, eslint.config.js, CLAUDE.md
```

**Pattern reference:** `~/0xmail/subscription_lib/package.json` — singleton pattern, adapter pattern, optional peer deps for RevenueCat SDKs

**Key types:**
- `CreditPackage` — `{ packageId, productId, title, credits, price, priceString, currencyCode }`
- `ConsumablesAdapter` — `getOfferings()`, `purchase(params)`, `setUserId?(userId, email?)`
- `ConsumablesApiClient` — configured with `{ baseUrl, getToken }`, methods mirror API endpoints

**Singleton functions:**
- `initializeConsumables({ adapter, apiClient })`
- `setConsumablesUserId(userId, email?)` / `getConsumablesUserId()`
- `refreshConsumablesBalance()` / `onConsumablesBalanceChange(listener)`
- `onConsumablesUserIdChange(listener)`

**Hooks:**
- `useBalance()` → `{ balance, initialCredits, isLoading, error, refetch }`
- `useConsumableProducts(offeringId)` → `{ packages: CreditPackage[], isLoading, error }`
- `usePurchaseCredits()` → `{ purchase(packageId, offeringId), isPurchasing, error }`
- `usePurchaseHistory(limit?)` → `{ purchases, isLoading, loadMore }`
- `useUsageHistory(limit?)` → `{ usages, isLoading, loadMore }`

**Web adapter:** Extracts `metadata.credits` from RevenueCat product metadata to populate `CreditPackage.credits`. Purchase calls `Purchases.purchase()` which opens RevenueCat/Stripe payment UI.

**Package config:** `peerDependencies: { react, @revenuecat/purchases-js (optional), react-native-purchases (optional) }`, published as `@sudobility/consumables_client`

---

### 3. `consumables_pages` (`./consumables_pages`)

Frontend UI library (web only). Page-level components with props-driven labels/formatters.

**Structure:**
```
consumables_pages/
  src/
    index.ts
    types.ts
    CreditStorePage.tsx
    PurchaseHistoryPage.tsx
    UsageHistoryPage.tsx
    CreditBalanceBadge.tsx
  tests/
    ...
  package.json, tsconfig.json, vite.config.ts, tailwind.config.js, CLAUDE.md
```

**Pattern reference:** Building blocks subscription components (`~/0xmail/building_blocks/src/components/subscription/`)

**Components:**
- `CreditStorePage` — balance display + grid of credit packages with buy buttons. Props: `isAuthenticated, balance, packages, isLoading, isPurchasing, onPurchase, onLoginClick, labels, formatters`
- `PurchaseHistoryPage` — table of purchase records. Props: `purchases, isLoading, onLoadMore, labels, formatters`
- `UsageHistoryPage` — table of usage records. Props: `usages, isLoading, onLoadMore, labels, formatters`
- `CreditBalanceBadge` — small inline badge for topbar. Props: `balance, isLoading, onClick`

**Package config:** `peerDependencies: { react, react-dom, @sudobility/consumables_client }`, Vite library build, published as `@sudobility/consumables_pages`

---

## Integration Changes

### svgr_api (`./svgr_api`)

**New files:**
- `src/db/consumables.ts` — calls `createConsumablesSchema(svgrSchema)` to create table definitions
- `src/middleware/requireAuth.ts` — like `optionalAuth.ts` but returns 401 if no valid token
- `src/services/consumables.ts` — lazy-initialized `ConsumablesHelper` singleton with `{ initialFreeCredits: 3 }`
- `src/routes/consumables.ts` — Hono routes for all endpoints

**Modified files:**
- `src/db/index.ts` (`initDatabase`) — add 3 CREATE TABLE IF NOT EXISTS statements for consumable tables
- `src/index.ts` — mount `app.route('/api/v1/consumables', consumablesRoutes)`

**API endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/consumables/balance` | Required | Get credit balance (auto-creates with free credits) |
| POST | `/api/v1/consumables/purchase` | Required | Record purchase `{ credits, source, transaction_ref_id, product_id, price_cents, currency }` |
| POST | `/api/v1/consumables/use` | Required | Deduct 1 credit `{ filename? }` → `{ balance, success }` |
| GET | `/api/v1/consumables/purchases` | Required | Purchase history `?limit=50&offset=0` |
| GET | `/api/v1/consumables/usages` | Required | Usage history `?limit=50&offset=0` |
| POST | `/api/v1/consumables/webhook` | HMAC | RevenueCat webhook (idempotent) |

**New env vars:** `REVENUECAT_WEBHOOK_SECRET`

---

### svgr_app (`./svgr_app`)

**New files:**
- `src/config/consumables.ts` — `initializeConsumablesService(getToken)` configuring web adapter + API client
- `src/pages/CreditsPage.tsx` — composes `CreditStorePage` with hooks + i18n labels

**Modified files:**
- `src/components/providers/AuthProviderWrapper.tsx` — call `setConsumablesUserId` on auth state change
- `src/components/SvgPreviewPanel.tsx` — add credit check before download:
  1. `useBalance()` to show balance state
  2. On download click: if `balance > 0`, proceed with download + call `recordUsage(filename)` async
  3. If `balance === 0`, show "buy credits" prompt / redirect to credits page
- `src/App.tsx` — add route `<Route path="credits" element={<CreditsPage />} />`; add `CreditBalanceBadge` to topbar `menuItems`

**New env vars:** `VITE_REVENUECAT_API_KEY`, `VITE_CONSUMABLES_OFFERING_ID`

---

### svgr_app_rn (`./svgr_app_rn`)

**New files:**
- `src/config/consumables.ts` — `initializeConsumablesService(getToken)` configuring RN adapter
- `src/screens/CreditsScreen.tsx` — native UI for credit store (uses hooks from consumables_client directly, not consumables_pages)

**Modified files:**
- `src/context/AuthContext.tsx` — call `setConsumablesUserId` on auth state change
- `src/components/SvgPreviewPanel.tsx` — same credit gating logic as web
- `src/navigation/AppNavigator.tsx` — add Credits screen

**New dependency:** `react-native-purchases`

---

## Implementation Order

| Phase | Project | Depends On |
|-------|---------|------------|
| 1 | `consumables_service` | Nothing |
| 2 | `svgr_api` integration | Phase 1 |
| 3 | `consumables_client` | Phase 2 (needs API to test against) |
| 4 | `consumables_pages` | Phase 3 |
| 5 | `svgr_app` integration | Phases 3 + 4 |
| 6 | `svgr_app_rn` integration | Phase 3 |

---

## Verification

1. **consumables_service:** `bun run verify` (typecheck + lint + tests + build)
2. **svgr_api:** Start server, run manual curl tests against all 6 endpoints; verify tables created in Postgres
3. **consumables_client:** `bun run test` (vitest with mocked fetch)
4. **consumables_pages:** `bun run build` (Vite library build succeeds)
5. **svgr_app:** Start dev server → login → verify balance badge shows free credits → convert image → download SVG → verify credit deducted → navigate to credits page → verify packages load from RevenueCat
6. **svgr_app_rn:** Build and run on macOS/iOS → same flow as web

**Also save this plan to:** `./svgr_app/plans/CONSUMABLES.md`
