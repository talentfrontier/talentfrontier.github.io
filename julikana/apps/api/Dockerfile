# ── Build stage ─────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspaces --include-workspace-root || npm install --workspaces --include-workspace-root
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm --workspace @julikana/api run prisma:generate \
 && npm --workspace @julikana/api run build

# ── Runtime stage ───────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 4000
USER node
CMD ["node", "dist/main.js"]
