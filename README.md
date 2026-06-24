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
- REST API under `/api/servers`
- Dual storage: PostgreSQL in production, JSON file fallback in development
- Container-ready (standalone Next.js output) with Docker, Kubernetes, and
  OpenShift manifests included

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

| Variable       | Required | Description                                                        |
| -------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL` | No       | PostgreSQL connection string. If unset, JSON file storage is used. |
| `PORT`         | No       | Port to listen on (default `3000`).                                |

## API

Base path: `/api/servers`

| Method | Path                | Description              |
| ------ | ------------------- | ------------------------ |
| GET    | `/api/servers`      | List all servers         |
| POST   | `/api/servers`      | Create a server          |
| GET    | `/api/servers/{id}` | Get a single server      |
| PUT    | `/api/servers/{id}` | Update a server (partial) |
| DELETE | `/api/servers/{id}` | Delete a server          |

Required fields when creating: `hostname`, `ip_address`, `status`, `os_name`,
`datacenter`.

## Run with Docker Compose

Builds the app image and starts it alongside PostgreSQL:

```bash
docker compose up --build
```

The app is available at [http://localhost:3000](http://localhost:3000).

## Deploy to Kubernetes

Vanilla Kubernetes manifests (Ingress + LoadBalancer) live in `k8s/`:

```bash
kubectl apply -f k8s/manifests.yaml
```

Update the image reference in `k8s/manifests.yaml` to your registry path first.

## Deploy to OpenShift

OpenShift-native manifests live in `openshift/`. They differ from the plain
Kubernetes set in a few important ways:

- A **Route** with edge TLS is used instead of an Ingress.
- PostgreSQL uses the **SCL/RHEL PostgreSQL image** (`quay.io/sclorg/postgresql-15-c9s`),
  which runs correctly under OpenShift's default `restricted-v2` SCC (arbitrary
  UID). The community `postgres` image does not.
- The app Deployment sets no fixed `runAsUser`, letting OpenShift assign a UID.
  The `Dockerfile` is configured so all writable paths are owned by group `0`
  and group-writable to support this.

### 1. Build and push the image

```bash
# Build with the OpenShift-compatible Dockerfile
docker build -t quay.io/your-org/asset-manager:latest .
docker push quay.io/your-org/asset-manager:latest
```

Then set that image in `openshift/03-asset-manager.yaml`. Alternatively, build
in-cluster:

```bash
oc new-build --name asset-manager --binary --strategy docker -n infraops
oc start-build asset-manager --from-dir . --follow -n infraops
```

### 2. Configure secrets

Edit `openshift/01-db-secret.yaml` and change `database-user`,
`database-password`, and `database-name` before applying.

### 3. Apply the manifests

```bash
oc apply -k openshift/
```

### 4. Get the URL

```bash
oc get route asset-manager -n infraops -o jsonpath='{.spec.host}{"\n"}'
```

## Project Structure

```
src/
  app/
    api/servers/        REST API routes
    page.tsx            Dashboard UI
    layout.tsx          Root layout
  lib/db.ts             Storage layer (PostgreSQL + JSON fallback)
k8s/                    Kubernetes manifests
openshift/              OpenShift manifests (Route, SCC-compatible)
Dockerfile              Multi-stage, OpenShift-compatible build
docker-compose.yml      Local app + PostgreSQL
```
