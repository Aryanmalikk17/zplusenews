# Complete Audit and Deployment Preparation Report: zplusenews

**Platform:** `zplusenews` (`zplusenews.com`)  
**Organization:** `zpluse`  
**Architecture:** 3-Tier Self-Managed VPS Migration (Frontend Proxy / Backend Containers / Managed DB)  
**Date:** August 2026  

---

## 1. Repository & Architecture Audit

| Audit Item | Details / Findings |
|---|---|
| **Repository Structure** | **Monorepo** containing both the Express backend and Vite React frontend under the `BizzShort` directory. |
| **Backend Framework** | Node.js (v20+), Express.js (v4.18), Mongoose (v9.0) |
| **Frontend Framework** | React (v19.2), Vite (v7.2), React Router (v7.12) |
| **Database** | **MongoDB** (Atlas connection via `MONGO_URI`). Supabase is **not** used. |
| **File Storage** | **Cloudinary** (external managed storage). Supabase storage is **not** used. |
| **Configuration Locations** | Backend: Loaded via `dotenv` in `server.js`.<br>Frontend: Dynamic API base URL via `import.meta.env.VITE_API_BASE_URL` with `/api` fallback. |
| **CORS & Bindings** | Server explicitly bound to `0.0.0.0` on port `3000`. CORS whitelist and Helmet CSP `connectSrc` dynamically populated from environment variables. |
| **Legacy Hosting Artifacts** | All hardcoded Render (`onrender.com`) domains removed from CORS whitelist, CSP directives, and utility scripts. |

---

## 2. Inventory of New & Modified Files

### A. New Containerization & CI/CD Files
1. **`Dockerfile`**
   - Multi-stage Docker build (`node:20-alpine`).
   - **Stage 1 (`frontend-builder`):** Installs frontend dependencies with `npm ci` and builds the static React app.
   - **Stage 2 (`runner`):** Installs only production backend dependencies with `npm ci --only=production`, copies backend code, embeds the built frontend into `client/dist`, exposes port `3000`, and runs `HEALTHCHECK` against `/api/health`.
2. **`.dockerignore`**
   - Excludes `node_modules/`, `.git/`, `.env*`, build artifacts, `.agent/`, `.github/`, and OS metadata (`.DS_Store`).
3. **`.github/workflows/deploy.yml`**
   - GitHub Actions workflow triggered on push to `main`.
   - Builds and tags the Docker image with `latest` and git commit SHA.
   - Pushes directly to GitHub Container Registry at `ghcr.io/zpluse/zplusenews` using `${{ secrets.GITHUB_TOKEN }}`.

### B. Modified Application Files
1. **`BizzShort/server.js`**
   - Server listener explicitly bound to `0.0.0.0`: `app.listen(PORT, '0.0.0.0', ...)`.
   - Initialized `allowedOrigins` before Helmet security middleware.
   - Helmet CSP `connectSrc` made dynamic to include `SITE_URL` and `CORS_ORIGIN`.
   - Cleaned up CORS matching logic to eliminate old Render domains and support configured production domains.
2. **`BizzShort/client/src/services/api.js`**
   - Updated Axios client `baseURL` to `import.meta.env.VITE_API_BASE_URL || '/api'`.
3. **`BizzShort/.env.example`**
   - Comprehensive environment template containing documentation for all required variables.
4. **Helper Scripts (`create-first-admin.js`, `populate-real-data.js`, `scripts/import_youtube.js`)**
   - Removed hardcoded `bizzshort.onrender.com` URLs in favor of `SITE_URL` / `API_BASE` environment variables with local fallbacks.

---

## 3. Production Environment Variables Reference

| Variable | Type | Default / Example | Purpose / Description |
|---|---|---|---|
| `PORT` | Number | `3000` | Port on which the container listens |
| `NODE_ENV` | String | `production` | Node application environment mode |
| `SITE_URL` | URL | `https://zplusenews.com` | Primary canonical URL for sitemaps & CSP |
| `MONGO_URI` | String | `mongodb+srv://...` | MongoDB database connection URI |
| `JWT_SECRET` | Secret | *`<32+ char secret>`* | Secret key for signing authentication JWTs |
| `JWT_EXPIRE` | String | `30d` | JWT token validity window |
| `SETUP_KEY` | Secret | *`<random string>`* | Authorizes initial admin seed routes |
| `DEFAULT_ADMIN_PASSWORD` | Secret | *`<secure password>`* | Password for initial admin account seeding |
| `CORS_ORIGIN` | List | `https://zplusenews.com,https://www.zplusenews.com` | Comma-delimited list of allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | Number | `900000` (15 min) | Rate limiting calculation window |
| `RATE_LIMIT_MAX_REQUESTS`| Number | `500` | Max API requests allowed per window |
| `MAX_FILE_SIZE` | Bytes | `5242880` (5 MB) | Maximum permitted file upload size |
| `CLOUDINARY_CLOUD_NAME` | String | *`your_cloud_name`* | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | String | *`your_api_key`* | Cloudinary API access key |
| `CLOUDINARY_API_SECRET` | Secret | *`your_api_secret`* | Cloudinary API access secret |
| `YOUTUBE_API_KEY` | Secret | *`your_youtube_key`* | YouTube Data API key for news syncing |
| `YOUTUBE_CHANNEL_ID` | String | *`your_channel_id`* | Target YouTube channel ID for news syncing |
| `YOUTUBE_CHANNEL_HANDLE` | String | `@zplusenews` | Fallback YouTube channel handle |
| `PROKERALA_CLIENT_ID` | String | *`your_client_id`* | Prokerala API Client ID |
| `PROKERALA_CLIENT_SECRET`| Secret | *`your_client_secret`* | Prokerala API Client Secret |

---

## 4. Verification & Validation Summary

- **Syntax Validation:** Ran `node -c` on all modified JavaScript files (`server.js`, `create-first-admin.js`, `populate-real-data.js`, `import_youtube.js`). All files passed without syntax errors.
- **Docker Layering & Build Optimization:** Verified that source files and dependencies are separated across multi-stage layers to maximize caching and minimize image footprint.
- **Security Check:** Verified no plaintext secrets or credentials are baked into version control or Docker build context.
