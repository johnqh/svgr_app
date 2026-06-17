# China Firebase Fallback Authentication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reach the app's core flow (convert + free SVG/PDF download) when Firebase Auth is unreachable (e.g. China) by minting a client-side `nofb_<random>` identity and having the API accept it as an unverified identity.

**Architecture:** When Firebase anonymous sign-in fails, the client enters "fallback mode": it mints/persists a `nofb_` UID, sends it as `Authorization: Bearer nofb_…`, and synthesizes an `isReady` API context backed by a fetch-based network client. The backend's auth middleware recognizes the `nofb_` prefix (behind an env flag) and accepts it without calling Firebase verification. Consumables stays uninitialized in fallback mode, so the download credit gate short-circuits to free.

**Tech Stack:** TypeScript, Bun, Vitest. Client: React 19, React Router v7, `@sudobility/{auth_lib,auth-components,building_blocks,svgr_client,svgr_lib,consumables_client,types}`. Backend: Hono, `@sudobility/{auth_service,types}`.

## Global Constraints

- Work on a dedicated feature branch in **each** repo (`svgr_app` and `svgr_api`); both currently sit on `main`.
- Fallback UID format is **exactly** `^nofb_[A-Za-z0-9_-]{16,}$` — the client generator and the backend validator must agree on this literal.
- Backend acceptance of fallback identities is gated by env flag **`ALLOW_FALLBACK_AUTH`** (default OFF); `"true"` or `"1"` enables it.
- A `nofb_` token must **never** be passed to `verifyIdToken` — the prefix check runs before Firebase verification.
- No edits to shared libraries (`@sudobility/auth_lib`, `@sudobility/building_blocks`, etc.) — all client logic lives in `svgr_app`.
- Commit messages end with the trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Deployment order:** ship the backend (with `ALLOW_FALLBACK_AUTH=true`) before/with the client, or `nofb_` requests get 401s.

---

## Part A — Backend (`svgr_api`)

> All Part A paths are relative to `/Users/johnhuang/projects/svgr_api`. Run commands from that repo root. Test runner: `bun run test` (vitest). Vitest sets `NODE_ENV=test`, so `verifyIdToken` throws in tests (test mode) — relied upon below.

### Task 1: Fallback token recognition helpers + config flag

**Files:**
- Create: `src/middleware/fallback-auth.ts`
- Test: `src/middleware/fallback-auth.test.ts`

**Interfaces:**
- Consumes: `getEnv` from `src/lib/env-helper.ts` — `getEnv(key: string, defaultValue?: string): string | undefined`.
- Produces:
  - `isFallbackToken(token: string): boolean`
  - `isFallbackAuthEnabled(): boolean`
  - `FALLBACK_TOKEN_REGEX: RegExp`

- [ ] **Step 1: Write the failing test**

Create `src/middleware/fallback-auth.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { isFallbackToken, isFallbackAuthEnabled } from "./fallback-auth";

describe("isFallbackToken", () => {
  it("accepts a well-formed nofb_ token", () => {
    expect(isFallbackToken("nofb_0123456789abcdef0123")).toBe(true);
  });

  it("rejects a nofb_ token whose body is shorter than 16 chars", () => {
    expect(isFallbackToken("nofb_short")).toBe(false);
  });

  it("rejects tokens without the nofb_ prefix", () => {
    expect(isFallbackToken("abcdef0123456789abcdef")).toBe(false);
    expect(isFallbackToken("")).toBe(false);
  });

  it("rejects a token with characters outside the allowed set", () => {
    expect(isFallbackToken("nofb_has spaces and stuff!!")).toBe(false);
  });
});

describe("isFallbackAuthEnabled", () => {
  const original = process.env.ALLOW_FALLBACK_AUTH;
  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_FALLBACK_AUTH;
    else process.env.ALLOW_FALLBACK_AUTH = original;
  });

  it("is true when the env flag is 'true' or '1'", () => {
    process.env.ALLOW_FALLBACK_AUTH = "true";
    expect(isFallbackAuthEnabled()).toBe(true);
    process.env.ALLOW_FALLBACK_AUTH = "1";
    expect(isFallbackAuthEnabled()).toBe(true);
  });

  it("is false when unset or any other value", () => {
    delete process.env.ALLOW_FALLBACK_AUTH;
    expect(isFallbackAuthEnabled()).toBe(false);
    process.env.ALLOW_FALLBACK_AUTH = "false";
    expect(isFallbackAuthEnabled()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/middleware/fallback-auth.test.ts`
