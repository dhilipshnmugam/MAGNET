# Magnet Deployment Guide

## Overview

Magnet is a social media platform with the following architecture:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│    Backend    │────▶│  Supabase DB     │
│   (Vercel)   │     │  (Render)     │     │  (PostgreSQL)    │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
              ┌─────▼─────┐ ┌─────▼──────┐
              │ Cloudinary │ │  Firebase   │
              │ (Storage)  │ │  (FCM)      │
              └───────────┘ └────────────┘
```

| Service          | Provider          | Purpose                     |
|------------------|-------------------|-----------------------------|
| Frontend         | Vercel            | React SPA (Vite + TypeScript) |
| Backend          | Render            | FastAPI (Python 3.11)       |
| Database         | Supabase          | PostgreSQL (asyncpg)        |
| File Storage     | Cloudinary        | Image/video uploads         |
| Push Notifications | Firebase Cloud Messaging | Web push             |

**Key versions:**
- Python 3.11+
- FastAPI 0.111.0
- Node.js 18+
- Vite 5.3.1
- React 18.3.1
- TypeScript 5.4.5

---

## 1. Database Setup (Supabase)

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/log in
2. Click **"New project"**
3. Choose an organization (create one if needed)
4. Fill in:
   - **Database Name:** `magnet`
   - **Database Password:** Generate a strong password and **save it immediately**
   - **Region:** Choose closest to your users (e.g., `US East` or `EU West`)
5. Click **"Create new project"** (takes ~2 minutes)

### 1.2 Get Connection String

1. In your project dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Switch to **URI** format
4. Copy the **Transaction** mode connection (required for Supavisor/pooling):

```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

> **Important:** Use **Transaction mode (port 6543)**, not Session mode (port 5432). Transaction mode is required for serverless platforms like Render that don't maintain persistent connections.

### 1.3 Run Migrations

If you have Alembic migrations:

```bash
# Run locally against the Supabase database
cd magnet/backend

# Set DATABASE_URL in your .env
echo "DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" >> .env

# Run all migrations
alembic upgrade head
```

If you have raw SQL schemas, go to Supabase Dashboard → **SQL Editor** and paste your migration files in order.

### 1.4 Create Initial Admin User

Use the Supabase SQL Editor or your backend API to create the first admin:

```sql
-- Run in Supabase SQL Editor
-- Replace with your hashed password (use passlib to generate)
INSERT INTO users (email, username, hashed_password, is_admin, is_active, created_at)
VALUES (
    'admin@magnet.app',
    'admin',
    '$2b$12$YOUR_HASHED_PASSWORD_HERE',
    true,
    true,
    NOW()
);
```

Or use the API endpoint once the backend is deployed.

### 1.5 Enable Row Level Security (Recommended)

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
```

### 1.6 Troubleshooting

| Issue | Fix |
|-------|-----|
| `connection refused` | Make sure you're using port 6543 (transaction mode) |
| `SSL required` | Add `?sslmode=require` to your connection string |
| `too many connections` | You're likely using session mode; switch to transaction mode |
| `password authentication failed` | Reset password in Supabase Dashboard → Settings → Database |

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
├── Dockerfile           # Optional but recommended
└── render.yaml          # Service blueprint
```

### 2.2 Create a Dockerfile

Create `magnet/backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run migrations then start the server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 2.3 Create render.yaml (Optional)

Create `magnet/render.yaml`:

```yaml
services:
  - type: web
    name: magnet-backend
    runtime: docker
    repo: https://github.com/YOUR_USERNAME/magnet
    rootDir: backend
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SECRET_KEY
        generateValue: true
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false
      - key: FRONTEND_URL
        value: https://your-app.vercel.app
      - key: ALLOWED_ORIGINS
        value: https://your-app.vercel.app
