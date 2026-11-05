import {
  DEFAULT_TRANSFORM,
  normalizeTransform,
  transformPlan,
  type TransformSettings,
} from '../../imaging/transform';
import {
  DEFAULT_WATERMARK,
  normalizeWatermark,
  type WatermarkStyle,
} from '../../imaging/watermark';
import type {
  ImageSource,
  OutputFormat,
  RenderRequest,
} from '../../imaging/types';
export type ProcessingMode = 'transform' | 'convert' | 'batch';
export const FORMATS: OutputFormat[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
];
export interface PipelineSettings {
  transform: TransformSettings;
  watermarkEnabled: boolean;
  watermark: WatermarkStyle;
  format: OutputFormat;
  quality: number;
  jpegBackground: string;
  naming: string;
}
export function defaults(): PipelineSettings {
  return {
    transform: { ...DEFAULT_TRANSFORM },
    watermarkEnabled: false,
    watermark: { ...DEFAULT_WATERMARK },
    format: 'image/png',
    quality: 0.85,
    jpegBackground: '#ffffff',
    naming: '{name}-{index}',
  };
}
export function normalizePipeline(s: PipelineSettings): PipelineSettings {
  return {
    transform: normalizeTransform(s.transform),
    watermarkEnabled: !!s.watermarkEnabled,
    watermark: normalizeWatermark(s.watermark),
    format: FORMATS.includes(s.format) ? s.format : 'image/png',
    quality: Number.isFinite(s.quality)
      ? Math.max(0.1, Math.min(1, s.quality))
      : 0.85,
    jpegBackground: /^#[\da-f]{6}$/i.test(s.jpegBackground)
      ? s.jpegBackground
      : '#ffffff',
    naming:
      typeof s.naming === 'string' ? s.naming.slice(0, 100) : '{name}-{index}',
  };
}
export function pipelineRequest(
  source: ImageSource,
  settings: PipelineSettings,
  logo?: ImageSource,
  preview = false,
): RenderRequest {
  const s = normalizePipeline(settings);
  if (
    s.watermarkEnabled &&
    (s.watermark.kind === 'image' ? !logo : !s.watermark.text.trim())
  )
    throw new Error(
      s.watermark.kind === 'image'
        ? '请重新选择本地水印图片。'
        : '请填写水印文字。',
    );
  return {
    plan: transformPlan(source, s.transform),
    sources: [source],
    preview,
    format: s.format,
    quality: s.quality,
    jpegBackground: s.jpegBackground,
    watermark: s.watermarkEnabled
      ? { style: s.watermark, image: logo }
      : undefined,
  };
}
export function pipelineValidation(
  s: PipelineSettings,
  logo?: ImageSource,
): string {
  if (
    !s.naming.trim() ||
    /\{[^}]*\}/g.test(s.naming.replace(/\{name\}|\{index\}/g, '')) ||
    /[{}]/.test(s.naming.replace(/\{name\}|\{index\}/g, ''))
  )
    return '命名规则只支持 {name} 和 {index}，请填写有效名称。';
  if (
    s.watermarkEnabled &&
    s.watermark.kind === 'text' &&
    !s.watermark.text.trim()
  )
    return '请填写水印文字。';
  if (s.watermarkEnabled && s.watermark.kind === 'image' && !logo)
    return '请重新选择本地水印图片。';
  return '';
}
