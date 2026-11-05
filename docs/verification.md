# 本地验收记录

日期：2026-11-05。本文件区分本地自动化、容器验证和真实设备验证，不代表线上发布。

当前源码已覆盖 V1.0–V2.0。下方保留历史记录，最新结果见文末的 V1.2–V2.0 验收。已有 `linux/amd64` Docker 归档仅对应 V1.0；真实手机与线上部署仍未验证。

## 环境与最终结果

Linux x64，Intel Core i5-8500，6 个逻辑 CPU，8 GiB 内存；Node 24.18.0、pnpm 11.21.0、Playwright 1.64.1。浏览器均为本机 headless 构建，不等同于真实手机。

| 检查                         | 最终结果                                             |
| ---------------------------- | ---------------------------------------------------- |
| Vitest                       | 4 个文件，18 项通过                                  |
| TypeScript、Oxlint、Prettier | 类型、lint、格式检查通过                             |
| Vite 生产构建                | 通过，`dist/` 包含 Worker 独立资源                   |
| Chromium 156.0.8078.4        | 21 项通过                                            |
| Firefox 157.0                | 20 项通过，跳过 1 项重复性能测量                     |
| WebKit 27.2                  | 20 项通过，跳过 1 项重复性能测量                     |
| 三浏览器总计                 | **61 项通过、2 项按设计跳过、0 项失败**              |
| 最终 Docker 容器端到端       | 三浏览器各 5 项，共 **15 项通过**                    |
| 容器与静态服务               | 非 root、只读根文件系统、healthy、Nginx 配置验证通过 |

两项跳过源于固定桌面性能测量只在 Chromium 执行；Firefox、WebKit 的功能与 Worker 检查实际执行并通过。无障碍检查使用 axe-core 的 WCAG 2 A/AA、2.1 AA 标签，在桌面与展开面板的 360px 视口通过；这不代表完整人工无障碍认证。

## 已取得的证据

- 18 项 Vitest 测试已通过：整数布局、有效列数、末行空格、中心裁切、参数校验、稳定顺序、删除后过期结果、格式头与容量保护，包括 EXIF 后跟随 XMP 不重置方向。
- 三种桌面浏览器均已通过核心导入、布局、实际下载内容、PNG 透明度、JPEG 底色、8 种 EXIF 旋转/镜像、取消、重试、清空与资源释放流程。
- 360 / 768 / 1440px 响应式检查已通过，参数面板浮动导致的溢出已修复。
- Worker PNG/JPEG 编码及重新解码探测已在三种浏览器通过。
- Worker、createImageBitmap、localStorage 不可用的主线程/HTMLImageElement 降级已通过。
- 只读、非 root 的临时 Docker 容器已启动并达到 healthy，`nginx -t` 通过。
- 文件选择、文件拖入、提供文件的模拟粘贴、鼠标拖动排序与键盘上下移动通过。模拟剪贴板不代表操作系统剪贴板权限或所有来源都提供图片文件。
- 以 1px 黑白条纹原图核对导出像素，证明导出使用原图细节，没有放大缩略图替代。
- 五轮导入/清空后，页面跟踪的活动 Object URL 每轮归零；这不是整个浏览器堆内存峰值测量。
- 导入、编辑、下载期间未发现图片外发请求；原文件通过只读 File/Blob 引用处理，不写回本地文件。
- 容器实际响应：HTML `no-cache`，哈希资源 `immutable`，缺失资源 404；CSP 支持本地 Worker 与 Blob 图片。带 EXIF 方向的生成样本导出 PNG/JPEG 后没有复制原始 EXIF，不能据此保证任意元数据匿名化。

## 性能样本

生产构建、同机并发测试环境；10 张自行生成的 1920 × 1080 纯色 PNG。预览从输入事件测到新图解码完成后的下一动画帧，含 80ms 调度；导出计时含 Playwright 通信。每次参数更新后等待新预览，10 次测量。

