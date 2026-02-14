# LOGIN & Watermark Protection Plan

## Context

SVGR currently allows anyone to convert images to SVG without authentication. To protect the service and encourage sign-ups, we need to add a watermark to converted SVGs for unauthenticated users. Logged-in users get clean SVGs. This follows the same Firebase Auth pattern used in shapeshyft.

## Summary of Decisions

- **Watermark text**: "SVGR"
- **Watermark style**: Orange with white outline, 20% opacity, bold, large, tilted -15deg, centered
- **Watermark location**: Server-side (svgr_api) — secure, can't be bypassed
- **Login UI**: Login button in top bar → dedicated login page (same as shapeshyft)
- **Auth providers**: Google + Email
- **Database**: Yes — drizzle-orm + PostgreSQL on 50.118.250.186, new `svgr` database
- **Auth token flow**: Firebase ID token via `Authorization: Bearer <token>` header

---

## Part 1: svgr_api — Auth + Watermark + Database

### 1A. Add dependencies

```
bun add @sudobility/auth_service drizzle-orm postgres firebase-admin
bun add -d drizzle-kit
```

### 1B. Firebase service (`src/services/firebase.ts`)

Follow shapeshyft_api pattern (`~/shapeshyft/shapeshyft_api/src/services/firebase.ts`):
- Import `initializeAuth`, `createCachedVerifier` from `@sudobility/auth_service`
- Initialize Firebase Admin SDK with env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
- Export `verifyIdToken` using cached verifier (5 min TTL)
- Skip initialization in test mode

### 1C. Optional auth middleware (`src/middleware/optionalAuth.ts`)

Unlike shapeshyft (which requires auth), we need **optional** auth:
- Extract `Authorization: Bearer <token>` header
- If present and valid → set `c.set('authenticated', true)` and `c.set('userId', uid)`
- If absent or invalid → set `c.set('authenticated', false)`
- **Always call `next()`** — never return 401

Declare Hono ContextVariableMap:
```typescript
declare module "hono" {
  interface ContextVariableMap {
    authenticated: boolean;
    userId: string | null;
    userEmail: string | null;
  }
}
```

### 1D. Database setup (`src/db/`)

Follow shapeshyft_api pattern with drizzle-orm + postgres:
- `src/db/index.ts` — Initialize postgres connection, export `db` and schema
- `src/db/schema.ts` — Define `users` table (firebase_uid, email, created_at)
- `src/db/init.ts` — Script to create tables
- Add `DATABASE_URL` to `.env`, `.env.local`, `.env.example`
- Create `svgr` database on 50.118.250.186

