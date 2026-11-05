import { describe, expect, it } from 'vitest';
import {
  cropRectangle,
  DEFAULT_TRANSFORM,
  normalizeTransform,
  transformPlan,
} from './transform';
const source = { id: 'photo', width: 800, height: 400 };
describe('crop and transform geometry', () => {
  it('fits fixed ratios within the selected rectangle and keeps pixel bounds', () => {
    expect(
      cropRectangle(800, 400, {
        ...DEFAULT_TRANSFORM,
        crop: true,
        ratio: '1:1',
      }),
    ).toEqual({ x: 200, y: 0, width: 400, height: 400 });
    const rect = cropRectangle(101, 57, {
      ...DEFAULT_TRANSFORM,
      crop: true,
      x: 99,
      y: 99,
      cropWidth: 100,
      cropHeight: 100,
    });
    expect(rect.x + rect.width).toBeLessThanOrEqual(101);
    expect(rect.y + rect.height).toBeLessThanOrEqual(57);
    expect(rect.width * rect.height).toBeGreaterThan(0);
  });
  it('crops, scales proportionally, then swaps final dimensions on a quarter turn', () => {
    const plan = transformPlan(source, {
      ...DEFAULT_TRANSFORM,
      crop: true,
      cropWidth: 50,
      resize: true,
      width: 200,
      rotation: 90,
      flipX: true,
    });
    expect([plan.width, plan.height]).toEqual([200, 200]);
    expect(plan.placements[0].source).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 400,
    });
    const rotated = transformPlan(source, {
      ...DEFAULT_TRANSFORM,
      resize: true,
      width: 200,
      rotation: 270,
    });
    expect([rotated.width, rotated.height]).toEqual([100, 200]);
  });
  it('disables steps and clamps nonfinite or out of range user values', () => {
    const s = normalizeTransform({
      ...DEFAULT_TRANSFORM,
      width: NaN,
      height: Infinity,
      x: -5,
      cropHeight: -10,
    });
    expect(s).toMatchObject({ width: 1200, height: 1200, x: 0, cropHeight: 1 });
    const plan = transformPlan(source, {
      ...DEFAULT_TRANSFORM,
      orient: false,
      rotation: 90,
      flipX: true,
    });
    expect([plan.width, plan.height]).toEqual([800, 400]);
    expect(plan.placements[0].transform).toEqual({
      rotation: 0,
      flipX: false,
      flipY: false,
    });
  });
});
