# Magnet Deployment Guide

## Overview

Magnet is a social media platform with the following architecture:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend    │────▶│   Backend     │────▶│  Render Postgres │
│ (Render SPA)  │     │   (Render)    │     │  (PostgreSQL)    │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                            │
                     ┌──────┴───────┐
                     │              │
               ┌─────▼─────┐ ┌─────▼──────┐
               │ Cloudinary │ │  Firebase   │
               │ (Storage)  │ │  (FCM)      │
               └───────────┘ └────────────┘
```

| Service          | Provider                 | Purpose                     |
|------------------|--------------------------|-----------------------------|
| Frontend         | Render (static site)     | React SPA (Vite + TypeScript) |
| Backend          | Render (native Python)   | FastAPI (Python 3.11)       |
| Database         | Render PostgreSQL        | PostgreSQL (asyncpg)        |
| File Storage     | Cloudinary (optional)    | Image/video uploads         |
| Push Notifications | Firebase Cloud Messaging (optional) | Web push         |

**Everything deploys to Render** from the single `render.yaml` blueprint at the repo root — the backend as a native Python web service and the frontend as a static site.

**Key versions:**
- Python 3.11 (pinned in `backend/.python-version`)
- FastAPI 0.111.0
- Node.js 18+
- Vite 5.3.1
- React 18.3.1
- TypeScript 5.4.5

---

## 1. Database Setup (Render PostgreSQL)

The database is defined directly in the `render.yaml` blueprint, so **Render creates it automatically** when you deploy — no manual setup or connection string needed.

```yaml
# From magnet/render.yaml
databases:
  - name: magnet-db
    plan: free
    region: oregon
    databaseName: magnet
    user: magnet
```

The backend's `DATABASE_URL` is wired to it automatically:

```yaml
- key: DATABASE_URL
  fromDatabase:
    name: magnet-db
    property: connectionString
```

### 1.1 How It Works

1. When you create the blueprint (New + → Blueprint → MAGNET repo), Render provisions the database alongside the two services
2. The backend connects over Render's private network using the internal connection string
3. The backend auto-converts `postgresql://` → `postgresql+asyncpg://` at startup, then creates all tables via its built-in migrations (`create_all` runs on boot)

> **⚠️ Important:** Render **free** Postgres databases **expire after 30 days**. For a permanent database, use a paid plan (e.g., `basic-256mb`) or see 1.3 for a manual standalone database.

### 1.2 Creating the DB Manually (Optional)

If you prefer to create the database yourself instead of via the blueprint:

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. Name it `magnet-db`, choose **Free** plan, click **Create**
3. Wait for status **Available** (~1 min), then copy the **Internal Database URL** (starts with `postgresql://`)
4. Paste it into the backend's `DATABASE_URL` env var (Render Dashboard → Environment)

### 1.3 Alternative: Supabase

Prefer an external managed Postgres? Supabase also works:

1. Go to [https://supabase.com](https://supabase.com) → **New project** → name `magnet`, set a strong password, choose a region
2. Go to **Settings → Database → Connection string** → copy the **Transaction mode (port 6543)** URI:

```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

3. Set it as the backend's `DATABASE_URL` env var (add `?sslmode=require` if the backend reports SSL issues)

> With Supabase, remove the `fromDatabase` block from `render.yaml` and change `DATABASE_URL` to `sync: false` so you can paste the string at creation time.

---

## 2. Backend Deployment (Render)

### 2.1 Prepare the Backend

Ensure your `backend/` directory contains:

```
backend/
├── app/
│   ├── main.py          # FastAPI app entry point
│   ├── config.py        # Settings (pydantic-settings)
│   ├── models/
│   ├── routes/
│   └── ...
├── alembic/             # Database migrations
├── alembic.ini
├── requirements.txt
├── .python-version      # Pins the Python version (e.g., 3.11.9)
└── render.yaml          # Service blueprint
```

### 2.2 Native Python runtime (no Docker)

The backend runs on Render's native Python runtime — no `Dockerfile` required. Python version is pinned with `backend/.python-version`:

```
3.11.9
```

### 2.3 The render.yaml Blueprint (included in the repo)

The repo ships with `magnet/render.yaml` — a two-service blueprint (backend + frontend):

```yaml
services:
  # Backend API (FastAPI, native Python)
  - type: web
    name: magnet-backend
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1}
    plan: free
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: magnet-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: "false"

  # Frontend (React static site)
  - type: web
    name: magnet-frontend
    runtime: static
    rootDir: frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

