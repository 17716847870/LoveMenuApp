# LoveMenu 重新部署命令文档

这份文档用于后续服务器已经部署过 LoveMenu 后，重新拉取最新代码、安装依赖、迁移数据库、构建并重启后端服务。

当前部署方式：

- 服务器：Ubuntu
- 后端目录：`/var/www/LoveMenuApp`
- 后端进程：PM2 管理，进程名 `lovemenu-server`
- 后端端口：`3001`
- Nginx 域名：`https://api.lovemenu.icu`
- API 地址：`https://api.lovemenu.icu/api`
- 数据库：PostgreSQL，和后端部署在同一台服务器

## 1. 登录服务器

在本地电脑终端执行：

```bash
ssh root@47.109.140.38
```

## 2. 进入项目目录

登录服务器后执行：

```bash
cd /var/www/LoveMenuApp
```

## 3. 拉取 GitHub 最新代码

```bash
git pull origin main
```

说明：

- `origin` 是 GitHub 远程仓库。
- `main` 是当前主分支。
- 如果本地服务器代码没有被手动改过，这一步通常会直接成功。

## 4. 安装或更新依赖

```bash
pnpm install
```

说明：

- 如果 `package.json` 或 `pnpm-lock.yaml` 有变化，这一步会安装新依赖。
- 如果依赖没有变化，也可以执行，通常不会有问题。

## 5. 生成 Prisma Client

```bash
pnpm --filter server prisma:generate
```

说明：

- 后端使用 Prisma 访问数据库。
- 每次更新数据库模型后，都建议执行一次。

## 6. 执行数据库迁移

```bash
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
```

说明：

- 生产环境使用 `migrate deploy`。
- 不要在服务器生产环境使用 `prisma migrate dev`。
- 如果没有新的 migration，这一步会提示数据库已经是最新状态。

## 7. 构建后端

```bash
pnpm --filter server build
```

说明：

- 这一步会把 NestJS 后端 TypeScript 代码构建到 `apps/server/dist`。
- 如果这里报错，先不要重启服务，需要先修复代码问题。

## 8. 重启 PM2 后端服务

```bash
pm2 restart lovemenu-server
```

说明：

- 这一步会重启后端，让最新构建的代码生效。

## 9. 保存 PM2 进程列表

```bash
pm2 save
```

说明：

- 保存当前 PM2 进程列表。
- 服务器重启后，PM2 会自动恢复这些进程。

## 10. 检查服务状态

```bash
pm2 status
```

确认 `lovemenu-server` 状态是：

```text
online
```

查看日志：

```bash
pm2 logs lovemenu-server
```

如果只想看最近日志，可以按 `Ctrl + C` 退出日志界面。

## 11. 测试后端接口

先测试服务器本机端口：

```bash
curl http://127.0.0.1:3001/api/health
```

再测试公网 HTTPS 域名：

```bash
curl https://api.lovemenu.icu/api/health
```

正常返回类似：

```json
{"name":"LoveMenu API","status":"ok","timestamp":"2026-06-05T04:11:10.095Z"}
```

## 12. 完整重新部署命令

如果只是常规更新代码，可以直接按顺序执行这一组：

```bash
ssh root@47.109.140.38
cd /var/www/LoveMenuApp
git pull origin main
pnpm install
pnpm --filter server prisma:generate
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter server build
pm2 restart lovemenu-server
pm2 save
pm2 status
curl https://api.lovemenu.icu/api/health
```

## 13. 常见问题

### 13.1 Git pull 失败

如果提示服务器上有本地修改：

```bash
git status
```

先看清楚修改了哪些文件。通常不要直接覆盖 `.env`。

如果只是误改了非重要文件，可以确认后再处理。

### 13.2 后端启动失败

查看日志：

```bash
pm2 logs lovemenu-server
```

常见原因：

- `.env` 配置错误
- 数据库没有启动
- `DATABASE_URL` 不正确
- Prisma migration 没有执行
- 端口被占用

### 13.3 数据库连接失败

检查 PostgreSQL 状态：

```bash
systemctl status postgresql
```

重启 PostgreSQL：

```bash
systemctl restart postgresql
```

测试数据库连接：

```bash
psql -h 127.0.0.1 -U lovemenu_user -d lovemenu
```

### 13.4 Nginx 访问 502

先确认后端本机端口是否正常：

```bash
curl http://127.0.0.1:3001/api/health
```

如果本机正常，再检查 Nginx：

```bash
nginx -t
systemctl reload nginx
```

查看 Nginx 配置：

```bash
cat /etc/nginx/sites-available/lovemenu-api
```

确认里面转发到：

```nginx
proxy_pass http://127.0.0.1:3001;
```

### 13.5 HTTPS 证书检查

测试证书自动续期：

```bash
certbot renew --dry-run
```

查看证书：

```bash
certbot certificates
```

## 14. 移动端 API 地址

移动端正式环境使用：

```text
https://api.lovemenu.icu/api
```

本地启动移动端时可以这样指定：

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.lovemenu.icu/api pnpm --filter lovemenu-mobile start
```

如果后续打包 App，也需要确保打包时环境变量是：

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.lovemenu.icu/api
```
