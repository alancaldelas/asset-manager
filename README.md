# Asset Manager

A web-based infrastructure inventory and server asset management platform. Track
physical and virtual servers across datacenters with search, filtering, and full
CRUD operations.

Built with Next.js (App Router) and TypeScript. It uses PostgreSQL when a
`DATABASE_URL` is provided and transparently falls back to local JSON file
storage for zero-config local development.

## Features

- Dashboard with fleet metrics (status breakdown, aggregate CPU / RAM / storage)
- Create, read, update, and delete server assets
- Real-time search and filtering by status and datacenter
- User accounts with authentication (bcrypt + signed JWT session cookie)
- Role-based access control: `admin`, `operator`, `viewer`
- Admin-only user management UI under `/users`
- REST API under `/api/servers`, `/api/users`, and `/api/auth`
- Dual storage: PostgreSQL in production, JSON file fallback in development
- Container-ready (standalone Next.js output) with a Docker image and a Helm
  chart for Kubernetes and OpenShift

## Authentication & Roles

All pages and server APIs require an authenticated session. On first boot the
app seeds a single administrator account:

- **Username:** `admin`
- **Password:** value of `ADMIN_DEFAULT_PASSWORD` (defaults to `admin` if unset)

Change this immediately after the first login.

Sessions are stateless JWTs signed with `SESSION_SECRET` and stored in an
`httpOnly` cookie. Route protection is handled by `proxy.ts` (Next.js 16
Proxy), which redirects unauthenticated users to `/login`.

| Role       | Servers              | Users            |
| ---------- | -------------------- | ---------------- |
| `viewer`   | Read-only            | No access        |
| `operator` | Create / edit / delete | No access      |
| `admin`    | Create / edit / delete | Full management |

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Framework  | Next.js 16 (App Router)             |
| Language   | TypeScript 5 / React 19             |
| Styling    | Tailwind CSS 4                      |
| Icons      | lucide-react                        |
| Database   | PostgreSQL 15 (pg) / JSON fallback  |

## Getting Started (Local Development)

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

With no `DATABASE_URL` set, the app seeds and stores data in
`data/servers.json`. To point at a PostgreSQL instance instead:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/asset_manager?sslmode=disable"
npm run dev
```

### Scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the dev server (hot reload) |
| `npm run build` | Production build                  |
| `npm start`     | Run the production build          |
| `npm run lint`  | Run ESLint                        |

## Environment Variables

| Variable                 | Required | Description                                                        |
| ------------------------ | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`           | No       | PostgreSQL connection string. If unset, JSON file storage is used. |
| `SESSION_SECRET`         | Yes      | Secret used to sign session JWTs. Generate with `openssl rand -base64 32`. |
| `ADMIN_DEFAULT_PASSWORD` | No       | Initial password for the seeded `admin` account (default `admin`). |
| `PORT`                   | No       | Port to listen on (default `3000`).                                |

See `.env.example` for a template.

## API

All endpoints below require an authenticated session except `/api/health`
(public, used for liveness/readiness probes) and `/api/auth/login`.

**Servers** — `viewer` may read; `operator`/`admin` may write.

| Method | Path                | Description               |
| ------ | ------------------- | ------------------------- |
| GET    | `/api/servers`      | List all servers          |
| POST   | `/api/servers`      | Create a server           |
| GET    | `/api/servers/{id}` | Get a single server       |
| PUT    | `/api/servers/{id}` | Update a server (partial) |
| DELETE | `/api/servers/{id}` | Delete a server           |

Required fields when creating: `hostname`, `ip_address`, `status`, `os_name`,
`datacenter`.

**Auth**

| Method | Path               | Description                       |
| ------ | ------------------ | --------------------------------- |
| POST   | `/api/auth/login`  | Log in (`username`, `password`)   |
| POST   | `/api/auth/logout` | Clear the session                 |
| GET    | `/api/auth/me`     | Get the current authenticated user |

**Users** — `admin` only.