```

### 2.4 Create Web Service on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `magnet-backend`
   - **Region:** Choose closest to Supabase region
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `backend/Dockerfile` (or just `Dockerfile` if rootDir is set)
   - **Docker Context:** `backend`
   - **Health Check Path:** `/health`
   - **Plan:** Free tier to start (upgrades available)
5. Click **"Advanced"** and set environment variables (see 2.5)
6. Click **"Create Web Service"**

### 2.5 Environment Variables

Set these in Render Dashboard → **Environment** tab:

```bash
# === Required ===
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
SECRET_KEY=<generate-with: python -c "import secrets; print(secrets.token_urlsafe(64))">
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# === Application ===
DEBUG=false
ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.your-domain.com
FRONTEND_URL=https://your-app.vercel.app

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
| `ECONNREFUSED` on database | Wrong port; use 6543 not 5432 for Supabase; check SSL |
| Cold starts take 30+ seconds | Free tier spins down after inactivity; upgrade to paid plan for always-on |
| Render runs out of memory | Upgrade plan; free tier has 512MB RAM |
| `ModuleNotFoundError` | Missing dependency in requirements.txt or wrong working directory |
| Docker build fails | Ensure `Dockerfile` context is correct; check `.dockerignore` |

---

## 3. Frontend Deployment (Vercel)

### 3.1 Import from GitHub

