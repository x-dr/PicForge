import {
  CROP_RATIOS,
  cropRectangle,
  type TransformSettings,
} from '../../imaging/transform';
import type { AssetRecord } from '../../imaging/types';
import styles from '../processing/Processing.module.css';
export function TransformFields({
  value: s,
  patch,
  selected,
}: {
  value: TransformSettings;
  patch: (s: Partial<TransformSettings>) => void;
  selected?: AssetRecord;
}) {
  const crop = selected
    ? cropRectangle(selected.width, selected.height, s)
    : undefined;
  return (
    <>
      <fieldset>
        <legend>01 / 裁剪</legend>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={s.crop}
            onChange={(e) => patch({ crop: e.target.checked })}
          />
          启用裁剪
        </label>
        {s.crop && (
          <>
            <label className="field">
              <span>裁剪比例</span>
              <select
                aria-label="裁剪比例"
                value={s.ratio}
                onChange={(e) =>
                  patch({ ratio: e.target.value as TransformSettings['ratio'] })
                }
              >
                {CROP_RATIOS.map((r) => (
                  <option key={r} value={r}>
                    {r === 'free' ? '自由比例' : r}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.twoColumns}>
              {(
                [
                  ['x', '裁剪左侧'],
                  ['y', '裁剪顶部'],
                  ['cropWidth', '裁剪宽度'],
                  ['cropHeight', '裁剪高度'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="field">
                  <span>{label} %</span>
                  <input
                    type="number"
                    aria-label={`${label}百分比`}
                    min={key === 'x' || key === 'y' ? 0 : 1}
                    max="100"
                    step="0.1"
                    value={Number(s[key].toFixed(1))}
                    onChange={(e) => patch({ [key]: e.target.valueAsNumber })}
                  />
                </label>
              ))}
            </div>
            <p className="microcopy">
              可在预览下方拖动选区。固定比例在选区内居中裁切。
            </p>
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>02 / 缩放</legend>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={s.resize}
            onChange={(e) =>
              patch({
                resize: e.target.checked,
                width: crop?.width ?? s.width,
                height: crop?.height ?? s.height,
              })
            }
          />
          启用缩放
        </label>
        {s.resize && (
          <>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={s.lockAspect}
                onChange={(e) => patch({ lockAspect: e.target.checked })}
              />
              锁定宽高比
            </label>
            <div className={styles.twoColumns}>
              <label className="field">
                <span>缩放宽度 px</span>
                <input
                  type="number"
                  aria-label="缩放宽度"
                  min="1"
                  max="8192"
                  value={s.width}
                  onChange={(e) => patch({ width: e.target.valueAsNumber })}
                />
              </label>
              <label className="field">
                <span>缩放高度 px</span>
                <input
                  type="number"
                  aria-label="缩放高度"
                  min="1"
                  max="8192"
                  value={
                    s.lockAspect && crop
                      ? Math.max(
                          1,
                          Math.round((s.width * crop.height) / crop.width),
                        )
                      : s.height
                  }
                  onChange={(e) => {
                    const height = e.target.valueAsNumber;
                    patch(
                      s.lockAspect && crop
                        ? {
                            width: Math.round(
                              (height * crop.width) / crop.height,
                            ),
                            height,
                          }
                        : { height },
                    );
                  }}
                />
              </label>
            </div>
            <p className="microcopy">
              尺寸在旋转前应用。等比高度按裁剪结果计算。
            </p>
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>03 / 方向</legend>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={s.orient}
            onChange={(e) => patch({ orient: e.target.checked })}
          />
          启用旋转与翻转
        </label>
        {s.orient && (
          <>
            <label className="field">
              <span>顺时针旋转</span>
              <select
                aria-label="顺时针旋转"
                value={s.rotation}
                onChange={(e) =>
                  patch({
                    rotation: Number(
                      e.target.value,
                    ) as TransformSettings['rotation'],
                  })
                }
              >
                {[0, 90, 180, 270].map((r) => (
                  <option key={r} value={r}>
                    {r}°
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <button
                className={`button secondary ${s.flipX ? styles.pressed : ''}`}
                aria-pressed={s.flipX}
                onClick={() => patch({ flipX: !s.flipX })}
              >
                水平翻转
              </button>
              <button
                className={`button secondary ${s.flipY ? styles.pressed : ''}`}
                aria-pressed={s.flipY}
                onClick={() => patch({ flipY: !s.flipY })}
              >
                垂直翻转
              </button>
            </div>
            <p className="microcopy">先按原图坐标翻转，再顺时针旋转。</p>
          </>
        )}
      </fieldset>
    </>
  );
}
