# @sudobility/svgr_app

Web application for SVGR image-to-SVG conversion. Built with React 19, Vite 6, and Tailwind CSS.

## Setup

```bash
bun install
cp .env.example .env   # Configure VITE_API_URL, Firebase, RevenueCat keys
```

## Features

- Drag-and-drop image upload with quality controls
- Real-time SVG preview with download (SVG/PDF)
- Credit-gated downloads via RevenueCat
- 16-language i18n with language-prefixed routes
- Firebase authentication

## Development

```bash
bun run dev          # Vite dev server (port 5175)
bun run build        # TypeScript check + Vite build
bun run preview      # Preview production build
bun test             # Run tests
bun run verify       # All checks + build
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | SVGR API server URL |
| `VITE_FIREBASE_*` | Firebase configuration (7 vars) |
| `VITE_REVENUECAT_API_KEY` | RevenueCat web API key |

## Related Packages

- `svgr_types` -- Shared type definitions
- `svgr_client` -- API client SDK
- `svgr_lib` -- Shared business logic
- `svgr_api` -- Backend API server
- `svgr_app_rn` -- React Native sibling app

## License

BUSL-1.1
