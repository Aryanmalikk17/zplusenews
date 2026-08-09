# Deployment Runbook: zpluse 3-Tier VPS Go-Live (v4 — full self-hosted DB tier)

Servers are live, Tailscale private networking is fully set up. This version updates the plan so **all three apps' databases are fully self-hosted on VPS3**, including migrating zplusenews's MongoDB off Atlas.

**Tell your agent this directly before pasting any prompt below:** "Private networking is already set up via Tailscale on all 3 servers. Do not attempt to discover, configure, or set up any private network — use the exact private IPs given in each instruction below. This is v4 of the runbook — zplusenews's MongoDB is now also migrating to self-hosted, not staying on Atlas."

---

## Part 1 — Server facts and finalized architecture decisions

| Server | Role | Public IP | Private (Tailscale) IP |
|---|---|---|---|
| `srv1889052.hstgr.cloud` | Frontend (KVM 2, Docker+Traefik) | `200.141.15.120` | `100.93.49.103` |
| `srv1889048.hstgr.cloud` | Backend (KVM 4, Plain OS) | `200.141.15.115` | `100.74.138.12` |
| `srv1889057.hstgr.cloud` | Database (KVM 2, Plain OS) | `200.141.15.121` | `100.112.91.109` |

**Updated decisions (all databases now self-hosted on VPS3):**
1. **zplusenews's MongoDB migrates from Atlas to self-hosted** on VPS3, with a full data migration (Part 7) — supersedes the earlier "keep on Atlas" decision.
2. **job-portal-fullstack's PostgreSQL migrates from Supabase to self-hosted `jobs_db`** on VPS3 — unchanged from before.
3. **zplus-counselling-platform's Postgres, MongoDB, Redis, RabbitMQ** were already planned self-hosted on VPS3 — unchanged.

Supabase itself stays in use for job-portal's **authentication and file storage only** — only its database is moving. Nothing about Supabase auth/storage changes.

### Per-app image and container map

| App | Image(s) on ghcr.io/zpluse/ | Container(s) | Runs on |
|---|---|---|---|
| zplusenews | `zplusenews` (combined frontend+backend, one image) | `zplusenews-app` (port 3000) | Backend VPS |
| zplus-counselling-platform | `zplus-counselling-backend` | `counselling-backend` (port 8080) | Backend VPS |
| zplus-counselling-platform | `zplus-counselling-frontend` | `counselling-frontend` (nginx, port 80) | **Frontend VPS** |
| job-portal-fullstack | `job-portal-fullstack-backend` | `jobs-backend` (port 8080) | Backend VPS |
| job-portal-fullstack | `job-portal-fullstack-frontend` | `jobs-frontend` (nginx, port 80) | **Frontend VPS** |

**Why counselling/jobs frontend containers run on the Frontend VPS:** both apps call their API on the same domain (e.g. `zplusecounselling.com/api/v1`), so Traefik splits traffic by URL path — `/api/*` to the backend over Tailscale, everything else served locally. zplusenews is one combined container serving both API and static frontend, so it stays entirely on the Backend VPS with Traefik proxying the whole domain to it.

### Database tier — now fully self-hosted, 4 services, 3 MongoDB databases total

| Service | Used by | Databases inside it |
|---|---|---|
| PostgreSQL | counselling, jobs | `counselling_db`, `jobs_db` — separate users/passwords each |
| MongoDB | **zplusenews AND counselling** | `zplusenews_db` (migrated from Atlas) and `zpluse_content` (counselling) — separate users/passwords each, same Mongo server |
| Redis | counselling, jobs | shared instance, separate logical DB index per app |
| RabbitMQ | counselling only | — |

---

## Part 2 — Private networking: DONE, nothing to do here

Tailscale is installed, authenticated, and connected on all 3 servers, confirmed via the admin console. Skip straight to Part 3.

---

## Part 3 — Safety rules for this entire deployment (non-negotiable)

1. **Do not touch DNS for any of the 3 domains until explicitly told to.** Old Render/Netlify/DigitalOcean/Supabase/Atlas hosting stays live and untouched until cutover.
2. **Do not decommission, delete, or downgrade anything on Render, Netlify, DigitalOcean, Supabase, or MongoDB Atlas** as part of this task — including not deleting the Atlas cluster after migration, until explicitly told to.
3. **Every database migration in this plan (zplusenews's MongoDB, job-portal's Postgres) must follow this pattern: take a fresh backup/dump first, confirm it's saved somewhere safe outside the VPS, restore it to the new self-hosted database, then verify data integrity (record counts, spot-check key records) before treating the migration as done.** Never delete or point production traffic away from the old database until this verification passes.
4. **Nothing is "deployed" until it's tested and reachable, verified working** — not just "container is running."
5. **If anything is ambiguous or risky, stop and ask — don't guess.**
6. **Do not attempt to set up, reconfigure, or discover private networking** — it's already done (Part 2).
7. **Security cleanup first:** confirm the leftover local key files in job-portal-fullstack (`github_actions_key.pem`, `server-key.pem`, `jobportal_do`, `.env.prod`) and the Firebase service account key file in zplus-counselling-platform were never committed to git history, then delete them from local disk once safely stored elsewhere.

