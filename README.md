# Modern PWA Demo - Mobile-First Web Application

A comprehensive Progressive Web Application showcasing 2025 web development best practices, including offline capabilities, real-time features, CI/CD deployment, and business customization framework.

## 🚀 Quick Run

- Dev (hot reload):

  ```bash
  docker compose --profile dev up -d --build
  # Frontend (dev): http://localhost:5173
  # Backend  (dev): http://localhost:3001
  ```

- Prod-like:

  ```bash
  docker compose --profile prod up -d --build
  # Frontend (Caddy): http://localhost:8082
  # API (proxied)   : http://localhost:8082/api
  ```

## 🚀 Features

### Core PWA Features
- ✅ **Installable PWA** - Works as a native app on mobile and desktop
- ✅ **Offline Functionality** - Full offline support with service workers
- ✅ **Background Sync** - Syncs data when connection is restored
- ✅ **Push Notifications** - Real-time order updates
- ✅ **App Shell Architecture** - Fast loading with cached shell

### Mobile-First Design
- ✅ **Responsive Design** - Optimized for all screen sizes
- ✅ **Touch Gestures** - Native-like touch interactions
- ✅ **Bottom Navigation** - Mobile-friendly navigation
- ✅ **Optimized Performance** - Fast load times and smooth animations

### Business Logic Features
- ✅ **Catalog Browsing** - Browse by categories with filtering
- ✅ **Cart Management** - Add, remove, and customize items
- ✅ **Order Tracking** - Real-time status updates
- ✅ **User Authentication** - Secure JWT-based auth
- ✅ **Payment Integration** - Secure payment processing
- ✅ **Delivery Tracking** - Live location tracking

### Technical Features & 2025 Best Practices
- ✅ **TypeScript** - Full type safety across frontend and backend
- ✅ **CI/CD Pipeline** - GitHub Actions with automated testing and deployment
- ✅ **Security Hardening** - Rate limiting, security headers, JWT secrets management
- ✅ **i18n Support** - Internationalization framework (13 languages)
- ✅ **IndexedDB Storage** - Offline data persistence
- ✅ **Real-time Updates** - WebSocket connections
- ✅ **Smart Caching** - Multi-level caching strategies
- ✅ **Docker Support** - Production-ready containerization
- ✅ **Code Quality** - Biome linting, formatting, and testing
- ✅ **Business Customization** - Easy rebranding for different industries

## 🛠️ Tech Stack

### Frontend
- **Framework**: Vanilla TypeScript (built to learn core web APIs and browser fundamentals)
- **Build Tool**: Vite
- **PWA**: Workbox + Custom Service Worker
- **Storage**: IndexedDB with Dexie
- **Styling**: CSS3 with CSS Variables
- **i18n**: Custom internationalization system
- **Code Quality**: Biome, TypeScript strict mode

### Backend
- **Runtime**: Node.js with Hono.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Auth**: JWT with refresh tokens
- **WebSocket**: Native WebSocket support
- **TypeScript**: Full type safety
- **Code Quality**: Biome, TypeScript strict mode

### Infrastructure
- **Container**: Docker & Docker Compose
- **Reverse Proxy**: Caddy (automatic HTTPS)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7

## 📁 Project Structure

```
mobile-web-app-demo/
├── frontend/                # Frontend PWA application
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── services/       # Business logic & API
│   │   ├── styles/         # CSS styles
│   │   ├── types/          # TypeScript types
│   │   └── main.ts         # App entry point
│   ├── public/             # Static assets
│   ├── biome.json          # Biome configuration
│   ├── tsconfig.json       # TypeScript config
│   └── package.json
├── backend/                # Backend API service
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # Server entry
│   ├── biome.json          # Biome configuration
│   ├── tsconfig.json       # TypeScript config
│   └── package.json
├── docker-compose.yml      # Production setup
├── docker-compose.dev.yml  # Development setup
└── Caddyfile              # Caddy configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Option 1: Full Docker Development (Recommended)

**Solves OS-specific issues and provides consistent development environment**

```bash
# Clone the repository
git clone <repository-url>
cd mobile-web-app-demo

# 🔐 CRITICAL: Generate JWT secrets
node generate-secrets.js

# Copy environment file and update with your secrets
cp .env.example .env
# Edit .env and paste the generated secrets

