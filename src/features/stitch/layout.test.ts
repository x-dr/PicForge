import { describe, expect, it } from 'vitest';
import { calculateLayout } from './layout';
import { DEFAULT_SETTINGS as defaults, normalizeSettings } from './document';
const images = [
  { id: 'a', width: 400, height: 200 },
  { id: 'b', width: 100, height: 300 },
  { id: 'c', width: 100, height: 100 },
];
describe('stitch geometry', () => {
  it('has no render plan for an empty list', () =>
    expect(calculateLayout([], defaults)).toBeNull());
  it('accumulates integer target boundaries vertically', () => {
    const plan = calculateLayout(images, { ...defaults, size: 100 })!;
    expect([plan.width, plan.height]).toEqual([132, 514]);
    expect(plan.placements.map((item) => item.target.y)).toEqual([16, 82, 398]);
  });
  it('normalizes horizontal heights and preserves order', () => {
    const plan = calculateLayout(images, {
      ...defaults,
      mode: 'horizontal',
      size: 100,
    })!;
    expect([plan.width, plan.height]).toEqual([397, 132]);
    expect(plan.placements.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(plan.placements.map((item) => item.target.x)).toEqual([
      16, 232, 281,
    ]);
  });
  it('retains empty cells in the final grid row', () => {
    const plan = calculateLayout(images, {
      ...defaults,
      mode: 'grid',
      cellWidth: 100,
      cellHeight: 80,
    })!;
    expect([plan.width, plan.height]).toEqual([248, 208]);
    expect(plan.placements[0].target).toEqual({
      x: 16,
      y: 31,
      width: 100,
      height: 50,
    });
    expect(plan.placements[2].target).toEqual({
      x: 26,
      y: 112,
      width: 80,
      height: 80,
    });
  });
  it('uses the effective column count for one image', () => {
    expect(
      calculateLayout(images.slice(0, 1), {
        ...defaults,
        mode: 'grid',
        columns: 5,
      })!.width,
    ).toBe(632);
  });
  it('center crops in cover mode and detects enlargement', () => {
    const plan = calculateLayout(images.slice(0, 1), {
      ...defaults,
      mode: 'grid',
      fit: 'cover',
      cellWidth: 100,
      cellHeight: 100,
    })!;
    expect(plan.placements[0].source).toEqual({
      x: 100,
      y: 0,
      width: 200,
      height: 200,
    });
    expect(plan.upscaled).toBe(false);
    expect(calculateLayout(images, defaults)!.upscaled).toBe(true);
  });
  it('rejects invalid sources and normalizes hostile preferences', () => {
    expect(() =>
      calculateLayout([{ id: 'x', width: 0, height: 20 }], defaults),
    ).toThrow();
    expect(
      normalizeSettings({
        size: Infinity,
        columns: -4,
        gap: 2.8,
        background: 'url(x)',
        quality: NaN,
      }),
    ).toMatchObject({
      size: 1200,
      columns: 1,
      gap: 3,
      background: '#ffffff',
      quality: 0.92,
    });
  });
});