---

## Part 4 — Agent prompt: Database server setup

Paste this into your agent:

```
Connect via SSH to the database server at 200.141.15.121 (srv1889057.hstgr.cloud).
Its Tailscale private IP is 100.112.91.109 — private networking is already fully
set up, do not attempt to configure or discover it. This server will run
PostgreSQL, MongoDB, Redis, and RabbitMQ. Do the following, explaining each
command before running it:

1. Update the system, install Docker and Docker Compose if not present.
2. Configure ufw firewall: allow SSH from anywhere. Allow the following ports
   ONLY from the backend server's Tailscale IP, 100.74.138.12: Postgres 5432,
   MongoDB 27017, Redis 6379, RabbitMQ 5672. Deny all of these from the public
   internet entirely — verify with an external check if possible.
3. Create a docker-compose.yml running all 4 services, each restart
   unless-stopped, each with a named volume for data persistence:
   - postgres:16 with a strong generated superuser password
   - mongo:7 with a strong generated root username/password
   - redis:7 with appendonly enabled and a generated password (requirepass)
   - rabbitmq:3-management with a strong generated default user/password
   Show me all generated credentials once so I can store them securely.
4. Start all 4 containers and confirm each is running.
5. In Postgres, create two databases: counselling_db (owned by dedicated user
   counselling_user) and jobs_db (owned by dedicated user jobs_user), each
   with its own generated password. Show me both sets of credentials.
6. In MongoDB, create TWO separate databases, each with its own dedicated
   user and generated password:
   - zplusenews_db — for the zplusenews platform (this will receive migrated
     data from its current MongoDB Atlas cluster in Part 7)
   - zpluse_content — for the counselling platform's content
   Show me both sets of credentials.
7. Confirm all 4 services are reachable from the backend server's Tailscale
   IP (100.74.138.12) but NOT reachable from the public internet.

Do not import any data yet — stop after everything is created and confirmed
reachable, and report back with all credentials.
```

---

## Part 5 — Agent prompt: Backend server setup

Paste this into your agent **after Part 4 is confirmed working**:

```
Connect via SSH to the backend server at 200.141.15.115 (srv1889048.hstgr.cloud).
Its Tailscale private IP is 100.74.138.12 — private networking is already fully
set up, do not attempt to configure or discover it. This server runs 3 backend
containers. Do the following:

1. Update the system, install Docker and Docker Compose if not present.
2. Configure ufw firewall: allow SSH from anywhere. Allow application ports
   ONLY from the frontend server's Tailscale IP, 100.93.49.103. Also confirm
   this server retains normal outbound internet access (needed temporarily
   for the MongoDB Atlas migration step in Part 7).
3. Log in to ghcr.io using a GitHub Personal Access Token I will provide, so
   this server can pull these private images:
   ghcr.io/zpluse/zplusenews
   ghcr.io/zpluse/zplus-counselling-backend
   ghcr.io/zpluse/job-portal-fullstack-backend
4. Create a docker-compose.yml running all 3, each restart unless-stopped:
   - zplusenews-app (port 3000): MONGO_URI points to the NEW self-hosted
     MongoDB at 100.112.91.109, database zplusenews_db, using the credentials
     from Part 4 — NOT the old Atlas connection string. I will provide the
     old Atlas connection string separately, only for the one-time migration
     in Part 7, not for the running app's config.
   - counselling-backend (port 8080): connects to PostgreSQL counselling_db,
     MongoDB zpluse_content, Redis, and RabbitMQ, all at 100.112.91.109 using
     the credentials from Part 4.
   - jobs-backend (port 8080): connects to PostgreSQL jobs_db and Redis at
     100.112.91.109 using the credentials from Part 4. Also configure the
     existing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars I will
     provide, since Supabase auth/storage stay external and unchanged — only
     the database connection is moving to self-hosted.
5. Start all 3 containers, confirm each is running and its health endpoint
   responds correctly from this server itself.

Do not expose any port publicly on this server. Do not proceed to the
frontend/proxy step until I confirm all 3 backends are healthy.
```

---

## Part 6 — Agent prompt: Frontend / Traefik server setup

Paste this into your agent **after Part 5 is confirmed working**:

