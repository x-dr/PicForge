import { checkOutput, type ImageBudget } from '../../imaging/budget';
import type { RenderRequest } from '../../imaging/types';
export function processingIssue(
  request: RenderRequest,
  budget: ImageBudget,
): string | null {
  const { width, height } = request.plan;
  const source = request.sources[0];
  const logo = request.watermark?.image;
  const sourcePixels =
    source.width * source.height + (logo ? logo.width * logo.height : 0);
  const issue = checkOutput(width, height, sourcePixels, budget);
  if (issue) return issue;
  if (
    request.format === 'image/avif' &&
    width * height >
      (budget.peakBytes <= 128 * 1024 ** 2 ? 1_500_000 : 4_000_000)
  )
    return 'AVIF 编码像素超出专项预算，请缩小至桌面 400 万 / 移动设备 150 万像素以内。';
  if (request.format === 'image/avif') {
    const reserve = (budget.peakBytes <= 128 * 1024 ** 2 ? 64 : 96) * 1024 ** 2;
    if (
      reserve + sourcePixels * 4 + width * height * 16 + 20 * 360 * 360 * 4 >
      budget.peakBytes
    )
      return 'AVIF 编码预计内存过高，请降低输出尺寸，或先缩小原图后重新导入。';
  }
  return null;
}