Expected: FAIL — `Failed to resolve import "./fallback-auth"` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/middleware/fallback-auth.ts`:

```ts
/**
 * @fileoverview Recognition of client-asserted fallback identities.
 *
 * When Firebase Auth is unreachable (e.g. in China), the client mints an
 * unverified `nofb_<random>` identity and sends it as a Bearer token. These
 * helpers let the auth middleware recognize that token format and gate its
 * acceptance behind the `ALLOW_FALLBACK_AUTH` env flag.
 *
 * A fallback identity is UNVERIFIED and spoofable; it is only accepted because
 * the fallback tier is free-only (no credits, no Firebase user data) and is
 * namespaced away from real Firebase UIDs by the `nofb_` prefix.
 */

import { getEnv } from "../lib/env-helper";

/** Strict format for fallback identity tokens. Must match the client generator. */
export const FALLBACK_TOKEN_REGEX = /^nofb_[A-Za-z0-9_-]{16,}$/;

/** True if the bearer token is a well-formed fallback identity token. */
export function isFallbackToken(token: string): boolean {
  return FALLBACK_TOKEN_REGEX.test(token);
}

/** Whether unverified `nofb_` fallback identities are accepted by this server. */
export function isFallbackAuthEnabled(): boolean {
  const value = getEnv("ALLOW_FALLBACK_AUTH");
  return value === "true" || value === "1";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/middleware/fallback-auth.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/middleware/fallback-auth.ts src/middleware/fallback-auth.test.ts
git commit -m "feat(auth): add nofb_ fallback token recognition helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Wire fallback identity into auth middleware

**Files:**
- Modify: `src/middleware/optionalAuth.ts` (add `isFallback` to `ContextVariableMap`; recognize fallback token)
- Modify: `src/middleware/requireAuth.ts` (recognize fallback token)
- Test: `src/middleware/requireAuth.test.ts` (create)

**Interfaces:**
- Consumes: `isFallbackToken`, `isFallbackAuthEnabled` from `./fallback-auth` (Task 1); `verifyIdToken` from `../services/firebase`.
- Produces: middleware sets context vars `authenticated: boolean`, `userId: string | null`, `userEmail: string | null`, `isFallback: boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/middleware/requireAuth.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { requireAuthMiddleware } from "./requireAuth";

const VALID_FALLBACK = "nofb_0123456789abcdef0123";

function makeApp() {
  const app = new Hono();
  app.use("/protected", requireAuthMiddleware);
  app.get("/protected", c =>
    c.json({
      userId: c.get("userId"),
      authenticated: c.get("authenticated"),
      isFallback: c.get("isFallback"),
    })
  );
  return app;
}

describe("requireAuthMiddleware fallback handling", () => {
  const original = process.env.ALLOW_FALLBACK_AUTH;
  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_FALLBACK_AUTH;
    else process.env.ALLOW_FALLBACK_AUTH = original;
  });

  it("accepts a nofb_ token when the flag is on, without Firebase verification", async () => {
    process.env.ALLOW_FALLBACK_AUTH = "true";
    const res = await makeApp().request("/protected", {
      headers: { Authorization: `Bearer ${VALID_FALLBACK}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(VALID_FALLBACK);
    expect(body.authenticated).toBe(true);
    expect(body.isFallback).toBe(true);
  });

  it("rejects a nofb_ token when the flag is off", async () => {
    delete process.env.ALLOW_FALLBACK_AUTH;
    const res = await makeApp().request("/protected", {
      headers: { Authorization: `Bearer ${VALID_FALLBACK}` },
    });
    // Flag off -> treated as a normal token -> verifyIdToken throws in test mode -> 401.
    expect(res.status).toBe(401);
  });

  it("rejects a request with no Authorization header", async () => {
    process.env.ALLOW_FALLBACK_AUTH = "true";
    const res = await makeApp().request("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects a non-fallback bearer token (Firebase verification fails in test mode)", async () => {
    process.env.ALLOW_FALLBACK_AUTH = "true";
    const res = await makeApp().request("/protected", {
      headers: { Authorization: "Bearer some-firebase-looking-token" },
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/middleware/requireAuth.test.ts`
Expected: FAIL — the first test gets 401 (fallback not yet recognized) and `isFallback` is undefined.

- [ ] **Step 3: Add `isFallback` to the context type in `optionalAuth.ts`**

In `src/middleware/optionalAuth.ts`, extend the existing module augmentation. Change:

```ts
declare module "hono" {
  interface ContextVariableMap {
    authenticated: boolean;
    userId: string | null;
    userEmail: string | null;
  }
}
```

to:

```ts
declare module "hono" {
  interface ContextVariableMap {
    authenticated: boolean;
    userId: string | null;
    userEmail: string | null;
    /** True when the identity is an unverified `nofb_` fallback (not Firebase). */
    isFallback: boolean;
  }
}
```

- [ ] **Step 4: Recognize fallback tokens in `optionalAuth.ts`**

In `src/middleware/optionalAuth.ts`, add the import at the top (next to the `verifyIdToken` import):

```ts
import { isFallbackToken, isFallbackAuthEnabled } from "./fallback-auth";
```

Set `isFallback: false` on the two early-return (no/invalid header) branches by adding `c.set("isFallback", false);` alongside the existing `c.set(...)` calls in each branch. Then, in the `try` block, **before** `const decodedToken = await verifyIdToken(token);`, insert:

```ts
    if (isFallbackAuthEnabled() && isFallbackToken(token)) {
      c.set("authenticated", true);
      c.set("userId", token);
      c.set("userEmail", null);
      c.set("isFallback", true);
      return next();
    }
```

And in the success path (after `c.set("userEmail", decodedToken.email ?? null);`) add:

```ts
    c.set("isFallback", false);
```

And in the `catch` block (where it sets `authenticated=false`) add `c.set("isFallback", false);`.

- [ ] **Step 5: Recognize fallback tokens in `requireAuth.ts`**

In `src/middleware/requireAuth.ts`, add the import at the top (next to the `verifyIdToken` import):

```ts
import { isFallbackToken, isFallbackAuthEnabled } from "./fallback-auth";
```

After the existing bearer-type validity check (the block that returns 401 when `type !== "Bearer" || !token`) and **before** the `try { const decodedToken = await verifyIdToken(token); ... }` block, insert:

```ts
  if (isFallbackAuthEnabled() && isFallbackToken(token)) {
    c.set("authenticated", true);
    c.set("userId", token);
    c.set("userEmail", null);
    c.set("isFallback", true);
    return next();
  }
```

Then, inside the existing `try` block, after `c.set("userEmail", decodedToken.email ?? null);`, add:

```ts
    c.set("isFallback", false);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run test -- src/middleware/requireAuth.test.ts src/middleware/fallback-auth.test.ts`
Expected: PASS (all cases).

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`
Expected: no errors (the `isFallback` context var resolves everywhere).

- [ ] **Step 8: Commit**

```bash
git add src/middleware/requireAuth.ts src/middleware/optionalAuth.ts src/middleware/requireAuth.test.ts
git commit -m "feat(auth): accept nofb_ fallback identities behind ALLOW_FALLBACK_AUTH

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Part B — Client (`svgr_app`)

> All Part B paths are relative to `/Users/johnhuang/projects/svgr_app`. Run commands from that repo root. Test runner: `bun test` or `bun run test` (vitest, jsdom). `localStorage`, `crypto.getRandomValues`, and `fetch` are available in the jsdom test environment.

### Task 3: Persisted fallback UID utility

**Files:**
- Create: `src/lib/fallback-uid.ts`
- Test: `src/lib/fallback-uid.test.ts`

**Interfaces:**
- Produces: `getOrCreateFallbackUid(): string` — returns a stable `nofb_<32 hex>` UID, persisted in `localStorage['svgr_fallback_uid']`, with an in-memory fallback if storage is unavailable.

- [ ] **Step 1: Write the failing test**

Create `src/lib/fallback-uid.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getOrCreateFallbackUid } from './fallback-uid';

const KEY = 'svgr_fallback_uid';

describe('getOrCreateFallbackUid', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('mints a nofb_ UID matching the agreed format and stores it', () => {
    const uid = getOrCreateFallbackUid();
    expect(uid).toMatch(/^nofb_[A-Za-z0-9_-]{16,}$/);
    expect(localStorage.getItem(KEY)).toBe(uid);
  });

  it('reuses the stored UID across calls', () => {
    const first = getOrCreateFallbackUid();
    const second = getOrCreateFallbackUid();
    expect(second).toBe(first);
  });

  it('falls back to an in-memory UID when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const uid = getOrCreateFallbackUid();
    expect(uid).toMatch(/^nofb_[A-Za-z0-9_-]{16,}$/);
    // Stable within the session even though storage is unavailable.
    expect(getOrCreateFallbackUid()).toBe(uid);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/fallback-uid.test.ts`
Expected: FAIL — cannot resolve `./fallback-uid`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/fallback-uid.ts`:

```ts
/**
 * Stable client-side fallback identity used when Firebase Auth is unreachable
 * (e.g. in China). The UID is namespaced with a `nofb_` prefix so the backend
 * and database can distinguish it from real Firebase users.
 */

const STORAGE_KEY = 'svgr_fallback_uid';
const PREFIX = 'nofb_';

let inMemoryUid: string | null = null;

/** Generate `nofb_` + 32 hex chars (matches /^nofb_[A-Za-z0-9_-]{16,}$/). */
function generateFallbackUid(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${PREFIX}${random}`;
}

/**
 * Returns the persisted fallback UID, minting and storing one on first use.
 * If `localStorage` is unavailable (e.g. private mode), returns a per-session
 * in-memory UID instead.
 */
export function getOrCreateFallbackUid(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const uid = generateFallbackUid();
    localStorage.setItem(STORAGE_KEY, uid);
    return uid;
  } catch {
    if (!inMemoryUid) inMemoryUid = generateFallbackUid();
    return inMemoryUid;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/fallback-uid.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fallback-uid.ts src/lib/fallback-uid.test.ts
git commit -m "feat(auth): add persisted nofb_ fallback UID utility

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Fallback network client

**Files:**
- Create: `src/lib/FallbackNetworkClient.ts`
- Test: `src/lib/FallbackNetworkClient.test.ts`

**Interfaces:**
- Consumes: `NetworkClient`, `NetworkRequestOptions`, `NetworkResponse` types from `@sudobility/types`.
- Produces: `createFallbackNetworkClient(getUid: () => string): NetworkClient` — a `fetch`-based client that attaches `Authorization: Bearer <getUid()>` to every request, sends JSON bodies as JSON, passes `FormData` through untouched (so the browser sets the multipart boundary), and returns a `Blob` as `data` for non-JSON responses (needed by `fetchFile` for SVG/preview downloads).

- [ ] **Step 1: Write the failing test**

Create `src/lib/FallbackNetworkClient.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFallbackNetworkClient } from './FallbackNetworkClient';

const UID = 'nofb_0123456789abcdef0123';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createFallbackNetworkClient', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('attaches the fallback bearer token on GET and parses JSON', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ hello: 'world' }));
    const client = createFallbackNetworkClient(() => UID);

    const res = await client.get('https://api.example/x');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example/x',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: `Bearer ${UID}` }),
      })
    );
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ hello: 'world' });
  });

  it('serializes plain-object POST bodies as JSON with a content-type header', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    const client = createFallbackNetworkClient(() => UID);

    await client.post('https://api.example/jobs', { imageId: 'abc' });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ imageId: 'abc' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('passes FormData through without JSON-stringifying or forcing content-type', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    const client = createFallbackNetworkClient(() => UID);

    const form = new FormData();
    form.append('image', new Blob(['x']), 'a.png');
    await client.post('https://api.example/images/upload', form);

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(form);
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers.Authorization).toBe(`Bearer ${UID}`);
  });

  it('returns a Blob as data for non-JSON responses (file downloads)', async () => {
    const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(blob, { status: 200, headers: { 'content-type': 'image/svg+xml' } })
    );
    const client = createFallbackNetworkClient(() => UID);

    const res = await client.get('https://api.example/files/x.svg');
    expect(res.ok).toBe(true);
    expect(res.data).toBeInstanceOf(Blob);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/FallbackNetworkClient.test.ts`
Expected: FAIL — cannot resolve `./FallbackNetworkClient`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/FallbackNetworkClient.ts`:

```ts
/**
 * A `fetch`-based NetworkClient used when Firebase Auth is unreachable.
 *
 * It attaches the unverified fallback identity (`Authorization: Bearer nofb_…`)
 * to every request. Unlike the Firebase network client it returns a `Blob` for
 * non-JSON responses, which the SVGR client's `fetchFile` relies on to download
 * SVG/PDF previews.
 */

import type {
  NetworkClient,
  NetworkRequestOptions,
  NetworkResponse,
} from '@sudobility/types';

export function createFallbackNetworkClient(getUid: () => string): NetworkClient {
  const withAuth = (extra?: Record<string, string> | null): Record<string, string> => ({
    ...(extra ?? {}),
    Authorization: `Bearer ${getUid()}`,
  });

  async function parse<T>(response: Response): Promise<NetworkResponse<T>> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const contentType = response.headers.get('content-type') ?? '';
    let data: unknown;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        /* empty/invalid JSON body */
      }
    } else {
      data = await response.blob();
    }
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      data: data as T,
      success: response.ok,
      timestamp: new Date().toISOString(),
    };
  }

  async function exec<T>(url: string, init: RequestInit): Promise<NetworkResponse<T>> {
    const response = await fetch(url, init);
    return parse<T>(response);
  }

  function buildBody(
    body: unknown,
    headers: Record<string, string>
  ): BodyInit | undefined {
    if (body == null) return undefined;
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      return body; // let the browser set the multipart boundary
    }
    if (typeof body === 'string' || body instanceof Blob) {
      return body as BodyInit;
    }
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    return JSON.stringify(body);
  }

  return {
    request<T = unknown>(url: string, options?: NetworkRequestOptions | null) {
      const headers = withAuth(options?.headers);
      return exec<T>(url, {
        method: options?.method ?? 'GET',
        headers,
        body: options?.body ?? undefined,
        signal: options?.signal ?? undefined,
      });
    },
    get<T = unknown>(url: string, options?: Omit<NetworkRequestOptions, 'method' | 'body'> | null) {
      return exec<T>(url, {
        method: 'GET',
        headers: withAuth(options?.headers),
        signal: options?.signal ?? undefined,
      });
    },
    post<T = unknown>(url: string, body?: unknown, options?: Omit<NetworkRequestOptions, 'method'> | null) {
      const headers = withAuth(options?.headers);
      return exec<T>(url, {
        method: 'POST',
        headers,
        body: buildBody(body, headers),
        signal: options?.signal ?? undefined,
      });
    },
    put<T = unknown>(url: string, body?: unknown, options?: Omit<NetworkRequestOptions, 'method'> | null) {
      const headers = withAuth(options?.headers);
      return exec<T>(url, {
        method: 'PUT',
        headers,
        body: buildBody(body, headers),
        signal: options?.signal ?? undefined,
      });
    },
    delete<T = unknown>(url: string, options?: Omit<NetworkRequestOptions, 'method' | 'body'> | null) {
      return exec<T>(url, {
        method: 'DELETE',
        headers: withAuth(options?.headers),
        signal: options?.signal ?? undefined,
      });
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/FallbackNetworkClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/FallbackNetworkClient.ts src/lib/FallbackNetworkClient.test.ts
git commit -m "feat(auth): add fetch-based fallback network client

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Fallback identity provider + detection

**Files:**
- Create: `src/components/providers/FallbackAuthProvider.tsx`
- Test: `src/components/providers/FallbackAuthProvider.test.tsx`

**Interfaces:**
- Consumes: `useAuthStatus()` from `@sudobility/auth-components` (returns `{ user: AuthUser | null, loading: boolean, ... }`); `getFirebaseAuth()` from `@sudobility/auth_lib`; `getOrCreateFallbackUid()` (Task 3).
- Produces:
  - `FallbackAuthProvider({ children }): JSX.Element`
  - `useFallbackIdentity(): { isFallback: boolean; fallbackUid: string | null }`
  - `FALLBACK_GRACE_MS: number` (export for reuse/testing)

- [ ] **Step 1: Write the failing test**

Create `src/components/providers/FallbackAuthProvider.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const mockUseAuthStatus = vi.fn();
const mockGetFirebaseAuth = vi.fn();

vi.mock('@sudobility/auth-components', () => ({
  useAuthStatus: () => mockUseAuthStatus(),
}));
vi.mock('@sudobility/auth_lib', () => ({
  getFirebaseAuth: () => mockGetFirebaseAuth(),
}));

import { FallbackAuthProvider, useFallbackIdentity } from './FallbackAuthProvider';

function Probe() {
  const { isFallback, fallbackUid } = useFallbackIdentity();
  return (
    <div>
      <span data-testid="isFallback">{String(isFallback)}</span>
      <span data-testid="uid">{fallbackUid ?? ''}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <FallbackAuthProvider>
      <Probe />
    </FallbackAuthProvider>
  );
}

describe('FallbackAuthProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    mockGetFirebaseAuth.mockReturnValue({}); // configured by default
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('stays out of fallback while a Firebase user exists', () => {
    mockUseAuthStatus.mockReturnValue({ user: { uid: 'real' }, loading: false });
    renderProvider();
    expect(screen.getByTestId('isFallback').textContent).toBe('false');
  });

  it('enters fallback immediately when Firebase is not configured', () => {
    mockGetFirebaseAuth.mockReturnValue(null);
    mockUseAuthStatus.mockReturnValue({ user: null, loading: true });
    renderProvider();
    expect(screen.getByTestId('isFallback').textContent).toBe('true');
    expect(screen.getByTestId('uid').textContent).toMatch(/^nofb_/);
  });

  it('enters fallback after the grace period when no user appears', () => {
    mockUseAuthStatus.mockReturnValue({ user: null, loading: false });
    renderProvider();
    expect(screen.getByTestId('isFallback').textContent).toBe('false');
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByTestId('isFallback').textContent).toBe('true');
    expect(screen.getByTestId('uid').textContent).toMatch(/^nofb_/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/components/providers/FallbackAuthProvider.test.tsx`
Expected: FAIL — cannot resolve `./FallbackAuthProvider`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/providers/FallbackAuthProvider.tsx`:

```tsx
/**
 * Detects when Firebase Auth cannot establish a user (e.g. blocked in China)
 * and switches the app into "fallback mode": a stable `nofb_` identity is
 * minted and exposed via context. Consumers (useEffectiveApi) use it to route
 * API calls with an unverified bearer token instead of a Firebase ID token.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuthStatus } from '@sudobility/auth-components';
import { getFirebaseAuth } from '@sudobility/auth_lib';
import { getOrCreateFallbackUid } from '../../lib/fallback-uid';

/** How long to wait for Firebase (incl. anonymous sign-in) before giving up. */
export const FALLBACK_GRACE_MS = 8000;

interface FallbackIdentity {
  isFallback: boolean;
  fallbackUid: string | null;
}

const FallbackIdentityContext = createContext<FallbackIdentity>({
  isFallback: false,
  fallbackUid: null,
});

export function useFallbackIdentity(): FallbackIdentity {
  return useContext(FallbackIdentityContext);
}

export function FallbackAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStatus();
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackUid, setFallbackUid] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const engageFallback = () => {
    setFallbackUid(getOrCreateFallbackUid());
    setIsFallback(true);
  };

  // Firebase not configured at all -> fallback immediately.
  useEffect(() => {
    if (getFirebaseAuth() === null) {
      engageFallback();
    }
  }, []);

  // A real Firebase user (anonymous or registered) -> leave fallback mode.
  // Otherwise start a grace timer; if it elapses with still no user, engage.
  useEffect(() => {
    if (user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsFallback(false);
      setFallbackUid(null);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(engageFallback, FALLBACK_GRACE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);

  const value = useMemo<FallbackIdentity>(
    () => ({ isFallback, fallbackUid }),
    [isFallback, fallbackUid]
  );

  return (
    <FallbackIdentityContext.Provider value={value}>
      {children}
    </FallbackIdentityContext.Provider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/components/providers/FallbackAuthProvider.test.tsx`
Expected: PASS (3 cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/providers/FallbackAuthProvider.tsx src/components/providers/FallbackAuthProvider.test.tsx
git commit -m "feat(auth): add FallbackAuthProvider with Firebase-failure detection

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Effective-API hook (real or synthetic context)

**Files:**
- Create: `src/hooks/useEffectiveApi.ts`
- Test: `src/hooks/useEffectiveApi.test.ts`

**Interfaces:**
- Consumes: `useApiSafe`, `ApiContextValue` from `@sudobility/building_blocks/firebase`; `useFallbackIdentity()` (Task 5); `createFallbackNetworkClient` (Task 4); `API_URL` from `../config/constants`.
- Produces: `useEffectiveApi(): ApiContextValue | null` — real `useApiSafe()` value when not in fallback mode; otherwise a synthetic `ApiContextValue` with `isReady: true`, `userId`/`token` set to the fallback UID, and `networkClient` = a fallback network client.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useEffectiveApi.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockUseApiSafe = vi.fn();
const mockUseFallbackIdentity = vi.fn();
const mockCreateFallbackNetworkClient = vi.fn(() => ({ tag: 'fallback-client' }));

vi.mock('@sudobility/building_blocks/firebase', () => ({
  useApiSafe: () => mockUseApiSafe(),
}));
vi.mock('../components/providers/FallbackAuthProvider', () => ({
  useFallbackIdentity: () => mockUseFallbackIdentity(),
}));
vi.mock('../lib/FallbackNetworkClient', () => ({
  createFallbackNetworkClient: (getUid: () => string) => mockCreateFallbackNetworkClient(getUid),
}));

import { useEffectiveApi } from './useEffectiveApi';

describe('useEffectiveApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the real API context when not in fallback mode', () => {
    const real = { networkClient: { tag: 'real' }, isReady: false };
    mockUseApiSafe.mockReturnValue(real);
    mockUseFallbackIdentity.mockReturnValue({ isFallback: false, fallbackUid: null });

    const { result } = renderHook(() => useEffectiveApi());
    expect(result.current).toBe(real);
  });

  it('returns a synthetic ready context in fallback mode', () => {
    mockUseApiSafe.mockReturnValue(null);
    mockUseFallbackIdentity.mockReturnValue({
      isFallback: true,
      fallbackUid: 'nofb_0123456789abcdef0123',
    });

    const { result } = renderHook(() => useEffectiveApi());
    expect(result.current?.isReady).toBe(true);
    expect(result.current?.userId).toBe('nofb_0123456789abcdef0123');
    expect(result.current?.token).toBe('nofb_0123456789abcdef0123');
    expect(result.current?.networkClient).toEqual({ tag: 'fallback-client' });
    expect(mockCreateFallbackNetworkClient).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/hooks/useEffectiveApi.test.ts`
Expected: FAIL — cannot resolve `./useEffectiveApi`.

- [ ] **Step 3: Write minimal implementation**

Create `src/hooks/useEffectiveApi.ts`:

```ts
/**
 * Returns the API context the app should use. Normally this is the real
 * Firebase-backed context from `useApiSafe()`. When the app is in fallback mode
 * (Firebase unreachable), it returns a synthetic, already-"ready" context
 * backed by the fallback network client, so the conversion pipeline can run
 * with an unverified `nofb_` identity.
 */

import { useMemo } from 'react';
import { useApiSafe, type ApiContextValue } from '@sudobility/building_blocks/firebase';
import { useFallbackIdentity } from '../components/providers/FallbackAuthProvider';
import { createFallbackNetworkClient } from '../lib/FallbackNetworkClient';
import { API_URL } from '../config/constants';

export function useEffectiveApi(): ApiContextValue | null {
  const realApi = useApiSafe();
  const { isFallback, fallbackUid } = useFallbackIdentity();

  return useMemo<ApiContextValue | null>(() => {
    if (isFallback && fallbackUid) {
      return {
        networkClient: createFallbackNetworkClient(() => fallbackUid),
        baseUrl: API_URL,
        userId: fallbackUid,
        token: fallbackUid,
        isReady: true,
        isLoading: false,
        refreshToken: async () => fallbackUid,
        testMode: false,
      };
    }
    return realApi;
  }, [isFallback, fallbackUid, realApi]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/hooks/useEffectiveApi.test.ts`
Expected: PASS (2 cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEffectiveApi.ts src/hooks/useEffectiveApi.test.ts
git commit -m "feat(auth): add useEffectiveApi overlay for fallback mode

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Route the SVGR client through the effective API

**Files:**
- Modify: `src/hooks/useSvgrClient.ts`
- Modify: `src/hooks/useSvgrClient.test.ts`

**Interfaces:**
- Consumes: `useEffectiveApi()` (Task 6) instead of `useApiSafe()`.
- Produces: unchanged signature — `useSvgrClient(): SvgrClient`.

- [ ] **Step 1: Update the implementation**

In `src/hooks/useSvgrClient.ts`, replace the `useApiSafe` import line:

```ts
import { useApiSafe } from '@sudobility/building_blocks/firebase';
```

with:

```ts
import { useEffectiveApi } from './useEffectiveApi';
```

and inside the hook body replace:

```ts
  const api = useApiSafe();
```

with:

```ts
  const api = useEffectiveApi();
```

(Leave the `useFirebaseAuthNetworkClient()` fallback and the rest of the hook unchanged — it still covers the pre-decision window before fallback engages.)

- [ ] **Step 2: Update the test to mock `useEffectiveApi`**

In `src/hooks/useSvgrClient.test.ts`, replace the building_blocks mock block:

```ts
vi.mock('@sudobility/building_blocks/firebase', () => ({
  useApiSafe: vi.fn(() => null),
}));
```

with:

```ts
vi.mock('./useEffectiveApi', () => ({
  useEffectiveApi: vi.fn(() => null),
}));
```

Replace the import line:

```ts
import { useApiSafe } from '@sudobility/building_blocks/firebase';
```

with:

```ts
import { useEffectiveApi } from './useEffectiveApi';
```

Then replace every `vi.mocked(useApiSafe)` with `vi.mocked(useEffectiveApi)` (two occurrences, in the "fallback network client when API context is null" and "API context network client when available" tests).

- [ ] **Step 3: Run the test to verify it passes**

Run: `bun run test -- src/hooks/useSvgrClient.test.ts`
Expected: PASS (4 cases) — the fallback-network-client and api-network-client selection still behave the same, now driven by `useEffectiveApi`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSvgrClient.ts src/hooks/useSvgrClient.test.ts
git commit -m "refactor(auth): resolve SVGR client network via useEffectiveApi

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Wire ConvertPage + AuthProviderWrapper; verify build

**Files:**
- Modify: `src/pages/ConvertPage.tsx` (use `useEffectiveApi` for the `isReady` gate)
- Modify: `src/components/providers/AuthProviderWrapper.tsx` (mount `FallbackAuthProvider`; only initialize consumables for real Firebase users)

**Interfaces:**
- Consumes: `useEffectiveApi()` (Task 6); `FallbackAuthProvider` (Task 5).
- Produces: no new exports.

- [ ] **Step 1: Switch ConvertPage to the effective API**

In `src/pages/ConvertPage.tsx`, replace the import:

```ts
import { useApiSafe } from '@sudobility/building_blocks/firebase';
```

with:

```ts
import { useEffectiveApi } from '../hooks/useEffectiveApi';
```

and replace:

```ts
  const api = useApiSafe();
```

with:

```ts
  const api = useEffectiveApi();
```

(The two `api?.isReady` usages — at the file-select handler and the retry `useEffect` — are unchanged; in fallback mode `isReady` is now `true`, so uploads proceed.)

- [ ] **Step 2: Mount FallbackAuthProvider and guard consumables in AuthProviderWrapper**

In `src/components/providers/AuthProviderWrapper.tsx`:

(a) Add the import near the other local imports:

```ts
import { FallbackAuthProvider } from './FallbackAuthProvider';
```

(b) Replace the consumables `useEffect` (the block that eagerly calls `initializeConsumablesService(...)` then subscribes via `onAuthStateChanged`) with one that only initializes/links consumables when a real Firebase user exists:

```ts
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, user => {
      // In fallback mode (Firebase blocked) there is no user; leave consumables
      // uninitialized so downloads are free and no Firebase-authed credit calls
      // are attempted.
      if (!user) return;
      initializeConsumablesService(new FirebaseAuthNetworkService());
      setConsumablesUserId(user.uid, user.email ?? undefined);
    });
    return unsubscribe;
  }, [auth]);
```

(c) Wrap the rendered children with `FallbackAuthProvider` inside the `AuthProvider` (so it can read `useAuthStatus()`). Change the returned JSX:

```tsx
    <AuthProvider
      firebaseConfig={{ type: 'instance', auth: auth }}
      providerConfig={{
        providers: ['google', 'email'],
        enableAnonymous: true,
      }}
      callbacks={authCallbacks}
      texts={texts}
      errorTexts={errorTexts}
      resolveErrorMessage={getFirebaseErrorMessage}
    >
      <FallbackAuthProvider>{children}</FallbackAuthProvider>
    </AuthProvider>
```

Also wrap the no-auth early return so fallback still works when Firebase is unconfigured. Change:

```tsx
  if (!auth) {
    console.warn('[AuthProviderWrapper] No auth instance - Firebase not configured');
    return <>{children}</>;
  }
```

to:

```tsx
  if (!auth) {
    console.warn('[AuthProviderWrapper] No auth instance - Firebase not configured');
    return <FallbackAuthProvider>{children}</FallbackAuthProvider>;
  }
```

> Note: `FallbackAuthProvider` calls `useAuthStatus()`, which requires an `AuthProvider` ancestor. In the no-auth branch there is none. If `bun run test`/runtime shows `useAuthStatus` throwing without a provider, guard it: in `FallbackAuthProvider`, wrap the `useAuthStatus()` call so a missing provider is treated as `{ user: null }` (Firebase unconfigured ⇒ the `getFirebaseAuth() === null` effect already engages fallback). Verify the actual behavior in Step 3 and apply this guard only if needed.

- [ ] **Step 3: Run the full client test suite**

Run: `bun run test`
Expected: PASS — all new tests plus the existing suite (including the updated `useSvgrClient.test.ts`).

- [ ] **Step 4: Typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: no type errors; build succeeds.

- [ ] **Step 5: Manual smoke check (fallback path)**

Run the dev server (`bun run dev`, port 5175). In DevTools, simulate Firebase being blocked (e.g. block `*.googleapis.com` requests, or set the network to offline only for those hosts), reload, and confirm: after ~8s the app becomes usable, an image upload/convert succeeds, the request carries `Authorization: Bearer nofb_…`, and SVG/PDF download works without a credit prompt. Requires the backend running with `ALLOW_FALLBACK_AUTH=true`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ConvertPage.tsx src/components/providers/AuthProviderWrapper.tsx
git commit -m "feat(auth): enable fallback identity flow in ConvertPage and AuthProviderWrapper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (performed against the spec)

**Spec coverage:**
- Detect Firebase failure → Task 5 (`getFirebaseAuth()===null` + 8s grace on no-user).
- Mint/persist `nofb_` UID in localStorage (+ in-memory fallback) → Task 3.
- Send identity as fake Bearer token → Task 4 (network client) + Task 6 (`token`/`userId`).
- Synthetic `isReady` API context → Task 6; consumed by Tasks 7–8.
- Free downloads via uninitialized consumables → Task 8 (consumables guarded to real users); `SvgPreviewPanel` untouched as designed.
- Backend accepts `nofb_` behind `ALLOW_FALLBACK_AUTH`, before `verifyIdToken`, with `isFallback` context var → Tasks 1–2 (both `requireAuth` and `optionalAuth`).
- DB marker = `nofb_` userId → automatic via `c.set("userId", token)` (no schema change), confirmed in Task 2.
- No shared-lib edits → all client code in `svgr_app` (`src/lib`, `src/hooks`, `src/components/providers`).

**Out-of-scope items confirmed not implemented:** paid credits for fallback users, history UI for fallback users, rate limiting, auth proxy, orphaned-row cleanup.

**Type consistency:** `getOrCreateFallbackUid` (Task 3) used in Tasks 5/6 by name; `createFallbackNetworkClient(getUid)` (Task 4) used in Task 6; `useFallbackIdentity()` shape `{ isFallback, fallbackUid }` consistent across Tasks 5/6; `useEffectiveApi()` returns `ApiContextValue | null` consumed in Tasks 7/8; backend `isFallback` context var declared in `optionalAuth.ts` and set in both middlewares (Task 2).
