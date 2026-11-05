import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../../app/Icon';
import {
  DEFAULT_SETTINGS,
  NUMBER_LIMITS,
  type NumericSetting,
  type LayoutMode,
} from './document';
import { useEditor } from './EditorContext';
import styles from '../../app/SettingsPanel.module.css';

function NumberField({
  label,
  field,
  unit = 'px',
}: {
  label: string;
  field: NumericSetting;
  unit?: string;
}) {
  const {
    document: { settings },
    dispatch,
  } = useEditor();
  const [min, max] = NUMBER_LIMITS[field];
  const [draft, setDraft] = useState(String(settings[field]));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setDraft(String(settings[field]));
    setInvalid(false);
  }, [settings, field]);
  return (
    <label className="field">
      <span>{label}</span>
      <span className="number-input">
        <input
          aria-label={label}
          aria-invalid={invalid}
          title={`请输入 ${min}–${max} 之间的整数`}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={draft}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            const number = Number(value);
            const valid =
              value !== '' &&
              Number.isInteger(number) &&
              number >= min &&
              number <= max;
            setInvalid(!valid);
            if (valid)
              dispatch({ type: 'settings', patch: { [field]: number } });
          }}
          onBlur={() => {
            setDraft(String(settings[field]));
            setInvalid(false);
          }}
        />
        <span>{unit}</span>
      </span>
      {invalid && (
        <small>
          请输入 {min}–{max} 之间的整数，当前保留上次有效值。
        </small>
      )}
    </label>
  );
}
const modes: { value: LayoutMode; title: string; icon: IconName }[] = [
  { value: 'vertical', title: '纵向', icon: 'vertical' },
  { value: 'horizontal', title: '横向', icon: 'horizontal' },
  { value: 'grid', title: '宫格', icon: 'grid' },
];
export function SettingsPanel() {
  const {
    document: { settings },
    dispatch,
  } = useEditor();
  const [expanded, setExpanded] = useState(
    () => !matchMedia('(max-width: 767px)').matches,
  );
  const patch = (
    value: Parameters<typeof dispatch>[0] & { type: 'settings' },
  ) => dispatch(value);
  return (
    <details
      className={styles.settings}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="panel-heading">
        <span>拼接设置</span>
        <Icon name="arrowDown" size={16} />
      </summary>
      <div className={styles.settingsBody}>
        <fieldset>
          <legend>布局方式</legend>
          <div className={styles.modeChoices}>
            {modes.map((mode) => (
              <button
                key={mode.value}
                className={`${styles.modeButton} ${settings.mode === mode.value ? styles.selected : ''}`}
                aria-pressed={settings.mode === mode.value}
                onClick={() =>
                  patch({ type: 'settings', patch: { mode: mode.value } })
                }
              >
                <Icon name={mode.icon} size={23} />
                <span>{mode.title}</span>
              </button>
            ))}
          </div>
          <p className="microcopy">
            {settings.mode === 'vertical'
              ? '统一宽度，上下拼接'
              : settings.mode === 'horizontal'
                ? '统一高度，左右拼接'
                : '规则排列，末行保留空格'}
          </p>
        </fieldset>
        <fieldset>
          <legend>画布尺寸</legend>
          {settings.mode === 'grid' ? (
            <>
              <NumberField label="宫格列数" field="columns" unit="列" />
              <div className="field-row">
                <NumberField label="单元格宽" field="cellWidth" />
                <NumberField label="单元格高" field="cellHeight" />
              </div>
              <label className="field">
                <span>图片适应</span>
                <select
                  value={settings.fit}
                  onChange={(event) =>
                    patch({
                      type: 'settings',
                      patch: { fit: event.target.value as 'contain' | 'cover' },
                    })
                  }
                  aria-label="图片适应"
                >
                  <option value="contain">完整显示 · 保持比例</option>
                  <option value="cover">填满裁切 · 居中裁切</option>
                </select>
              </label>
            </>
          ) : (
            <NumberField
              label={settings.mode === 'vertical' ? '内容宽度' : '内容高度'}
              field="size"
            />
          )}
          <div className="field-row">
            <NumberField label="图片间距" field="gap" />
            <NumberField label="外边距" field="padding" />
          </div>
        </fieldset>
        <fieldset>
          <legend>背景颜色</legend>
          <div className={styles.swatches}>
            {['#ffffff', '#f4f1ed', '#e9e7f6', '#151823'].map((color) => (
              <button
                key={color}
                aria-label={`背景 ${color}`}
                aria-pressed={
                  !settings.transparent && settings.background === color
                }
                className={`${styles.swatch} ${!settings.transparent && settings.background === color ? styles.activeSwatch : ''}`}
                style={{ backgroundColor: color }}
                onClick={() =>
                  patch({
                    type: 'settings',
                    patch: { background: color, transparent: false },
                  })
                }
              >
                {!settings.transparent && settings.background === color && (
                  <Icon
                    name="check"
                    size={15}
                    style={{ color: color === '#151823' ? '#fff' : '#6155dc' }}
                  />
                )}
              </button>
            ))}
            <button
              className={`${styles.swatch} checkerboard ${settings.transparent ? styles.activeSwatch : ''}`}
              aria-label="透明背景"
              aria-pressed={settings.transparent}
              onClick={() =>
                patch({ type: 'settings', patch: { transparent: true } })
              }
            >
              {settings.transparent && <Icon name="check" size={15} />}
            </button>
          </div>
          <div className={styles.colorInput}>
            <input
              type="color"
              aria-label="自定义背景颜色"
              value={settings.background}
              onChange={(event) =>
                patch({
                  type: 'settings',
                  patch: { background: event.target.value, transparent: false },
                })
              }
            />
            <span>
              {settings.transparent
                ? '透明背景'
                : settings.background.toUpperCase()}
            </span>
            <span>自定义</span>
          </div>
        </fieldset>
        <fieldset>
          <legend>导出设置</legend>
          <div className="segmented" aria-label="导出格式">
            {(['image/png', 'image/jpeg'] as const).map((format) => (
              <button
                key={format}
                aria-pressed={settings.format === format}
                className={settings.format === format ? 'active' : ''}
                onClick={() => patch({ type: 'settings', patch: { format } })}
              >
                {format === 'image/png' ? 'PNG' : 'JPEG'}
              </button>
            ))}
          </div>
          <p className="microcopy">
            {settings.format === 'image/png'
              ? '无损画质，支持透明背景'
              : '适合分享，可调整质量与文件大小'}
          </p>
          {settings.format === 'image/jpeg' && (
            <>
              <label className="field">
                <span>
                  JPEG 质量{' '}
                  <strong>{Math.round(settings.quality * 100)}%</strong>
                </span>
                <input
                  type="range"
                  aria-label="JPEG 质量"
                  min={10}
                  max={100}
                  value={Math.round(settings.quality * 100)}
                  onChange={(event) =>
                    patch({
                      type: 'settings',
                      patch: { quality: Number(event.target.value) / 100 },
                    })
                  }
                />
              </label>
              {settings.transparent && (
                <label className="field">
                  <span>JPEG 透明区域底色</span>
                  <input
                    type="color"
                    aria-label="JPEG 透明区域底色"
                    value={settings.jpegBackground}
                    onChange={(event) =>
                      patch({
                        type: 'settings',
                        patch: { jpegBackground: event.target.value },
                      })
                    }
                  />
                  <small>JPEG 不保留透明通道，将使用此底色。</small>
                </label>
              )}
            </>
          )}
          <label className="field filename-field">
            <span>文件名称</span>
            <div className="number-input">
              <input
                aria-label="文件名称"
                value={settings.filename}
                maxLength={80}
                onChange={(event) =>
                  patch({
                    type: 'settings',
                    patch: { filename: event.target.value },
                  })
                }
              />
              <span>{settings.format === 'image/png' ? '.png' : '.jpg'}</span>
            </div>
          </label>
        </fieldset>
        <button
          className="text-button reset-button"
          onClick={() =>
            dispatch({ type: 'settings', patch: DEFAULT_SETTINGS })
          }
        >
          <Icon name="reset" size={14} />
          恢复默认设置
        </button>
      </div>
    </details>
  );
}
