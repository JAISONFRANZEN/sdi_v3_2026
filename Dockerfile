# Single shared stage: the frontend's tsc build resolves AppRouter via a
# relative type-only import into ../backend/src/routers, so both projects
# (with backend's node_modules, for full type resolution) must sit side by
# side in the same filesystem during the build — isolated builder stages
# don't have that sibling directory available.
FROM node:18-alpine AS builder
WORKDIR /app

COPY backend/package.json backend/package.json
RUN cd backend && npm install
COPY backend/ backend/
RUN cd backend && npm run build

COPY frontend/package.json frontend/package.json
RUN cd frontend && npm install
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Stage 2: Run the application
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/drizzle ./backend/drizzle
COPY --from=builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
EXPOSE 3000
# tsc preserva a subpasta src/ (rootDir "."), então o entrypoint compilado
# fica em dist/src/index.js, não dist/index.js.
# seed.ts é compilado para backend/dist/seed.js; popule com:
# docker compose exec app node backend/dist/seed.js
CMD ["node", "backend/dist/src/index.js"]
