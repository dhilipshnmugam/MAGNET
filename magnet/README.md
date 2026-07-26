# Magnet - College Communication Platform

A production-ready, full-stack college communication platform that centralizes posts, messaging, announcements, events, and resource sharing within a college ecosystem.

---

## Features

- **Social Feed** — Create, like, comment on, and bookmark posts with rich text and image support
- **Real-time Direct Messaging** — One-on-one and group private messaging via WebSockets
- **Channels** — Topic-based or department-based communication rooms with membership management
- **Announcements** — Official broadcasts from Admin/Faculty to targeted or campus-wide audiences
- **Events** — Create, RSVP, and manage college events with calendar integration
- **Push Notifications** — Real-time browser notifications via Firebase Cloud Messaging
- **Role-based Access Control** — Student, Faculty, and Admin roles with granular permissions
- **Search** — Full-text search across users, posts, channels, and events
- **Leaderboard & Gamification** — Points system tracking engagement with department and individual rankings
- **Analytics Dashboards** — Visual analytics for Admin, Faculty, and Principal roles using Recharts
- **Media Uploads** — Image uploads via Cloudinary with optimization and transformation support
- **User Profiles** — Editable profiles with avatar, bio, department, and activity history
- **Dark/Light Theme** — Theme context with persistent user preference
- **Rate Limiting** — Server-side request throttling to prevent abuse
- **Email Notifications** — SMTP-based email delivery for account verification and alerts
- **Request Logging** — Structured request/response logging middleware for observability
- **Health Check Endpoint** — `/health` endpoint for uptime monitoring and load balancer probes

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** 0.111 | Async Python web framework |
| **SQLAlchemy** 2.0 (async) | ORM with async PostgreSQL driver |
| **asyncpg** 0.29 | High-performance PostgreSQL async driver |
| **Alembic** 1.13 | Database migration management |
| **Pydantic** 2.7 (with pydantic-settings) | Data validation and settings management |
| **python-jose** | JWT token creation and verification |
| **passlib** (bcrypt) | Password hashing |
| **WebSockets** 12.0 | Real-time bidirectional communication |
| **Cloudinary** 1.40 | Media upload, storage, and transformation |
| **Firebase Admin** 6.5 | Push notification delivery via FCM |
| **slowapi** 0.1 | Rate limiting middleware |
| **uvicorn** 0.30 | ASGI server |
| **httpx** 0.27 | Async HTTP client |

### Frontend
| Technology | Purpose |
|---|---|
| **React** 18.3 | UI component library |
| **Vite** 5.3 | Build tool and dev server |
| **TypeScript** 5.4 | Type-safe JavaScript |
| **Tailwind CSS** 3.4 | Utility-first CSS framework |
| **React Router** 6.23 | Client-side routing |
| **Recharts** 2.15 | Chart and dashboard visualizations |
| **Axios** 1.7 | HTTP client |
| **Lucide React** 0.378 | Icon library |
| **React Hot Toast** 2.4 | Toast notifications |
| **date-fns** 3.6 | Date formatting and manipulation |

### Infrastructure
| Service | Purpose |
|---|---|
| **Docker** | Backend containerization |
| **Vercel** | Frontend hosting and CDN |
| **Render** | Backend API hosting |
| **Supabase** | Managed PostgreSQL database |
| **Cloudinary** | Media asset management |
| **Firebase** | Push notification service |

---

## Architecture

Magnet follows a **monorepo architecture** with clearly separated frontend and backend applications communicating via a RESTful API (with WebSocket upgrades for real-time features).

