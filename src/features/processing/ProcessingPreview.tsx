import { useAssets } from '../../app/AssetContext';
import { useFileImport } from '../../app/FileImportContext';
import { EmptyArtwork } from '../../app/EmptyArtwork';
import { Icon } from '../../app/Icon';
import { PreviewImage } from '../../app/PreviewImage';
import { transformPlan } from '../../imaging/transform';
import { useProcessing } from './ProcessingContext';
import { useProcessingPreview } from './use-processing-preview';
import { CropSelection } from '../transform/CropSelection';
import type { ProcessingMode } from './model';
import panel from '../../app/PreviewPanel.module.css';
import styles from './Processing.module.css';
const titles = {
  transform: '裁剪、旋转，刚刚好',
  convert: '换个格式，轻松分享',
  batch: '一份流程，处理每张图片',
};
export function ProcessingPreview({ mode }: { mode: ProcessingMode }) {
  const { ready } = useAssets();
  const { open, demo, demoLoading } = useFileImport();
  const { settings, patch, select } = useProcessing(mode);
  const preview = useProcessingPreview(mode);
  const selected = preview.selected;
  const plan = selected
    ? transformPlan(selected, settings.transform)
    : undefined;
  return (
    <section className={panel.preview} aria-label="处理预览">
      <div className={panel.previewToolbar}>
        <div className={panel.previewTitle}>
          <span className="status-dot" />
          实时预览
        </div>
        {selected && (
          <select
            className={styles.imageSelect}
            aria-label="当前预览图片"
            value={selected.id}
            onChange={(e) => select(e.target.value)}
          >
            {ready.map((a, i) => (
              <option key={a.id} value={a.id}>
                {i + 1}. {a.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div
        className={`${panel.previewViewport} ${selected ? panel.withImage : ''}`}
      >
        {selected ? (
          <>
            <div className={styles.previewImage}>
              {preview.url ? (
                <PreviewImage
                  className="checkerboard"
                  src={preview.url}
                  data-testid="processing-preview"
                  alt={`${selected.name} 的处理预览，输出 ${plan?.width} × ${plan?.height} 像素`}
                />
              ) : preview.error ? (
                <div className="message warning" role="alert">
                  <span>{preview.error}</span>
                  <button className="text-button" onClick={preview.retry}>
                    重试预览
                  </button>
                </div>
              ) : (
                <span className="spinner" aria-label="正在生成预览" />
              )}
            </div>
            <p
              className={styles.dimensions}
              data-testid="processing-dimensions"
            >
              {plan?.width.toLocaleString()} × {plan?.height.toLocaleString()}{' '}
              px{plan?.upscaled ? ' · 放大可能变模糊' : ''}
            </p>
            {mode !== 'convert' && settings.transform.crop && (
              <CropSelection
                asset={selected}
                settings={settings.transform}
                patch={(t) =>
                  patch({ transform: { ...settings.transform, ...t } })
                }
              />
            )}
          </>
        ) : (
          <div className={panel.emptyPreview}>
            <div className={panel.smallEyebrow}>
              LOCAL IMAGES. MORE POSSIBILITIES.
            </div>
            <EmptyArtwork />
            <h2>{titles[mode]}</h2>
            <p>
              {mode === 'convert'
                ? '保留清晰与透明，选择适合你的格式。'
                : mode === 'batch'
                  ? '组合常用步骤，逐张生成，一次打包。'
                  : '从选区到尺寸，让图片更合心意。'}
            </p>
            <button className="button primary large" onClick={open}>
              <Icon name="upload" size={18} />
              选择本地图片
            </button>
            <span className={panel.dropHint}>或将图片拖放至此处</span>
            <div className={panel.demoLink}>
              <button
                className="text-button"
                disabled={demoLoading}
                onClick={demo}
              >
                <Icon name="sparkles" size={14} />
                试试示例图片
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={panel.previewFooter}>
        <span>
          <Icon name="lock" size={13} />
          图片在本机处理
        </span>
        <span role="status">
          {selected
            ? preview.error
              ? '预览失败'
              : preview.url
                ? '预览已更新'
                : '正在更新预览'
            : '添加图片开始'}
        </span>
      </div>
    </section>
  );
}
