# Brand Configuration System

This project uses a clean, modular branding system that allows easy switching between different restaurant brands during development.

## How it Works

### Frontend Branding
- Location: `frontend/src/config/branding.ts`
- Brands: `frontend/src/config/brands/`
- Current: Mario's Pizzeria

### Backend Branding
- Location: `backend/src/config/restaurant.ts`
- Brands: `backend/src/config/brands/`
- Current: Mario's Pizzeria

## Available Brands

1. Mario's Pizzeria — Italian pizzeria theme
2. Burger Junction — American burger restaurant theme

## How to Switch Brands

### 1) Frontend (required)
Edit `frontend/src/config/branding.ts`:
```ts
// Change this import to switch brands:
import { marioPizzeriaConfig } from './brands/mario-pizzeria';
// import { burgerJunctionConfig } from './brands/burger-junction';

export const activeBrandConfig = marioPizzeriaConfig;
```

### 2) Backend (required)
Edit `backend/src/config/restaurant.ts`:
```ts
// Change this line to switch brands:
export const restaurantConfig: RestaurantConfig = marioPizzeriaConfig;
// export const restaurantConfig: RestaurantConfig = burgerJunctionConfig;
```

### 3) Database Seed Data (optional)
- Mario's: `backend/src/db/03-seed.sql`
- (Other brand seeds can be added similarly.)

## Current Setup: Mario's Pizzeria

Configured with:
- French copy + Italian-styled theme
- Pizza-specific menu items and categories
- Professional, modern system fonts

Branding is static and compile-time configured.
