# LoveMenu

LoveMenu 是一个面向情侣共同生活场景的前后端分离应用。项目包含移动端 App 和后端 API，支持菜单、点单、纪念日、情侣绑定、聊天、空间动态、经期记录与预测等功能。

## 项目介绍

LoveMenu 是一款为情侣设计的共同生活管理 App，核心目标是把两个人日常相处中的小事变得更有仪式感、更好协作。它不仅是一个点餐或菜单工具，而是围绕情侣关系构建的一套轻量生活空间。

在 LoveMenu 中，双方可以完成情侣绑定，管理彼此喜欢的菜单，发起点单请求，记录订单状态和反馈；也可以维护纪念日、发布空间动态、进行聊天互动。应用还加入了经期记录与预测功能，帮助伴侣更温柔地理解对方的身体状态和生活节奏。

项目采用前后端分离架构，移动端基于 Expo 和 React Native 开发，后端使用 NestJS、Prisma 和 PostgreSQL 构建。整体设计偏向温暖、轻量、陪伴感，适合用作情侣生活类 App、React Native 全栈项目、NestJS API 服务和 Prisma 数据建模的实践项目。

## 技术栈

- Mobile: Expo + React Native + TypeScript + Zustand + React Navigation
- Server: NestJS + Prisma + PostgreSQL
- Storage: Aliyun OSS
- Package manager: pnpm workspace

## 目录结构

```text
LoveMenuApp
├── apps
│   ├── mobile      # Expo / React Native App
│   └── server      # NestJS API service
├── docs
├── scripts
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## 环境要求

- Node.js 22 LTS recommended
- pnpm 9.15.9
- PostgreSQL 16 recommended
- Expo CLI / Android Studio, if running the mobile app locally

Enable pnpm with Corepack:

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

## 安装依赖

```bash
pnpm install
```

## 后端配置

Copy the environment file:

```bash
cp apps/server/.env.example apps/server/.env
```

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lovemenu?schema=public"
PORT=3000

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
OPENAI_BASE_URL="https://api.openai.com/v1"

OSS_REGION=""
OSS_ACCESS_KEY_ID=""
OSS_ACCESS_KEY_SECRET=""
OSS_BUCKET=""
OSS_PUBLIC_BASE_URL=""
OSS_UPLOAD_URL_EXPIRES_SECONDS=600
OSS_READ_URL_EXPIRES_SECONDS=3600
```

Notes:

- `DATABASE_URL` is required.
- `OPENAI_API_KEY` is optional. If it is empty, AI-enhanced period insight falls back to base prediction.
- OSS variables are required for image and voice upload features.

## 数据库初始化

Generate Prisma Client:

```bash
pnpm --filter server prisma:generate
```

For local development:

```bash
pnpm --filter server prisma:migrate
```

For production deployment:

```bash
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
```

## 本地开发

Start the server:

```bash
pnpm server
```

Start the mobile app:

```bash
pnpm mobile
```

Start Android:

```bash
pnpm android
```

The mobile app reads the API endpoint from:

```bash
EXPO_PUBLIC_API_BASE_URL
```

For Android emulator local development, the default value is:

```text
http://10.0.2.2:3001/api
```

For deployment or real-device testing, set it explicitly:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api pnpm --filter lovemenu-mobile start
```

## 构建检查

Server build:

```bash
pnpm --filter server build
```

Mobile TypeScript check:

```bash
pnpm --filter lovemenu-mobile exec tsc --noEmit
```

Mobile export check:

```bash
pnpm --filter lovemenu-mobile exec expo export --platform android
```

## 生产部署示例

The recommended deployment shape is:

- PostgreSQL and NestJS server on the same Linux server
- Nginx reverse proxy
- HTTPS domain for the API
- Mobile app points to the public API URL

### 1. Install system dependencies

```bash
sudo apt update
sudo apt install -y git curl nginx postgresql postgresql-contrib
```

### 2. Create database

```bash
sudo -u postgres psql
```

```sql
CREATE USER lovemenu_user WITH PASSWORD 'replace_with_strong_password';
CREATE DATABASE lovemenu OWNER lovemenu_user;
GRANT ALL PRIVILEGES ON DATABASE lovemenu TO lovemenu_user;
\q
```

Use this in production `.env`:

```env
DATABASE_URL="postgresql://lovemenu_user:replace_with_strong_password@127.0.0.1:5432/lovemenu?schema=public"
PORT=3000
```

### 3. Build and migrate

```bash
pnpm install
pnpm --filter server prisma:generate
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter server build
```

### 4. Run the server

For a quick smoke test:

```bash
pnpm --filter server start:prod
```

Health check:

```bash
curl http://127.0.0.1:3000/api/health
```

For a persistent process, use PM2:

```bash
npm install -g pm2
pm2 start "pnpm --filter server start:prod" --name lovemenu-server
pm2 save
pm2 startup
```

### 5. Nginx reverse proxy

Example for `api.example.com`:

```nginx
server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then enable HTTPS with Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

## GitHub 发布前建议

- Do not commit `.env` files.
- Keep only `.env.example` in the repository.
- Configure Android `package` and iOS `bundleIdentifier` before building release apps.
- Use HTTPS API URLs for real-device testing and production builds.
- Make sure OSS credentials are configured before testing upload features.
