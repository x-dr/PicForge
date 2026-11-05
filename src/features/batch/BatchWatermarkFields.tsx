import { useRef } from 'react';
import { useProcessing } from '../processing/ProcessingContext';
import { useWatermark } from '../watermark/WatermarkContext';
import {
  WATERMARK_POSITIONS,
  type WatermarkStyle,
} from '../../imaging/watermark';
import styles from '../processing/Processing.module.css';
const labels = [
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
export function BatchWatermarkFields() {
  const { settings, patch } = useProcessing('batch');
  const { logo, logoLoading, logoError, loadLogo, removeLogo } = useWatermark();
  const input = useRef<HTMLInputElement>(null);
  const s = settings.watermark;
  const update = (v: Partial<WatermarkStyle>) =>
    patch({ watermark: { ...s, ...v } });
  return (
    <fieldset>
      <legend>04 / 水印</legend>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={settings.watermarkEnabled}
          onChange={(e) => patch({ watermarkEnabled: e.target.checked })}
        />
        启用批量水印
      </label>
      {settings.watermarkEnabled && (
        <>
          <label className="field">
            <span>水印类型</span>
            <select
              aria-label="水印类型"
              value={s.kind}
              onChange={(e) =>
                update({ kind: e.target.value as 'text' | 'image' })
              }
            >
              <option value="text">文字水印</option>
              <option value="image">图片水印</option>
            </select>
          </label>
          {s.kind === 'text' ? (
            <>
              <label className="field">
                <span>水印文字</span>
                <input
                  className={styles.textInput}
                  value={s.text}
                  maxLength={80}
                  onChange={(e) => update({ text: e.target.value })}
                />
              </label>
              <div className={styles.twoColumns}>
                <label className="field">
                  <span>字体</span>
                  <select
                    value={s.font}
                    onChange={(e) =>
                      update({ font: e.target.value as WatermarkStyle['font'] })
                    }
                  >
                    <option value="sans-serif">系统黑体</option>
                    <option value="serif">系统宋体</option>
                  </select>
                </label>
                <label className="field">
                  <span>水印颜色</span>
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => update({ color: e.target.value })}
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <input
                ref={input}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                data-testid="batch-logo-input"
                aria-label="批量水印图片文件"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void loadLogo(file);
                  e.target.value = '';
                }}
              />
              <div className={styles.actions}>
                <button
                  className="button secondary"
                  disabled={logoLoading}
                  onClick={() => input.current?.click()}
                >
                  {logoLoading
                    ? '正在检查水印…'
                    : logo
                      ? '替换本地 Logo'
                      : '选择本地 Logo'}
                </button>
                {logo && (
                  <button className="text-button" onClick={removeLogo}>
                    移除 Logo
                  </button>
                )}
              </div>
              {logo && <p className="microcopy">{logo.name}</p>}
              {logoError && (
                <p className="asset-error" role="alert">
                  {logoError}
                </p>
              )}
            </>
          )}
          <label className="field">
            <span>水印位置</span>
            <select
              value={s.position}
              disabled={s.tile}
              onChange={(e) =>
                update({
                  position: e.target.value as WatermarkStyle['position'],
                })
              }
            >
              {WATERMARK_POSITIONS.map((p, i) => (
                <option key={p} value={p}>
                  {labels[i]}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              [
                'size',
                '水印大小',
                s.kind === 'text' ? 1 : 5,
                s.kind === 'text' ? 20 : 60,
              ],
              ['opacity', '水印不透明度', 0, 100],
              ['rotation', '水印旋转', -90, 90],
              [
                s.tile ? 'spacing' : 'margin',
                s.tile ? '平铺间隔' : '边缘留白',
                0,
                s.tile ? 50 : 20,
              ],
            ] as const
          ).map(([key, label, min, max]) => (
            <label key={key} className="field">
              <span>
                {label}
                <strong>
                  {s[key]}
                  {key === 'rotation' ? '°' : '%'}
                </strong>
              </span>
              <input
                type="range"
                aria-label={label}
                min={min}
                max={max}
                value={s[key]}
                onChange={(e) => update({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={s.tile}
              onChange={(e) => update({ tile: e.target.checked })}
            />
            平铺水印
          </label>
        </>
      )}
    </fieldset>
  );
}
