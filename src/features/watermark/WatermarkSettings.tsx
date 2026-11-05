import { useRef, useState } from 'react';
import { Icon } from '../../app/Icon';
import { WATERMARK_POSITIONS } from '../../imaging/watermark';
import { useWatermark } from './WatermarkContext';
import { DEFAULT_SETTINGS } from './model';
import panel from '../../app/SettingsPanel.module.css';
import styles from './Watermark.module.css';

const POSITION_NAMES = [
  '左上',
  '上中',
  '右上',
  '左中',
  '居中',
  '右中',
  '左下',
  '下中',
  '右下',
];
export function WatermarkSettings() {
  const {
    settings,
    patch,
    logo,
    loadLogo,
    removeLogo,
    logoLoading,
    logoError,
  } = useWatermark();
  const [expanded, setExpanded] = useState(
    () => !matchMedia('(max-width: 767px)').matches,
  );
  const input = useRef<HTMLInputElement>(null);
  return (
    <details
      className={panel.settings}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="panel-heading">
        <span>水印设置</span>
        <Icon name="arrowDown" size={16} />
      </summary>
      <div className={`${panel.settingsBody} ${styles.settingsBody}`}>
        <fieldset>
          <legend>01 / 水印内容</legend>
          <div className="segmented">
            {(['text', 'image'] as const).map((kind) => (
              <button
                key={kind}
                className={settings.kind === kind ? 'active' : ''}
                aria-pressed={settings.kind === kind}
                onClick={() => patch({ kind, size: kind === 'text' ? 5 : 20 })}
              >
                {kind === 'text' ? '文字水印' : '图片水印'}
              </button>
            ))}
          </div>
          {settings.kind === 'text' ? (
            <>
              <label className={`field ${styles.contentField}`}>
                <span>水印文字</span>
                <input
                  className={styles.textInput}
                  value={settings.text}
                  maxLength={160}
                  onChange={(event) => patch({ text: event.target.value })}
                  placeholder="输入你的署名或版权信息"
                />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>字体</span>
                  <select
                    value={settings.font}
                    onChange={(event) =>
                      patch({
                        font: event.target.value as 'sans-serif' | 'serif',
                      })
                    }
                  >
                    <option value="sans-serif">系统黑体</option>
                    <option value="serif">系统宋体</option>
                  </select>
                </label>
                <label className="field">
                  <span>文字颜色</span>
                  <span className={panel.colorInput}>
                    <input
                      type="color"
                      aria-label="文字颜色"
                      value={settings.color}
                      onChange={(event) => patch({ color: event.target.value })}
                    />
                    <span>{settings.color.toUpperCase()}</span>
                  </span>
                </label>
              </div>
              <p className="microcopy">
                最多 80 个字符。系统字体外观随设备变化。
              </p>
            </>
          ) : (
            <div className={styles.logoArea}>
              <input
                ref={input}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                data-testid="logo-input"
                aria-label="选择水印图片文件"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadLogo(file);
                  event.target.value = '';
                }}
              />
              {logo && (
                <div className={styles.logoPreview}>
                  <span className="checkerboard">
                    <img src={logo.url} alt="当前水印图片" />
                  </span>
                  <span title={logo.name}>{logo.name}</span>
                  <button
                    className="icon-button"
                    aria-label="移除水印图片"
                    onClick={removeLogo}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              )}
              <button
                className="button secondary"
                onClick={() => input.current?.click()}
                disabled={logoLoading}
              >
                <Icon name="upload" size={16} />
                {logoLoading
                  ? '正在检查水印…'
                  : logo
                    ? '替换水印图片'
                    : '选择水印图片'}
              </button>
              <p className="microcopy">推荐透明 PNG，也支持静态 JPEG、WebP。</p>
              {logoError && (
                <p className="asset-error" role="alert">
                  {logoError}
                  {logo ? ' 已保留上一张有效水印。' : ''}
                </p>
              )}
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend>02 / 位置与样式</legend>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={settings.tile}
              onChange={(event) => patch({ tile: event.target.checked })}
            />
            平铺水印<span>覆盖整张图片</span>
          </label>
          <div className={styles.positions} role="group" aria-label="水印位置">
            {WATERMARK_POSITIONS.map((position, index) => (
              <button
                key={position}
                aria-label={POSITION_NAMES[index]}
                aria-pressed={settings.position === position}
                className={
                  settings.position === position ? styles.selected : ''
                }
                disabled={settings.tile}
                onClick={() => patch({ position })}
              >
                <span aria-hidden="true">
                  {['↖', '↑', '↗', '←', '·', '→', '↙', '↓', '↘'][index]}
                </span>
                <span className="sr-only">{POSITION_NAMES[index]}</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span>
              {settings.kind === 'text' ? '文字大小' : '水印宽度'}
              <strong>{settings.size}%</strong>
            </span>
            <input
              aria-label={settings.kind === 'text' ? '文字大小' : '水印宽度'}
              type="range"
              min={settings.kind === 'text' ? 1 : 5}
              max={settings.kind === 'text' ? 20 : 60}
              step="1"
              value={settings.size}
              onChange={(event) => patch({ size: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>
              不透明度<strong>{settings.opacity}%</strong>
            </span>
            <input
              aria-label="不透明度"
              type="range"
              min="0"
              max="100"
              value={settings.opacity}
              onChange={(event) =>
                patch({ opacity: Number(event.target.value) })
              }
            />
          </label>
          <label className="field">
            <span>
              旋转角度<strong>{settings.rotation}°</strong>
            </span>
            <input
              aria-label="旋转角度"
              type="range"
              min="-90"
              max="90"
              value={settings.rotation}
              onChange={(event) =>
                patch({ rotation: Number(event.target.value) })
              }
            />
          </label>
          <label className="field">
            <span>
              {settings.tile ? '平铺间隔' : '边缘留白'}
              <strong>
                {settings.tile ? settings.spacing : settings.margin}%
              </strong>
            </span>
            <input
              aria-label={settings.tile ? '平铺间隔' : '边缘留白'}
              type="range"
              min="0"
              max={settings.tile ? 50 : 20}
              value={settings.tile ? settings.spacing : settings.margin}
              onChange={(event) =>
                patch(
                  settings.tile
                    ? { spacing: Number(event.target.value) }
                    : { margin: Number(event.target.value) },
                )
              }
            />
          </label>
          <p className="microcopy">
            大小与间距按图片短边计算，自动适应每张图。
          </p>
        </fieldset>
        <fieldset>
          <legend>03 / 导出格式</legend>
          <div className="segmented">
            {(['image/png', 'image/jpeg'] as const).map((format) => (
              <button
                key={format}
                className={settings.format === format ? 'active' : ''}
                aria-pressed={settings.format === format}
                onClick={() => patch({ format })}
              >
                {format === 'image/png' ? 'PNG' : 'JPEG'}
              </button>
            ))}
          </div>
          {settings.format === 'image/jpeg' ? (
            <>
              <label className={`field ${styles.contentField}`}>
                <span>
                  JPEG 质量
                  <strong>{Math.round(settings.quality * 100)}%</strong>
                </span>
                <input
                  type="range"
                  aria-label="JPEG 质量"
                  min="10"
                  max="100"
                  value={Math.round(settings.quality * 100)}
                  onChange={(event) =>
                    patch({ quality: Number(event.target.value) / 100 })
                  }
                />
              </label>
              <p className="microcopy">
                透明区域使用白色背景。实际体积以生成结果为准。
              </p>
            </>
          ) : (
            <p className="microcopy">保留透明区域，按原图像素尺寸导出。</p>
          )}
        </fieldset>
        <button
          className="text-button reset-button"
          onClick={() => patch(DEFAULT_SETTINGS)}
        >
          <Icon name="reset" size={14} />
          恢复默认水印
        </button>
      </div>
    </details>
  );
}
