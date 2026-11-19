# syntax=docker/dockerfile:1
# MAKEEN FM Portal — web image (deployed to its own server).
# Self-contained: build from THIS folder:  docker build -t makeen-web .
ARG NODE_IMAGE=node:24.22.3-alpine

# 1) Build the Next.js app (standalone server bundle).
FROM ${NODE_IMAGE} AS build
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit
COPY . .
RUN npm run build

# 2) Runtime: only the standalone server, static assets and public files; non-root.
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
