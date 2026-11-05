# 腾讯云 EdgeOne Pages 部署

PicForge 是 Vite 纯静态应用，可托管在腾讯云 EdgeOne Pages 的站点根路径。图片、Logo 和生成结果仍只在浏览器处理；部署不需要后端、数据库或业务密钥。

## 导入 Git 仓库

1. 在腾讯云 EdgeOne Pages 控制台创建项目，选择导入项目所在的 Git 仓库与需要发布的分支。
2. 根目录选择包含 `package.json` 和 `edgeone.json` 的目录，框架选择 **Vite**。
3. 使用仓库配置的安装命令、构建命令和输出目录。无需设置应用环境变量。
4. 由项目所有者在控制台确认部署，完成后使用平台提供的 HTTPS 地址访问。

| 配置项   | 值                                                                    |
| -------- | --------------------------------------------------------------------- |
| Node     | `.nvmrc` 中的 `24.18.0`，与 `.node-version` 保持一致                  |
| 安装命令 | `npm install --global pnpm@11.21.0 && pnpm install --frozen-lockfile` |
| 构建命令 | `pnpm build:edgeone`                                                  |
| 输出目录 | `dist`                                                                |

EdgeOne 的[构建指南](https://edgeone.cloud.tencent.com/pages/document/162936788693114880)说明，根目录有 `.nvmrc` 时会自动下载并切换 Node；下载的版本不自带包管理器。因此安装命令显式安装项目固定版本的 pnpm，不依赖平台预装版本或 Corepack。构建日志应显示 Node 24.18.0、pnpm 11.21.0；若 Node 下载失败，先排查平台构建日志，或使用下方本地构建上传方式。

`edgeone.json` 的构建设置优先于控制台相应设置，格式见[官方配置文档](https://edgeone.cloud.tencent.com/pages/document/162936771610066944)。`.nvmrc` 负责精确 Node 版本，不另设可能冲突的 `nodeVersion`。

## 本地构建后直接上传

在 Node 24.18.0 环境执行：

```bash
cd /root/PicForge
npm install --global pnpm@11.21.0
pnpm install --frozen-lockfile
pnpm build:edgeone
```

该命令先运行原有类型检查与生产构建，再将响应头配置写入 `dist/edgeone.json`。普通 `pnpm build` 继续用于通用静态部署和 Docker；需要上传 EdgeOne 的产物时使用 `build:edgeone`。

在 EdgeOne Pages 创建项目时选择直接上传，上传整个 `dist/` 文件夹。也可以将 **dist 内部的文件**压缩成 ZIP 后上传，确保解压后 `index.html` 位于根层级，而非 `dist/index.html`。

上传目录结构如下，所有 `assets/` 文件必须完整保留：

```text
index.html
404.html
edgeone.json
favicon.svg
third-party-licenses.txt
assets/
  index-<hash>.js
  index-<hash>.css
  render.worker-<hash>.js
  ...编码器 JS、WASM 与其他带哈希的模块
```

不要上传源码目录或只上传入口 HTML。根目录配置含构建命令；产物配置仅含响应头，因为[直接上传的配置只支持 redirects、rewrites、headers](https://pages.edgeone.ai/document/direct-upload)。两者由同一个根配置生成，避免手动维护两套安全策略。

直接上传项目与 Git 集成项目是不同的创建方式；官方文档说明直接上传项目不能直接切换为 Git 集成，需要新建项目。

## 路由、缓存与编码器

- 工具使用 `/#watermark`、`/#transform`、`/#convert`、`/#batch`，hash 不发送给服务器。刷新这些地址只请求根入口，无需配置 `/* → /index.html` 的全路径回退。
- `public/404.html` 随构建复制到输出根目录，供平台在路径不存在时返回。PicForge 不使用 History 路由，因此无需依赖 SPA 的路径回退。发布后需确认缺失 `.js` / `.wasm` 返回 **404**，不能返回首页或 200。
- 默认响应头为 `Cache-Control: no-cache`，`/assets/*` 的带哈希产物覆盖为 `public, max-age=31536000, immutable`。入口和非哈希文件需要重新验证缓存，更新后不会因入口被长期缓存而引用旧模块。边缘缓存沿用平台部署失效机制，不额外固定缓存时长。
- CSP 与现有 Nginx 一致：允许本站模块 Worker、Blob 图片、按需下载和编译本站 WASM；`script-src` 使用 `wasm-unsafe-eval`。编码器是单线程，不要求 COOP/COEP。
- 保留 `X-Content-Type-Options: nosniff` 和 `Referrer-Policy: no-referrer`。平台应正确提供 JS 与 `application/wasm` MIME；不要把所有静态文件强制改成 HTML 或统一 MIME。

自定义 404 的平台行为参考[官方说明](https://pages.edgeone.ai/document/custom-404-page)。本项目以根路径部署；如果要为现有站点的子路径接入 EdgeOne，应单独核对反向代理映射和响应头匹配路径。

## 验证与上线核对

本地执行构建及与静态交付相关的浏览器检查：

```bash
pnpm build:edgeone
pnpm lint
pnpm format:check
pnpm exec playwright test tests/e2e/codec-delivery.spec.ts
```

浏览器用例在本机生产预览上注入 Nginx / EdgeOne 的 CSP，分别验证真实 Worker 编码探测、AVIF WASM 按需加载、下载失败后的重新检测与真实导出。这属于本地配置兼容性验证，不能证明腾讯云构建环境或 CDN 已正确应用配置。

实际部署后，在目标 HTTPS 域名完成以下检查：

1. 根入口和各 `/#...` 工具地址能打开并刷新；响应头包含 CSP、`nosniff` 与入口 `no-cache`。
2. 开发者工具中主 JS、CSS、Worker 和 WASM 均来自本站，返回 200 和正确 MIME；带哈希资源具有长期缓存头。
3. 首次选择 PNG 不请求 WASM；切换 AVIF 后可以加载本站编码器，导出图片可重新打开。浏览器原生不支持 WebP 编码时，其降级编码器也应可加载。
4. 随机不存在的路径、`/assets/not-found.js` 和 `/assets/not-found.wasm` 返回 404；检查失败响应未被 CDN 长期缓存。
5. 在图片拼接与批量工具各完成一次下载，确认没有图片上传请求。

需要对线上地址执行既有浏览器用例时，可用项目已支持的 `PICFORGE_TEST_URL` 指定完整 HTTPS 地址；响应头仍应通过浏览器网络面板或 `curl --head` 独立核对。

本轮没有创建云项目、绑定域名或执行线上部署。具体本地执行结果记录于[验收记录](verification.md)。
