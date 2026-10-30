# ---------- build ----------
FROM node:24.14.0-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# prisma-client-js 生成到 node_modules/.prisma，prune 后仍会保留
RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev

# ---------- runtime ----------
FROM node:24.14.0-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