| 项目               | 实测                         |
| ------------------ | ---------------------------- |
| 参数更新到预览 P95 | **152ms**                    |
| 输出尺寸           | 1132 × 6366（约 721 万像素） |
| PNG 三次导出       | 518 / 663 / 686ms            |
| JPEG 三次导出      | 619 / 631 / 701ms            |

样本达到方案中这组桌面目标，不能推断摄影照片、1600 万像素极限或手机也达到相同性能。原始数据见 [性能记录](records/performance-2026-11-05.json)，浏览器版本和 HTTP/元数据抽查见 [容器记录](records/container-2026-11-05.json)。

## 可复核产物

- [360px](screenshots/workspace-360.png)、[768px](screenshots/workspace-768.png)、[1440px](screenshots/workspace-1440.png)、[含素材工作台](screenshots/workspace-populated.png)。截图为自动化视口，未冒充真机。
- Docker 标签 `picforge:1.0.0`，平台 `linux/amd64`，镜像约 24.95 MiB。运行阶段只含静态资源与 Nginx。
- 归档：`artifacts/picforge-1.0.0-linux-amd64.tar.gz`；SHA256 校验文件：`artifacts/SHA256SUMS`。
- 对应镜像 ID：`sha256:33a147d02fee8f54d1dfa9dd41959224c9c57c6115551ebb2814243b9e0f2e1b`。
- 归档 SHA256：`8b60169a0e325497d15c63345cc4c887a8c34740befcc9635e5e9e37e90a8b29`。
- 测试容器和预览进程在验收后清理；没有推送镜像仓库或部署公网服务。

## TypeScript 7 升级复验

