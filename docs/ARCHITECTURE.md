# Architecture Overview

This app has two main components: a lightweight Hono backend and a mobile‑first TypeScript frontend. Everything is containerized for consistent local and demo deployments.

## Backend (Node.js + Hono)

- Entry: `backend/src/index.ts`
- Routes: `backend/src/routes/*`
  - `/api/menu/*` – public menu + categories (with caching)
  - `/api/auth/*` – register/login/refresh/logout
  - `/api/orders/*` – create + list orders (auth required)
  - `/api/admin/*` – admin endpoints (menu, inventory, settings)
- DB Access: `backend/src/config/database.ts` (PostgreSQL + Redis)
- Middleware: security headers, rate limits, error handler

### Database Init

`backend/src/db/`
- `01-schema.sql` – core tables
- `02-admin-schema.sql` – inventory, audit, analytics
- `03-seed.sql` – French categories + items (with images)
- `04-admin-seed.sql` – admin user, inventory seed, sample sales

### Promotions

`POST /api/orders` accepts `promoCode`.
- `WELCOME20` → 20% off subtotal for a user’s first order. Tax is calculated on the discounted subtotal.

## Frontend (TypeScript)

- App shell + router: `frontend/src/app.ts`
- Pages: `frontend/src/pages/*` (Home, Menu, Cart, Orders, Profile, Admin*)
- Services: `frontend/src/services/*` (menu, auth, i18n, branding)
- Styling: `frontend/src/styles/main.css` (tokens + components)
- Branding: `frontend/src/config/brands/*`

### UX Notes

- PWA enabled; during UI work, hard refresh or unregister the service worker.
- Apple‑like theme: higher contrast, neutral typography, rounded components.

## Running

Prod‑like compose
```bash
docker compose up -d --build
# Frontend via Caddy: http://localhost:8082
# API via Caddy:      http://localhost:8082/api
```

Dev compose (hot reload)
```bash
docker compose -f docker-compose.dev.yml up -d --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Conventions

- TypeScript everywhere.
- Biome for lint/format.
- Keep modules small; favor pure functions/util helpers.
- Server authority; UI mirrors results.

