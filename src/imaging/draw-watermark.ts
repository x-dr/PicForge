import { decodeImage } from './decode';
import type { RenderRequest } from './types';
import { watermarkGeometry } from './watermark';

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export async function drawWatermark(
  ctx: Context,
  request: RenderRequest,
  signal: AbortSignal,
) {
  const overlay = request.watermark;
  if (!overlay) return;
  const { style } = overlay;
  const { width, height } = request.plan;
  const shortSide = Math.min(width, height);
  const size = (shortSide * style.size) / 100;
  let decoded: Awaited<ReturnType<typeof decodeImage>> | undefined;
  ctx.save();
  try {
    let markWidth: number;
    let markHeight: number;
    let ascent = 0;
    const font = `${size}px ${style.font}`;
    if (style.kind === 'text') {
      if (!style.text.trim()) throw new Error('请先填写水印文字。');
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.load(font, style.text);
        await document.fonts.ready;
      }
      signal.throwIfAborted();
      ctx.font = font;
      const metrics = ctx.measureText(style.text);
      markWidth = Math.max(
        1,
        metrics.width,
        metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      );
      ascent = metrics.actualBoundingBoxAscent;
      markHeight = Math.max(1, ascent + metrics.actualBoundingBoxDescent);
    } else {
      if (!overlay.image) throw new Error('请先选择水印图片。');
      decoded = await decodeImage(overlay.image.file);
      signal.throwIfAborted();
      markWidth = size;
      markHeight = (size * decoded.height) / decoded.width;
    }
    const geometry = watermarkGeometry(
      width,
      height,
      markWidth,
      markHeight,
      style,
    );
    ctx.globalAlpha = style.opacity / 100;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const { x, y } of geometry.centers) {
      signal.throwIfAborted();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(geometry.angle);
      ctx.scale(geometry.scale, geometry.scale);
      if (decoded)
        ctx.drawImage(
          decoded.image,
          -markWidth / 2,
          -markHeight / 2,
          markWidth,
          markHeight,
        );
      else ctx.fillText(style.text, 0, -markHeight / 2 + ascent);
      ctx.restore();
    }
  } finally {
    decoded?.close();
    ctx.restore();
  }
}