```
magnet/
├── backend/                   # FastAPI Python application
│   ├── app/
│   │   ├── main.py            # App factory, middleware, router registration
│   │   ├── config.py          # Pydantic Settings (env-based configuration)
│   │   ├── database.py        # Async SQLAlchemy engine and session
│   │   ├── dependencies.py    # FastAPI dependency injection
│   │   ├── models/            # SQLAlchemy ORM models (14 models)
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── routers/           # API route handlers (13 routers)
│   │   ├── services/          # Business logic layer (15 services)
│   │   ├── middleware/        # CORS, rate limiting, request logging
│   │   ├── websockets/        # WebSocket connection manager and handlers
│   │   └── utils/             # Security, email, Cloudinary, Firebase helpers
│   ├── migrations/            # Additional SQL migration scripts
│   ├── alembic/               # Alembic migration environment
│   ├── alembic.ini            # Alembic configuration
│   ├── Dockerfile             # Multi-stage production Docker build
│   ├── requirements.txt       # Python dependencies
│   └── run.py                 # Dev server entry point
│
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── main.tsx           # App entry point
│   │   ├── App.tsx            # Router and route definitions
│   │   ├── pages/             # Page-level components (15 pages)
│   │   ├── components/        # Reusable UI components (11 categories)
│   │   ├── services/          # API client functions (9 service modules)
│   │   ├── context/           # React Context providers (Auth, Theme, Notifications)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript type definitions
│   │   ├── utils/             # Validation and helper utilities
│   │   └── styles/            # Global CSS and Tailwind config
│   ├── package.json
│   ├── vite.config.ts         # Vite config with proxy and aliases
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── index.html
│
├── SRS.md                     # Software Requirement Specification
├── DATABASE_DESIGN.md         # Full database schema and ER diagram
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python** 3.11 or higher
- **Node.js** 18+ and npm 9+
- **PostgreSQL** 15+ (local or via Supabase)
- **Git**

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/magnet.git
cd magnet

# 2. Create and activate a virtual environment
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your actual values (see Environment Variables below)

# 5. Run database migrations
alembic upgrade head

# 6. (Optional) Seed initial data
python -m app.utils.seed_data

# 7. Start the backend server
python run.py
```

The API server starts at `http://localhost:8000`. Swagger docs available at `http://localhost:8000/docs` in debug mode.

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd magnet/frontend

# 2. Install Node.js dependencies
npm install

# 3. Configure environment variables
# Create a .env file (see Environment Variables below)
# A default .env is included for local development

# 4. Start the development server
npm run dev
```

The frontend dev server starts at `http://localhost:5173` with automatic proxying of `/api` and `/ws` requests to the backend.

### Environment Variables

#### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_NAME` | No | `Magnet` | Application name |
| `APP_VERSION` | No | `1.0.0` | Application version |
| `DEBUG` | No | `False` | Enable debug mode (Swagger docs, verbose logging) |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (`postgresql+asyncpg://user:pass@host:5432/db`) |
| `SECRET_KEY` | **Yes** | — | Random string for JWT signing (min 64 chars recommended) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT access token lifetime (24 hours) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | JWT refresh token lifetime |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated CORS origins |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | **Yes** | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | **Yes** | — | Cloudinary API secret |
| `FIREBASE_CREDENTIALS_PATH` | No | `./firebase-service-account.json` | Path to Firebase service account JSON |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | No | `""` | SMTP username/email |
| `SMTP_PASS` | No | `""` | SMTP password or app password |
| `EMAIL_FROM` | No | `noreply@magnet.app` | Sender email address |
| `FRONTEND_URL` | No | `http://localhost:5173` | Frontend URL for email links |

#### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:8000/api/v1` | Backend API base URL |
| `VITE_WS_URL` | No | `ws://localhost:8000` | WebSocket server URL |

---

## Docker Setup

A multi-stage `Dockerfile` is provided for the backend, producing a minimal production image based on `python:3.11-slim`.

```bash
# Build the backend image
cd backend
docker build -t magnet-backend .

# Run the container
docker run -p 8000:8000 --env-file .env magnet-backend
```

The container runs uvicorn with 4 workers, exposes port 8000, and includes a built-in health check at `/health`.

---

## Database

### Schema Overview

The database contains the following tables:

| Table | Description |
|---|---|
| `users` | User accounts with roles, profiles, and authentication data |
| `departments` | Academic departments with optional head reference |
| `clubs` | Student clubs and organizations |
| `posts` | User-generated feed posts with text and media |
| `comments` | Threaded comments on posts |
| `channels` | Group communication rooms |
| `channel_members` | Many-to-many channel membership with roles |
| `messages` | Direct and channel messages |
| `announcements` | Official broadcasts from admin/faculty |
| `events` | College events with RSVP tracking |
| `notifications` | User notification records |
| `points` | Gamification points per user |
| `activity_log` | Audit trail of user actions |
| `approval` | Content moderation approval records |

