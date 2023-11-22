# Dockerfile
FROM node:18.18.2

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json /app/
COPY apps/nextjs apps/nextjs
COPY packages packages

RUN npm install -g pnpm@8.10.2 dotenv turbo && pnpm install

RUN turbo build

EXPOSE 3000

RUN turbo start