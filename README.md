# LoveMenu

LoveMenu 是一个面向情侣共同生活场景的前后端分离应用。项目包含移动端 App 和后端 API，支持菜单、点单、纪念日、情侣绑定、聊天、空间动态、经期记录与预测等功能。

## 项目介绍

LoveMenu 是一款为情侣设计的共同生活管理 App，核心目标是把两个人日常相处中的小事变得更有仪式感、更好协作。它不仅是一个点餐或菜单工具，而是围绕情侣关系构建的一套轻量生活空间。

在 LoveMenu 中，双方可以完成情侣绑定，管理彼此喜欢的菜单，发起点单请求，记录订单状态和反馈；也可以维护纪念日、发布空间动态、进行聊天互动。应用还加入了经期记录与预测功能，帮助伴侣更温柔地理解对方的身体状态和生活节奏。

项目采用前后端分离架构，移动端基于 Expo 和 React Native 开发，后端使用 NestJS、Prisma 和 PostgreSQL 构建。整体设计偏向温暖、轻量、陪伴感，适合用作情侣生活类 App、React Native 全栈项目、NestJS API 服务和 Prisma 数据建模的实践项目。

## 技术栈

- 移动端：Expo + React Native + TypeScript + Zustand + React Navigation
- 服务端：NestJS + Prisma + PostgreSQL
- 文件存储：阿里云 OSS
- 包管理：pnpm workspace

## 目录结构

```text
LoveMenuApp
├── apps
│   ├── mobile      # Expo / React Native 移动端
│   └── server      # NestJS 后端服务
├── docs            # 项目文档
├── scripts         # 辅助脚本
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## 环境要求

- Node.js 22 LTS，推荐使用长期支持版本
- pnpm 9.15.9
- PostgreSQL 16，推荐用于本地和服务器部署
- Android Studio / Expo CLI，本地运行移动端时需要

启用 pnpm：

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

## 安装依赖

在项目根目录执行：

```bash
pnpm install
```

## 后端配置

复制后端环境变量示例文件：

```bash
cp apps/server/.env.example apps/server/.env
```

`.env` 示例：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lovemenu?schema=public"
PORT=3001

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

配置说明：

- `DATABASE_URL` 是必填项，用于连接 PostgreSQL 数据库。
- `PORT` 是后端监听端口，当前部署环境使用 `3001`。
- `OPENAI_API_KEY` 可选。如果不配置，AI 经期分析会自动退回基础预测结果。
- OSS 相关配置用于图片和语音上传功能。如果不配置，上传相关接口会不可用。

## 数据库初始化

生成 Prisma Client：

```bash
pnpm --filter server prisma:generate
```

本地开发环境执行数据库迁移：

```bash
pnpm --filter server prisma:migrate
```

生产环境执行数据库迁移：

```bash
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
```

注意：生产环境建议使用 `migrate deploy`，不要使用 `migrate dev`。

## 本地开发

启动后端服务：

```bash
pnpm server
```

启动移动端：

```bash
pnpm mobile
```

启动 Android：

```bash
pnpm android
```

移动端会读取下面这个环境变量作为 API 地址：

```bash
EXPO_PUBLIC_API_BASE_URL
```

Android 模拟器本地开发时，默认 API 地址是：

```text
http://10.0.2.2:3001/api
```

如果是真机测试或生产环境，需要显式指定公网 API 地址：

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api pnpm --filter lovemenu-mobile start
```

当前线上 API 地址：

```text
https://api.lovemenu.icu/api
```

## 构建检查

构建后端：

```bash
pnpm --filter server build
```

检查移动端 TypeScript：

```bash
pnpm --filter lovemenu-mobile exec tsc --noEmit
```

导出 Android 移动端 bundle，用于检查 Expo 打包是否正常：

```bash
pnpm --filter lovemenu-mobile exec expo export --platform android
```

## 生产部署示例

推荐部署方式：

- PostgreSQL 和 NestJS 后端部署在同一台 Linux 服务器
- 使用 PM2 管理后端进程
- 使用 Nginx 做反向代理
- 使用 HTTPS 域名访问后端 API
- 移动端通过公网 API 地址访问后端

### 1. 安装服务器依赖

```bash
sudo apt update
sudo apt install -y git curl nginx postgresql postgresql-contrib
```

### 2. 创建数据库

进入 PostgreSQL：

```bash
sudo -u postgres psql
```

创建数据库用户和数据库：

```sql
CREATE USER lovemenu_user WITH PASSWORD 'replace_with_strong_password';
CREATE DATABASE lovemenu OWNER lovemenu_user;
GRANT ALL PRIVILEGES ON DATABASE lovemenu TO lovemenu_user;
\q
```

生产环境 `.env` 中可以这样配置：

```env
DATABASE_URL="postgresql://lovemenu_user:replace_with_strong_password@127.0.0.1:5432/lovemenu?schema=public"
PORT=3001
```

### 3. 安装依赖、迁移数据库并构建

```bash
pnpm install
pnpm --filter server prisma:generate
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter server build
```

### 4. 启动后端

临时启动，用于测试：

```bash
pnpm --filter server start:prod
```

健康检查：

```bash
curl http://127.0.0.1:3001/api/health
```

使用 PM2 常驻运行：

```bash
npm install -g pm2
pm2 start "pnpm --filter server start:prod" --name lovemenu-server
pm2 save
pm2 startup
```

### 5. 配置 Nginx 反向代理

以 `api.example.com` 为例：

```nginx
server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置 HTTPS 证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

重新部署和服务器更新命令见：[docs/deploy.md](docs/deploy.md)。

## GitHub 发布前建议

- 不要提交 `.env` 文件。
- 仓库中只保留 `.env.example` 示例文件。
- 构建正式 App 前，需要配置 Android `package` 和 iOS `bundleIdentifier`。
- 真机测试和生产环境建议使用 HTTPS API 地址。
- 测试上传功能前，需要先配置 OSS 访问凭证。
