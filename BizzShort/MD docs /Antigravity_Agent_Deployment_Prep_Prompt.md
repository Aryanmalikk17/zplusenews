# Agent Prompt: Prepare zpluse Repositories for 3-Tier VPS Deployment

Copy everything below the line into your Antigravity agent. Run it once per repository (start with `zplusenews`, then `zplus-counselling-platform`, then `job-portal-fullstack`), since each repo needs its own Dockerfile, CI workflow, and config audit.

---

## Context

This repository is one of six company web platforms being migrated off scattered hosting (Render, Netlify, DigitalOcean) onto a self-managed, three-tier VPS architecture, all under the `zpluse` GitHub organization. Your job is **not** to change any business logic or features — it is to make this specific repository fully ready for containerized deployment on that new infrastructure, with zero behavior change to the running application.

## Target infrastructure (already finalized, do not redesign this)

- **VPS 1 — Frontend tier (KVM 2):** runs a reverse proxy (Traefik) plus static frontend builds for all platforms, serving each on its own domain with automatic SSL.
- **VPS 2 — Backend tier (KVM 4):** runs all backend application containers (Spring Boot and Node.js apps) as independent Docker containers.
- **VPS 3 — Database tier (KVM 2):** runs a single Postgres server hosting one isolated database per platform.
- All three servers communicate over a private network. Only the frontend tier is exposed to the public internet.
- Deployment is fully automated: GitHub Actions builds a Docker image on every push to `main`, pushes it to GitHub Container Registry (`ghcr.io`), and the target VPS pulls and runs the new image.
- Some platforms use **Supabase** (external, managed) for authentication and/or file storage — this stays external and unchanged; only its connection details need to be environment-configurable.

## What I need you to do in this repository

### 1. Audit and report first
Before changing anything, inspect the repo structure and tell me:
- Is this a monorepo (frontend + backend together) or backend-only/frontend-only?
- What framework/build tool is used (Spring Boot + Maven/Gradle, Node/Express, React/Vite/CRA, etc.)?
- Where is configuration currently defined (`application.properties`, `.env`, hardcoded values, etc.)?
- Are there any hardcoded URLs, ports, database credentials, or API keys currently in the codebase — including old Render/Netlify/DigitalOcean URLs?
- Does it use Supabase? If so, for what (auth, storage, database)?

### 2. Externalize all configuration
- Every environment-specific value (database connection string, port, Supabase URL/keys, CORS allowed origins, any third-party API keys) must be read from environment variables — none hardcoded.
- Produce a `.env.example` file listing every required environment variable with a placeholder value and a one-line comment explaining what it's for.
- The app must bind to `0.0.0.0`, not `localhost` or `127.0.0.1`, so it's reachable inside a container.
- The listening port must be configurable via an environment variable (e.g. `PORT` or `SERVER_PORT`), not hardcoded.

### 3. Add a production-ready Dockerfile
- Use a **multi-stage build**: one stage to build (Maven/Gradle build, or `npm run build`), a second minimal runtime stage (slim JRE for Spring Boot, or Nginx/Node slim for frontend).
- Keep the final image as small as reasonably possible — don't ship build tools or source code in the runtime layer.
- Add a `.dockerignore` file excluding `node_modules`, build artifacts, `.git`, `.env`, and any local-only files.
- Add a `HEALTHCHECK` instruction or expose a simple `/health` or `/actuator/health` endpoint if one doesn't already exist, so the reverse proxy and monitoring can verify the container is alive.

### 4. Update CORS and API base URL handling
- If this is a backend: update CORS configuration to allow the platform's real production domain (I will confirm the exact domain per repo), not `localhost` or an old Render/Netlify URL.
- If this is a frontend: confirm the API base URL is read from a build-time environment variable, not hardcoded to any previous backend URL.

### 5. Add a GitHub Actions workflow
Create `.github/workflows/deploy.yml` that, on every push to `main`:
- Builds the Docker image
- Tags it with both `latest` and the short commit SHA
- Pushes it to `ghcr.io/zpluse/<repo-name>` using `GITHUB_TOKEN` (no manual secrets needed for registry auth)
- Does **not** attempt to SSH or deploy directly yet — just build and push. I will wire up the deploy step myself once the VPS servers are live, since that needs server-specific secrets I haven't provisioned yet.

### 6. What NOT to do
- Do not modify business logic, UI, or features.
- Do not rename existing API endpoints or change request/response formats.
- Do not swap out Supabase, the database, or any core dependency — only make their connection details configurable.
- Do not remove or restructure existing tests.
- If something looks broken or risky to containerize as-is, stop and flag it to me instead of guessing.

### 7. Final output I need from you
A short summary listing:
- Every new/changed file and why
- The full list of environment variables this app now requires, with a one-line description of each
- Any assumptions you made that I should confirm
- Anything you found that looks like a leftover credential, hardcoded secret, or old hosting URL still in the codebase that needs my attention

---

**Reminder for myself before running this on each repo:** confirm the exact production domain for that platform (`zplusenews.com`, `zplusecounselling.com`, or `zplusejobs.com`) and its intended database name (`news_db`, `counselling_db`, `jobs_db`) so I can fill in the `.env.example` values correctly once the agent finishes.
