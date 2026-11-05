import { decodeImage } from './decode';
import type { OutputFormat } from './types';
import { matchesOutput } from './output-signature';

export async function encodeCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  let blob =
    'convertToBlob' in canvas
      ? await canvas.convertToBlob({ type: format, quality })
      : await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value
                ? resolve(value)
                : reject(new Error('编码返回空结果，请降低尺寸后重试。')),
            format,
            quality,
          ),
        );
  if (blob.type !== format && ['image/webp', 'image/avif'].includes(format)) {
    const { encodeFallback } = await import('./codec-fallback');
    blob = await encodeFallback(canvas, format, quality);
  }
  if (!blob.size || blob.type !== format)
    throw new Error('浏览器未能生成所选格式，请切换格式后重试。');
  const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  if (!matchesOutput(bytes, format))
    throw new Error('输出文件签名与格式不一致，已停止下载。');
  const decoded = await decodeImage(blob);
  try {
    if (decoded.width !== canvas.width || decoded.height !== canvas.height)
      throw new Error('输出尺寸校验失败，请降低尺寸后重试。');
  } finally {
    decoded.close();
  }
  return blob;
}