Refer to `DATABASE_DESIGN.md` for the complete ER diagram, indexes, constraints, and normalization analysis.

### Migration Commands

```bash
# Navigate to the backend directory
cd backend

# Generate a new migration after model changes
alembic revision --autogenerate -m "description_of_change"

# Apply all pending migrations
alembic upgrade head

# Rollback the last migration
alembic downgrade -1

# View current migration version
alembic current
```

---

## API Documentation

### Swagger UI

When `DEBUG=true`, interactive API documentation is available at:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### API Versioning

All API routes are prefixed with `/api/v1`:

```
http://localhost:8000/api/v1/{resource}
```

### Available Endpoints

| Router | Prefix | Description |
|---|---|---|
| `auth_router` | `/api/v1/auth` | Login, register, refresh tokens, password reset |
| `users_router` | `/api/v1/users` | User profiles, follows, settings |
| `posts_router` | `/api/v1/posts` | CRUD posts, likes, comments, bookmarks |
| `messages_router` | `/api/v1/messages` | Direct and group messaging |
| `channels_router` | `/api/v1/channels` | Channel management and membership |
| `announcements_router` | `/api/v1/announcements` | Create and manage announcements |
| `events_router` | `/api/v1/events` | Event CRUD and RSVP |
| `notifications_router` | `/api/v1/notifications` | User notifications |
| `search_router` | `/api/v1/search` | Cross-resource search |
| `upload_router` | `/api/v1/upload` | Media file uploads via Cloudinary |
| `admin_router` | `/api/v1/admin` | Admin dashboard and user management |
| `leaderboard_router` | `/api/v1/leaderboard` | Points and rankings |
| `analytics_router` | `/api/v1/analytics` | Platform analytics data |

### Authentication Flow

1. **Register** — `POST /api/v1/auth/register` with email, password, name, and college details
2. **Login** — `POST /api/v1/auth/login` returns `access_token` and `refresh_token`
3. **Authenticated requests** — Include header: `Authorization: Bearer <access_token>`
4. **Token refresh** — `POST /api/v1/auth/refresh` with expired access token and valid refresh token
5. **Password reset** — `POST /api/v1/auth/forgot-password` triggers an email with a reset link

### WebSocket Connection

Connect to `ws://localhost:8000/api/v1/ws` with a valid JWT token for real-time messaging and notification delivery.

---

## Project Structure