2026-11-05 将 TypeScript 从 **5.9.3 升级至 7.0.2**，版本以当日 [npm 官方 `latest`](https://registry.npmjs.org/typescript/latest) 为准。先在临时副本完成兼容性验证，再同步项目依赖及锁文件；源码、测试和 `tsconfig.json` 无需修改。

- `pnpm install --frozen-lockfile`：通过；锁文件保留 TypeScript 的平台原生可选依赖，安装时需保留可选依赖。
- `pnpm exec tsc --version`：`Version 7.0.2`。
- `pnpm typecheck`、`pnpm lint`、`pnpm format:check`：通过。
- `pnpm test`：4 个文件，18 项通过。
- `pnpm build`：通过，包含独立 Worker 资源。
- `pnpm exec playwright test`：对本轮生产构建复验，Chromium 21 项、Firefox 20 项、WebKit 20 项通过，总计 **61 项通过、2 项按设计跳过、0 项失败**。

默认沙箱因本地端口监听 `EPERM` 无法启动浏览器测试的预览服务，放行执行权限后完成上述三浏览器回归。本轮未重新构建 Docker 镜像或更新 `artifacts/`；前述容器与镜像归档证据对应升级前的构建。

## 尚未验证

- 真实 iOS Safari 和 Android Chrome：系统文件选择器、触控排序、系统下载/相册保存、内存峰值。
- ARM64 镜像、真实 VPS、公网 HTTPS、外部平台部署、离线刷新。
- 摄影照片和低内存设备性能；专业色彩和彻底元数据匿名化。

## 可复现命令

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:e2e
docker compose -f docker-compose.yaml config --quiet
docker build --tag picforge:1.0.0 .
```

测试使用真实 Canvas 和编码结果，未用 Canvas mock 替代导出验证。浏览器运行需要本地监听和进程权限；本次环境默认沙箱出现 EPERM 后，临时预览及浏览器测试在获准的执行环境完成。

## V1.1 水印实现验收

2026-11-05。先保存 [水印设计](watermark-design.md)，再完成文字/图片水印、批量逐项下载与共享素材工作台。对当前 `dist/` 完成三浏览器完整回归，包含全部原有拼接用例；本节对应本轮源码和静态构建，未更新 Docker 归档。

| 检查                     | 结果                                     |
| ------------------------ | ---------------------------------------- |
| Vitest                   | 5 个文件，**22 项通过**                  |
| TypeScript               | `pnpm typecheck` 与生产构建类型检查通过  |
| Oxlint / Prettier        | `pnpm lint`、`pnpm format:check` 通过    |
| Vite 生产构建            | 通过，保留独立 Worker 资源               |
| Chromium                 | **34 项通过**                            |
| Firefox                  | **33 项通过、1 项按设计跳过**            |
| WebKit                   | **33 项通过、1 项按设计跳过**            |
| 完整浏览器回归           | **100 项通过、2 项按设计跳过、0 项失败** |
| 其中 V1.1 新增浏览器覆盖 | 13 个场景 × 3 浏览器，**39 项全部通过**  |

两项跳过仍为只在 Chromium 测量的重复性能用例，未跳过水印用例。测试使用本机 headless 浏览器，不等同于 iOS/Android 真机。

本轮取得的证据：

- 真实 PNG 下载重新解码，核对水印九宫格锚点、90° 旋转、平铺与 50% 不透明度的实际像素、原始输出尺寸及文件名后缀。
- 真实 PNG 透明区域和 JPEG 白底、文件签名验证通过。中文文字预览与导出在同一浏览器的像素差异检查通过；字体外观不作跨设备一致性承诺。
- 通过临时注入编码失败、延迟编码验证：部分失败保留成功，失败项按原配置重试；取消忽略迟到结果，已经完成的图片仍可下载。注入仅控制失败/时序，成功结果仍由真实 Canvas 编码。
- 任务生成后修改不透明度、移除源图和 Logo，不改变已开始任务的配置快照。
- 5000 × 3400 的生成 PNG 超出输出预算时，该项失败但后续有效项成功；导入损坏项进入结果错误列表。
- 清空素材保留已生成下载结果；清空结果保留素材；拼接参数和水印文字在切换工具后保留。键盘跳过导航仍停留在水印工具。
- Worker / createImageBitmap 不可用时，主线程与 HTMLImageElement 路径能够导出；损坏 Logo 替换失败时保留上一张有效水印。
- 移除 Logo、清空素材后，页面跟踪的活动 Object URL 归零；不冒充浏览器整体内存或峰值测量。结果 Blob 的 64/32 MiB 累计保护已实现，未使用真实大批量摄影照片测量峰值。
- 水印操作期间未观察到图片外发请求。360 / 768 / 1440px 无横向溢出，包含生成结果的页面通过 axe 的 WCAG 2 A/AA、2.1 AA 自动检查；未声称人工无障碍认证。

可复核的水印工作台截图：[360px](screenshots/watermark-360.png)、[768px](screenshots/watermark-768.png)、[1440px](screenshots/watermark-1440.png)。构建校验值、检查计数与边界见 [本轮记录](records/watermark-2026-11-05.json)。截图使用本地 Canvas 原创示例，未经外部图片服务。

默认沙箱禁止监听本地端口（`EPERM`），浏览器验收在获准执行环境完成。初轮响应式用例因 hash 同页导航保留会话而超时，改为每个视口显式刷新后，全量回归通过；最终没有未处理失败。

本轮没有重新构建或验证 Docker 镜像，没有推送、部署公网或验证真实手机的文件选择、触控与系统保存。该 V1.1 历史轮次未实施 V1.2–V2.0；后续结果见文末。

## V1.2–V2.0 实现验收

日期：2026-11-05。当前源码版本为 **2.0.0**。本轮实现图片处理、独立格式转换、多步骤批量、ZIP 与模板，并对原拼接和水印进行完整回归。详细数据：[处理与构建记录](records/processing-2026-11-05.json)、[子路径记录](records/subpath-2026-11-05.json)。

### 最终检查

| 检查                                                   | 结果                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `pnpm test`                                            | 12 个文件，36 项通过                                                              |
| `pnpm build`                                           | TypeScript 类型检查与生产构建通过；动态编码器/Worker/WASM/ZIP 产物生成            |
| `pnpm lint` / `pnpm format:check`                      | 通过                                                                              |
| `docker compose -f docker-compose.yaml config --quiet` | 配置解析通过；未构建或运行镜像                                                    |
| Playwright 完整回归                                    | 135 项中 133 通过、2 跳过、0 失败；跳过的是仅在 Chromium 测量的重复性能用例       |
| Chromium 156.0.8078.4                                  | 45 通过                                                                           |
| Firefox 157.0                                          | 44 通过、1 跳过                                                                   |
| WebKit 27.2                                            | 44 通过、1 跳过                                                                   |
| 补充子路径验收                                         | 三种浏览器均通过 `/tools/picforge/` 下的 Worker/WASM/AVIF 导出和缺失文件 404 检查 |

完整回归命令（生产构建后运行）：

```bash
PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/full.json pnpm exec playwright test --reporter=list,json,html
```

原始报告位于 `test-results/full.json` 与 `playwright-report/`。本轮受沙箱端口权限限制，真实浏览器测试使用已获准的本机回环服务执行；没有暴露公网服务。

### 已验证行为

- 裁剪固定比例在选区内居中，自由裁剪支持原图拖动与数值输入；裁剪、等比缩放和旋转后的输出尺寸正确，恢复默认回到原始尺寸。
- 四色角点样本逐一核对 0/90/180/270° 与水平镜像组合的真实导出像素；按原图坐标翻转后旋转，没有重复 EXIF 旋转。原 V1.0 的八种 EXIF 方向用例持续通过。
- 透明样本实际生成 PNG/JPEG/WebP/AVIF，重新解码核对尺寸、alpha 与 JPEG 白底；实际 MIME、签名和文件后缀一致。生成的 AVIF 再次导入成功。PNG 不显示质量滑块，JPEG 低质量结果为有效 JPEG。
- 实际下载结果显示原图/输出字节与百分比变化，不能预先宣称一定变小。
- 批量顺序执行多个启用步骤并叠加图片水印；损坏图或输出/AVIF 预算超限时逐项失败，其他项继续成功，降低尺寸后可重新生成。
- 取消保留已完成项；修改格式、命名和尺寸不影响原批次快照；迟到的编码结果不能覆盖重试。处理中删除素材不影响已有请求，清空素材后结果仍可下载。
- ZIP 用 Python 标准库 `zipfile` 实际解包，检查 CRC、文件名、数量与有效数据；单元测试检查 UTF-8、中央目录偏移、字节、重复/路径文件名、预算及取消不返回半成品。
- 模板保存、JSON 下载/导入与刷新后应用可用；错误版本/类型/范围/超大输入拒绝，保留当前配置。图片水印模板要求重新选择 Logo；禁用 localStorage 后仍可导出。
- 360/768/1440px 的三个新工作台无页面横向溢出；按各视口展开设置后执行 axe WCAG 2 A/AA、2.1 AA 检查，三浏览器通过。原拼接与水印的键盘、响应式与无障碍用例持续通过。
- 格式转换未观察到非 GET 请求；编码器使用本站资源。首次选择 PNG 不加载 WASM；模拟 AVIF 编码器下载失败时禁用生成，恢复网络后可重新检测并生成。
- 使用仓库 Nginx CSP 在三种浏览器验证本地 WASM 编码。已为 `script-src` 添加 `wasm-unsafe-eval`，未开放 JavaScript `unsafe-eval`；新增 WASM gzip 类型。子路径验收使用同一 CSP 与本地临时静态服务器，完成后关闭。

本轮固定桌面生成样本的拼接预览 P95 为 163ms；1132 × 6366 输出的 PNG 为 598–793ms、JPEG 为 628–732ms（各 3 次）。环境与原始测量已存入处理记录；这不是新编码器或真实照片性能承诺。

### 产物与限制

生产主 JS 约 327 KB，AVIF 单线程 WASM 约 3.49 MB，WebP WASM 约 281 KB（均为未压缩大小，编码器按需加载）。文件路径、实际字节及 SHA256 见记录。PNG/JPEG/WebP/AVIF 的浏览器校验不代表相机照片或任意大图性能。

截图：`docs/screenshots/transform-{360,768,1440}.png`、`convert-{360,768,1440}.png`、`batch-{360,768,1440}.png`。桌面设置内部滚动，手机纵向显示；截图样本为生成图片。

AVIF 输入仅支持容器预检通过的静态直接编码主图；拒绝动画、网格和带容器旋转/镜像/显示裁切的文件。输出另受 400 万/150 万像素与编码器内存余量限制。所有工具结果累计预算为 64/32 MiB，新工具每批 32/16 MiB；这是产品保护策略，未测浏览器整体内存峰值。

本轮未进行真实 iOS/Android 文件选择、触控和系统保存验收，未验证真实手机内存/性能，未重建 Docker 镜像、修改原 V1.0 归档或部署线上服务。Compose 默认源码构建标签为 2.0.0，旧归档需显式使用 `PICFORGE_IMAGE_TAG=1.0.0`。

## EdgeOne Pages 部署支持验收

日期：2026-11-05。本轮添加 EdgeOne Pages 的仓库构建配置、Node 版本文件、直接上传产物准备脚本、静态 404 页面与[部署说明](edgeone-pages.md)。图片处理逻辑与依赖版本未修改。

| 检查                                                          | 结果                                                                                                                                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build:edgeone`                                          | TypeScript 与 Vite 生产构建通过；生成可上传的 `dist/`                                                                                                                |
| `pnpm typecheck`                                              | JSON 导入语法修正后通过                                                                                                                                              |
| `pnpm lint`                                                   | 通过                                                                                                                                                                 |
| `pnpm exec oxlint --deny-warnings deploy/prepare-edgeone.mjs` | 通过                                                                                                                                                                 |
| `node --check deploy/prepare-edgeone.mjs`                     | 通过                                                                                                                                                                 |
| `pnpm format:check`                                           | 通过                                                                                                                                                                 |
| 产物检查                                                      | `dist/edgeone.json` 仅包含与根配置相同的 headers；CSP 与 Nginx 相同；`.nvmrc` 与 `.node-version` 相同；404 文件完整复制；Worker 与两份 WASM 均存在；未配置全路径回退 |
| 三浏览器针对性回归                                            | Chromium / Firefox / WebKit 各 2 项，共 **6 项通过、0 失败、0 跳过**                                                                                                 |

浏览器命令：

```bash
pnpm exec playwright test tests/e2e/codec-delivery.spec.ts --output=test-results/edgeone --reporter=list
```

该用例分别在本机生产预览上应用 Nginx 和 EdgeOne 的 CSP，核对 Worker 实际 PNG/JPEG 往返探测、PNG 阶段不请求 WASM、AVIF 编码器请求始终同源、断网后生成禁用、恢复后重新检测及下载文件重新解码为 80 × 40。没有模拟 Canvas 或编码成功结果。

默认沙箱因回环监听 `EPERM` 无法启动预览，经执行权限放行后完成测试。首次测试加载曾缺少 Node JSON 导入属性，修正并重新检查后 6 项全部通过。本轮未重跑图片领域单元测试与完整浏览器套件；没有修改图片领域逻辑。

这些证据只覆盖本地构建产物与 CSP 兼容性，没有创建腾讯云项目，也未验证平台构建、真实 HTTPS/CDN 的响应头合并、MIME、缓存或缺失文件状态码。上线后按部署说明核对。没有重建 Docker 镜像、更新旧归档或执行线上部署。
