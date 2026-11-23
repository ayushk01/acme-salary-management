# syntax=docker/dockerfile:1

# Build stage: install everything, compile the server, bundle the React app.
FROM node:26-slim AS build
WORKDIR /app

# Copy manifests first so the dependency layer is cached independently of
# source changes. npm ci needs every workspace manifest, not just the root.
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
# --ignore-scripts: see the note in the runtime stage. better-sqlite3's
# install script is node-gyp rebuild, which needs python3 and a compiler
# that this image does not carry, and the package ships prebuilt binaries
# that make the build unnecessary.
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Runtime stage: production dependencies and build output only.
FROM node:26-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
# --ignore-scripts because better-sqlite3's install script falls back to
# node-gyp here, which would need python3 and a toolchain in the runtime
# image. The package ships prebuilt binaries (linux-arm64, linux-x64 and
# more), so the script has nothing useful to do and the native module loads
# fine without it.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web/dist

# The host supplies PORT; 3000 is the local default.
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
