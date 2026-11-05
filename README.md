# PicForge

一个在浏览器本地处理图片的工具箱。无需账户和上传接口，选择图片、拼接、水印、裁剪缩放或转换格式，预览后下载。

当前源码已实现 [项目方案](docs/project-plan.md) 的 **V1.0–V2.0**：图片拼接、水印、图片处理、格式转换和批量工具。具体测试与真机验证边界见 [验收记录](docs/verification.md)。

## 已实现

- 静态 JPEG / PNG / WebP / AVIF 多图导入，支持选择、拖入和浏览器提供图片文件时的粘贴；按实际文件内容识别格式。AVIF 仅接受通过容器预检的静态直接编码主图。
- 预检格式、动画标记、体积与源像素，拒绝 APNG、动态 WebP、损坏文件及超限图片；错误逐项展示。
- 三种布局：统一高度的横向、统一宽度的纵向、规则宫格。支持完整显示、中心裁切、间距、外边距和背景。
- 缩略列表、拖动手柄排序、键盘可用的上下移动、移除、确认清空。
- 实时预览、适应窗口及缩放；PNG 透明导出、JPEG 底色和质量、文件命名、实际文件体积。
- 按原图重绘导出；取消、失败重试、尺寸减半；旧预览和已取消任务不会触发过期结果。
- Worker / OffscreenCanvas 往返能力探测，失败时本机主线程降级；逐张解码和显式资源释放。
- 响应式中文工作台、轻量偏好保存、本地生成的原创示例图片；禁用存储不影响使用。
- 文字和图片水印：中文文字、系统黑体/宋体、颜色、九宫格位置、相对大小、不透明度、旋转、平铺与间距。
- 批量水印：逐张生成 PNG/JPEG、结果体积、逐项下载、取消保留成功项、失败单项重试；编辑期间使用点击生成时的配置快照。
- 顶部导航切换拼接与水印，共用会话素材，各自保留参数；水印也支持直接访问 `/#watermark`。已生成结果在清空素材后仍可下载。
- 图片处理 `/#transform`：自由/固定比例裁剪、拖动选区与数值输入、等比/自由缩放、90° 旋转与翻转、JPEG 压缩和底色；显示实际输出尺寸、字节及体积增减。
- 格式转换 `/#convert`：PNG / JPEG / WebP / AVIF；编码往返能力检测，必要时按需加载本站托管的 WASM 编码器，核对 MIME、签名与重新解码尺寸。
- 批量工具 `/#batch`：按序执行裁剪、缩放、方向、水印与编码；可逐步启用，支持取消、失败/取消项原快照重试、命名规则、成功项 ZIP 下载。
- 版本化模板：保存至当前浏览器，或导出/导入 JSON 迁移；参数严格校验，图片水印模板需重新选择本地 Logo。

## 图片处理、转换与批量

“图片处理”只生成当前预览图；多张图片应用同一组操作时使用“批量工具”。裁剪基于方向归一化后的原图，固定比例在选区内居中裁切；先裁剪和缩放，按原图坐标翻转后旋转，最后在最终方向绘制水印。PNG 没有质量滑块；减小像素或选择 JPEG/WebP/AVIF 可进行有损压缩，文件可能变大，生成后如实显示。

格式转换逐张保留原始尺寸。AVIF 原图/输出超过预算时，可在批量工具启用缩放再选择 AVIF。AVIF 首次使用约加载 3.49 MB 编码器（未压缩），WebP 需要降级时约 281 KB；均由本站静态文件提供。AVIF 输入拒绝动画、网格主图和带容器旋转/镜像/显示裁切的文件，并依赖当前浏览器解码能力。

结果不会自动保存到磁盘。生成后逐项下载，或使用“下载成功项 ZIP”。ZIP 采用存储模式，保持各图片字节不变；取消打包保留图片结果。重新生成会替换本工具旧结果，清空素材仍保留已生成结果；清空结果释放对应 Blob。每次任务按点击时的参数与素材快照执行。

命名支持 `{name}` 和 `{index}`，自动清理路径字符、截断长度并去重。模板最多保存 10 份，JSON 最大 64 KiB；仅保存参数和水印文字，不包含原图、Logo 或结果。禁用浏览器存储时仍可导出/导入模板文件。

## 使用图片水印

打开“图片水印”，添加素材，再输入署名或选择本地 Logo。位置与大小会按每张图片调整，中央选择框可以切换预览。点击“生成水印图片”，在结果列表逐项下载；单项重试使用该批次原配置，修改参数后使用“重新生成全部”。重新生成会替换旧结果。

图片水印建议使用透明 PNG。PNG 保留透明区域，JPEG 用白色填充透明区域。水印保持原始像素尺寸，超出输出预算时需要先缩小原图后重新导入；文字预览与导出等待同一页面的系统字体，不新增远程字体。

## 开发

固定环境：Node **24.18.0**、pnpm **11.21.0**、TypeScript **7.0.2**。Node 最低要求 22.12，锁文件和依赖版本已固定。

```bash
cd /root/PicForge
npm install --global pnpm@11.21.0
pnpm install --frozen-lockfile
pnpm dev
```

访问终端打印的地址，通常为 `http://localhost:5173`。

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e
```

`test:e2e` 先构建，再对生产产物运行三种浏览器测试。首次运行还需满足 Playwright 的系统依赖。测试截图、HTML 报告、性能数据分别保存在 `test-results/`、`playwright-report/`、`test-results/performance.json`。

## 静态构建

```bash
pnpm build
pnpm preview
```

将 `dist/` 放到 HTTPS 静态服务器。生产环境不需要 Node 服务、数据库或上传存储。构建采用相对资源路径；子路径托管时需要将整个 `dist/` 映射到该目录，入口地址使用末尾斜杠。直接双击 `index.html` 的 `file://` 模式不受支持。

