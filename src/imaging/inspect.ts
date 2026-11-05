import type { ImageHeader } from './types';
import { inspectAvif } from './inspect-avif';

function text(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}
function exifOrientation(view: DataView, start: number, end: number): number {
  if (start + 8 > end) return 1;
  const tiff = view.getUint32(start) === 0x45786966 ? start + 6 : start;
  if (tiff + 8 > end || ![0x4949, 0x4d4d].includes(view.getUint16(tiff)))
    return 1;
  const little = view.getUint16(tiff) === 0x4949;
  if (view.getUint16(tiff + 2, little) !== 42) return 1;
  const offset = tiff + view.getUint32(tiff + 4, little);
  if (offset < tiff || offset + 2 > end) return 1;
  const entries = view.getUint16(offset, little);
  for (let i = 0; i < entries; i++) {
    const at = offset + 2 + i * 12;
    if (at + 12 > end) return 1;
    if (
      view.getUint16(at, little) === 0x0112 &&
      view.getUint16(at + 2, little) === 3 &&
      view.getUint32(at + 4, little) === 1
    ) {
      const orientation = view.getUint16(at + 8, little);
      return orientation >= 1 && orientation <= 8 ? orientation : 1;
    }
  }
  return 1;
}

/** Inspect real container bytes before allocating a decoded bitmap. */
export function inspectImage(buffer: ArrayBuffer): ImageHeader {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const malformed = () =>
    new Error('图片头部损坏或不完整，请重新选择有效图片。');
  if (bytes.length >= 12 && text(bytes, 4, 4) === 'ftyp')
    return inspectAvif(buffer);
  if (
    bytes.length >= 24 &&
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a
  ) {
    if (text(bytes, 12, 4) !== 'IHDR' || view.getUint32(8) !== 13)
      throw malformed();
    let ended = false;
    let orientation = 1;
    for (let at = 8; at + 12 <= bytes.length;) {
      const length = view.getUint32(at);
      if (at + 12 + length > bytes.length) throw malformed();
      const kind = text(bytes, at + 4, 4);
      if (kind === 'acTL')
        throw new Error('暂不支持动态 PNG（APNG），请选择静态图片。');
      if (kind === 'eXIf')
        orientation = exifOrientation(view, at + 8, at + 8 + length);
      if (kind === 'IEND') {
        ended = true;
        break;
      }
      at += length + 12;
    }
    if (!ended) throw malformed();
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
      format: 'image/png',
      orientation,
    };
  }
  if (
    bytes.length >= 12 &&
    text(bytes, 0, 4) === 'RIFF' &&
    text(bytes, 8, 4) === 'WEBP'
  ) {
    const end = view.getUint32(4, true) + 8;
    if (end > bytes.length || end < 12) throw malformed();
    let dimensions: { width: number; height: number } | undefined;
    let orientation = 1;
    for (let at = 12; at + 8 <= end;) {
      const kind = text(bytes, at, 4);
      const size = view.getUint32(at + 4, true);
      const data = at + 8;
      if (data + size > end) throw malformed();
      if (kind === 'ANIM' || kind === 'ANMF')
        throw new Error('暂不支持动态 WebP，请选择静态图片。');
      if (kind === 'EXIF')
        orientation = exifOrientation(view, data, data + size);
      if (kind === 'VP8X' && size >= 10) {
        if (bytes[data] & 2)
          throw new Error('暂不支持动态 WebP，请选择静态图片。');
        const u24 = (p: number) =>
          bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16);
        dimensions = { width: u24(data + 4) + 1, height: u24(data + 7) + 1 };
      } else if (
        kind === 'VP8 ' &&
        size >= 10 &&
        text(bytes, data + 3, 3) === '\x9d\x01\x2a'
      ) {
        dimensions ??= {
          width: view.getUint16(data + 6, true) & 0x3fff,
          height: view.getUint16(data + 8, true) & 0x3fff,
        };
      } else if (kind === 'VP8L' && size >= 5 && bytes[data] === 0x2f) {
        const bits = view.getUint32(data + 1, true);
        dimensions ??= {
          width: (bits & 0x3fff) + 1,
          height: ((bits >>> 14) & 0x3fff) + 1,
        };
      }
      at += 8 + size + (size % 2);
    }
    if (!dimensions) throw malformed();
    return { ...dimensions, format: 'image/webp', orientation };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let dimensions: { width: number; height: number } | undefined;
    let orientation = 1;
    for (let at = 2; at < bytes.length;) {
      if (bytes[at] !== 0xff) throw malformed();
      while (bytes[at] === 0xff) at++;
      const marker = bytes[at++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (at + 2 > bytes.length) throw malformed();
      const length = view.getUint16(at);
      if (length < 2 || at + length > bytes.length) throw malformed();
      if (
        marker === 0xe1 &&
        length >= 8 &&
        view.getUint32(at + 2) === 0x45786966 &&
        view.getUint16(at + 6) === 0
      )
        orientation = exifOrientation(view, at + 2, at + length);
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker) &&
        length >= 8
      ) {
        dimensions = {
          height: view.getUint16(at + 3),
          width: view.getUint16(at + 5),
        };
      }
      at += length;
    }
    if (!dimensions) throw malformed();
    return { ...dimensions, format: 'image/jpeg', orientation };
  }
  throw new Error(
    '格式不支持。请选择静态 JPEG、PNG、WebP 或 AVIF 图片（按文件实际内容识别）。',
  );
}
