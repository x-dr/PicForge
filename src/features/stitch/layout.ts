import type { ImageSource, Rect, RenderPlan } from '../../imaging/types';
import { normalizeSettings, type StitchSettings } from './document';

export function calculateLayout(
  images: Pick<ImageSource, 'id' | 'width' | 'height'>[],
  input: StitchSettings,
): RenderPlan | null {
  if (!images.length) return null;
  if (
    images.some(
      (image) =>
        !Number.isInteger(image.width) ||
        !Number.isInteger(image.height) ||
        image.width < 1 ||
        image.height < 1,
    )
  )
    throw new Error('素材尺寸无效。');
  const settings = normalizeSettings(input);
  const {
    mode,
    size,
    gap,
    padding: p,
    cellWidth: cw,
    cellHeight: ch,
  } = settings;
  let width = 0;
  let height = 0;
  let cursor = p;
  let upscaled = false;
  const columns = Math.min(settings.columns, images.length);
  const placements = images.map((image, index) => {
    let source: Rect = { x: 0, y: 0, width: image.width, height: image.height };
    let target: Rect;
    if (mode === 'horizontal') {
      const w = Math.max(1, Math.round((image.width * size) / image.height));
      target = { x: cursor, y: p, width: w, height: size };
      cursor += w + gap;
      width = cursor - gap + p;
      height = size + p * 2;
    } else if (mode === 'vertical') {
      const h = Math.max(1, Math.round((image.height * size) / image.width));
      target = { x: p, y: cursor, width: size, height: h };
      cursor += h + gap;
      width = size + p * 2;
      height = cursor - gap + p;
    } else {
      const x = p + (index % columns) * (cw + gap);
      const y = p + Math.floor(index / columns) * (ch + gap);
      if (settings.fit === 'cover') {
        const ratio = Math.max(cw / image.width, ch / image.height);
        source = {
          x: (image.width - cw / ratio) / 2,
          y: (image.height - ch / ratio) / 2,
          width: cw / ratio,
          height: ch / ratio,
        };
        target = { x, y, width: cw, height: ch };
      } else {
        const ratio = Math.min(cw / image.width, ch / image.height);
        const w = Math.max(1, Math.round(image.width * ratio));
        const h = Math.max(1, Math.round(image.height * ratio));
        target = {
          x: x + Math.floor((cw - w) / 2),
          y: y + Math.floor((ch - h) / 2),
          width: w,
          height: h,
        };
      }
      const rows = Math.ceil(images.length / columns);
      width = columns * cw + (columns - 1) * gap + p * 2;
      height = rows * ch + (rows - 1) * gap + p * 2;
    }
    upscaled ||= target.width > source.width || target.height > source.height;
    return { id: image.id, source, target };
  });
  return {
    width,
    height,
    placements,
    background: settings.transparent ? null : settings.background,
    upscaled,
  };
}
