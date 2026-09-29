FROM node:26-slim AS build

WORKDIR /app

RUN npm install --global pnpm@12.8.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
RUN pnpm install --frozen-lockfile --filter backend...

COPY backend backend
RUN pnpm --filter backend build

FROM node:26-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/backend/package.json backend/package.json
COPY --from=build /app/backend/node_modules backend/node_modules
COPY --from=build /app/backend/dist backend/dist

WORKDIR /app/backend
CMD ["node", "dist/index.js"]
