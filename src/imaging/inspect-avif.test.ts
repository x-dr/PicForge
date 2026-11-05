import { expect, it } from 'vitest';
import { inspectImage } from './inspect';
function box(type: string, ...parts: Buffer[]) {
  const data = Buffer.concat(parts);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length + 8);
  head.write(type, 4);
  return Buffer.concat([head, data]);
}
function sample(
  options: { brand?: string; type?: string; transform?: boolean } = {},
) {
  const pitm = Buffer.from([0, 0, 0, 0, 0, 1]);
  const infe = Buffer.concat([
    Buffer.from([2, 0, 0, 0, 0, 1, 0, 0]),
    Buffer.from(options.type ?? 'av01'),
    Buffer.from([0]),
  ]);
  const ispe = Buffer.alloc(12);
  ispe.writeUInt32BE(120, 4);
  ispe.writeUInt32BE(80, 8);
  const ipma = Buffer.from([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    options.transform ? 2 : 1,
    1,
    ...(options.transform ? [2] : []),
  ]);
  const bytes = Buffer.concat([
    box(
      'ftyp',
      Buffer.from('avif'),
      Buffer.alloc(4),
      Buffer.from(options.brand ?? 'avif'),
    ),
    box(
      'meta',
      Buffer.alloc(4),
      box('pitm', pitm),
      box('iinf', Buffer.from([0, 0, 0, 0, 0, 1]), box('infe', infe)),
      box(
        'iprp',
        box(
          'ipco',
          box('ispe', ispe),
          ...(options.transform ? [box('irot', Buffer.from([1]))] : []),
        ),
        box('ipma', ipma),
      ),
    ),
    box('mdat', Buffer.from([0])),
  ]);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
it('uses the primary AV1 item dimensions before allocating a bitmap', () => {
  expect(inspectImage(sample())).toEqual({
    width: 120,
    height: 80,
    orientation: 1,
    format: 'image/avif',
  });
});
it('rejects animated, grid, transformed and truncated AVIF containers', () => {
  expect(() => inspectImage(sample({ brand: 'avis' }))).toThrow('静态');
  expect(() => inspectImage(sample({ type: 'grid' }))).toThrow('网格');
  expect(() => inspectImage(sample({ transform: true }))).toThrow('旋转');
  expect(() => inspectImage(sample().slice(0, -1))).toThrow('容器');
});
