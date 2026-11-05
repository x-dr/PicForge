import { inspectImage } from './inspect';
import { checkSource, type ImageBudget } from './budget';
import { decodeImage } from './decode';

export async function importImage(
  file: File,
  budget: ImageBudget,
  signal: AbortSignal,
) {
  if (!file.size) throw new Error('文件为空，请重新选择图片。');
  if (file.size > budget.maxFileBytes)
    throw new Error('单张图片不能超过 20 MiB，请先压缩文件。');
  signal.throwIfAborted();
  const header = inspectImage(await file.arrayBuffer());
  checkSource(header.width, header.height, budget);
  signal.throwIfAborted();
  const decoded = await decodeImage(new Blob([file], { type: header.format }));
  const canvas = document.createElement('canvas');
  try {
    signal.throwIfAborted();
    checkSource(decoded.width, decoded.height, budget);
    const swapped = header.orientation >= 5;
    if (
      decoded.width !== (swapped ? header.height : header.width) ||
      decoded.height !== (swapped ? header.width : header.height)
    ) {
      throw new Error(
        '浏览器方向归一化结果不符合预期，请预先旋转此图后重新选择。',
      );
    }
    const scale = Math.min(1, 360 / Math.max(decoded.width, decoded.height));
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器无法创建画布，请更换浏览器。');
    ctx.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
    const thumbnail = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('缩略图生成失败，请重试。')),
        'image/png',
      ),
    );
    signal.throwIfAborted();
    return {
      width: decoded.width,
      height: decoded.height,
      thumbnail,
      file: new Blob([file], { type: header.format }),
    };
  } finally {
    decoded.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
