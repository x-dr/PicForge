import { expect, it } from 'vitest';
import { createZip } from './zip';
it('writes a real UTF-8 ZIP32 archive with correct CRC, offsets and stored bytes', async () => {
  const zip = await createZip(
    [{ name: '测试.png', blob: new Blob(['123456789']) }],
    1000,
    new AbortController().signal,
    () => {},
  );
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const v = new DataView(bytes.buffer);
  expect(v.getUint32(0, true)).toBe(0x04034b50);
  expect(v.getUint16(6, true)).toBe(0x800);
  expect(v.getUint32(14, true)).toBe(0xcbf43926);
  const n = v.getUint16(26, true);
  expect(new TextDecoder().decode(bytes.subarray(30, 30 + n))).toBe('测试.png');
  expect(new TextDecoder().decode(bytes.subarray(30 + n, 39 + n))).toBe(
    '123456789',
  );
  const end = bytes.length - 22;
  const central = v.getUint32(end + 16, true);
  expect(v.getUint32(central, true)).toBe(0x02014b50);
  expect(v.getUint32(central + 42, true)).toBe(0);
  expect(v.getUint16(end + 10, true)).toBe(1);
});
it('rejects oversize, traversal, duplicate and cancelled archives', async () => {
  const entry = { name: 'a.png', blob: new Blob(['x']) };
  const signal = new AbortController().signal;
  await expect(createZip([entry], 1, signal, () => {})).rejects.toThrow('预算');
  await expect(
    createZip([{ ...entry, name: '../a.png' }], 1000, signal, () => {}),
  ).rejects.toThrow('文件名');
  await expect(
    createZip([entry, entry], 1000, signal, () => {}),
  ).rejects.toThrow('重复');
  const c = new AbortController();
  c.abort();
  await expect(createZip([entry], 1000, c.signal, () => {})).rejects.toThrow();
});
it('cancels between entries and never returns a partial archive', async () => {
  const c = new AbortController();
  await expect(
    createZip(
      [
        { name: 'a.png', blob: new Blob(['a']) },
        { name: 'b.png', blob: new Blob(['b']) },
      ],
      1000,
      c.signal,
      () => c.abort(),
    ),
  ).rejects.toThrow();
});
