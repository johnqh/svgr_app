# Improvement Plans for @sudobility/svgr_app

## Priority 1 - High Impact

### 1. Expand Test Coverage Beyond Constants
- The project currently has only one test file (`src/config/constants.test.ts`) which validates that `API_URL` and `APP_NAME` are defined. No component tests, hook tests, or page tests exist.
- **Components needing tests**: `ImageUploadPanel` (drag-drop flow, file validation, error states), `SvgPreviewPanel` (credit checking, download triggers, PDF generation), `ConvertButton` (disabled/loading states), `SEO` (hreflang generation, canonical paths).
- **Hooks needing tests**: `useSvgrClient` (client instantiation with network client fallback).
- **Pages needing tests**: `ConvertPage` (full conversion flow integration), `CreditsPage` (purchase flow, unauthenticated state), `LoginPage` (redirect when authenticated).
- The test setup file (`src/test/setup.ts`) already mocks `@sudobility/svgr_lib`, showing infrastructure is in place but unused.

### 2. Add JSDoc Documentation to Components, Hooks, and Config Modules
- None of the page components (`ConvertPage`, `CreditsPage`, `UseCasesPage`, `LoginPage`, `PrivacyPage`, `TermsPage`) have JSDoc comments describing their purpose, props, or behavior.
- The `useSvgrClient` hook has no JSDoc explaining the fallback network client strategy (`useApiSafe` vs `useFirebaseAuthNetworkClient`).
- `SvgPreviewPanel` contains nuanced credit-gating logic (`consumeCredit`, `checkBalance`) that silently allows downloads on error -- this design decision deserves documented rationale.
- The `AuthProviderWrapper` has a brief JSDoc but the consumables initialization side effect inside `useEffect` is undocumented.
- Config files (`consumables.ts`, `initialize.ts`, `seo-config.ts`) lack JSDoc on exported functions and constants.

### 3. Improve Error Handling in ConvertPage and SvgPreviewPanel
- `ConvertPage.handleConvert` uses a `FileReader` with `onload` callback but has no `onerror` handler. If the file read fails, the user sees no feedback.
- `SvgPreviewPanel.handleDownloadPdf` has no try/catch around `jsPDF` creation or `svg2pdf` conversion. If the SVG has malformed dimensions or parsing fails, the error is unhandled.
- `SvgPreviewPanel.consumeCredit` silently returns `true` on error, allowing downloads even when credit recording fails. This is intentional (per comment "async recording") but there is no retry mechanism or user notification.
- The `checkBalance` function allows downloads when `balance === null` (still loading). This could lead to downloads without credit deduction if the balance check hasn't completed.

## Priority 2 - Medium Impact

### 4. Extract Inline SVG Icons into a Shared Icon Component or File
- `App.tsx` defines `LightBulbIcon` inline. `ConvertButton.tsx` has inline spinner and arrow SVGs. `SvgPreviewPanel.tsx` has an inline download icon. `ImageUploadPanel.tsx` has an inline image upload icon.
- These inline SVG definitions add visual clutter to business logic components and make icon reuse impossible.
- Consider creating a `src/components/icons/` directory or using the ecosystem's `@sudobility/building_blocks` for shared icon components.

### 5. Add Loading/Suspense Boundary for Route-Level Code Splitting
- All pages are eagerly imported in `App.tsx` (`import ConvertPage from './pages/ConvertPage'`, etc.).
- The `main.tsx` wraps `App` in `<Suspense fallback={null}>` but since no lazy loading is used, this Suspense boundary has no effect.
- `React.lazy()` could be applied to `UseCasesPage`, `CreditsPage`, `LoginPage`, `PrivacyPage`, and `TermsPage` to reduce the initial bundle size, since only `ConvertPage` is the primary entry point.
- Vite already supports dynamic imports for code splitting.

### 6. Consolidate Object URL Memory Management
- `ConvertPage` creates an object URL via `URL.createObjectURL(f)` in `handleFileSelect` and revokes it in `handleClear`, but there is no cleanup on unmount. If the user navigates away from `ConvertPage` without clicking clear, the object URL leaks.
- Consider using a `useEffect` cleanup or a dedicated hook that manages the object URL lifecycle.

## Priority 3 - Nice to Have

### 7. Add Accessibility Attributes to Interactive Elements
- The image upload drop zone (`ImageUploadPanel`) uses a `div` with `onClick` and drag handlers but lacks `role="button"`, `tabIndex`, `aria-label`, or keyboard event handlers. It is not keyboard-accessible.
- The close button overlay uses a `<button>` (good) but lacks an `aria-label` for screen readers.
- The quality slider in `ConvertPage` is a native `<input type="range">` (accessible) but lacks an `aria-label` or explicit `id`/`htmlFor` pairing with its label.
- Download buttons in `SvgPreviewPanel` lack `aria-label` attributes (they show only "SVG" or "PDF" text with an icon).

### 8. Add Environment Variable Validation at Startup
- `initializeApp()` in `config/initialize.ts` passes `import.meta.env` values directly to Firebase initialization without validating they exist. If `VITE_FIREBASE_API_KEY` is missing, the app initializes Firebase with an empty string, which may cause cryptic runtime errors later.
- `consumables.ts` warns when `REVENUECAT_API_KEY` is missing but other config files do not.
- Consider a startup validation step that checks all required environment variables and provides clear error messages during development.

### 9. Hardcoded Strings in Non-i18n Contexts
- `LoginPage` hardcodes `appName="SVGR"` instead of using the `APP_NAME` constant.
- `auth-config.ts` hardcodes `continueWithApple: "Continue with Apple"` instead of using `t('continueWithApple')`.
- `PrivacyPage` and `TermsPage` hardcode `lastUpdatedDate="2025-02-14"` -- this should be a constant or config value, and the date appears stale (it is now 2026).
- `seo-config.ts` hardcodes the default description string in English rather than pulling from i18n.
