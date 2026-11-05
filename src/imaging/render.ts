import { decodeImage } from './decode';
import { encodeCanvas } from './encode';
import { drawWatermark } from './draw-watermark';
import type { RenderRequest, RenderProgress } from './types';

export async function renderImage(
  request: RenderRequest,
  signal: AbortSignal,
  progress: (value: RenderProgress) => void,
): Promise<Blob> {
  const { plan, preview } = request;
  const scale = preview
    ? Math.min(
        1,
        1400 / Math.max(plan.width, plan.height),
        Math.sqrt(1_600_000 / (plan.width * plan.height)),
      )
    : 1;
  const width = Math.max(1, Math.round(plan.width * scale));
  const height = Math.max(1, Math.round(plan.height * scale));
  const canvas =
    typeof document === 'undefined'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext('2d') as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) throw new Error('无法创建输出画布，请降低尺寸后重试。');
    ctx.scale(width / plan.width, height / plan.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const background =
      plan.background ??
      (request.format === 'image/jpeg' ? request.jpegBackground : null);
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, plan.width, plan.height);
    }
    for (const [index, placement] of plan.placements.entries()) {
      signal.throwIfAborted();
      progress({
        phase: 'drawing',
        done: index + 1,
        total: plan.placements.length,
      });
      const source = request.sources.find((item) => item.id === placement.id);
      if (!source) throw new Error('素材已失效，请重新选择图片。');
      const decoded = await decodeImage(source.file);
      try {
        signal.throwIfAborted();
        const s = placement.source;
        const t = placement.target;
        const sx = decoded.width / source.width;
        const sy = decoded.height / source.height;
        const transform = placement.transform;
        ctx.save();
        if (transform) {
          ctx.translate(t.x + t.width / 2, t.y + t.height / 2);
          ctx.rotate((transform.rotation * Math.PI) / 180);
          ctx.scale(transform.flipX ? -1 : 1, transform.flipY ? -1 : 1);
        }
        const swapped = transform && transform.rotation % 180 !== 0;
        const drawWidth = swapped ? t.height : t.width;
        const drawHeight = swapped ? t.width : t.height;
        ctx.drawImage(
          decoded.image,
          s.x * sx,
          s.y * sy,
          s.width * sx,
          s.height * sy,
          transform ? -drawWidth / 2 : t.x,
          transform ? -drawHeight / 2 : t.y,
          drawWidth,
          drawHeight,
        );
        ctx.restore();
      } finally {
        decoded.close();
      }
      if (typeof document !== 'undefined')
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    await drawWatermark(ctx, request, signal);
    signal.throwIfAborted();
    progress({
      phase: 'encoding',
      done: plan.placements.length,
      total: plan.placements.length,
    });
    const result = await encodeCanvas(
      canvas,
      preview ? 'image/png' : request.format,
      request.quality,
    );
    signal.throwIfAborted();
    return result;
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw new Error(
      error instanceof Error
        ? error.message
        : '生成图片失败，请降低尺寸后重试。',
    );
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