```
Connect via SSH to the frontend server at 200.141.15.120 (srv1889052.hstgr.cloud).
Its Tailscale private IP is 100.93.49.103 — private networking is already fully
set up, do not attempt to configure or discover it. Docker and Traefik are
already installed from the Hostinger template. This server also runs 2 small
frontend containers directly. Do the following:

1. Show me the current Traefik configuration before changing anything.
2. Log in to ghcr.io using the same GitHub PAT, and pull + run these 2
   containers locally on this server, restart unless-stopped:
   - counselling-frontend from ghcr.io/zpluse/zplus-counselling-frontend
   - jobs-frontend from ghcr.io/zpluse/job-portal-fullstack-frontend
3. Configure Traefik routing with automatic Let's Encrypt SSL:
   - zplusenews.com → the zplusenews-app container on the backend server,
     100.74.138.12:3000 (whole domain, one target)
   - zplusecounselling.com: split by path —
       /api/* → counselling-backend on 100.74.138.12:8080
       everything else → the local counselling-frontend container here
   - zplusejobs.com: split by path —
       /api/* → jobs-backend on 100.74.138.12:8080
       everything else → the local jobs-frontend container here
4. Do NOT point the actual domain DNS here yet. Test each route using a
   temporary local hosts-file entry or staging subdomain first, confirming
   both the frontend loads AND an API path correctly reaches the backend,
   before reporting back.

Stop and report status after routing is configured and tested — do not touch
DNS records.
```

---

## Part 7 — Data migrations (do these before go-live, after Parts 4–6 pass)

### 7a. zplusenews: MongoDB Atlas → self-hosted migration

```
On the backend server (200.141.15.115), which still has outbound internet
access, do the following — explain each command before running it:

1. Install mongodump/mongorestore tools (mongodb-database-tools package) if
   not already present.
2. Run mongodump against the OLD Atlas cluster using the connection string I
   will provide, outputting to a local dump folder. Do not modify or delete
   anything on Atlas.
3. Show me the dump size and collection list so I can sanity-check it looks
   complete before proceeding.
4. Run mongorestore, pointing the dump at the NEW self-hosted MongoDB on
   100.112.91.109, database zplusenews_db, using the credentials from Part 4.
5. Verify the migration: compare document counts per collection between the
   Atlas dump output and the new database. Report any mismatches before
   calling this done.
6. Do NOT delete the dump folder yet, and do NOT touch the Atlas cluster
   itself (no deletion, no downgrade) — we keep it as a fallback until the
   new setup is confirmed stable in production.
7. Do NOT restart the zplusenews-app container or change its live config yet
   — it should still be pointed at the new database per Part 5's setup, but
   we verify data first before calling this migration complete.
```

### 7b. job-portal-fullstack: Supabase Postgres → self-hosted migration

```
On the backend server (200.141.15.115), do the following — explain each
command before running it:

1. Run pg_dump against the OLD Supabase Postgres using the connection string
   I will provide, outputting to a local dump file. Do not modify or delete
   anything on Supabase.
2. Show me the dump file size and table list so I can sanity-check it before
   proceeding.
3. Run pg_restore (or psql, depending on dump format), pointing at the NEW
   self-hosted jobs_db on 100.112.91.109, using the credentials from Part 4.
4. Verify the migration: compare row counts per table between the Supabase
   dump and the new database. Report any mismatches before calling this done.
5. Do NOT delete the dump file yet, and do NOT touch the Supabase database
   itself — keep it as a fallback. Supabase auth and storage remain fully
   active and unchanged; only the database is migrating.
```

---

## Part 8 — Go-live (only after Parts 4–7 all pass verification)

1. Confirm both migrations (7a, 7b) passed their record-count verification with no unexplained mismatches.
2. Point each domain's DNS A record to the frontend server's public IP: **200.141.15.120**.
3. Watch closely for 24–48 hours — check each site loads, logs in, and core features work correctly, including job-portal's Supabase-authenticated login (auth unchanged, only DB moved) and zplusenews's content (Mongo unchanged in structure, only location moved).
4. Only after that monitoring window: cancel old Render/Netlify/DigitalOcean hosting, and downgrade/decommission the old Atlas cluster and Supabase's database usage for these platforms (keeping Supabase itself active for job-portal's auth/storage).

---

## Notes for you (not the agent)

- Keep every password, credential, and PAT generated in this process in a password manager.
- Keep both migration dump files (Mongo + Postgres) backed up somewhere off the VPS until you're fully confident in the new setup — don't rely on the VPS disk as your only backup copy.
- The other 3 platforms get added to Parts 4–6 later as additional containers/routes on these same three servers.
- Outstanding before Part 5: a GitHub PAT with `read:packages` scope, and confirmation all 5 images exist at ghcr.io/zpluse (check github.com/orgs/zpluse/packages). Also gather the old MongoDB Atlas connection string and old Supabase Postgres connection string now — both are needed for Part 7.
- Watch the database server's resource usage once all 4 services (Postgres, MongoDB, Redis, RabbitMQ) are running with real data from 3 databases — KVM 2 (8GB RAM) should handle this at moderate traffic, but this is the one server most likely to need an upgrade first if traffic grows.
