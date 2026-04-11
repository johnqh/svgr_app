# SVGR App

Web app for SVGR image-to-SVG conversion.

**Package**: `@sudobility/svgr_app` (private)

## Tech Stack

- **Language**: TypeScript (strict mode, JSX)
- **Runtime**: Bun
- **Package Manager**: Bun (do not use npm/yarn/pnpm for installing dependencies)
- **Framework**: React 19, React Router v7
- **Build**: Vite 6
- **Styling**: Tailwind CSS 3
- **i18n**: i18next (16 languages)
- **Auth**: Firebase Auth
- **Payments**: RevenueCat (web)
- **Test**: Vitest

## Project Structure

```
src/
├── App.tsx                     # Root app with routing
├── main.tsx                    # Entry point
├── i18n.ts                     # i18n initialization
├── analytics.ts                # Analytics setup
├── index.css                   # Global styles (Tailwind)
├── config/
│   ├── auth-config.ts          # Firebase auth config
│   ├── constants.ts            # App constants
│   ├── constants.test.ts       # Constants tests
│   ├── consumables.ts          # Credit system config
│   ├── initialize.ts           # App initialization
│   └── seo-config.ts           # SEO metadata
├── pages/
│   ├── ConvertPage.tsx          # Main conversion page
│   ├── UseCasesPage.tsx         # Use cases / marketing
│   ├── CreditsPage.tsx          # Credit store
│   ├── LoginPage.tsx            # Authentication
│   ├── PrivacyPage.tsx          # Privacy policy
│   └── TermsPage.tsx            # Terms of service
├── components/
│   ├── ImageUploadPanel.tsx     # Drag-drop image upload
│   ├── SvgPreviewPanel.tsx      # SVG/PDF download with credit check
│   ├── ConvertButton.tsx        # Conversion trigger
│   ├── providers/               # Context providers
│   └── seo/                     # SEO components
├── hooks/                       # Custom hooks
└── test/                        # Test utilities
```

## Commands

```bash
bun run dev          # Vite dev server
bun run build        # TypeScript check + Vite build
bun run preview      # Preview production build
bun test             # Run tests
bun run lint         # Run ESLint
bun run typecheck    # TypeScript check
bun run verify       # All checks + build (use before commit)
```

## Key Concepts

### Conversion Flow

1. User uploads image via `ImageUploadPanel` (drag-drop or file picker)
2. Adjusts quality slider and options
3. Clicks `ConvertButton` -- calls API (free, no auth required)
4. `SvgPreviewPanel` displays result
5. Download SVG/PDF costs 1 credit (credit-gated)

### Routing

Language-prefixed routes: `/:lang/*` (e.g., `/en/convert`, `/ja/credits`). Supports 16 languages.

### Sudobility Ecosystem Dependencies

- `@sudobility/building_blocks` -- shared UI components
- `@sudobility/auth-components` -- Firebase auth UI
- `@sudobility/di` -- dependency injection
- `@sudobility/seo_lib` -- SEO utilities
- `@sudobility/consumables_client` -- credit system
- `@sudobility/consumables_pages` -- credit store UI
- `@sudobility/svgr_lib` -- shared business logic
- `@sudobility/svgr_client` -- API client

## Environment Variables

| Variable                            | Description                  |
| ----------------------------------- | ---------------------------- |
| `VITE_API_URL`                      | SVGR API server URL          |
| `VITE_FIREBASE_API_KEY`             | Firebase API key             |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain         |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase project ID          |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket      |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID`              | Firebase app ID              |
| `VITE_FIREBASE_MEASUREMENT_ID`      | Firebase measurement ID      |
| `VITE_REVENUECAT_API_KEY`           | RevenueCat web API key       |
| `VITE_CONSUMABLES_OFFERING_ID`      | RevenueCat offering ID       |

## Related Projects

- **svgr_types** (`/Users/johnhuang/projects/svgr_types`) -- Shared type definitions (indirect dependency)
- **svgr_client** (`/Users/johnhuang/projects/svgr_client`) -- API client SDK for calling the conversion API
- **svgr_lib** (`/Users/johnhuang/projects/svgr_lib`) -- Shared business logic (hooks, constants, i18n, validation)
- **svgr_api** (`/Users/johnhuang/projects/svgr_api`) -- Backend API server this app calls
- **svgr_app_rn** (`/Users/johnhuang/projects/svgr_app_rn`) -- React Native sibling app sharing svgr_client and svgr_lib
- **consumables_client** / **consumables_pages** (`@sudobility/consumables_client`, `@sudobility/consumables_pages`) -- Credit system client and store UI
- **building_blocks** (`@sudobility/building_blocks`) -- Shared UI shell and components

## Coding Patterns

- **Language-prefixed routes**: all routes follow `/:lang/*` pattern (e.g., `/en/convert`, `/ja/credits`). 16 languages supported.
- **`ConvertPage`** is the main feature page -- image upload, conversion, preview, and download
- **RevenueCat** for credit purchases -- web SDK integrated for in-app purchases
- **PDF export** uses `jspdf` + `svg2pdf.js` to convert SVG results to downloadable PDFs
- **Radix UI + Tailwind CSS** for component styling -- use Radix primitives for accessibility, Tailwind for layout and design tokens
- **Vite** dev server runs on port 5175
- React 19 with React Router v7 for routing

## Gotchas

- **Downloads cost 1 credit each** -- both SVG and PDF downloads are credit-gated. The conversion itself is free (no auth required).
- **Vite dedupes React and shared packages** -- check `vite.config.ts` for `resolve.dedupe` settings. Duplicate React instances cause hook errors.
- **`resolve.alias` for svgr_client** -- Vite config includes an alias to resolve svgr_client correctly. If you add new shared packages, you may need similar aliases.
- **Deployed to Cloudflare Pages** -- the build output must be compatible with Cloudflare's static hosting. No server-side rendering.
- **SEO is important** -- language-prefixed routes, hreflang tags, and meta tags are generated for all 16 languages. Changes to routing must preserve SEO structure.
- Environment variables must be prefixed with `VITE_` to be available in client code.

## Testing Notes

- Tests are in `*.test.ts` / `*.test.tsx` files alongside source files (e.g., `src/config/constants.test.ts`)
- Use Vitest's `vi.mock()` for mocking dependencies
- Test utilities are in `src/test/`
- Component tests should use React Testing Library patterns