| Method | Path              | Description          |
| ------ | ----------------- | -------------------- |
| GET    | `/api/users`      | List all users       |
| POST   | `/api/users`      | Create a user        |
| GET    | `/api/users/{id}` | Get a single user    |
| PUT    | `/api/users/{id}` | Update a user        |
| DELETE | `/api/users/{id}` | Delete a user        |

The last remaining admin cannot be deleted or demoted, and users cannot delete
their own account.

## Run with Docker Compose

Builds the app image and starts it alongside PostgreSQL:

```bash
docker compose up --build
```

The app is available at [http://localhost:3000](http://localhost:3000).

## Deploy with Helm

A single chart lives in `charts/asset-manager/`. It runs on both vanilla
Kubernetes and OpenShift, selected with one flag:

| `openshift.enabled` | Database                                   | Ingress    |
| ------------------- | ------------------------------------------ | ---------- |
| `false` (default)   | Bitnami PostgreSQL subchart                | Ingress    |
| `true`              | In-chart SCLorg PostgreSQL (arbitrary-UID) | Route (TLS)|

`SESSION_SECRET`, the seeded admin password, and (in OpenShift mode) the
database password are **auto-generated** on install and preserved across
upgrades — nothing secret is committed to git. Override any of them via
`app.sessionSecret`, `app.adminDefaultPassword`, etc.

Build and push the image first (the `Dockerfile` is OpenShift `restricted-v2`
SCC compatible — non-root, group-`0`-writable paths):

```bash
docker build -t quay.io/your-org/asset-manager:latest .
docker push quay.io/your-org/asset-manager:latest
```

### Kubernetes (default: Bitnami PostgreSQL + Ingress)

```bash
helm dependency update charts/asset-manager   # fetch the Bitnami subchart (once)

helm install asset-manager charts/asset-manager \
  -n infraops --create-namespace \
  --set image.repository=quay.io/your-org/asset-manager \
  --set image.tag=latest \
  --set ingress.host=asset-manager.example.com
```

### OpenShift (SCLorg PostgreSQL + Route)

`values-openshift.yaml` sets `openshift.enabled=true`, `postgresql.enabled=false`,
and `ingress.enabled=false` for you (no `helm dependency update` needed):

```bash
helm install asset-manager charts/asset-manager \
  -n infraops --create-namespace \
  -f charts/asset-manager/values-openshift.yaml \
  --set image.repository=quay.io/your-org/asset-manager \
  --set image.tag=latest

# Get the URL
oc get route asset-manager -n infraops -o jsonpath='{"https://"}{.spec.host}{"\n"}'
```

### Retrieve the seeded admin password

```bash
kubectl get secret asset-manager-secret -n infraops \
  -o jsonpath='{.data.admin-default-password}' | base64 -d; echo
```

Change it immediately after the first login.

> **Note:** enabling OpenShift mode requires `postgresql.enabled=false` (the
> Bitnami subchart and the in-chart SCLorg PostgreSQL are mutually exclusive).
> The chart fails fast with a clear message if both are enabled. This is because
> Helm can only toggle a subchart via a static `condition`, so the two flags are
> coordinated rather than derived from each other.

## Project Structure

```
src/
  proxy.ts              Next.js 16 Proxy (route protection / auth redirects)
  app/
    api/
      servers/          Server CRUD REST API (auth-protected)
      users/            User management REST API (admin only)
      auth/             login / logout / me endpoints
      health/           Public liveness/readiness probe
    login/page.tsx      Login UI
    users/page.tsx      Admin user management UI
    page.tsx            Dashboard UI
    layout.tsx          Root layout
  lib/
    db.ts               Storage layer (PostgreSQL + JSON fallback)
    session.ts          JWT session encode/decode + cookie handling
    auth.ts             Current-user DAL + role authorization helpers
charts/asset-manager/   Helm chart (Kubernetes + OpenShift)
Dockerfile              Multi-stage, OpenShift-compatible build
docker-compose.yml      Local app + PostgreSQL
```
