# LoveMenu 后台管理系统方案

## 目标定位

LoveMenu 后台管理系统不是运营后台，也不是用户数据后台。它的定位是一个单人使用的维护控制台，用来减少手动维护成本。

后台只服务以下目标：

- 管理 App 的“关于我们”页面内容。
- 管理 App 版本发布和检查更新。
- 支持 Android APK 下载、安装更新流程。
- 从 Git 仓库读取最新代码，并一键部署到服务器。
- 查看部署日志。
- 记录和查看接口代码异常日志。

后台不做以下能力：

- 不做用户管理。
- 不做情侣数据管理。
- 不做数据分析。
- 不做内容审核。
- 不做多角色权限。
- 不展示聊天、经期、订单等私人业务数据。

## 总体架构

项目继续使用现有 monorepo：

```text
LoveMenuApp
├── apps
│   ├── mobile
│   ├── server
│   └── admin
├── docs
├── scripts
└── package.json
```

新增：

```text
apps/admin
```

用于后台 Web 页面。

扩展：

```text
apps/server/src/admin
apps/server/src/app-info
```

`app-info` 继续作为 App 读取“关于我们”和“检查更新”的公开接口。后台通过 `admin` 模块维护这些配置。

推荐技术栈：

- 后台前端：React + Vite + TypeScript
- 后台 UI：Ant Design
- 后台 API 请求：TanStack Query 或轻量 fetch 封装
- 后端：继续使用 NestJS
- ORM：继续使用 Prisma
- 数据库：继续使用 PostgreSQL
- APK 存储：优先复用现有阿里云 OSS
- 服务部署：服务器本地 shell 脚本 + PM2

后台访问地址建议：

```text
https://admin.lovemenu.icu
```

后端后台接口前缀：

```text
/api/admin/*
```

App 公开接口前缀保持：

```text
/api/app-info/*
```

## 后台页面

后台只有一个管理员角色。页面如下：

```text
登录
控制台首页
App 信息配置
版本发布
服务器部署
部署日志
接口错误日志
系统设置
```

### 登录

后台使用独立管理员账号，不复用普通 App 用户账号。

登录字段：

- 用户名
- 密码

登录成功后返回后台专用 JWT。

建议：

- JWT 有效期 12 小时。
- 密码使用 bcrypt 哈希。
- 登录失败不写接口错误日志，因为这是正常业务失败。
- 登录成功和失败写后台审计日志，便于排查异常访问。
- 第一个管理员账号通过服务端脚本初始化，不在公开接口中注册。

管理员初始化：

```text
pnpm --filter server admin:create-user
```

脚本能力：

- 创建第一个管理员账号。
- 修改指定管理员密码。
- 禁用或启用管理员账号。
- 输出一次性初始密码，要求首次登录后修改。
- 不通过 HTTP 暴露管理员创建接口。

### 控制台首页

首页只展示维护状态，不展示用户业务数据。

展示内容：

- 当前后台登录账号。
- 当前服务器运行环境。
- 当前 Git 分支。
- 当前 Git commit hash。
- 最近一次部署状态。
- 最近一次部署时间。
- 当前 Android 最新版本。
- 最近接口错误数量。

### App 信息配置

用于维护 App “关于我们”页面内容。

可配置字段：

- App 名称
- slogan
- 应用简介
- 公司名称
- 版权信息
- 联系邮箱
- 隐私政策 URL
- 用户协议 URL
- ICP 备案号
- 公安备案号
- 主要功能列表
- 是否显示检查更新入口

现有移动端 `AboutScreen` 已经会读取：

```text
GET /api/app-info/about
```

后续改造方向：

- 当前 `AppInfoService` 从环境变量读取。
- 改为优先从数据库读取。
- 数据库没有配置时，再使用默认值兜底。

### 版本发布

用于管理 App 新版本。

当前重点支持 Android。iOS 后续如果需要，建议走 TestFlight 或 App Store，不做 App 内 IPA 自动安装。