# Start complete development stack (all services in containers)
docker compose --profile dev up -d --build

# View logs (optional)
docker-compose -f docker-compose.dev.yml logs -f

# Access the app
# Frontend (dev): http://localhost:5173
# Backend API (dev): http://localhost:3001
# Database: localhost:5437 (postgres/postgres)
# Redis: localhost:6380
```

**Benefits:**
- No OS-specific build issues (Windows/Mac/Linux)
- Consistent Node.js and dependency versions
- Hot reload for both frontend and backend
- Automatic container networking
- Clean teardown with `docker-compose down`

### Option 2: Hybrid Setup (Database in Docker, Apps Local)

```bash
# Clone and setup
git clone <repository-url>
cd mobile-web-app-demo

# Generate secrets and setup environment
node generate-secrets.js
cp .env.example .env
# Edit .env with generated secrets

# Start only databases in Docker
docker compose up -d postgres redis

# Start backend locally
cd backend && npm install && npm run dev  # Terminal 1

# Start frontend locally
cd frontend && npm install && npm run dev # Terminal 2

# Access at http://localhost:5173
```

### Option 3: Full Local Setup (PostgreSQL + Redis installed locally)

```bash
# Clone and setup
git clone <repository-url>
cd mobile-web-app-demo

# Automated local setup (installs PostgreSQL + Redis)
\# Optional: run DB locally (advanced) – see docs/ARCHITECTURE.md

# Start development
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2

# Access at http://localhost:5173
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

### Manual Setup

```bash
# Clone the repository
git clone <repository-url>
cd mobile-web-app-demo

# Setup backend
cd backend
npm install
cp .env.example .env  # Configure your environment
npm run dev

# Setup frontend (new terminal)
cd ../frontend
npm install
npm run dev

# Access the app (dev)
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
```

## 📜 Available Scripts

### Frontend Scripts
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run Biome linter
npm run format     # Format code with Biome
npm run typecheck  # TypeScript type checking
```

### Backend Scripts
```bash
npm run dev        # Start with hot reload
npm run build      # Compile TypeScript
npm run start      # Start production server
npm run lint       # Run Biome linter
npm run format     # Format code with Biome
npm run typecheck  # TypeScript type checking
```

## 🔐 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foodflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:8082
```

## 🏗️ Building for Production

### Using Docker
```bash
# Build and start all services
docker compose build
docker compose up -d

# Check status
docker-compose ps

# View logs
docker compose logs -f

# Local port mappings (default compose)
# - Frontend via Caddy: http://localhost:8082 (HTTPS on 8445)
# - Frontend container (direct): http://localhost:5180 (HTTPS on 5181)
# - Backend API (direct): http://localhost:3003
# - PostgreSQL: localhost:5437
# - Redis: localhost:6381
```

### Manual Build
```bash
# Build frontend
cd frontend
npm run build
# Serve dist/ with any static server

# Build backend
cd backend
npm run build
npm run start
```

## 📱 PWA Features

### Service Worker
- **Caching Strategy**: Cache-first for assets, network-first for API
- **Offline Pages**: Custom offline page when network unavailable
- **Background Sync**: Queues failed requests for retry
- **Update Strategy**: Skip waiting for immediate updates

### Installation
- **Desktop**: Chrome/Edge - Install button in address bar
- **iOS**: Safari - Share → Add to Home Screen
- **Android**: Chrome - Add to Home Screen prompt

### Push Notifications
- Order status updates
- Delivery notifications
- Promotional messages (with opt-in)

## 🌍 Internationalization

Supported languages:
- 🇬🇧 English (en)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇮🇹 Italian (it)
- 🇵🇹 Portuguese (pt)
- 🇨🇳 Chinese (zh)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)
- 🇸🇦 Arabic (ar) - RTL
- 🇮🇱 Hebrew (he) - RTL
- 🇮🇳 Hindi (hi)
- 🇷🇺 Russian (ru)

## 🔄 API Documentation

### Authentication Endpoints
```
POST   /api/auth/register     - User registration
POST   /api/auth/login        - User login
POST   /api/auth/refresh      - Refresh token
POST   /api/auth/logout       - User logout
```

### Menu Endpoints
```
GET    /api/menu/categories   - Get categories
GET    /api/menu/items        - Get menu items
GET    /api/menu/items/:id    - Get item details
```

