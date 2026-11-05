import { useEffect, useRef, useState } from 'react';
import { EmptyArtwork } from '../../app/EmptyArtwork';
import { Icon } from '../../app/Icon';
import { useEditor } from './EditorContext';
import { useFileImport } from '../../app/FileImportContext';
import { usePreview } from './use-preview';
import styles from '../../app/PreviewPanel.module.css';

export function PreviewPanel() {
  const { plan, ready, document: doc } = useEditor();
  const { open, demo, demoLoading } = useFileImport();
  const preview = usePreview();
  const [zoom, setZoom] = useState('fit');
  const imageArea = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 600, height: 400 });
  const hasPlan = !!plan;
  useEffect(() => {
    if (!imageArea.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailable({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(imageArea.current);
    return () => observer.disconnect();
  }, [hasPlan]);
  const importBusy = doc.assets.some((asset) => asset.status === 'loading');
  return (
    <section className={styles.preview} aria-label="拼接预览">
      <div className={styles.previewToolbar}>
        <div className={styles.previewTitle}>
          <span className="status-dot" />
          实时预览<span className={styles.previewSubtitle}>所见即所得</span>
        </div>
        <div className={styles.zoomControls}>
          <button
            className="icon-button"
            aria-label="适应窗口"
            title="适应窗口"
            onClick={() => setZoom('fit')}
          >
            <Icon name="fit" size={16} />
          </button>
          <span className="toolbar-divider" />
          <select
            aria-label="预览缩放"
            value={zoom}
            onChange={(event) => setZoom(event.target.value)}
          >
            <option value="fit">适应窗口</option>
            <option value="0.25">25%</option>
            <option value="0.5">50%</option>
            <option value="1">100%</option>
            <option value="2">200%</option>
          </select>
        </div>
      </div>
      <div
        className={`${styles.previewViewport} ${plan ? styles.withImage : ''}`}
        data-testid="preview-viewport"
        tabIndex={0}
        role="region"
        aria-label="预览画布，可滚动查看"
      >
        {plan ? (
          <>
            <div className={styles.previewImageArea} ref={imageArea}>
              {preview.url && (
                <div
                  className={`${styles.canvasFrame} checkerboard`}
                  style={{
                    width:
                      zoom === 'fit'
                        ? Math.max(
                            1,
                            Math.min(
                              available.width,
                              (available.height * plan.width) / plan.height,
                            ),
                          )
                        : `${plan.width * Number(zoom)}px`,
                    flexShrink: 0,
                  }}
                >
                  <img
                    data-testid="stitch-preview"
                    src={preview.url}
                    alt={`${ready.length} 张图片的拼接预览，输出 ${plan.width} × ${plan.height} 像素`}
                    style={{ opacity: preview.state === 'loading' ? 0.65 : 1 }}
                  />
                </div>
              )}
              {preview.state === 'loading' && (
                <span className={styles.previewLoading} role="status">
                  <span className="spinner" />
                  正在更新预览
                </span>
              )}
              {preview.state === 'error' && (
                <div className="message warning" role="alert">
                  <span>{preview.error}</span>
                  <button className="text-button" onClick={preview.retry}>
                    重试预览
                  </button>
                </div>
              )}
            </div>
            <div className={styles.previewNote}>
              <Icon name="image" size={14} />
              <span>
                {plan.width.toLocaleString()} × {plan.height.toLocaleString()}{' '}
                px
              </span>
              <span>·</span>
              <span>{ready.length} 张图片</span>
            </div>
          </>
        ) : (
          <div className={styles.emptyPreview}>
            <div className={styles.smallEyebrow}>
              A LITTLE SPACE FOR YOUR CREATIVITY
            </div>
            <EmptyArtwork />
            <h2>把灵感，拼在一起</h2>
            <p>
              几张照片，一个完整故事。
              <br />
              添加图片，即刻开始你的创作。
            </p>
            <button className="button primary large" onClick={open}>
              <Icon name="upload" size={18} />
              选择本地图片
            </button>
            <span className={styles.dropHint}>或将图片拖放至此处</span>
            <div className={styles.demoLink}>
              <span>还没有准备好？</span>
              <button
                className="text-button"
                onClick={demo}
                disabled={demoLoading}
              >
                <Icon name="sparkles" size={14} />
                {demoLoading ? '正在准备…' : '试试示例图片'}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={styles.previewFooter}>
        <span>
          <Icon name="lock" size={13} />
          本地处理，安心创作
        </span>
        <span role="status">
          {importBusy
            ? '正在导入图片…'
            : preview.state === 'loading'
              ? '预览更新中…'
              : plan
                ? '从原图导出完整画质'
                : '支持多图拖入与粘贴'}
        </span>
      </div>
    </section>
  );
}