版本字段：

- 平台：android
- 版本名称：例如 `1.0.3`
- 构建号：例如 `103`
- APK 文件 URL
- APK 文件大小
- APK SHA256
- 更新标题
- 更新说明
- 是否强制更新
- 是否启用
- 发布时间

后台能力：

- 新增版本。
- 编辑版本。
- 保存草稿。
- 上传 APK。
- 启用某个版本。
- 停用某个版本。
- 查看版本列表。
- 查看下载地址。
- 复制下载地址。

同一平台建议只有一个启用版本。启用新版本时，自动停用同平台旧版本。

建议同一平台下 `build_number` 唯一，避免同一个构建号重复发布。

上传 APK 校验：

- 只允许上传 `.apk` 文件。
- 限制文件大小，例如第一版 300 MB。
- 不只信任 MIME，需要同时检查扩展名和文件头。
- 上传后由服务端计算 SHA256，并写入版本记录。
- 保存 OSS object key，下载 URL 可以按需生成或使用公开 URL。
- 上传失败时清理临时文件或未完成的 OSS 对象。
- 旧 APK 默认保留，后续可以增加手动删除或定期清理。

### App 检查更新

移动端调用：

```text
POST /api/app-info/version/check
```

请求：

```json
{
  "platform": "android",
  "current_version": "1.0.2",
  "build_number": "102"
}
```

响应：

```json
{
  "has_update": true,
  "latest_version": "1.0.3",
  "latest_build_number": "103",
  "force_update": false,
  "title": "发现新版本",
  "release_notes": ["优化使用体验", "修复已知问题"],
  "download_url": "https://...",
  "store_url": ""
}
```

版本判断优先使用 `build_number`，版本名称只用于展示。

判断规则：

- 当前构建号小于后台启用版本构建号，则有更新。
- 后台版本 `is_force_update = true`，则返回强制更新。
- 没有启用版本时，返回无更新。

### Android APK 下载和安装

移动端点击“立即更新”后的推荐流程：

1. App 请求检查更新接口。
2. 发现更新后展示更新弹窗。
3. 用户点击“立即更新”。
4. App 下载 APK。
5. 校验 SHA256。
6. 调用 Android 安装流程。
7. 如果没有安装未知来源权限，引导用户打开权限设置。

注意：

- Android 可以做 APK 下载和安装，但需要处理安装未知来源权限。
- 如果 App 未来上架 Google Play，更新方式需要重新评估。
- iOS 不支持普通 App 直接下载 IPA 并自动安装，必须走 Apple 认可的分发体系。

### 服务器部署

后台提供“一键部署服务器”按钮。

部署动作：

```text
读取 Git 仓库最新代码
安装依赖
生成 Prisma Client
执行数据库迁移
构建后台前端
构建后端
重启服务
健康检查
记录日志
```

后端不允许后台页面输入任意命令。部署命令固定写在服务器脚本中。

建议新增脚本：

```text
scripts/deploy-server.sh
```

脚本示例流程：

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/LoveMenuApp"
BRANCH="main"