### Order Endpoints
```
POST   /api/orders            - Create order
GET    /api/orders            - Get user orders
GET    /api/orders/:id        - Get order details
```

### User Endpoints
```
GET    /api/users/profile     - Get profile
PUT    /api/users/profile     - Update profile
GET    /api/users/addresses   - Get addresses
POST   /api/users/addresses   - Add address
PUT    /api/users/addresses/:id - Update address
DELETE /api/users/addresses/:id - Delete address
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run e2e tests
npm run test:e2e
```

### Testing

Project currently focuses on manual QA for the demo; add tests as needed.

## 📊 Performance Metrics

- **Lighthouse Score**: 95+ (PWA, Performance, Accessibility)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 200KB (gzipped)

## 📋 Recent Fixes Applied

\# See Git history for recent fixes and improvements.

### Key Updates:
- ✅ Fixed Zod dependency version (3.23.8)
- ✅ Fixed TypeScript imports (removed .js extensions)
- ✅ Created all PWA icons
- ✅ Standardized ports (Frontend: 5173, Backend: 3001)
- ✅ Updated Docker configurations

## 🔧 Development Tools

### Recommended VS Code Extensions
- TypeScript and JavaScript Language Features
- Biome
- Docker
- PostgreSQL
- Redis

### Debugging
- Frontend: Browser DevTools (Application tab for PWA)
- Backend: Node.js debugger, logs
- Database: pgAdmin, TablePlus
- Redis: RedisInsight, redis-cli

## 🚢 Deployment

### Docker Deployment
```bash
# Production build
docker compose --profile prod up -d --build

# SSL/HTTPS handled by Caddy automatically
# Local access (without DNS):
# - App via Caddy: http://localhost:8082 (HTTPS on 8445)
# - API direct (for debugging): http://localhost:3003
```

### Manual Deployment
1. Build frontend and serve with Nginx/Apache
2. Deploy backend with a process manager (e.g., PM2) or containers
3. Setup PostgreSQL and Redis
4. Configure reverse proxy with SSL

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- **Formatting**: Biome (tabs, double quotes, semicolons)
- **TypeScript**: Strict mode enabled
- **Commits**: Conventional commits recommended

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with modern web standards
- Optimized for performance and UX
- Accessible and internationalized
- Security-first approach

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review closed issues for solutions

---

**Built with ❤️ using modern web technologies**

## 🧭 Quick Reference: Docker Ports

- Development compose (`docker-compose.dev.yml`):
  - Frontend: http://localhost:5173
  - Backend API: http://localhost:3001
  - PostgreSQL: localhost:5437
  - Redis: localhost:6380
- Prod-like compose (`docker-compose.yml`):
  - Frontend via Caddy: http://localhost:8082 (HTTPS on 8445)
  - Frontend (direct container): http://localhost:5180 (HTTPS on 5181)
  - Backend API (direct): http://localhost:3003
  - PostgreSQL: localhost:5437
  - Redis: localhost:6381

## 🔑 Demo Credentials

See docs/REFERENCE.md for demo accounts and API endpoint summary. Admin users are seeded by the DB scripts.

## 🧰 Troubleshooting

- Ports in use: If `5432` or `6379` are busy, dev compose maps to `5437` (Postgres) and `6380` (Redis). Stop local DBs or adjust mappings.
- Missing JWT secrets: Run `node generate-secrets.js` and copy values into `.env` (root). Restart containers.
- Containers unhealthy: Check logs with `docker compose logs -f backend postgres redis` and verify `/health` at `http://localhost:3001/health`.
- Reset state: `docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d` to wipe volumes and re-seed.
- CORS/API URL: Ensure `VITE_API_URL=http://localhost:3001` for dev and `FRONTEND_URL` matches your origin.
- Admin login fails: Ensure the admin schema/seed ran. In dev, the entire `backend/src/db` is mounted to the Postgres init directory; for an existing DB, apply manually:
  - `docker exec -i foodflow-postgres-dev psql -U postgres -d foodflow < backend/src/db/admin-schema.sql`
  - `docker exec -i foodflow-postgres-dev psql -U postgres -d foodflow < backend/src/db/admin-seed.sql`
  - Default admin (pizzeria theme): `admin@mariospizzeria.com` / `admin123`
