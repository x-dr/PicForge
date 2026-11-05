import { useEffect, useRef, useState } from 'react';
import { EditorProvider } from '../features/stitch/EditorContext';
import { FileImportProvider } from './FileImportContext';
import { AssetPanel } from './AssetPanel';
import { AssetProvider } from './AssetContext';
import { WatermarkProvider } from '../features/watermark/WatermarkContext';
import { WatermarkPreview } from '../features/watermark/WatermarkPreview';
import { WatermarkSettings } from '../features/watermark/WatermarkSettings';
import { WatermarkResults } from '../features/watermark/WatermarkResults';
import { SettingsPanel } from '../features/stitch/SettingsPanel';
import { PreviewPanel } from '../features/stitch/PreviewPanel';
import { ExportPanel } from '../features/stitch/ExportPanel';
import { ProcessingProvider } from '../features/processing/ProcessingContext';
import { ProcessingPreview } from '../features/processing/ProcessingPreview';
import { ProcessingSettings } from '../features/processing/ProcessingSettings';
import { ProcessingResults } from '../features/processing/ProcessingResults';
import { Icon } from './Icon';
import styles from './Workspace.module.css';

export function App() {
  return (
    <AssetProvider>
      <EditorProvider>
        <WatermarkProvider>
          <ProcessingProvider>
            <FileImportProvider>
              <Workspace />
            </FileImportProvider>
          </ProcessingProvider>
        </WatermarkProvider>
      </EditorProvider>
    </AssetProvider>
  );
}
function Workspace() {
  const guide = useRef<HTMLDialogElement>(null);
  const readTool = () => {
    const hash = window.location.hash.slice(1);
    return hash === 'watermark' ||
      hash === 'transform' ||
      hash === 'convert' ||
      hash === 'batch'
      ? hash
      : 'stitch';
  };
  const [tool, setTool] = useState(readTool);
  const watermark = tool === 'watermark';
  useEffect(() => {
    const change = () => setTool(readTool());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const title = {
    stitch: '图片拼接',
    watermark: '图片水印',
    transform: '图片处理',
    convert: '格式转换',
    batch: '批量工具',
  }[tool];
  return (
    <>
      <a
        className="skip-link"
        href="#workspace"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('workspace')?.focus();
        }}
      >
        跳到工作台
      </a>
      <header className={styles.header}>
        <a className={styles.brand} href="./" aria-label="PicForge 首页">
          <span className={styles.brandMark}>
            <i />
            <i />
            <i />
          </span>
          <span>
            PicForge<span className={styles.brandDot}>.</span>
          </span>
        </a>
        <nav aria-label="工具导航">
          <a
            className={tool === 'stitch' ? styles.activeNav : styles.navLink}
            aria-current={tool === 'stitch' ? 'page' : undefined}
            href="#workspace"
          >
            <Icon name="grid" size={16} />
            图片拼接
          </a>
          {(['watermark', 'transform', 'convert', 'batch'] as const).map(
            (mode) => (
              <a
                key={mode}
                className={tool === mode ? styles.activeNav : styles.navLink}
                aria-current={tool === mode ? 'page' : undefined}
                href={`#${mode}`}
              >
                {mode === 'watermark' && <Icon name="watermark" size={16} />}
                {
                  {
                    watermark: '图片水印',
                    transform: '图片处理',
                    convert: '格式转换',
                    batch: '批量工具',
                  }[mode]
                }
              </a>
            ),
          )}
        </nav>
        <div className={styles.headerRight}>
          <span className={styles.localBadge}>
            <Icon name="shield" size={14} />
            图片在本机处理
          </span>
          <span className={styles.headerDivider} />
          <button
            className="text-button muted"
            aria-label="使用指南"
            onClick={() => guide.current?.showModal()}
          >
            <Icon name="help" size={17} />
            <span>使用指南</span>
          </button>
        </div>
      </header>
      <main className={styles.main} id="workspace" tabIndex={-1}>
        <div className={styles.intro}>
          <div>
            <h1>
              {title}
              <span>
                {tool === 'transform'
                  ? '从尺寸到方向，都合心意。'
                  : tool === 'convert'
                    ? '选择适合你的格式。'
                    : tool === 'batch'
                      ? '一份流程，省下重复操作。'
                      : watermark
                        ? '每一份创作，都有你的名字。'
                        : '每一张，都恰到好处。'}
              </span>
            </h1>
          </div>
          <span className={styles.versionBadge}>
            简单一点，创作多一点 <Icon name="sparkles" size={14} />
          </span>
        </div>
        <div className={styles.workspace}>
          <AssetPanel />
          {tool === 'transform' || tool === 'convert' || tool === 'batch' ? (
            <>
              <ProcessingPreview key={`preview-${tool}`} mode={tool} />
              <ProcessingSettings key={`settings-${tool}`} mode={tool} />
              <ProcessingResults key={`results-${tool}`} mode={tool} />
            </>
          ) : watermark ? (
            <>
              <WatermarkPreview />
              <WatermarkSettings />
              <WatermarkResults />
            </>
          ) : (
            <>
              <PreviewPanel />
              <SettingsPanel />
              <ExportPanel />
            </>
          )}
        </div>
        <footer className={styles.footer}>
          <span>用简单的工具，拼出你的好故事。</span>
          <span>
            PicForge <span>© 2026</span>
            <span className={styles.footerDot}>·</span>为你的灵感而造
          </span>
        </footer>
      </main>
      <dialog
        ref={guide}
        className="guide-dialog"
        aria-labelledby="guide-title"
      >
        <div className="dialog-heading">
          <span className="eyebrow">PICFORGE / QUICK START</span>
          <button
            className="icon-button"
            aria-label="关闭使用指南"
            onClick={() => guide.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="guide-title">让照片，讲一个完整故事。</h2>
        <ol className={styles.guideSteps}>
          <li>
            <span>01</span>
            <div>
              <strong>添加你喜欢的图片</strong>
              <p>
                选择、拖入或粘贴静态 JPEG、PNG、WebP、AVIF。单张不超过 20
                MiB，每次会话最多 20 张。
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>选择工具与参数</strong>
              <p>
                {tool === 'transform'
                  ? '启用裁剪或缩放，调整比例与方向；拖动选区或输入数值，随时恢复默认。'
                  : tool === 'convert'
                    ? '选择 PNG、JPEG、WebP 或 AVIF；生成前检测当前浏览器的实际能力。'
                    : tool === 'batch'
                      ? '按顺序组合裁剪、缩放、方向、水印和编码，保存模板以便复用。'
                      : watermark
                        ? '输入文字或选择水印图片，调整九宫格位置、相对大小、不透明度与旋转，也可以开启平铺。'
                        : '选择纵向、横向或宫格，调整尺寸、留白与背景。用手柄拖动或上下按钮调整顺序。'}
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>预览，然后下载</strong>
              <p>
                {tool === 'transform' || tool === 'convert' || tool === 'batch'
                  ? '生成后检查实际尺寸和体积，在结果列表下载。批量与格式转换支持成功项 ZIP；取消保留成功项，失败项可重试。'
                  : watermark
                    ? '选择 PNG 或 JPEG 后生成。每张图片单独处理，在结果列表逐项下载；取消保留已完成结果，失败项可单独重试。'
                    : 'PNG 支持透明背景，JPEG 可以调整质量。导出按点击时的配置生成，可随时取消等待。'}
              </p>
            </div>
          </li>
        </ol>
        <div className="message">
          <Icon name="shield" size={18} />
          <span>
            图片只在浏览器本地处理。刷新会清除素材，原始文件不会被修改。大图超限时，请减少图片或降低尺寸。
          </span>
        </div>
        <form method="dialog">
          <button className="button primary">
            开始创作 <span aria-hidden="true">↗</span>
          </button>
        </form>
      </dialog>
    </>
  );
}