cd "$APP_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
pnpm install --frozen-lockfile
pnpm --filter server prisma:generate
pnpm --filter server exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter admin build
pnpm --filter server build
pm2 restart lovemenu-server
curl --fail http://127.0.0.1:3001/api/health
```

后台接口只触发这个脚本：

```text
POST /api/admin/deployments
```

部署安全限制：

- 同一时间只能有一个部署任务。
- 触发部署需要管理员登录。
- 部署前弹出二次确认。
- 部署脚本路径固定。
- 不允许从请求参数传 shell 命令。
- Git 仓库访问使用 deploy key。
- 部署日志完整保存。
- 部署任务设置超时时间，例如 10 分钟。
- 如果服务重启时存在超时的 `running` 任务，自动标记为 `failed`。
- 部署后必须执行健康检查，健康检查失败则部署状态为 `failed`。

### 部署日志

后台展示部署记录。

列表字段：

- 部署 ID
- Git 分支
- 开始 commit
- 目标 commit
- 状态：running / success / failed
- 触发人
- 开始时间
- 结束时间
- 耗时

详情字段：

- 完整日志
- 错误摘要
- 执行步骤

部署状态：

```text
running
success
failed
cancelled
```

第一版可以不做取消部署。`cancelled` 作为预留状态。

部署异常恢复：

- 通过数据库中的 `running` 记录判断是否已有部署任务。
- 部署开始时记录进程 ID 或任务 ID。
- 后台服务启动时扫描超过超时时间的 `running` 部署记录，并写入失败摘要。
- 部署脚本输出需要按时间顺序追加到 `log_text`。
- 如果部署脚本执行失败，保留完整日志和最后一段错误摘要。

### 接口错误日志

接口错误日志只记录代码层面的异常，不记录正常业务失败。

记录：

- HTTP 500 及以上异常。
- 未捕获异常。
- Prisma 异常。
- 数据库连接异常。
- OSS、短信、OpenAI、推送等第三方 SDK 异常。
- 程序运行时异常。

不记录：

- 登录失败。
- 验证码错误。
- 密码错误。
- 参数校验失败。
- 用户未登录。
- 权限不足。
- 业务状态不允许操作。

实现方式：

- NestJS 增加全局异常过滤器。
- 只记录 `statusCode >= 500` 的异常。
- 明确的业务异常，如 `BadRequestException`、`UnauthorizedException`、`ForbiddenException` 不记录。
- 错误写入数据库后，接口仍按现有响应格式返回。

错误日志字段：

- requestId
- 请求方法
- 请求路径
- query 摘要
- body 摘要
- 当前用户 ID
- IP
- User-Agent
- 状态码
- 错误类型
- 错误消息
- stack
- 创建时间

敏感字段必须脱敏：

- password
- token
- authorization
- sms_code
- code
- phone
- new_phone
- email

后台错误日志页面支持：

- 列表查看。
- 详情查看。
- 按时间筛选。
- 按接口路径筛选。
- 按状态码筛选。
- 按错误类型筛选。
- 标记已处理。
- 删除或批量清理已处理日志。

实现补充：

- 增加 requestId 中间件。
- 如果请求头有 `x-request-id`，优先沿用。
- 如果没有，则服务端生成 requestId，并写入响应头。
- 错误日志建议默认保留 90 天，避免长期膨胀。

### 后台操作审计日志

后台操作审计日志记录管理员主动操作，不记录 App 普通用户行为。

需要记录：

- 登录成功。
- 登录失败。
- 修改关于我们配置。
- 新增、编辑、启用、停用 App 版本。
- 上传 APK。
- 触发服务器部署。
- 标记接口错误日志为已处理。
- 修改系统设置。

审计字段：

- 操作 ID
- 管理员 ID
- 管理员用户名
- 操作类型
- 操作对象类型
- 操作对象 ID
- 操作摘要
- 变更前摘要
- 变更后摘要
- IP
- User-Agent
- requestId
- 创建时间

敏感字段仍需要脱敏后再写入审计日志。

## 数据库设计

### AdminUser

```prisma
model AdminUser {
  id           BigInt    @id @default(autoincrement())
  username     String    @unique @db.VarChar(64)
  passwordHash String    @map("password_hash") @db.VarChar(256)
  displayName  String?   @map("display_name") @db.VarChar(64)
  status       String    @default("active") @db.VarChar(16)
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@map("admin_users")
}
```

### SystemSetting

```prisma
model SystemSetting {
  id          BigInt   @id @default(autoincrement())
  key         String   @unique @db.VarChar(128)
  valueJson   Json     @map("value_json")
  description String?
  updatedBy   BigInt?  @map("updated_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("system_settings")
}
```

用于保存：

- 关于我们配置。
- 系统配置。
- 部署脚本路径等固定配置。

说明：

- `updatedBy` 记录最后修改配置的管理员 ID。
- 第一版不强制保存完整配置历史，重要变更通过 `AdminAuditLog` 追踪。

### AppRelease

```prisma
model AppRelease {
  id                BigInt    @id @default(autoincrement())
  platform          String    @db.VarChar(16)
  versionName       String    @map("version_name") @db.VarChar(32)
  buildNumber       Int       @map("build_number")
  title             String    @db.VarChar(128)
  releaseNotes      Json      @map("release_notes")
  downloadUrl       String    @map("download_url") @db.VarChar(512)
  objectKey         String?   @map("object_key") @db.VarChar(512)
  fileSize          BigInt?   @map("file_size")
  sha256            String?   @db.VarChar(128)
  isForceUpdate     Boolean   @default(false) @map("is_force_update")
  isActive          Boolean   @default(false) @map("is_active")
  status            String    @default("draft") @db.VarChar(16)
  publishedAt       DateTime? @map("published_at")
  createdByAdminId  BigInt?   @map("created_by_admin_id")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@unique([platform, buildNumber])
  @@index([platform])
  @@index([platform, isActive])
  @@index([status])
  @@map("app_releases")
}
```

`status` 建议值：

```text
draft
published
archived
```

### DeployLog

```prisma
model DeployLog {
  id             BigInt    @id @default(autoincrement())
  status         String    @default("running") @db.VarChar(16)
  branch         String?   @db.VarChar(64)
  beforeCommit   String?   @map("before_commit") @db.VarChar(64)
  targetCommit   String?   @map("target_commit") @db.VarChar(64)
  startedBy      BigInt?   @map("started_by")
  processId      Int?      @map("process_id")
  logText        String?   @map("log_text")
  errorMessage   String?   @map("error_message")
  startedAt      DateTime  @default(now()) @map("started_at")
  finishedAt     DateTime? @map("finished_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([status])
  @@index([startedAt])
  @@map("deploy_logs")
}
```

### ApiErrorLog

```prisma
model ApiErrorLog {
  id           BigInt    @id @default(autoincrement())
  requestId    String?   @map("request_id") @db.VarChar(64)
  method       String    @db.VarChar(16)
  path         String    @db.VarChar(512)
  queryJson    Json?     @map("query_json")
  bodyJson     Json?     @map("body_json")
  userId       BigInt?   @map("user_id")
  ip           String?   @db.VarChar(64)
  userAgent    String?   @map("user_agent")
  statusCode   Int       @map("status_code")
  errorName    String?   @map("error_name") @db.VarChar(128)
  errorMessage String?   @map("error_message")
  errorStack   String?   @map("error_stack")
  isResolved   Boolean   @default(false) @map("is_resolved")
  resolvedAt   DateTime? @map("resolved_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@index([path])
  @@index([statusCode])
  @@index([createdAt])
  @@index([isResolved])
  @@map("api_error_logs")
}
```

### AdminAuditLog

```prisma
model AdminAuditLog {
  id             BigInt   @id @default(autoincrement())
  adminUserId    BigInt?  @map("admin_user_id")
  adminUsername  String?  @map("admin_username") @db.VarChar(64)
  action         String   @db.VarChar(64)
  targetType     String?  @map("target_type") @db.VarChar(64)
  targetId       String?  @map("target_id") @db.VarChar(64)
  summary        String?
  beforeJson     Json?    @map("before_json")
  afterJson      Json?    @map("after_json")
  ip             String?  @db.VarChar(64)
  userAgent      String?  @map("user_agent")
  requestId      String?  @map("request_id") @db.VarChar(64)
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([adminUserId])
  @@index([action])
  @@index([targetType])
  @@index([createdAt])
  @@map("admin_audit_logs")
}
```

## 后端接口设计

### 后台认证

```text
POST /api/admin/auth/login
GET  /api/admin/auth/session
POST /api/admin/auth/logout
```

管理员账号初始化不走 HTTP 接口，通过服务端 CLI 完成。

### 控制台

```text
GET /api/admin/dashboard/overview
```

返回：

- Git 分支。
- 当前 commit。
- 最近部署。
- 当前启用版本。
- 最近错误数量。

### App 信息

后台：

```text
GET  /api/admin/app-info/about
PUT  /api/admin/app-info/about
```

App：

```text
GET /api/app-info/about
```

### 版本发布

后台：

```text
GET    /api/admin/app-releases
POST   /api/admin/app-releases
GET    /api/admin/app-releases/:id
PUT    /api/admin/app-releases/:id
POST   /api/admin/app-releases/:id/activate
POST   /api/admin/app-releases/:id/deactivate
POST   /api/admin/app-releases/:id/archive
POST   /api/admin/app-releases/upload-apk
```

App：

```text
POST /api/app-info/version/check
```

### 部署

```text
POST /api/admin/deployments
GET  /api/admin/deployments
GET  /api/admin/deployments/:id
GET  /api/admin/deployments/current
```

### 接口错误日志

```text
GET   /api/admin/api-error-logs
GET   /api/admin/api-error-logs/:id
PATCH /api/admin/api-error-logs/:id/resolve
DELETE /api/admin/api-error-logs/resolved
DELETE /api/admin/api-error-logs/expired
```

### 后台审计日志

```text
GET /api/admin/audit-logs
GET /api/admin/audit-logs/:id
```

## 前端后台结构

```text
apps/admin
├── src
│   ├── api
│   ├── components
│   ├── layouts
│   ├── pages
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AppInfoPage.tsx
│   │   ├── ReleasesPage.tsx
│   │   ├── DeploymentsPage.tsx
│   │   ├── DeployLogDetailPage.tsx
│   │   ├── ApiErrorLogsPage.tsx
│   │   ├── ApiErrorLogDetailPage.tsx
│   │   └── SettingsPage.tsx
│   ├── router
│   └── main.tsx
├── package.json
└── vite.config.ts
```

UI 风格：

- 偏工具型后台。
- 左侧导航。
- 顶部显示当前环境和账号。
- 表格、表单、弹窗为主。
- 不做营销页和复杂视觉设计。

## 后台前端部署

后台前端作为静态站点部署，域名建议：

```text
https://admin.lovemenu.icu
```

构建命令：

```bash
pnpm --filter admin build
```

部署建议：

- Vite 构建产物输出到 `apps/admin/dist`。
- Nginx 将 `admin.lovemenu.icu` 指向后台静态目录。
- 后台接口继续请求 `https://api.lovemenu.icu/api/admin/*`。
- Nginx 对后台域名开启 HTTPS。
- 前端路由使用 history fallback，刷新页面仍回到 `index.html`。
- 一键部署脚本同时构建后台前端和后端。
- 如果后台静态文件部署在 `/var/www/LoveMenuApp/apps/admin/dist`，需要确认 Nginx 运行用户有读取权限。

后台前端环境变量：

```env
VITE_API_BASE_URL="https://api.lovemenu.icu/api"
```

## 安全设计

必须做：

- 后台接口全部要求管理员 JWT。
- 部署接口二次确认。
- 部署脚本路径固定。
- 后台不接收任意 shell 命令。
- 上传 APK 限制文件类型。
- 上传 APK 限制文件大小。
- 上传 APK 后计算 SHA256。
- 敏感请求字段脱敏后再写错误日志。
- 管理员密码哈希保存。
- 后台 Cookie 或 token 过期自动退出。
- 服务端 CORS 只允许后台域名和必要的 App 访问来源。
- 后台所有关键操作写审计日志。

建议做：

- 后台地址使用独立域名。
- 后台只允许 HTTPS。
- 可选配置 IP 白名单。
- 可选配置 Nginx basic auth 作为第二层保护。

## 移动端需要调整的点

现有 `AboutScreen` 已有检查更新弹窗，但目前点击更新只是打开 URL。

需要增强：

- 检查更新继续调用 `POST /api/app-info/version/check`。
- Android 有更新时，点击按钮下载 APK。
- 下载完成后校验 SHA256。
- 调起 Android 安装。
- 没有安装权限时，引导用户去系统设置授权。
- 强制更新时，弹窗不提供“稍后再说”。

类型字段建议统一为 snake_case，因为当前移动端类型已经偏向这种格式。

## 服务端需要调整的点

需要新增模块：

```text
apps/server/src/admin/auth
apps/server/src/admin/dashboard
apps/server/src/admin/app-info
apps/server/src/admin/app-releases
apps/server/src/admin/deployments
apps/server/src/admin/api-error-logs
apps/server/src/admin/audit-logs
```

需要扩展：

```text
apps/server/src/app-info
```

改造方向：

- `getAbout()` 从数据库读取配置。
- `checkVersion()` 从 `app_releases` 读取启用版本。
- 保留环境变量兜底，避免数据库未初始化时报错。

需要新增全局异常过滤器：

```text
ApiErrorLoggingFilter
```

并在 `main.ts` 注册。

需要新增全局 requestId 中间件：

```text
RequestIdMiddleware
```

并在响应头返回 `x-request-id`。

需要新增管理员初始化脚本：

```text
apps/server/src/admin/cli/create-admin-user.ts
```

脚本通过 Prisma 直接写入 `admin_users`，不暴露公网接口。

## 环境变量建议

新增：

```env
ADMIN_JWT_SECRET=""
ADMIN_JWT_EXPIRES_IN="12h"
ADMIN_DEPLOY_SCRIPT_PATH="/var/www/LoveMenuApp/scripts/deploy-server.sh"
ADMIN_DEPLOY_WORKDIR="/var/www/LoveMenuApp"
ADMIN_DEPLOY_TIMEOUT_SECONDS="600"
ADMIN_ALLOWED_ORIGIN="https://admin.lovemenu.icu"
ADMIN_AUDIT_LOG_RETENTION_DAYS="180"
API_ERROR_LOG_RETENTION_DAYS="90"
APK_MAX_SIZE_MB="300"
APK_PUBLIC_BASE_URL=""
VITE_API_BASE_URL="https://api.lovemenu.icu/api"
```

如果 APK 走 OSS，复用现有 OSS 配置即可。

## 交付完成标准

这套后台完成后，应满足：

- 可以登录后台。
- 可以通过 CLI 初始化第一个管理员并重置密码。
- 可以修改关于我们页面内容，App 打开后能看到新内容。
- 可以新增 Android 版本记录。
- 可以上传 APK 或填写 APK 下载地址。
- 上传 APK 后能看到文件大小和 SHA256。
- App 检查更新可以发现新版本。
- Android App 可以下载并触发安装 APK。
- 可以在后台点击一键部署。
- 部署过程有日志。
- 部署超时或脚本失败会标记失败并保存错误摘要。
- 部署成功后服务自动重启。
- 部署后健康检查通过。
- 代码异常会写入接口错误日志。
- 登录失败、验证码错误、参数错误等业务失败不会写入接口错误日志。
- 后台关键操作会写入审计日志。
- 后台前端可以通过 `https://admin.lovemenu.icu` 访问并刷新不 404。

## 最终使用流程

日常维护流程：

```text
1. 开发完成后 push 到 Git 仓库。
2. 打开 LoveMenu 后台。
3. 点击服务器部署。
4. 等待部署成功。
5. 如果有 App 新版本，进入版本发布。
6. 上传 APK 或填写 APK 地址。
7. 填写版本号、构建号、更新说明。
8. 启用新版本。
9. 用户在 App 关于我们页面点击检查更新。
10. App 弹出新版本，用户点击更新并安装。
```