# PostgreSQL database (created automatically by the blueprint)
databases:
  - name: magnet-db
    plan: free
    region: oregon
    databaseName: magnet
    user: magnet
```

### 2.4 Create Web Service on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"** and pick the repo containing `render.yaml` (creates the backend, frontend, **and** database at once)
   - Or **"New +"** → **"Web Service"** for the backend alone
3. Connect your GitHub repository
4. Configure the backend:
   - **Name:** `magnet-backend`
   - **Region:** Same region as the database (e.g., `oregon`)
   - **Runtime:** `Python 3`
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1}`
   - **Health Check Path:** `/health`
   - **Plan:** Free tier to start (upgrades available)
5. Click **"Advanced"** and set environment variables (see 2.5)
6. Click **"Create Web Service"**

### 2.5 Environment Variables

`DATABASE_URL` and `SECRET_KEY` are **set automatically by the blueprint** (from the `magnet-db` database and an auto-generated secret). Only set these manually if you're deploying the backend without the blueprint:

```bash
# === Required (only if not using the blueprint) ===
# DATABASE_URL is auto-wired via the blueprint's fromDatabase reference
SECRET_KEY=<auto-generated — or use: python -c "import secrets; print(secrets.token_urlsafe(64))">
CLOUDINARY_CLOUD_NAME=your_cloud_name    # optional — omit to use local file storage
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# === Application ===
DEBUG=false
ALLOWED_ORIGINS=https://magnet-frontend.onrender.com
FRONTEND_URL=https://magnet-frontend.onrender.com

# === Firebase ===
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json

# === SMTP (Optional) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@your-domain.com
```

