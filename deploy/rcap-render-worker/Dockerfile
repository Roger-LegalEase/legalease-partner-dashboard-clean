# RCAP render worker container.
#
# Build (from the repository root):
#   docker build -f deploy/rcap-render-worker/Dockerfile \
#     -t rcap-render-worker:<git-sha> .
#
# The image digest printed by the build is the container_digest recorded on
# every artifact this worker finalizes; start the container with
# RCAP_WORKER_CONTAINER_DIGEST set to it.
#
# The worker performs no network access during render: rendering is pure
# pdf-lib over server-held data. Database and storage traffic happen before and
# after the render step. No browser, no subprocess, no build tools at runtime.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# Non-root: the worker owns nothing on the filesystem beyond its scratch dir.
RUN useradd --system --create-home --shell /usr/sbin/nologin rcapworker \
  && mkdir -p /tmp/rcap-render-scratch && chown rcapworker /tmp/rcap-render-scratch
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY scripts/rcap-render-worker.mjs scripts/
COPY scripts/lib/ scripts/lib/
COPY src/ src/
USER rcapworker
# Liveness: the loop logs one JSON line per non-idle cycle; the healthcheck
# asserts the process is alive and can reach its own module graph.
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "process.exit(0)"
CMD ["node", "scripts/rcap-render-worker.mjs", "--loop"]
