FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile
RUN pnpm rebuild esbuild

COPY . .

RUN pnpm build


FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/ /usr/share/nginx/html/print/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
