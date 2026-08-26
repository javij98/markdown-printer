FROM node:22-alpine AS frontend-builder

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile
RUN pnpm rebuild esbuild

COPY . .

RUN pnpm build


FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY server/package.json ./server/package.json

RUN cd server && npm install --omit=dev

COPY server/server.mjs ./server/server.mjs

COPY --from=frontend-builder /app/dist ./public

EXPOSE 3000

CMD ["node", "server/server.mjs"]