User table schema:
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firebase_uid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
```

### 1E. Rewrite watermark service (`src/services/watermark.ts`)

Replace existing small-corner watermark with a large, centered, tilted watermark:
- Parse SVG dimensions from width/height or viewBox
- Create a `<text>` element:
  - Text: "SVGR"
  - Font: bold, sans-serif, ~30% of image width
  - Fill: orange (#ea580c), opacity 0.2
  - White stroke outline (stroke="#ffffff", stroke-width proportional)
  - Centered: `x="50%"`, `y="50%"`, `text-anchor="middle"`, `dominant-baseline="central"`
  - Tilted: wrapped in `<g transform="rotate(-15, cx, cy)">`
- Insert before `</svg>` closing tag

### 1F. Update convert route (`src/routes/convert.ts`)

- Apply optional auth middleware to the route
- After conversion, check `c.get('authenticated')`:
  - If `false` → call `addWatermark(svg)` before returning
  - If `true` → return clean SVG
- Fire-and-forget: ensure user exists in DB if authenticated

### 1G. Update index.ts

- Apply optional auth middleware globally or to the convert route
- Initialize database on startup (like shapeshyft)

### 1H. Environment variables

Add to `.env` and `.env.local`:
```
DATABASE_URL=postgres://svgr:PASSWORD@50.118.250.186:5432/svgr
SITEADMIN_EMAILS=johnqh@yahoo.com,johnqh@sonic.net
```

Update `.env.example` with new keys.

---

## Part 2: svgr_client — Pass auth token

### 2A. Update SvgrClient (`src/network/SvgrClient.ts`)

Add optional `getToken` callback to config:
```typescript
export interface SvgrClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
}
```

In `convert()` method:
- If `getToken` is provided, call it and add `Authorization: Bearer <token>` header
- If not provided or returns null, send without auth header

### 2B. Bump version

Update package.json version.

---

## Part 3: svgr_app — Firebase Auth + Login UI

### 3A. Add dependencies

```
bun add @sudobility/auth-components @sudobility/auth_lib
```

### 3B. Switch to SudobilityAppWithFirebaseAuth

Update `src/App.tsx`:
- Replace `SudobilityApp` with `SudobilityAppWithFirebaseAuth` from `@sudobility/building_blocks/firebase`
- Import from `@sudobility/building_blocks/firebase` (not main export)
- Pass `AuthProviderWrapper`, `apiUrl`, `testMode` props (same pattern as shapeshyft)

### 3C. Create AuthProviderWrapper (`src/components/providers/AuthProviderWrapper.tsx`)

Follow shapeshyft pattern (`~/shapeshyft/shapeshyft_app/src/components/providers/AuthProviderWrapper.tsx`):
- Use `AuthProvider` from `@sudobility/auth-components`
- Use `getFirebaseAuth`, `initializeFirebaseAuth` from `@sudobility/auth_lib`
- Create `auth-config.ts` with `createAuthTexts()` and `createAuthErrorTexts()` using i18n
- Providers: `["google", "email"]`, `enableAnonymous: false`

### 3D. Create LoginPage (`src/pages/LoginPage.tsx`)

Follow shapeshyft pattern (`~/shapeshyft/shapeshyft_app/src/pages/LoginPage.tsx`):
- Use `LoginPage` component from `@sudobility/building_blocks`
- Use `useAuthStatus` from `@sudobility/auth-components`
- Redirect to main page (`/${lang}`) if already authenticated
- Pass logo, appName, auth instance, onSuccess callback

### 3E. Update TopBar — Switch to AppTopBarWithFirebaseAuth

Replace `AppTopBar` in `src/App.tsx` with `AppTopBarWithFirebaseAuth`:
- Import `AuthAction` from `@sudobility/auth-components`
- Pass `AuthActionComponent={AuthAction}`
- Pass `onLoginClick={() => navigate(\`/${currentLang}/login\`)}`
- No authenticated menu items needed (SVGR is simpler than shapeshyft)

### 3F. Update routing

Add login route in `LangRoutes`:
```tsx
<Route path="login" element={<LoginPage />} />
```

### 3G. Update useSvgrClient hook

Pass Firebase ID token getter to SvgrClient:
```typescript
import { useApi } from '@sudobility/building_blocks/firebase';

export function useSvgrClient() {
  const { getToken } = useApi(); // or similar hook from the auth context
  return useMemo(
    () => new SvgrClient({ baseUrl: API_URL, getToken }),
    [getToken]
  );
}
```

Need to check exactly how `useApi()` exposes the token getter from `SudobilityAppWithFirebaseAuth`.

### 3H. Add auth i18n translations

Add auth-related translation keys to `public/locales/en/svgr.json` (or a separate `auth.json` namespace):
- signInTitle, signIn, signUp, continueWithGoogle, continueWithEmail, etc.
- All ~30 auth text keys needed by AuthProvider
- Translate to all 16 supported languages

---

## File Change Summary

### svgr_api (~/projects/svgr_api)
| File | Action |
|------|--------|
| `package.json` | Add deps: auth_service, drizzle-orm, postgres, firebase-admin, drizzle-kit |
| `src/services/firebase.ts` | NEW — Firebase Admin init + token verification |
| `src/middleware/optionalAuth.ts` | NEW — Optional auth middleware |
| `src/db/index.ts` | NEW — Database connection + exports |
| `src/db/schema.ts` | NEW — Users table schema |
| `src/db/init.ts` | NEW — DB initialization script |
| `src/services/watermark.ts` | REWRITE — Large centered tilted watermark |
| `src/services/watermark.test.ts` | UPDATE — Tests for new watermark |
| `src/routes/convert.ts` | UPDATE — Add auth check, conditional watermark |
| `src/index.ts` | UPDATE — Add DB init, apply middleware |
| `.env` | UPDATE — Add DATABASE_URL, SITEADMIN_EMAILS |
| `.env.local` | UPDATE — Add DATABASE_URL |
| `.env.example` | UPDATE — Add new env var placeholders |

### svgr_client (~/projects/svgr_client)
| File | Action |
|------|--------|
| `src/network/SvgrClient.ts` | UPDATE — Add optional getToken to config |
| `package.json` | Bump version |

### svgr_app (~/projects/svgr_app)
| File | Action |
|------|--------|
| `package.json` | Add deps: auth-components, auth_lib |
| `src/App.tsx` | UPDATE — Use SudobilityAppWithFirebaseAuth, add login route, switch to AppTopBarWithFirebaseAuth |
| `src/components/providers/AuthProviderWrapper.tsx` | NEW — Auth provider wrapper |
| `src/config/auth-config.ts` | NEW — Auth text config |
| `src/pages/LoginPage.tsx` | NEW — Login page |
| `src/hooks/useSvgrClient.ts` | UPDATE — Pass token getter |
| `public/locales/*/svgr.json` | UPDATE — Add auth translation keys (16 languages) |

---

## Verification

1. **Start svgr_api**: `cd svgr_api && bun run dev` — should start on port 8019 with DB connected
2. **Start svgr_app**: `cd svgr_app && bun run dev` — should start on port 5175
3. **Test unauthenticated**: Convert an image without logging in → SVG should contain large "SVGR" watermark, orange, tilted, centered
4. **Test login**: Click login button in top bar → navigate to login page → sign in with Google → redirect back
5. **Test authenticated**: Convert an image while logged in → SVG should be clean, no watermark
6. **Test watermark properties**: Inspect SVG source — verify orange fill (#ea580c), 20% opacity, white stroke outline, -15deg rotation, centered
7. **Run tests**: `cd svgr_api && bun run test` — watermark tests pass
8. **Build check**: `cd svgr_app && bun run build` — no TypeScript errors
