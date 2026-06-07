# LoveMenu 重新部署命令文档

这份文档用于后续服务器已经部署过 LoveMenu 后，重新拉取最新代码、安装依赖、迁移数据库、构建后台前端、构建后端并重启服务。

当前部署方式：

- 服务器：Ubuntu
- 后端目录：`/var/www/LoveMenuApp`
- 后端进程：PM2 管理，进程名 `lovemenu-server`
- 后端端口：`3001`
- Nginx 域名：`https://api.lovemenu.icu`
- API 地址：`https://api.lovemenu.icu/api`
- 后台域名：`https://admin.lovemenu.icu`
- 后台静态目录：`/var/www/LoveMenuApp/apps/admin/dist`
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
git fetch origin main
git reset --hard origin/main
```

说明：

- `origin` 是 GitHub 远程仓库。
- `main` 是当前主分支。
- 自动部署使用 `reset --hard`，会覆盖服务器上受 Git 管理文件的本地改动。
- 服务器上不要手动修改受 Git 管理的代码文件。
- `.env` 必须保持在 `.gitignore` 中，不要提交到 Git。

## 4. 安装或更新依赖

```bash
pnpm install --frozen-lockfile
```

说明：

- 如果 `package.json` 或 `pnpm-lock.yaml` 有变化，这一步会安装新依赖。
- 生产环境使用 `--frozen-lockfile`，要求 `pnpm-lock.yaml` 已提交并且和 `package.json` 一致。

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

## 7. 构建后台前端

```bash
pnpm --filter admin build
```

说明：

- 这一步会把后台管理系统构建到 `apps/admin/dist`。
- Nginx 的 `admin.lovemenu.icu` 需要指向这个目录。

## 8. 构建后端

```bash
pnpm --filter server build
```

说明：

- 这一步会把 NestJS 后端 TypeScript 代码构建到 `apps/server/dist`。
- 如果这里报错，先不要重启服务，需要先修复代码问题。

## 9. 重启 PM2 后端服务

```bash
pm2 restart lovemenu-server
```

说明：

- 这一步会重启后端，让最新构建的代码生效。

## 10. 保存 PM2 进程列表

```bash
pm2 save
```

说明：

- 保存当前 PM2 进程列表。
- 服务器重启后，PM2 会自动恢复这些进程。

## 11. 检查服务状态

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

## 12. 测试后端接口

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

## 13. 测试后台页面

测试后台域名：

```bash
curl -I https://admin.lovemenu.icu
```

正常情况下应该返回 `200`，并且浏览器打开后台页面刷新任意路径不应 404。

## 14. 后台 Nginx 配置要点

后台前端是 Vite 静态站点。Nginx 需要将 `admin.lovemenu.icu` 指向：

```text
/var/www/LoveMenuApp/apps/admin/dist
```

配置示例：

```nginx
server {
    server_name admin.lovemenu.icu;

    root /var/www/LoveMenuApp/apps/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

如果后台前端直接请求 `https://api.lovemenu.icu/api`，需要确认后端 CORS 允许 `https://admin.lovemenu.icu`。

## 15. 完整重新部署命令

如果只是常规更新代码，可以直接按顺序执行这一组：

```bash
ssh root@47.109.140.38
cd /var/www/LoveMenuApp
git fetch origin main
git reset --hard origin/main
pnpm install --frozen-lockfile
pnpm --filter server prisma:generate
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter admin build
pnpm --filter server build
pm2 restart lovemenu-server
pm2 save
pm2 status
curl https://api.lovemenu.icu/api/health
curl -I https://admin.lovemenu.icu
```

## 16. 后台一键部署配置

后台管理系统的“一键部署”不从 `.env` 读取部署配置，而是从后台页面保存的系统设置读取。

首次使用前，在后台进入：

```text
系统设置 -> 部署配置
```

填写：

- 部署脚本路径：`/var/www/LoveMenuApp/scripts/deploy-server.sh`
- 部署工作目录：`/var/www/LoveMenuApp`
- 部署超时时间：`600`
- 健康检查 URL：`http://127.0.0.1:3001/api/health`

也可以在服务器命令行初始化：

```bash
pnpm --filter server admin:set-deployment \
  /var/www/LoveMenuApp/scripts/deploy-server.sh \
  /var/www/LoveMenuApp \
  600 \
  http://127.0.0.1:3001/api/health
```

触发部署时，后台会先拉取 Git 分支和最近 commit 列表。管理员需要选择：

- Git 分支
- 要部署的 commit

后台不会默认部署最新代码。

部署日志通过 WebSocket 实时返回，日志格式类似：

```text
[10:20:01] 开始拉取代码
[10:20:03] 切换到 main 分支
[10:20:15] 安装依赖完成
[10:20:40] 构建成功
[10:20:45] 服务重启成功
```

## 17. 常见问题

### 17.1 Git 更新失败

如果提示服务器上有本地修改：

```bash
git status
```

先看清楚修改了哪些文件。通常不要直接覆盖 `.env`。

自动部署会使用 `git reset --hard origin/main`。如果服务器上有必须保留的本地修改，先备份或提交，不要直接部署覆盖。

### 17.2 后端启动失败

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

### 17.3 数据库连接失败

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

### 17.4 Nginx 访问 502

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

### 17.5 后台页面刷新 404

检查 `admin.lovemenu.icu` 的 Nginx 配置是否有：

```nginx
try_files $uri $uri/ /index.html;
```

### 17.6 HTTPS 证书检查

测试证书自动续期：

```bash
certbot renew --dry-run
```

查看证书：

```bash
certbot certificates
```

## 18. 移动端 API 地址

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
