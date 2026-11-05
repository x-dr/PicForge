import { deflateSync } from 'node:zlib';
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Buffer): Buffer {
  const type = Buffer.from(name);
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([prefix, type, data, crc]);
}
export function png(
  width: number,
  height: number,
  rgba = [230, 40, 40, 255],
  animated = false,
): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const row = Buffer.alloc(width * 4 + 1);
  for (let i = 0; i < width; i++) row.set(rgba, i * 4 + 1);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    ...(animated ? [chunk('acTL', Buffer.from([0, 0, 0, 2, 0, 0, 0, 0]))] : []),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
export const red = {
  name: '红色.png',
  mimeType: 'image/png',
  buffer: png(80, 40),
};
export const blue = {
  name: '蓝色.png',
  mimeType: 'image/png',
  buffer: png(40, 80, [30, 70, 230, 255]),
};
export const green = {
  name: '绿色.png',
  mimeType: 'image/png',
  buffer: png(40, 40, [30, 180, 70, 255]),
};
export function withExif(jpeg: Buffer, orientation: number): Buffer {
  const segment = Buffer.alloc(36);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  segment.writeUInt16BE(34, 2);
  segment.write('Exif\0\0', 4, 'binary');
  segment.write('II', 10);
  segment.writeUInt16LE(42, 12);
  segment.writeUInt32LE(8, 14);
  segment.writeUInt16LE(1, 18);
  segment.writeUInt16LE(0x112, 20);
  segment.writeUInt16LE(3, 22);
  segment.writeUInt32LE(1, 24);
  segment.writeUInt16LE(orientation, 28);
  return Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
}