1. Go to [https://vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New Project"**
3. Select your `magnet` repository
4. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` (use the `./frontend` dropdown)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Click **"Deploy"**

### 3.2 Environment Variables

In the Vercel project settings → **Environment Variables**, add:

```bash
VITE_API_URL=https://magnet-backend.onrender.com/api
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> **Important:** Vercel environment variables must be prefixed with `VITE_` to be exposed to the client bundle.

After adding variables, go to **Deployments** → click **"..."** on latest → **"Redeploy"** to pick up the new env vars.

### 3.3 Custom Domain Setup

1. In your Vercel project, go to **Settings** → **Domains**
2. Enter your custom domain (e.g., `magnet.yourdomain.com`)
3. Add the DNS records Vercel provides:

```
# For apex domain (yourdomain.com)
Type: A
Name: @
Value: 76.76.21.21

# For subdomain (magnet.yourdomain.com)
Type: CNAME
Name: magnet
Value: cname.vercel-dns.com
```

4. Wait for DNS propagation (5 minutes to 48 hours)
5. SSL certificate is **automatic** via Let's Encrypt

### 3.4 SPA Routing (Important)

If you use `react-router-dom` with browser routing, create a `vercel.json` in `magnet/frontend/`:

```json
{
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

### 3.5 Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails with `tsc` errors | Run `npm run build` locally first; fix TypeScript errors |
| Blank page after deploy | Check `vercel.json` rewrites; ensure env vars are set |
| API calls fail with CORS | Add Vercel domain to backend's `ALLOWED_ORIGINS` |
| `VITE_` variables undefined | Ensure prefix; redeploy after adding variables |
| 404 on refresh | Add SPA rewrite rules in `vercel.json` |
| Build exceeds timeout | Optimize dependencies; check `node_modules` size |

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

Frontend (Vercel) — if doing client-side uploads:
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
5. Copy the `firebaseConfig` object — you'll need these values for Vercel env vars

### 5.3 Generate Service Account Key (Backend)

1. Go to **Project Settings** → **Service accounts**
2. Click **"Generate new private key"**
3. Save the JSON file as `firebase-service-account.json`
4. Upload this to Render as a Secret File (see Section 2.5)

### 5.4 Generate VAPID Key (Web Push)

1. Go to **Project Settings** → **Cloud Messaging**
2. Under **Web Push certificates**, click **"Generate key pair"**
3. Copy the **Public Key** — add to frontend env vars

Frontend (Vercel):
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

| Provider | Steps |
|----------|-------|
| **Vercel** | Settings → Domains → Enter domain → Add DNS records |
| **Render** | Settings → Custom Domains → Enter domain → Add DNS records |

### 6.2 SSL Certificates

Both Vercel and Render provide **automatic SSL** via Let's Encrypt:

- **Vercel:** SSL is automatic and immediate upon DNS verification
- **Render:** SSL is automatic for custom domains (may take a few minutes after DNS propagation)

### 6.3 DNS Configuration

For a full setup with `magnet.yourdomain.com` (frontend) and `api.magnet.yourdomain.com` (backend):

```dns
; Frontend
Type: CNAME
Name: magnet
Value: cname.vercel-dns.com
TTL: 3600

; Backend API
Type: CNAME
Name: api
Value: magnet-backend.onrender.com
TTL: 3600
```

Then update environment variables:
- **Frontend:** `VITE_API_URL=https://api.magnet.yourdomain.com/api`
- **Backend:** `ALLOWED_ORIGINS=https://magnet.yourdomain.com,https://api.magnet.yourdomain.com`

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

### 7.2 Vercel Analytics

1. In Vercel project → **Analytics** tab
2. Enable **Web Analytics** for visitor tracking
3. Enable **Speed Insights** for Core Web Vitals

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
| Frontend broken deploy | Revert to previous Vercel deployment (one click) |
| Cloudinary outage | Media temporarily unavailable; no data loss (Cloudinary has 99.95% SLA) |
| Full data loss | Restore DB from backup; redeploy all services; re-upload critical media |

---

## 9. Security Checklist

### Environment Variables

- [ ] All secrets in environment variables, **never** in code
- [ ] `.env` is in `.gitignore`
- [ ] Render/Vercel env vars are encrypted at rest
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
ALLOWED_ORIGINS=https://magnet.vercel.app,https://magnet.yourdomain.com
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

- [ ] Vercel: Automatic (all traffic served over HTTPS)
- [ ] Render: Automatic for custom domains
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

**Vercel** includes a global CDN automatically. All static assets are cached at edge locations.

**Render** serves from a single region. For API caching, consider Cloudflare in front.

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

**Render** auto-deploys on push to `main` — no extra configuration needed.

**Vercel** auto-deploys on push to `main` — no extra configuration needed.

For pull requests, both platforms create **preview deployments** automatically.

### 11.3 Branch Strategy

```
main          → Production (auto-deploy)
├── develop   → Staging (optional: deploy to staging services)
└── feature/* → Preview deployments (Vercel + Render PR previews)
```

---

## 12. Troubleshooting

### Quick Reference

| Problem | Service | Fix |
|---------|---------|-----|
| App won't start | Render | Check logs; ensure `PORT` env var is used |
| Database connection timeout | Supabase | Use port 6543; check SSL; verify IP allowlist |
| CORS error in browser | Frontend/Backend | Add frontend URL to `ALLOWED_ORIGINS` |
| 404 on page refresh | Vercel | Add SPA rewrite in `vercel.json` |
| Images not uploading | Cloudinary | Check API keys; verify upload preset name |
| Push notifications not working | Firebase | Verify service account; check VAPID key |
| Slow cold starts | Render | Upgrade to paid plan (always-on instances) |
| Build exceeds memory | Render | Increase plan; optimize Docker image |
| Environment variables not picked up | Vercel | Must be prefixed with `VITE_`; redeploy after adding |
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

# Check Render service status
curl https://magnet-backend.onrender.com/health

# Check Vercel deployment
curl -I https://your-app.vercel.app
```

### Getting Help

- **Render:** [docs.render.com](https://docs.render.com) | [community.render.com](https://community.render.com)
- **Vercel:** [vercel.com/docs](https://vercel.com/docs) | [github.com/vercel/vercel](https://github.com/vercel/vercel/discussions)
- **Supabase:** [supabase.com/docs](https://supabase.com/docs) | [github.com/supabase/supabase](https://github.com/supabase/supabase/discussions)
- **Cloudinary:** [cloudinary.com/documentation](https://cloudinary.com/documentation)
- **Firebase:** [firebase.google.com/docs](https://firebase.google.com/docs)

---

## Quick Deploy Checklist

```
□ 1. Create Supabase project & get connection string (port 6543)
□ 2. Run database migrations
□ 3. Create Cloudinary account & get API keys
□ 4. Create Firebase project & download service account JSON
□ 5. Push code to GitHub
□ 6. Deploy backend to Render (Docker)
□ 7. Deploy frontend to Vercel
□ 8. Set all environment variables on both platforms
□ 9. Configure custom domains & DNS
□ 10. Verify SSL certificates
□ 11. Test health check endpoint
□ 12. Test end-to-end flow (signup, login, create post, upload image, notifications)
□ 13. Set up uptime monitoring (UptimeRobot or similar)
□ 14. Review security checklist
□ 15. Set up database backup schedule
```
