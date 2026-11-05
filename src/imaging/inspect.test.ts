import { describe, expect, it } from 'vitest';
import { inspectImage } from './inspect';
import {
  checkOutput,
  checkSource,
  DESKTOP_BUDGET,
  MOBILE_BUDGET,
} from './budget';
function png(animated = false) {
  const bytes = new Uint8Array(animated ? 65 : 45);
  const view = new DataView(bytes.buffer);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  view.setUint32(8, 13);
  bytes.set(new TextEncoder().encode('IHDR'), 12);
  view.setUint32(16, 200);
  view.setUint32(20, 100);
  if (animated) {
    view.setUint32(33, 8);
    bytes.set(new TextEncoder().encode('acTL'), 37);
  }
  bytes.set(new TextEncoder().encode('IEND'), animated ? 57 : 37);
  return bytes.buffer;
}
describe('binary input guards', () => {
  it('does not let a following XMP APP1 segment reset EXIF orientation', () => {
    const exif = new Uint8Array(36);
    const view = new DataView(exif.buffer);
    exif.set([255, 225, 0, 34]);
    exif.set(new TextEncoder().encode('Exif\0\0II'), 4);
    view.setUint16(12, 42, true);
    view.setUint32(14, 8, true);
    view.setUint16(18, 1, true);
    view.setUint16(20, 0x112, true);
    view.setUint16(22, 3, true);
    view.setUint32(24, 1, true);
    view.setUint16(28, 6, true);
    const image = new Uint8Array([
      255,
      216,
      ...exif,
      255,
      225,
      0,
      6,
      88,
      77,
      80,
      0,
      255,
      192,
      0,
      11,
      8,
      0,
      100,
      0,
      200,
      1,
      1,
      17,
      0,
      255,
      217,
    ]);
    expect(inspectImage(image.buffer).orientation).toBe(6);
  });
  it('identifies PNG by content rather than extension', () =>
    expect(inspectImage(png())).toMatchObject({
      width: 200,
      height: 100,
      format: 'image/png',
    }));
  it('rejects animated PNG and malformed containers', () => {
    expect(() => inspectImage(png(true))).toThrow('动态 PNG');
    expect(() => inspectImage(png().slice(0, 30))).toThrow('损坏');
    expect(() =>
      inspectImage(new TextEncoder().encode('<svg/>').buffer),
    ).toThrow('格式不支持');
  });
  it('rejects animated WebP flags before decoding', () => {
    const bytes = new Uint8Array(30);
    const view = new DataView(bytes.buffer);
    bytes.set(new TextEncoder().encode('RIFF'));
    view.setUint32(4, 22, true);
    bytes.set(new TextEncoder().encode('WEBPVP8X'), 8);
    view.setUint32(16, 10, true);
    bytes[20] = 2;
    expect(() => inspectImage(bytes.buffer)).toThrow('动态 WebP');
  });
  it('inspects JPEG frame sizes and rejects broken segments', () => {
    const bytes = new Uint8Array([
      255, 216, 255, 192, 0, 11, 8, 0, 100, 0, 200, 1, 1, 17, 0, 255, 217,
    ]);
    expect(inspectImage(bytes.buffer)).toMatchObject({
      width: 200,
      height: 100,
      format: 'image/jpeg',
    });
    bytes[5] = 100;
    expect(() => inspectImage(bytes.buffer)).toThrow('损坏');
  });
});
describe('pixel and memory protection', () => {
  it('rejects huge sources before browser decode', () => {
    expect(() => checkSource(8192, 8192, DESKTOP_BUDGET)).toThrow('原图像素');
    expect(() => checkSource(4000, 4000, MOBILE_BUDGET)).toThrow();
    expect(() => checkSource(4000, 4000, DESKTOP_BUDGET)).not.toThrow();
  });
  it('validates both area and individual dimensions', () => {
    expect(checkOutput(9000, 10, 1000, DESKTOP_BUDGET)).toContain('输出超出');
    expect(checkOutput(4000, 4000, 1000, MOBILE_BUDGET)).toContain('输出超出');
    expect(checkOutput(1000, 1000, 1000, DESKTOP_BUDGET)).toBeNull();
  });
});
