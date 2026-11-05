import type { ImageSource, Rect, RenderPlan } from './types';
export const CROP_RATIOS = [
  'free',
  '1:1',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
] as const;
export interface TransformSettings {
  crop: boolean;
  ratio: (typeof CROP_RATIOS)[number];
  x: number;
  y: number;
  cropWidth: number;
  cropHeight: number;
  resize: boolean;
  width: number;
  height: number;
  lockAspect: boolean;
  orient: boolean;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
}
export const DEFAULT_TRANSFORM: TransformSettings = {
  crop: false,
  ratio: 'free',
  x: 0,
  y: 0,
  cropWidth: 100,
  cropHeight: 100,
  resize: false,
  width: 1200,
  height: 1200,
  lockAspect: true,
  orient: true,
  rotation: 0,
  flipX: false,
  flipY: false,
};
const clamp = (n: number, min: number, max: number, fallback: number) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
export function normalizeTransform(
  input: TransformSettings,
): TransformSettings {
  const x = clamp(input.x, 0, 99, 0);
  const y = clamp(input.y, 0, 99, 0);
  return {
    crop: !!input.crop,
    ratio: CROP_RATIOS.includes(input.ratio) ? input.ratio : 'free',
    x,
    y,
    cropWidth: clamp(input.cropWidth, 1, 100 - x, 100 - x),
    cropHeight: clamp(input.cropHeight, 1, 100 - y, 100 - y),
    resize: !!input.resize,
    width: Math.round(clamp(input.width, 1, 8192, 1200)),
    height: Math.round(clamp(input.height, 1, 8192, 1200)),
    lockAspect: !!input.lockAspect,
    orient: !!input.orient,
    rotation: [0, 90, 180, 270].includes(input.rotation) ? input.rotation : 0,
    flipX: !!input.flipX,
    flipY: !!input.flipY,
  };
}
export function cropRectangle(
  width: number,
  height: number,
  settings: TransformSettings,
): Rect {
  const s = normalizeTransform(settings);
  if (!s.crop) return { x: 0, y: 0, width, height };
  const box = {
    x: (width * s.x) / 100,
    y: (height * s.y) / 100,
    width: (width * s.cropWidth) / 100,
    height: (height * s.cropHeight) / 100,
  };
  if (s.ratio !== 'free') {
    const [rw, rh] = s.ratio.split(':').map(Number);
    const w = Math.min(box.width, (box.height * rw) / rh);
    const h = (w * rh) / rw;
    box.x += (box.width - w) / 2;
    box.y += (box.height - h) / 2;
    box.width = w;
    box.height = h;
  }
  const x = Math.min(width - 1, Math.round(box.x));
  const y = Math.min(height - 1, Math.round(box.y));
  return {
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.round(box.width))),
    height: Math.max(1, Math.min(height - y, Math.round(box.height))),
  };
}
export function transformPlan(
  source: Pick<ImageSource, 'id' | 'width' | 'height'>,
  settings: TransformSettings,
): RenderPlan {
  const s = normalizeTransform(settings);
  const crop = cropRectangle(source.width, source.height, s);
  const w = s.resize ? s.width : crop.width;
  const h = s.resize
    ? s.lockAspect
      ? Math.max(1, Math.round((w * crop.height) / crop.width))
      : s.height
    : crop.height;
  const rotation = s.orient ? s.rotation : 0;
  const swapped = rotation % 180 !== 0;
  const width = swapped ? h : w;
  const height = swapped ? w : h;
  return {
    width,
    height,
    background: null,
    upscaled: w > crop.width || h > crop.height,
    placements: [
      {
        id: source.id,
        source: crop,
        target: { x: 0, y: 0, width, height },
        transform: {
          rotation,
          flipX: s.orient && s.flipX,
          flipY: s.orient && s.flipY,
        },
      },
    ],
  };
}