入口 HTML 不应长期缓存，带哈希的 `assets/` 可长期缓存；缺失静态文件应返回 404。内置 Nginx 配置已实现这些规则。

## 腾讯云 EdgeOne Pages

支持导入 Git 仓库构建，以及直接上传本地构建产物。仓库根目录的 `edgeone.json` 已配置安装命令、构建命令、`dist` 输出目录、缓存和安全响应头；`.nvmrc` 固定 Node 24.18.0，安装时显式使用 pnpm 11.21.0。

在 EdgeOne Pages 创建项目并导入仓库，根目录选择本项目目录，框架选择 Vite，使用配置中的 `pnpm build:edgeone` 和 `dist`。直接上传时先执行：

```bash
pnpm install --frozen-lockfile
pnpm build:edgeone
```

上传整个 `dist/` 文件夹，其根目录包含 `index.html`、`404.html` 和仅含运行时响应头的 `edgeone.json`。所有工具使用 `/#...` 路由，无需添加全路径回退。配置保留 Worker 与本站 WASM 编码能力，图片继续在浏览器本地处理。

详细步骤和上线核对见 [EdgeOne Pages 部署说明](docs/edgeone-pages.md)。本仓库提供部署支持，本轮未创建腾讯云项目或执行线上部署。

## Docker 镜像

```bash
cd /root/PicForge
docker compose -f docker-compose.yaml up -d --build
docker compose -f docker-compose.yaml ps
```

访问 `http://服务器地址:8080`。修改 Compose 的端口映射可更换宿主机端口；公网 HTTPS 由现有反向代理提供。

镜像采用 Node 构建、Nginx 静态运行，两种基础镜像均固定摘要。运行阶段为 `nginx` 非 root 用户；Compose 使用只读文件系统与临时 `/tmp`，无需数据卷。健康检查访问容器内 8080 端口。

Compose 从当前源码构建时默认使用 `picforge:2.0.0` 标签。本轮未重建 Docker 镜像。已有 `linux/amd64` 镜像压缩包仅对应 **V1.0**；若需要运行原有归档，在目标机器执行：

```bash
cd /root/PicForge
sha256sum -c artifacts/SHA256SUMS
docker load --input artifacts/picforge-1.0.0-linux-amd64.tar.gz
PICFORGE_IMAGE_TAG=1.0.0 docker compose -f docker-compose.yaml up -d --no-build
```

导出包只适用于记录的平台。ARM64 主机可在本机从 Dockerfile 构建；本次未验证 ARM64 构建或运行。

## 使用边界

| 项目                  | 桌面预算       | 粗指针设备预算 |
| --------------------- | -------------- | -------------- |
| 会话图片数 / 单张体积 | 20 张 / 20 MiB | 相同           |
| 单张源像素            | 2400 万        | 1200 万        |
| 输出像素              | 1600 万        | 600 万         |
| 源图和输出最长边      | 8192px         | 8192px         |
| 估算峰值保护预算      | 256 MiB        | 128 MiB        |

这些值是产品保护策略，并非所有浏览器或设备的可用性保证；实际编码也可能因内存不足失败。源图超限必须先缩小原图；只降低导出尺寸不能解决源图本身的问题。拼接导出超限可用“尺寸减半”降低输出。水印结果 Blob 累计预算为桌面 64 MiB、粗指针设备 32 MiB，超限时先下载并清空结果，再分批生成；这不是整个浏览器内存的硬上限。

新工具每个结果批次的 Blob 上限为桌面 32 MiB / 粗指针设备 16 MiB，所有工具累计结果共享 64 / 32 MiB 会话预算；重绘跨工具排队，避免同时解码大图。AVIF 另设桌面 400 万 / 粗指针设备 150 万输出像素上限，并估算编码器内存余量。超限项失败，后续有效项继续；可下载、清空结果后分批运行。这些策略并非浏览器总内存的硬上限。

图片不上传，不写入 IndexedDB，也不会覆盖原始文件。localStorage 保存拼接偏好，以及用户主动保存的批量模板（含水印文字）；Logo、原图与批量结果不持久化。刷新或关闭页面后释放会话素材与结果；默认没有草稿恢复。站点首次加载仍需要网络访问静态资源，未提供离线刷新保证。

系统字体外观随设备变化；输出面向常规网页显示，不提供专业 ICC / CMYK、印刷或广色域工作流。Canvas 重编码不主动复制 EXIF/GPS，不应当作彻底匿名化工具。

## 代码组织

`features/stitch` 管理拼接文档；`features/watermark` 管理水印；`features/transform` 管理裁剪缩放交互，`features/convert` 管理格式能力，`features/batch` 管理命名与模板；三个新工具共用 `features/processing` 的任务、预览和结果。`imaging` 负责图片领域，`workers` 定义任务协议，`browser` 管理渲染排队、下载、ZIP 和偏好，`app` 管理共享会话与页面。图片模块不依赖 React。编码器许可随静态产物提供于 `third-party-licenses.txt`。

设计与验收资料：

- [项目方案](docs/project-plan.md)
- [实现与进度](docs/implementation.md)
- [V1.1 水印设计](docs/watermark-design.md)
- [V1.2–V2.0 设计](docs/processing-design.md)
- [本地验收记录](docs/verification.md)
