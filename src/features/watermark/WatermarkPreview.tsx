import { Icon } from '../../app/Icon';
import { PreviewImage } from '../../app/PreviewImage';
import { EmptyArtwork } from '../../app/EmptyArtwork';
import { useAssets } from '../../app/AssetContext';
import { useFileImport } from '../../app/FileImportContext';
import { useWatermark } from './WatermarkContext';
import { useWatermarkPreview } from './use-watermark-preview';
import panel from '../../app/PreviewPanel.module.css';
import styles from './Watermark.module.css';

export function WatermarkPreview() {
  const { ready } = useAssets();
  const { select, validation } = useWatermark();
  const { open, demo, demoLoading } = useFileImport();
  const preview = useWatermarkPreview();
  return (
    <section className={panel.preview} aria-label="水印预览">
      <div className={panel.previewToolbar}>
        <div className={panel.previewTitle}>
          <span className="status-dot" />
          实时预览
        </div>
        {preview.selected ? (
          <select
            className={styles.imageSelect}
            aria-label="当前预览图片"
            value={preview.selected.id}
            onChange={(event) => select(event.target.value)}
          >
            {ready.map((item, index) => (
              <option key={item.id} value={item.id}>
                {index + 1}. {item.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="microcopy">每一张，都是你的作品</span>
        )}
      </div>
      <div
        className={`${panel.previewViewport} ${preview.selected ? panel.withImage : ''}`}
      >
        {preview.selected ? (
          <>
            <div className={styles.watermarkCanvas}>
              {preview.url && (
                <PreviewImage
                  className="checkerboard"
                  data-testid="watermark-preview"
                  src={preview.url}
                  alt={`${preview.selected.name} 的水印预览，输出 ${preview.selected.width} × ${preview.selected.height} 像素`}
                />
              )}
              {validation ? (
                <div className="message">{validation}</div>
              ) : preview.error ? (
                <div className="message warning" role="alert">
                  <span>{preview.error}</span>
                  <button className="text-button" onClick={preview.retry}>
                    重试预览
                  </button>
                </div>
              ) : (
                !preview.url && (
                  <span className="spinner" aria-label="正在生成水印预览" />
                )
              )}
            </div>
            <div className={panel.previewNote}>
              <Icon name="image" size={14} />
              {preview.selected.width.toLocaleString()} ×{' '}
              {preview.selected.height.toLocaleString()} px<span>·</span>
              原始尺寸
            </div>
          </>
        ) : (
          <div className={panel.emptyPreview}>
            <div className={panel.smallEyebrow}>YOUR WORK. YOUR SIGNATURE.</div>
            <EmptyArtwork />
            <h2>给作品，留下你的名字</h2>
            <p>
              一句署名，一个专属标记。
              <br />
              同一份水印，轻松应用到每张图片。
            </p>
            <button className="button primary large" onClick={open}>
              <Icon name="upload" size={18} />
              选择本地图片
            </button>
            <span className={panel.dropHint}>或将图片拖放至此处</span>
            <div className={panel.demoLink}>
              <span>先找一点灵感？</span>
              <button
                className="text-button"
                onClick={demo}
                disabled={demoLoading}
              >
                <Icon name="sparkles" size={14} />
                {demoLoading ? '正在准备…' : '试试示例图片'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={panel.previewFooter}>
        <span>
          <Icon name="lock" size={13} />
          图片与水印都在本机处理
        </span>
        <span role="status">
          {preview.selected ? preview.status : '支持文字与图片水印'}
        </span>
      </div>
    </section>
  );
}
