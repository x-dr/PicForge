export interface ImageBudget {
  maxImages: number;
  maxFileBytes: number;
  sourcePixels: number;
  outputPixels: number;
  maxSide: number;
  peakBytes: number;
}

export const DESKTOP_BUDGET: ImageBudget = {
  maxImages: 20,
  maxFileBytes: 20 * 1024 ** 2,
  sourcePixels: 24_000_000,
  outputPixels: 16_000_000,
  maxSide: 8192,
  peakBytes: 256 * 1024 ** 2,
};
export const MOBILE_BUDGET: ImageBudget = {
  ...DESKTOP_BUDGET,
  sourcePixels: 12_000_000,
  outputPixels: 6_000_000,
  peakBytes: 128 * 1024 ** 2,
};
export function checkSource(
  width: number,
  height: number,
  budget: ImageBudget,
): void {
  if (
    width < 1 ||
    height < 1 ||
    width > budget.maxSide ||
    height > budget.maxSide ||
    width * height > budget.sourcePixels
  ) {
    throw new Error(
      `原图像素超出保护范围（最长边 ${budget.maxSide}px，最多 ${budget.sourcePixels / 1_000_000} 百万像素），请先缩小原图。`,
    );
  }
}
export function checkOutput(
  width: number,
  height: number,
  sourcePixels: number,
  budget: ImageBudget,
): string | null {
  if (
    width > budget.maxSide ||
    height > budget.maxSide ||
    width * height > budget.outputPixels
  ) {
    return `输出超出保护范围（最长边 ${budget.maxSide}px，最多 ${budget.outputPixels / 1_000_000} 百万像素），请降低内容尺寸或减少图片。`;
  }
  const estimatedPeak =
    width * height * 8 + sourcePixels * 4 + 20 * 360 * 360 * 4;
  return estimatedPeak > budget.peakBytes
    ? '预计内存用量过高，请降低输出尺寸。'
    : null;
}
