#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${ADMIN_DEPLOY_WORKDIR:-/var/www/LoveMenuApp}"
BRANCH="${ADMIN_DEPLOY_BRANCH:-main}"
TARGET_REF="${ADMIN_DEPLOY_REF:-origin/$BRANCH}"
HEALTH_URL="${ADMIN_DEPLOY_HEALTH_URL:-http://127.0.0.1:3001/api/health}"

log() {
  printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$1"
}

cd "$APP_DIR"
log "开始拉取代码"
git fetch origin "$BRANCH"
log "切换到 $BRANCH 分支"
git checkout -B "$BRANCH" "origin/$BRANCH"
log "切换到 ${TARGET_REF} 版本"
git reset --hard "$TARGET_REF"
log "开始安装依赖"
pnpm install --frozen-lockfile
log "安装依赖完成"
log "生成 Prisma Client"
pnpm --filter server prisma:generate
log "执行数据库迁移"
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
log "开始构建后台"
pnpm --filter admin build
log "开始构建后端"
pnpm --filter server build
log "构建成功"
pm2 restart lovemenu-server
log "服务重启成功"
pm2 save
log "开始健康检查"
curl --fail "$HEALTH_URL"
log "健康检查通过"