```
magnet/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app, middleware, lifespan
│   │   ├── config.py                  # Pydantic Settings
│   │   ├── database.py                # Async SQLAlchemy engine + session
│   │   ├── dependencies.py            # Injected dependencies
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── post.py
│   │   │   ├── comment.py
│   │   │   ├── message.py
│   │   │   ├── channel.py
│   │   │   ├── announcement.py
│   │   │   ├── event.py
│   │   │   ├── notification.py
│   │   │   ├── club.py
│   │   │   ├── department.py
│   │   │   ├── points.py
│   │   │   ├── activity_log.py
│   │   │   └── approval.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── common.py
│   │   │   ├── user.py
│   │   │   ├── post.py
│   │   │   ├── message.py
│   │   │   ├── channel.py
│   │   │   ├── announcement.py
│   │   │   ├── event.py
│   │   │   ├── notification.py
│   │   │   ├── points.py
│   │   │   └── approval.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── posts.py
│   │   │   ├── messages.py
│   │   │   ├── channels.py
│   │   │   ├── announcements.py
│   │   │   ├── events.py
│   │   │   ├── notifications.py
│   │   │   ├── search.py
│   │   │   ├── upload.py
│   │   │   ├── admin.py
│   │   │   ├── leaderboard.py
│   │   │   └── analytics.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── post_service.py
│   │   │   ├── message_service.py
│   │   │   ├── channel_service.py
│   │   │   ├── announcement_service.py
│   │   │   ├── event_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── search_service.py
│   │   │   ├── upload_service.py
│   │   │   ├── admin_service.py
│   │   │   ├── leaderboard_engine.py
│   │   │   ├── analytics_engine.py
│   │   │   └── point_engine.py
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── cors.py
│   │   │   ├── rate_limit.py
│   │   │   └── logging_mw.py
│   │   ├── websockets/
│   │   │   ├── __init__.py
│   │   │   ├── connection_manager.py
│   │   │   └── handlers.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py
│   │       ├── email.py
│   │       ├── cloudinary.py
│   │       ├── firebase.py
│   │       └── validators.py
│   ├── alembic/
│   ├── migrations/
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── FeedPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── MessagesPage.tsx
│   │   │   ├── ChannelsPage.tsx
│   │   │   ├── EventsPage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── LeaderboardPage.tsx
│   │   │   ├── FacultyDashboardPage.tsx
│   │   │   ├── PrincipalDashboardPage.tsx
│   │   │   ├── ClubDashboardPage.tsx
│   │   │   └── admin/
│   │   │       └── AdminDashboardPage.tsx
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── channels/
│   │   │   ├── charts/
│   │   │   ├── common/
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── Loader.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   ├── ProtectedRoute.tsx
│   │   │   │   └── Skeleton.tsx
│   │   │   ├── events/
│   │   │   ├── feed/
│   │   │   ├── layout/
│   │   │   ├── messages/
│   │   │   ├── notifications/
│   │   │   └── profile/
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   ├── postService.ts
│   │   │   ├── messageService.ts
│   │   │   ├── channelService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── leaderboardService.ts
│   │   │   ├── firebaseMessaging.ts
│   │   │   └── index.ts
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   └── NotificationContext.tsx
│   │   ├── hooks/
│   │   │   ├── useFormValidation.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── validation.ts
│   │   │   └── helpers.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── .env
│
├── SRS.md
├── DATABASE_DESIGN.md
└── README.md
```

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
python -m pytest

# Run with verbose output
python -m pytest -v

# Run with coverage report
python -m pytest --cov=app --cov-report=term-missing

# Run a specific test file
python -m pytest tests/test_auth.py

# Run tests matching a keyword
python -m pytest -k "registration"
```

### Frontend Tests

```bash
cd frontend

# Run linting
npm run lint

# Build (type-checks via tsc)
npm run build

# Preview production build
npm run preview
```

---

## Deployment

### Frontend — Vercel

1. Push the repository to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Set the **Root Directory** to `frontend`
4. Framework preset: **Vite**
5. Add environment variables in the Vercel dashboard:
   - `VITE_API_URL` — Your Render backend URL (e.g., `https://magnet-api.onrender.com/api/v1`)
   - `VITE_WS_URL` — Your WebSocket URL (e.g., `wss://magnet-api.onrender.com`)
6. Deploy — Vercel auto-deploys on every push to `main`

### Backend — Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Set the **Root Directory** to `backend`
4. **Runtime:** Python 3.11
5. **Build Command:** `pip install -r requirements.txt`
6. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add all environment variables from the table above
8. Enable **Auto Deploy** on the `main` branch

### Database — Supabase

1. Create a free project on [supabase.com](https://supabase.com)
2. Go to **Settings > Database** and copy the connection string
3. Use the **URI** format for `DATABASE_URL`:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Run `alembic upgrade head` against the Supabase database to apply the schema
5. Enable Row Level Security policies as needed in the Supabase dashboard

---

## Contributing

### Git Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit with a descriptive message:
   ```
   git commit -m "feat: add real-time typing indicators to messages"
   ```
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request against `main`

### Code Style

**Backend (Python):**
- Follow PEP 8 conventions
- Use type hints on all function signatures
- Keep routers thin — business logic lives in `services/`
- Use Pydantic schemas for all request/response validation
- Run `ruff check app/` before committing (if configured)

**Frontend (TypeScript/React):**
- Functional components with hooks only (no class components)
- Use Tailwind CSS utility classes for styling
- Extract reusable logic into custom hooks under `hooks/`
- Keep page components in `pages/` and reusable UI in `components/`
- Run `npm run lint` before committing

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Magnet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
