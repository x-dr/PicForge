import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WATERMARK,
  normalizeWatermark,
  watermarkGeometry,
  WATERMARK_POSITIONS,
} from './watermark';

describe('watermark geometry', () => {
  it('places rotated bounds inside all nine anchors', () => {
    for (const position of WATERMARK_POSITIONS) {
      const geometry = watermarkGeometry(800, 400, 160, 40, {
        ...DEFAULT_WATERMARK,
        position,
        rotation: 45,
        margin: 5,
      });
      const { x, y } = geometry.centers[0];
      expect(x - geometry.boundWidth / 2).toBeGreaterThanOrEqual(20 - 1e-8);
      expect(y - geometry.boundHeight / 2).toBeGreaterThanOrEqual(20 - 1e-8);
      expect(x + geometry.boundWidth / 2).toBeLessThanOrEqual(780 + 1e-8);
      expect(y + geometry.boundHeight / 2).toBeLessThanOrEqual(380 + 1e-8);
    }
  });
  it('fits very long text and tall logos without changing aspect ratio', () => {
    for (const [width, height] of [
      [6000, 40],
      [10, 9000],
    ]) {
      const geometry = watermarkGeometry(100, 200, width, height, {
        ...DEFAULT_WATERMARK,
        rotation: 90,
      });
      expect(geometry.boundWidth).toBeLessThanOrEqual(92 + 1e-8);
      expect(geometry.boundHeight).toBeLessThanOrEqual(192 + 1e-8);
      expect(geometry.width / geometry.height).toBeCloseTo(width / height);
    }
  });
  it('bounds dense tiling and leaves no overlaps between rotated bounds', () => {
    const style = {
      ...DEFAULT_WATERMARK,
      tile: true,
      spacing: 0,
      rotation: 30,
    };
    const tiny = watermarkGeometry(8192, 8192, 1, 1, style);
    expect(tiny.centers.length).toBeLessThanOrEqual(400);
    const geometry = watermarkGeometry(800, 400, 100, 20, style);
    expect(
      geometry.centers[1].x - geometry.centers[0].x,
    ).toBeGreaterThanOrEqual(geometry.boundWidth - 1e-8);
  });
  it('normalizes invalid values, limits unicode characters and retains zero opacity', () => {
    const style = normalizeWatermark({
      text: '😀'.repeat(100),
      size: Infinity,
      opacity: 0,
      rotation: 200,
      color: 'red',
      margin: -2,
    });
    expect(Array.from(style.text)).toHaveLength(80);
    expect(style.size).toBe(DEFAULT_WATERMARK.size);
    expect(style.opacity).toBe(0);
    expect(style.rotation).toBe(90);
    expect(style.color).toBe('#ffffff');
    expect(style.margin).toBe(0);
  });
});
