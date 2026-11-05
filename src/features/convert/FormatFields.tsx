import { useProcessing } from '../processing/ProcessingContext';
import { FORMATS, type ProcessingMode } from '../processing/model';
import type { OutputFormat } from '../../imaging/types';
import { useFormatCapability } from './use-format-capability';
export function FormatFields({ mode }: { mode: ProcessingMode }) {
  const { settings: s, patch } = useProcessing(mode);
  const capability = useFormatCapability(s.format);
  const formats = mode === 'transform' ? FORMATS.slice(0, 2) : FORMATS;
  return (
    <fieldset>
      <legend>
        {mode === 'convert' ? '01' : mode === 'batch' ? '05' : '04'} /
        编码与压缩
      </legend>
      <label className="field">
        <span>输出格式</span>
        <select
          aria-label="输出格式"
          value={s.format}
          onChange={(e) => patch({ format: e.target.value as OutputFormat })}
        >
          {formats.map((f) => (
            <option key={f} value={f}>
              {f.slice(6).toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      {s.format !== 'image/png' && (
        <label className="field">
          <span>
            编码质量<strong>{Math.round(s.quality * 100)}%</strong>
          </span>
          <input
            type="range"
            aria-label="编码质量"
            min="10"
            max="100"
            value={Math.round(s.quality * 100)}
            onChange={(e) => patch({ quality: Number(e.target.value) / 100 })}
          />
        </label>
      )}
      {s.format === 'image/jpeg' && (
        <label className="field">
          <span>JPEG 透明区底色</span>
          <input
            type="color"
            value={s.jpegBackground}
            onChange={(e) => patch({ jpegBackground: e.target.value })}
          />
        </label>
      )}
      <p className="microcopy">
        {s.format === 'image/png'
          ? 'PNG 保留透明度。降低像素尺寸可以减少体积。'
          : '有损编码不保证更小，实际体积以结果为准。'}
        {s.format === 'image/avif'
          ? ' AVIF 首次使用会加载本地编码器，适合较小图片。'
          : ''}
      </p>
      <p className="microcopy" role="status">
        {capability.checking
          ? '正在检测格式能力…'
          : `编码：${capability.encoding} · 解码：${capability.decoding}`}
      </p>
      {capability.error && (
        <div className="asset-error" role="alert">
          {capability.error}
          <button className="text-button" onClick={capability.retry}>
            重新检测格式
          </button>
        </div>
      )}
    </fieldset>
  );
}
