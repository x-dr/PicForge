export const WATERMARK_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;
export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];
export interface WatermarkStyle {
  kind: 'text' | 'image';
  text: string;
  font: 'sans-serif' | 'serif';
  color: string;
  size: number;
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
  tile: boolean;
  margin: number;
  spacing: number;
}
export const DEFAULT_WATERMARK: WatermarkStyle = {
  kind: 'text',
  text: '© 我的作品',
  font: 'sans-serif',
  color: '#ffffff',
  size: 5,
  opacity: 60,
  rotation: 0,
  position: 'bottom-right',
  tile: false,
  margin: 4,
  spacing: 12,
};
export function normalizeWatermark(
  input: Partial<WatermarkStyle>,
): WatermarkStyle {
  const result = { ...DEFAULT_WATERMARK };
  if (input.kind === 'image' || input.kind === 'text') result.kind = input.kind;
  if (typeof input.text === 'string')
    result.text = Array.from(input.text.replace(/[\r\n\t]/g, ' '))
      .slice(0, 80)
      .join('');
  if (input.font === 'sans-serif' || input.font === 'serif')
    result.font = input.font;
  if (/^#[\da-f]{6}$/i.test(input.color ?? '')) result.color = input.color!;
  if (WATERMARK_POSITIONS.includes(input.position!))
    result.position = input.position!;
  if (typeof input.tile === 'boolean') result.tile = input.tile;
  for (const [key, min, max] of [
    ['size', result.kind === 'text' ? 1 : 5, result.kind === 'text' ? 20 : 60],
    ['opacity', 0, 100],
    ['rotation', -90, 90],
    ['margin', 0, 20],
    ['spacing', 0, 50],
  ] as const) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value))
      result[key] = Math.min(max, Math.max(min, value));
  }
  return result;
}
export function watermarkGeometry(
  width: number,
  height: number,
  markWidth: number,
  markHeight: number,
  style: WatermarkStyle,
) {
  const angle = (style.rotation * Math.PI) / 180;
  const margin = (Math.min(width, height) * style.margin) / 100;
  const rotatedWidth =
    Math.abs(markWidth * Math.cos(angle)) +
    Math.abs(markHeight * Math.sin(angle));
  const rotatedHeight =
    Math.abs(markWidth * Math.sin(angle)) +
    Math.abs(markHeight * Math.cos(angle));
  const scale = Math.min(
    1,
    (width - 2 * margin) / rotatedWidth,
    (height - 2 * margin) / rotatedHeight,
  );
  const boundWidth = rotatedWidth * scale;
  const boundHeight = rotatedHeight * scale;
  const centers: { x: number; y: number }[] = [];
  if (style.tile) {
    const gap = (Math.min(width, height) * style.spacing) / 100;
    const stepX = Math.max(boundWidth + gap, width / 18);
    const stepY = Math.max(boundHeight + gap, height / 18);
    for (let y = boundHeight / 2; y < height; y += stepY)
      for (let x = boundWidth / 2; x < width; x += stepX)
        centers.push({ x, y });
  } else {
    const index = WATERMARK_POSITIONS.indexOf(style.position);
    const column = index % 3;
    const row = Math.floor(index / 3);
    centers.push({
      x:
        column === 0
          ? margin + boundWidth / 2
          : column === 1
            ? width / 2
            : width - margin - boundWidth / 2,
      y:
        row === 0
          ? margin + boundHeight / 2
          : row === 1
            ? height / 2
            : height - margin - boundHeight / 2,
    });
  }
  return {
    width: markWidth * scale,
    height: markHeight * scale,
    angle,
    scale,
    centers,
    boundWidth,
    boundHeight,
  };
}
