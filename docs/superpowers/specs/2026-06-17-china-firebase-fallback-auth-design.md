# China Firebase Fallback Authentication — Design

**Date:** 2026-06-17
**Status:** Approved for planning
**Repos affected:** `svgr_app` (client), `svgr_api` (backend)

## Problem

In China, Firebase Auth endpoints (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`) are
blocked. This app authenticates **every** user — including anonymous visitors — through Firebase, and
its entire conversion pipeline is gated behind a verified Firebase ID token:

| Step | Endpoint | Auth |
| --- | --- | --- |
| Upload image | `POST /api/v1/images/upload` | `requireAuth` |
| Create job | `POST /api/v1/jobs` | `requireAuth` |
| Poll job | `GET /api/v1/jobs/:id` | `requireAuth` |
| Fetch preview / SVG | `GET /api/v1/files/:name` | `requireAuth` |

`requireAuthMiddleware` calls `verifyIdToken(token)` on the `Authorization: Bearer <token>` header.
With Firebase blocked there is no token, so all four steps return `401` and the app is **completely
unusable** in China — not merely download-restricted.

> Note: the standalone free `POST /api/v1/convert` (optional auth) endpoint exists in `svgr_client` but
> is **not** used by this web app. The app uses the job-based pipeline via
> `@sudobility/svgr_lib`'s `useImageConverter`.

## Goal

Let users reach the app's core value — **convert an image and download the SVG/PDF for free** — even
when Firebase is unreachable. When Firebase fails, mint a client-side fallback identity, send it to the
API, and have the API accept it as an unverified identity. The fallback UID carries a `nofb_` prefix so
these rows are distinguishable from real Firebase users in the database.

### In scope
- Detecting Firebase auth failure on the client and entering "fallback mode".
- Minting + persisting a `nofb_<random>` UID and using it as the identity for API calls.
- Free conversion **and** free SVG/PDF downloads for fallback users (credits bypassed).
- A backend change so protected endpoints accept the fallback identity.

### Out of scope
- Paid credits / RevenueCat purchases for fallback users.
- Conversion history UI for fallback users (HistoryPage stays Firebase-registered-only).
- Rate limiting / abuse mitigation for the fallback tier (noted as follow-up).
- Making Firebase Auth itself work in China (e.g. an auth proxy).
- Any change to shared libs (`@sudobility/auth_lib`, `@sudobility/building_blocks`).

## Key decisions (settled)

| Decision | Choice |
| --- | --- |
| Identity transport | **Fake Bearer token** — `Authorization: Bearer nofb_<random>`; backend detects the `nofb_` prefix and skips `verifyIdToken`. |
| UID persistence | **`localStorage`** — generate once, reuse across reloads/sessions in that browser. |
| Architecture | **Contained in `svgr_app`** + a minimal `svgr_api` middleware change. No shared-lib edits. |
| Credits for fallback users | **Bypassed** — consumables service is never initialized in fallback mode, so the download gate short-circuits to free. |

## Assumptions & prerequisites

- The `svgr_api` domain (`VITE_API_URL`) is itself reachable from China; **only** Firebase is blocked.
  If the API is also blocked, this design does not help — that is a separate hosting problem.
- The Firebase JS SDK is bundled with the app (served from Cloudflare Pages), so SDK *code* loads fine;
  only its *runtime calls* to Google token endpoints fail. Detection therefore relies on the auth
  call failing/timing out, not on the SDK failing to load.
- Real Firebase UIDs never begin with `nofb_`, so the two identity namespaces cannot collide.

## Architecture

### Client (`svgr_app`)

```
┌─────────────────────────────────────────────────────────────┐
│ AuthProviderWrapper (existing)                                │
│   • AuthProvider(enableAnonymous) tries Firebase anon sign-in │
│   • initializes consumables ONLY for real Firebase users      │
│                                                               │
│   └── FallbackAuthProvider (NEW)                              │
│         watches useAuthStatus(); on Firebase failure:         │
│           - isFallback = true                                 │
│           - fallbackUid = localStorage 'svgr_fallback_uid'    │
│             (mint 'nofb_<random>' once if absent)             │
│                                                               │
│         useEffectiveApi() (NEW hook)                          │
│           - healthy  → useApiSafe() (real Firebase ApiContext)│
│           - fallback → synthetic ApiContextValue backed by    │
│                        FallbackNetworkClient (NEW)            │
└─────────────────────────────────────────────────────────────┘
        │ consumed by
        ▼
  ConvertPage + useSvgrClient  (switch useApiSafe → useEffectiveApi)
```

#### New unit: `FallbackNetworkClient`
- **What it does:** implements `NetworkClient` (from `@sudobility/types`) over `fetch`, attaching
  `Authorization: Bearer <fallbackUid>` to every request (matching how `FirebaseAuthNetworkService`
  attaches the real token). Must support the methods `SvgrClient` uses: `get`, `post` (incl. `FormData`
  bodies for upload), with the same `{ ok, status, data }` response shape and `timeout` option.
- **How it's used:** instantiated with the current `fallbackUid`; injected into the synthetic
  `ApiContextValue.networkClient`.
- **Depends on:** `fetch`, `API_URL`, the active `fallbackUid`.

#### New unit: `FallbackAuthProvider` + `useFallbackIdentity()`
- **What it does:** owns fallback detection and the persisted UID. Detection enters fallback mode when:
  - `getFirebaseAuth()` returns `null` (Firebase not configured / SDK unavailable), **or**
  - `useAuthStatus()` settles to `!loading && !user` after a grace timeout (default **8s**) — i.e.
    anonymous sign-in neither succeeded nor is still pending (blocked token endpoint).
  On entering fallback mode it reads `localStorage['svgr_fallback_uid']`, or mints
  `nofb_<random>` (≥16 url-safe chars) and stores it.
- **Exposes:** `{ isFallback: boolean, fallbackUid: string | null }`.
- **Depends on:** `useAuthStatus()` (auth-components), `getFirebaseAuth()` (auth_lib), `localStorage`.
- **UID format:** `nofb_` + url-safe random, matching backend regex `^nofb_[A-Za-z0-9_-]{16,}$`.
  Generated with `crypto.getRandomValues` (or `crypto.randomUUID()` with separators stripped).

#### New unit: `useEffectiveApi()`
- **What it does:** returns the API context the rest of the app should use.
  - Firebase healthy → the real `useApiSafe()` value.
  - Fallback mode → a synthetic `ApiContextValue`:
    ```
    {
      networkClient: fallbackNetworkClient,
      baseUrl: API_URL,
      userId: fallbackUid,
      token: fallbackUid,
      isReady: true,
      isLoading: false,
      refreshToken: async () => fallbackUid,
      testMode: false,
    }
    ```
  - While still deciding (Firebase pending, before timeout) → real value (likely `isReady: false`),
    so the UI shows its normal "waiting for auth" state until either Firebase succeeds or fallback
    engages.
- **Why `isReady: true` matters:** `ConvertPage` only uploads when `api?.isReady` is true (it even
  retries upload when `isReady` flips). Synthesizing `isReady: true` is what unblocks the pipeline.

#### Changed call sites
- `src/pages/ConvertPage.tsx`: `useApiSafe()` → `useEffectiveApi()` (the `api?.isReady` gate at lines
  ~97 and ~112).
- `src/hooks/useSvgrClient.ts`: resolve the network client from `useEffectiveApi()` instead of
  `useApiSafe()` (keep the existing `useFirebaseAuthNetworkClient()` fallback for the pre-decision
  window).
- `src/components/providers/AuthProviderWrapper.tsx`: mount `FallbackAuthProvider`; guard
  `initializeConsumablesService` / `setConsumablesUserId` so they run **only** for real Firebase users
  (skip entirely in fallback mode).

#### Untouched by design
- `SvgPreviewPanel.tsx`: no change. `checkBalance()` / `consumeCredit()` already return `true` when
  `!isConsumablesInitialized()`, so downloads are free once consumables is skipped in fallback mode.
- HistoryPage / CreditsPage: continue to gate on a real (non-anonymous) Firebase user. Fallback users
  see the existing login prompts there. Acceptable — fallback tier is convert + download only.

### Backend (`svgr_api`)

#### Changed unit: `requireAuthMiddleware`
- **New behavior:** parse the bearer token as today. Then:
  1. If the token matches `^nofb_[A-Za-z0-9_-]{16,}$` **and** `ALLOW_FALLBACK_AUTH` is enabled →
     set `authenticated = true`, `userId = token`, `userEmail = null`, **`isFallback = true`**, and
     `next()`. **Do not call `verifyIdToken`.**
  2. Otherwise → existing path: `verifyIdToken(token)`; `401` on failure.
- **Ordering:** the `nofb_` check must run **before** `verifyIdToken`, so a fallback token is never
  sent to Firebase verification.

#### Changed unit: `optionalAuthMiddleware`
- Same `nofb_` recognition for consistency (sets `userId`/`isFallback` instead of leaving anonymous).
  Low impact since the app's optional-auth endpoint isn't on the critical path, but keeps identity
  semantics uniform.

#### New context var: `isFallback`
- Add `isFallback: boolean` to Hono's `ContextVariableMap` (declared alongside the existing
  `authenticated` / `userId` / `userEmail`). Lets handlers/DB logic distinguish fallback identities if
  needed later. Defaults to `false` everywhere it isn't explicitly set.

#### New config: `ALLOW_FALLBACK_AUTH`
- Boolean env flag (default **off**). Master switch to accept/reject `nofb_` identities so the tier can
  be disabled instantly without a client deploy. When off, `nofb_` tokens fail verification like any
  invalid token (`401`).

#### Database
- No schema change. `images`/`jobs` rows persist `userId = nofb_…` automatically (the `userId` context
  var feeds existing inserts). The `nofb_` prefix is the "not a Firebase user" marker.

#### Consumables routes
- Left as Firebase-`requireAuth`. With `ALLOW_FALLBACK_AUTH` on, these endpoints would technically
  accept a `nofb_` token too — but the client never initializes consumables in fallback mode, so it
  never calls them. No functional credit grant occurs. (If stricter isolation is wanted later, reject
  `isFallback` identities at the consumables router — noted, not in scope.)

## Data flow (fallback path)

1. App loads in China → `AuthProvider` attempts anonymous Firebase sign-in → blocked token call
   fails/times out → `useAuthStatus()` settles `!loading && !user`.
2. `FallbackAuthProvider` engages: `isFallback = true`, `fallbackUid = nofb_…` (from/into localStorage).
3. `useEffectiveApi()` returns the synthetic context (`isReady: true`, `FallbackNetworkClient`).
4. User selects an image → `ConvertPage` sees `api.isReady` → `converter.upload(file)`.
5. `FallbackNetworkClient` sends each request with `Authorization: Bearer nofb_…`.
6. `svgr_api` middleware recognizes the `nofb_` token (flag on) → `userId = nofb_…`, `isFallback = true`
   → pipeline proceeds; rows stored under the `nofb_` UID.
7. Download: consumables uninitialized → `checkBalance()` returns true → SVG/PDF download is free.

## Error handling & edge cases

- **Firebase recovers / user later logs in:** real Firebase user appears → `useEffectiveApi()` returns
  the real context → the app uses the verified Firebase identity. The `nofb_` UID and its server-side
  rows are simply abandoned (no migration; out of scope).
- **False positive (slow but working Firebase):** the 8s grace timeout reduces the chance of entering
  fallback while a real anon sign-in is mid-flight. If fallback engages and Firebase then succeeds, the
  effective context flips to the real one on the next render.
- **`localStorage` unavailable (private mode):** fall back to an in-memory per-session UID; conversions
  still work for that session, history won't persist across reloads. Log a warning.
- **Flag off but client sends `nofb_`:** backend treats it as an invalid token → `401`; the client
  surfaces its normal conversion error. (Operational note: deploy backend flag before/with client.)
- **Malformed fallback token:** fails the strict regex → not accepted → `401`.

## Testing strategy

**Client (Vitest + RTL)**
- `FallbackAuthProvider`: enters fallback on `getFirebaseAuth()===null`; enters fallback on
  `!loading && !user` after timeout; stays out of fallback when a user exists or while loading.
- UID lifecycle: mints `nofb_`-prefixed UID matching the regex; persists and reuses from localStorage;
  in-memory fallback when localStorage throws.
- `useEffectiveApi()`: returns real context when healthy; synthetic context with `isReady: true` and
  the `FallbackNetworkClient` in fallback mode.
- `FallbackNetworkClient`: attaches `Authorization: Bearer <uid>` on `get`/`post`; handles `FormData`
  bodies; maps responses to `{ ok, status, data }`.
- Consumables guard: `initializeConsumablesService` not called in fallback mode → `SvgPreviewPanel`
  download path runs without a credit check.

**Backend (svgr_api test suite)**
- `requireAuthMiddleware`: valid Firebase token → authenticated, `isFallback=false`; valid `nofb_`
  token with flag on → authenticated, `userId=token`, `isFallback=true`, `verifyIdToken` **not** called;
  `nofb_` token with flag off → `401`; malformed `nofb_` → `401`; missing/invalid Bearer → `401`.
- `optionalAuthMiddleware`: `nofb_` token sets `userId`/`isFallback` instead of anonymous.
- Integration: upload → job → file round-trip succeeds with a `nofb_` bearer and persists rows under
  the `nofb_` userId.

## Open follow-ups (not in this spec)
- Rate limiting / abuse controls for the fallback tier.
- Optional explicit rejection of `isFallback` identities on consumables routes.
- Any cleanup/migration of orphaned `nofb_` rows.
