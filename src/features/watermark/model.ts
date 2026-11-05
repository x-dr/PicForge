import type {
  ImageSource,
  OutputFormat,
  RenderRequest,
} from '../../imaging/types';
import {
  DEFAULT_WATERMARK,
  normalizeWatermark,
  type WatermarkStyle,
} from '../../imaging/watermark';

export interface WatermarkSettings extends WatermarkStyle {
  format: OutputFormat;
  quality: number;
}
export const DEFAULT_SETTINGS: WatermarkSettings = {
  ...DEFAULT_WATERMARK,
  format: 'image/png',
  quality: 0.92,
};
export function updateSettings(
  current: WatermarkSettings,
  patch: Partial<WatermarkSettings>,
): WatermarkSettings {
  const input = { ...current, ...patch };
  return {
    ...normalizeWatermark(input),
    format: input.format === 'image/jpeg' ? 'image/jpeg' : 'image/png',
    quality: Number.isFinite(input.quality)
      ? Math.max(0.1, Math.min(1, input.quality))
      : 0.92,
  };
}
export function watermarkRequest(
  source: ImageSource,
  settings: WatermarkSettings,
  logo?: ImageSource,
  preview = false,
): RenderRequest {
  const rectangle = { x: 0, y: 0, width: source.width, height: source.height };
  return {
    plan: {
      width: source.width,
      height: source.height,
      background: null,
      upscaled: false,
      placements: [{ id: source.id, source: rectangle, target: rectangle }],
    },
    sources: [source],
    preview,
    format: settings.format,
    quality: settings.quality,
    jpegBackground: '#ffffff',
    watermark: { style: { ...settings }, image: logo },
  };
}
