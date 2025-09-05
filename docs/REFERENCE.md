## Reference

This page consolidates a quick summary of API endpoints and demo credentials.

### Demo Accounts

- Customer (demo): `demo@mariospizzerIa.com` / `demo123`
- Admin (seeded): `admin@mariospizzeria.com` / `admin123`

Note: Admin and demo users are created by the database seed scripts. Change these in production.

### API Endpoints (summary)

Authentication
- POST `/api/auth/register` – Create a user (email, password, name, phone?)
- POST `/api/auth/login` – Returns `{ user, accessToken, refreshToken }`
- POST `/api/auth/refresh` – Returns `{ accessToken, refreshToken }`
- POST `/api/auth/logout`

Menu
- GET `/api/menu/categories` – Lists categories (with `imageUrl`)
- GET `/api/menu/items` – Lists items (filters: `category`, `search`, `dietary`, paging)
- GET `/api/menu/items/:id` – Item details

Orders (auth required)
- POST `/api/orders` – Create an order
  - Supports `promoCode` (WELCOME20 → 20% off first order). Response includes `discountAmount`, `promoApplied`.
- GET `/api/orders` – List user orders (paging)

Admin (auth + role required)
- `/api/admin/menu/*`, `/api/admin/orders/*`, `/api/admin/settings/*` – Management endpoints

For more, inspect `backend/src/routes/*`.
