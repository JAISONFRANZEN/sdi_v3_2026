# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 3: Run the application
FROM node:18-alpine
WORKDIR /app
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/package.json
COPY --from=backend-builder /app/backend/drizzle ./backend/drizzle
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
EXPOSE 3000
# seed.ts é compilado para backend/dist/seed.js pelo `npm run build` (incluído
# no tsconfig do backend); popule com: docker compose exec app node backend/dist/seed.js
CMD ["node", "backend/dist/index.js"]
