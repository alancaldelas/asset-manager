# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry during build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user that belongs to the root group (GID 0). OpenShift's
# restricted-v2 SCC runs containers with an arbitrary UID that is always a
# member of the root group, so all writable paths must be group-owned by root
# and group-writable.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup root nextjs

# Set up standard public and static asset directories
COPY --from=builder /app/public ./public

# Writable dirs: Next.js runtime cache (.next/cache) and the JSON storage
# fallback (data/). Created up front so permissions can be relaxed for GID 0.
RUN mkdir -p .next data

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=1001:0 /app/.next/standalone ./
COPY --from=builder --chown=1001:0 /app/.next/static ./.next/static

# Hand everything to the root group with group read/write/execute so that the
# arbitrary UID assigned by OpenShift can still read code and write caches.
RUN chown -R 1001:0 /app \
  && chmod -R g+rwX /app

# Use a numeric UID so the platform does not need an /etc/passwd entry.
USER 1001

EXPOSE 3000

CMD ["node", "server.js"]
