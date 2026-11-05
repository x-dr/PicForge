// Single-thread encoders also work without cross-origin isolation.
// Each adapter and WASM asset is loaded only when native encoding fails.
import type { OutputFormat } from './types';

export async function encodeFallback(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  const context = canvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!context) throw new Error('无法读取输出画布。');
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  if (format === 'image/avif') {
    const { encodeAvif } = await import('./encode-avif');
    return new Blob([await encodeAvif(data, quality)], { type: format });
  }
  if (format === 'image/webp') {
    const { encodeWebp } = await import('./encode-webp');
    return new Blob([await encodeWebp(data, quality)], { type: format });
  }
  throw new Error('当前浏览器不能编码所选格式。');
}