> **For Firebase credentials:** Upload `firebase-service-account.json` as a [Secret File](https://docs.render.com/secret-files) in Render, or embed the JSON content in an environment variable and modify `config.py` to parse it.

#### Firebase Secret File Setup

1. In Render Dashboard, go to **Environment** → **Files** section
2. Upload `firebase-service-account.json` as a **Secret File**
3. The file will be mounted at `/etc/secrets/firebase-service-account.json`
4. Update your `FIREBASE_CREDENTIALS_PATH`:
   ```
   FIREBASE_CREDENTIALS_PATH=/etc/secrets/firebase-service-account.json
   ```

### 2.6 Auto-Deploy from GitHub

Render auto-deploys on push by default. To configure:

1. Go to your service → **Settings**
2. Under **Build & Deploy**, ensure **Auto Deploy** is `Yes`
3. Set **Branch:** `main`
4. Optionally configure deploy hooks or [Render CLI](https://render.com/docs/cli)

### 2.7 Health Check Endpoint

Ensure your `main.py` includes a health check:

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
```

### 2.8 Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails with `pip install` errors | Check `requirements.txt` for version conflicts; run `pip check` locally |
| `Application failed to respond` | App isn't binding to `0.0.0.0:$PORT`; ensure uvicorn uses `--host 0.0.0.0 --port $PORT` |
| `ECONNREFUSED` on database | Verify the database is Available; for Supabase use port 6543 not 5432 |
| Cold starts take 30+ seconds | Free tier spins down after inactivity; upgrade to paid plan for always-on |
| Render runs out of memory | Upgrade plan; free tier has 512MB RAM |
| `ModuleNotFoundError` | Missing dependency in requirements.txt or wrong working directory |
| Build fails | Check the deploy logs; confirm `requirements.txt` installs cleanly and Python version in `.python-version` matches your dependencies |

---

## 3. Frontend Deployment (Render Static Site)

The frontend deploys as a **static site** on Render. Its configuration lives in the same `render.yaml` blueprint, so it deploys together with the backend:

```yaml
# From magnet/render.yaml
- type: web
  name: magnet-frontend
  runtime: static
  rootDir: frontend
  buildCommand: npm ci && npm run build
  staticPublishPath: ./dist
  routes:
    - type: rewrite
      source: /*
      destination: /index.html
```

### 3.1 Create via Blueprint (Recommended)

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New +** → **Blueprint**
2. Connect GitHub and select the `MAGNET` repo, branch `main`
3. Render reads `render.yaml` and shows both services (`magnet-backend` + `magnet-frontend`)
4. Fill in the prompted env vars, then click **Create**
5. Wait for both builds to finish — the static site appears at `https://magnet-frontend.onrender.com`

> Creating the static site manually instead? Use **New + → Static Site** → repo → **Root Directory** `frontend` → **Build Command** `npm ci && npm run build` → **Publish Directory** `dist`.

### 3.2 Environment Variables

Set `VITE_` variables in the static site's **Environment** tab (Render static sites inject these at build time):

```bash
VITE_API_URL=https://magnet-backend.onrender.com/api/v1
```

> **Important:** Vite only exposes variables prefixed with `VITE_` to the client bundle. This single variable drives both the HTTP API client and the WebSocket URL (chat + notifications). After changing it, Render automatically rebuilds the site.

### 3.3 SPA Routing (Already Configured)

The blueprint includes a catch-all rewrite so deep links (e.g., `/profile/xyz`) serve `index.html` instead of 404ing. Render serves real files first, so `assets/*` are unaffected.

If you ever create the static site manually, add this rewrite in the dashboard: **Settings → Redirects/Rewrites** → **Rewrite** — Source `/*`, Destination `/index.html`.

### 3.4 Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails with `tsc` errors | Run `npm run build` locally first; fix TypeScript errors |
| Blank page after deploy | Check the rewrite rule; ensure `VITE_API_URL` is set and the site rebuilt |
| API calls fail with CORS | Add the frontend URL to the backend's `ALLOWED_ORIGINS` |
| `VITE_` variables undefined | Ensure the `VITE_` prefix; change the env var to trigger a rebuild |
| 404 on refresh | Confirm the `/*` → `/index.html` rewrite exists |

---

## 4. Cloudinary Setup

### 4.1 Create Account

1. Go to [https://cloudinary.com](https://cloudinary.com) and sign up
2. Note your **Dashboard** info

### 4.2 Get API Keys

1. Go to **Settings** → **Access Keys**
2. Copy:
   - **Cloud Name** (displayed at top of dashboard)
   - **API Key**
   - **API Secret** (click "Reveal")

### 4.3 Create Upload Preset

1. Go to **Settings** → **Upload** → **Upload presets**
2. Click **"Add upload preset"**
3. Configure:
   - **Preset Name:** `magnet_uploads`
   - **Signing Mode:** `Unsigned` (for client-side uploads) or `Signed` (more secure)
   - **Folder:** `magnet`
   - **Allowed formats:** `jpg, png, gif, webp, mp4, mov`
   - **Max file size:** Set as needed (e.g., 10MB for images, 50MB for video)
   - **Transformations:** Add a default (e.g., limit to 1920px width)
4. Save the preset

### 4.4 Environment Variables

Backend (Render):
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Frontend (Render static site) — if doing client-side uploads:
```bash
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=magnet_uploads
VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/your_cloud_name/image/upload
```

### 4.5 Troubleshooting

| Issue | Fix |
|-------|-----|
| `Invalid API key` | Check keys match Dashboard; no trailing whitespace |
| `Upload preset not found` | Ensure preset name is exact; check if unsigned is enabled |
| `File too large` | Increase max file size in upload preset |
| `Invalid signature` | Using signed preset but secret is wrong; or use unsigned |
| Images look blurry | Add quality/transformation parameters to preset |

---

## 5. Firebase Cloud Messaging (FCM)

### 5.1 Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Enter project name: `magnet-notifications`
4. Enable Google Analytics (optional)
5. Click **"Create project"**

### 5.2 Register Web App

1. In the project dashboard, click the **Web icon** (`</>`)
2. Enter nickname: `Magnet Web`
3. Check **"Also set up Firebase Hosting"** (optional)
4. Click **"Register app"**
5. Copy the `firebaseConfig` object — you'll need these values for the frontend env vars

### 5.3 Generate Service Account Key (Backend)

1. Go to **Project Settings** → **Service accounts**
2. Click **"Generate new private key"**
3. Save the JSON file as `firebase-service-account.json`
4. Upload this to Render as a Secret File (see Section 2.5)

### 5.4 Generate VAPID Key (Web Push)

1. Go to **Project Settings** → **Cloud Messaging**
2. Under **Web Push certificates**, click **"Generate key pair"**
3. Copy the **Public Key** — add to frontend env vars

Frontend (Render static site):
```bash
VITE_FIREBASE_VAPID_KEY=your-public-vapid-key
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 5.5 Service Worker

Create `magnet/frontend/public/firebase-messaging-sw.js`:

```javascript
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

const app = initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = getMessaging(app);

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || "/logo.png",
  });
});
```

### 5.6 Troubleshooting

| Issue | Fix |
|-------|-----|
| `Firebase: No App` error | Firebase not initialized; check config values |
| Notifications not received | Check service worker is registered; verify VAPID key |
| `auth/argument-error` | Service account JSON is invalid or not uploaded |
| `messaging/unsupported` | Browser doesn't support FCM (check Safari version) |
| `Permission denied` | User denied notification permission; can't re-prompt automatically |
| Token refresh not working | Ensure `onTokenRefresh` listener is set up |

---

## 6. Domain & SSL

### 6.1 Custom Domain Setup

Both services get a free `onrender.com` subdomain automatically:
- Backend: `https://magnet-backend.onrender.com`
- Frontend: `https://magnet-frontend.onrender.com`

To add a custom domain:

| Service | Steps |
|---------|-------|
| **Render (any service)** | Service → **Settings** → **Custom Domains** → enter domain → add DNS records |

### 6.2 SSL Certificates

Render provides **automatic SSL** (Let's Encrypt) for all services, including `onrender.com` subdomains:

- SSL is enabled immediately on the `onrender.com` subdomain
- Custom domains get an auto-managed certificate a few minutes after DNS propagation

### 6.3 DNS Configuration

For a full setup with `magnet.yourdomain.com` (frontend) and `api.magnet.yourdomain.com` (backend):

```dns
; Frontend
Type: CNAME
Name: magnet
Value: magnet-frontend.onrender.com
TTL: 3600

; Backend API
Type: CNAME
Name: api
Value: magnet-backend.onrender.com
TTL: 3600
```

Then update environment variables:
- **Frontend:** `VITE_API_URL=https://api.magnet.yourdomain.com/api/v1`
- **Backend:** `ALLOWED_ORIGINS=https://magnet.yourdomain.com` and `FRONTEND_URL=https://magnet.yourdomain.com`

### 6.4 Troubleshooting

| Issue | Fix |
|-------|-----|
| SSL not working | DNS not propagated yet; wait up to 48 hours; use `dig` to check |
| Mixed content warnings | Ensure all API URLs use HTTPS |
| Domain not resolving | Check DNS records with `nslookup your-domain.com` |
| `ERR_TOO_MANY_REDIRECTS` | Redirect loop; check backend isn't redirecting HTTP to HTTPS behind a proxy |

---

## 7. Monitoring & Logging

### 7.1 Render Logs

```bash
# View live logs via Render Dashboard
# Service → Logs tab

# Or use Render CLI
render logs --service magnet-backend --tail
```

Key things to monitor:
- Startup errors (missing env vars, failed DB connection)
- Request latency
- Error rates (500s, 400s)

### 7.2 Frontend Monitoring

Render doesn't ship built-in web analytics, so use a third-party tool for the SPA:

- **Plausible / Umami** (privacy-friendly, simple script tag)
- **Google Analytics 4** — add the `<script>` to `frontend/index.html`
- **Core Web Vitals** — test with Lighthouse or PageSpeed Insights

### 7.3 Supabase Dashboard

Monitor in Supabase Dashboard:
- **Database** → **Reports**: Query performance, connection count
- **Logs** → **Postgres**: Real-time query logs
- **Storage** → Usage stats (if using Supabase Storage)

### 7.4 Health Check Monitoring

Set up a free monitoring service (e.g., [UptimeRobot](https://uptimerobot.com)):

```
URL: https://magnet-backend.onrender.com/health
Interval: 5 minutes
Alert: your-email@example.com
```
### 7.5 Add Structured Logging to Backend

In `main.py`:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Status: {response.status_code}")
    return response
```

---

## 8. Backup & Recovery

### 8.1 Database Backups

**Supabase automatic backups:**
- Free tier: 7-day backup retention
- Pro tier: 30-day backup retention + point-in-time recovery

**Manual backup:**
```bash
# Export entire database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20240101_120000.sql
```

**Scheduled backup with cron (local or CI):**
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/magnet_${DATE}.sql"
pg_dump $DATABASE_URL | gzip > "${BACKUP_FILE}.gz"
# Upload to cloud storage (S3, GCS, etc.)
```

### 8.2 Media Backup Strategy

Cloudinary provides built-in redundancy, but for extra safety:

1. **Enable auto-backup** in Cloudinary settings (paid feature)
2. **Or** periodically export:
   ```bash
   # Using Cloudinary CLI
   cloudinary-cli export magnet/ --output ./media-backup/
   ```

### 8.3 Disaster Recovery Plan

| Scenario | Recovery Steps |
|----------|----------------|
| Database corruption | Restore from Supabase backup; run `alembic upgrade head` |
| Backend crash | Render auto-restarts; check logs; redeploy if needed |
| Frontend broken deploy | Revert to a previous deployment in Render → Deploys → "..." → Rollback |
| Cloudinary outage | Media temporarily unavailable; no data loss (Cloudinary has 99.95% SLA) |
| Full data loss | Restore DB from backup; redeploy all services; re-upload critical media |

---

## 9. Security Checklist

### Environment Variables

- [ ] All secrets in environment variables, **never** in code
- [ ] `.env` is in `.gitignore`
- [ ] Render env vars are encrypted at rest
- [ ] No secrets committed to git history

### CORS

In your FastAPI `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Ensure `ALLOWED_ORIGINS` only contains your frontend domains:
```
ALLOWED_ORIGINS=https://magnet-frontend.onrender.com
```

### Rate Limiting

Already configured via `slowapi`. Verify in `main.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/auth/login")
@limiter.limit("5/minute")
async def login(...):
    ...
```

### HTTPS Enforcement

- [ ] Render: Automatic HTTPS for all services (subdomains + custom domains)
- [ ] Add HSTS header:
  ```python
  @app.middleware("http")
  async def add_security_headers(request, call_next):
      response = await call_next(request)
      response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
      response.headers["X-Content-Type-Options"] = "nosniff"
      response.headers["X-Frame-Options"] = "DENY"
      return response
  ```

### Secret Rotation

- Rotate `SECRET_KEY` periodically (JWT signing key)
- Rotate Cloudinary API keys annually
- Rotate database password quarterly
- Rotate Firebase service account keys annually

### Additional Security

- [ ] Passwords hashed with bcrypt (via `passlib[bcrypt]`)
- [ ] JWT tokens have expiration (`ACCESS_TOKEN_EXPIRE_MINUTES: 1440`)
- [ ] Input validation via Pydantic models
- [ ] SQL injection prevented by SQLAlchemy ORM
- [ ] File upload validation (type, size) on both frontend and backend

---

## 10. Performance Optimization

### 10.1 CDN Configuration

**Render** serves static sites over a global CDN — all `assets/*` are cached at edge locations automatically.

**Render** API services run in a single region. For API-level caching/CDN, put Cloudflare in front of `magnet-backend.onrender.com`.

### 10.2 Database Connection Pooling

Supabase provides connection pooling via Supavisor:

```
# Transaction mode (port 6543) - recommended for serverless
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

Connection pool settings in Supabase Dashboard → Settings → Database:
- **Pool mode:** Transaction
- **Default pool size:** 20 (adjust based on plan)
- **Max client connections:** Depends on plan

### 10.3 Redis Caching (Optional)

Add Redis for session caching and rate limiting:

```bash
# On Render, create a Redis instance
# Then in requirements.txt, add:
redis[hiredis]==5.0.4

# In config.py:
REDIS_URL: str = ""

# Usage in routes:
import redis
cache = redis.from_url(settings.REDIS_URL)

@app.get("/api/posts")
async def get_posts():
    cached = cache.get("posts:all")
    if cached:
        return json.loads(cached)
    posts = await fetch_posts_from_db()
    cache.setex("posts:all", 300, json.dumps(posts))  # 5 min TTL
    return posts
```

### 10.4 Image Optimization via Cloudinary

Use Cloudinary transformations for responsive images:

```
# Thumbnail (300x300, auto format, auto quality)
https://res.cloudinary.com/your_cloud/image/upload/w_300,h_300,c_fill,q_auto,f_auto/v1234/post.jpg

# Full size with max width
https://res.cloudinary.com/your_cloud/image/upload/w_1920,q_auto,f_auto/v1234/post.jpg

# Video thumbnail
https://res.cloudinary.com/your_cloud/video/upload/w_640,h_360,c_fill/v1234/video.mp4
```

Implement lazy loading in the frontend:
```tsx
<img
  src="https://res.cloudinary.com/your_cloud/image/upload/w_300,h_300,c_fill,f_auto/v1234/post.jpg"
  loading="lazy"
  alt="Post image"
/>
```

### 10.5 Frontend Performance

```bash
# Analyze bundle size
cd frontend
npm install -g vite-bundle-analyzer
npx vite-bundle-analyzer
```

Optimizations:
- Code-split routes with `React.lazy()`
- Tree-shake unused Lucide icons
- Use `date-fns` tree-shakeable imports: `import { format } from 'date-fns'`

---

## 11. CI/CD Pipeline

### 11.1 GitHub Actions Workflow

Create `magnet/.github/workflows/deploy.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: magnet_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/magnet_test
        run: alembic upgrade head

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/magnet_test
          SECRET_KEY: test-secret-key
          CLOUDINARY_CLOUD_NAME: test
          CLOUDINARY_API_KEY: test
          CLOUDINARY_API_SECRET: test
        run: pytest -v

  frontend-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check & Build
        env:
          VITE_API_URL: http://localhost:8000/api
        run: npm run build
```

### 11.2 Auto-Deploy on Merge

**Render** auto-deploys both services on push to `main` — no extra configuration needed. The static site rebuilds when `frontend/**` changes and the backend redeploys when `backend/**` changes (both respect their `rootDir`).

For pull requests, Render can create **preview deployments** (enable per service in **Settings → Pull Request Previews**).

### 11.3 Branch Strategy

```
main          → Production (auto-deploy)
├── develop   → Staging (optional: deploy to staging services)
└── feature/* → Preview deployments (Render PR previews)
```

---

## 12. Troubleshooting

### Quick Reference

| Problem | Service | Fix |
|---------|---------|-----|
| App won't start | Render | Check logs; ensure `PORT` env var is used |
| Database connection timeout | Supabase | Use port 6543; check SSL; verify IP allowlist |
| CORS error in browser | Frontend/Backend | Add frontend URL to `ALLOWED_ORIGINS` |
| 404 on page refresh | Render | Confirm the `/*` → `/index.html` rewrite exists |
| Images not uploading | Cloudinary | Check API keys; verify upload preset name |
| Push notifications not working | Firebase | Verify service account; check VAPID key |
| Slow cold starts | Render | Upgrade to paid plan (always-on instances) |
| Build exceeds memory | Render | Increase plan; trim dependencies |
| Environment variables not picked up | Render | Frontend: `VITE_` prefix + rebuild; backend: change env var triggers redeploy |
| Alembic migration fails | Supabase | Check connection string; ensure transaction mode |

### Debug Commands

```bash
# Test database connection locally
python -c "
import asyncpg, asyncio
async def test():
    conn = await asyncpg.connect('YOUR_DATABASE_URL')
    version = await conn.fetchval('SELECT version()')
    print(f'Connected: {version}')
    await conn.close()
asyncio.run(test())
"

# Test Cloudinary connection
python -c "
import cloudinary
cloudinary.config(
    cloud_name='YOUR_CLOUD_NAME',
    api_key='YOUR_API_KEY',
    api_secret='YOUR_API_SECRET'
)
print('Cloudinary configured successfully')
"

# Test Firebase credentials
python -c "
import firebase_admin
cred = firebase_admin.credentials.Certificate('firebase-service-account.json')
firebase_admin.initialize_app(cred)
print('Firebase initialized successfully')
"

# Check Render backend health
curl https://magnet-backend.onrender.com/health

# Check Render frontend
curl -I https://magnet-frontend.onrender.com
```

### Getting Help

- **Render:** [docs.render.com](https://docs.render.com) | [community.render.com](https://community.render.com)
- **Supabase:** [supabase.com/docs](https://supabase.com/docs) | [github.com/supabase/supabase](https://github.com/supabase/supabase/discussions)
- **Cloudinary:** [cloudinary.com/documentation](https://cloudinary.com/documentation)
- **Firebase:** [firebase.google.com/docs](https://firebase.google.com/docs)

---

## Quick Deploy Checklist

```
□ 1. Create Supabase project & get connection string (port 6543) — or Render Postgres
□ 2. Push code to GitHub (main branch)
□ 3. Create Cloudinary account & get API keys (optional)
□ 4. Create Firebase project & download service account JSON (optional)
□ 5. Create the blueprint on Render: New + → Blueprint → MAGNET repo → main
□ 6. Paste DATABASE_URL when prompted (SECRET_KEY is auto-generated)
□ 7. Set frontend env var: VITE_API_URL=https://magnet-backend.onrender.com/api/v1
□ 8. Set backend env vars: ALLOWED_ORIGINS + FRONTEND_URL=https://magnet-frontend.onrender.com
□ 9. Verify: backend /health returns healthy
□ 10. Verify: frontend loads and login works end-to-end
□ 11. Configure custom domains & DNS (optional)
□ 12. Verify SSL certificates
□ 13. Set up uptime monitoring (UptimeRobot or similar)
□ 14. Review security checklist
□ 15. Set up database backup schedule
```
