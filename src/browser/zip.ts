export interface ZipEntry {
  name: string;
  blob: Blob;
}
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  return c >>> 0;
});
async function checksum(blob: Blob, signal: AbortSignal) {
  let crc = 0xffffffff;
  const reader = blob.stream().getReader();
  const abort = () => {
    void reader.cancel();
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      for (const byte of value) crc = (crc >>> 8) ^ table[(crc ^ byte) & 255];
      await new Promise<void>((r) => setTimeout(r, 0));
    }
    signal.throwIfAborted();
    return (crc ^ 0xffffffff) >>> 0;
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}
function header(size: number) {
  const bytes = new Uint8Array(size);
  return { bytes, view: new DataView(bytes.buffer) };
}
// ZIP32, UTF-8 names, stored files. Existing image Blobs are reused as Blob parts.
export async function createZip(
  entries: ZipEntry[],
  maxBytes: number,
  signal: AbortSignal,
  progress: (done: number) => void,
): Promise<Blob> {
  if (!entries.length || entries.length > 65535)
    throw new Error('没有可打包的结果。');
  const total = entries.reduce(
    (n, e) =>
      n + e.blob.size + new TextEncoder().encode(e.name).length * 2 + 76,
    22,
  );
  if (total > maxBytes || total >= 0xffffffff)
    throw new Error('ZIP 超出内存预算，请逐项下载或分批打包。');
  const seen = new Set<string>();
  const parts: BlobPart[] = [];
  const directory: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const [i, entry] of entries.entries()) {
    signal.throwIfAborted();
    if (
      !entry.name ||
      /[/\\]/.test(entry.name) ||
      Array.from(entry.name).some((c) => c.charCodeAt(0) < 32) ||
      ['.', '..'].includes(entry.name) ||
      seen.has(entry.name.toLowerCase())
    )
      throw new Error('ZIP 文件名无效或重复。');
    seen.add(entry.name.toLowerCase());
    const name = new TextEncoder().encode(entry.name);
    if (name.length > 65535) throw new Error('ZIP 文件名过长。');
    const crc = await checksum(entry.blob, signal);
    const local = header(30 + name.length);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x800, true);
    local.view.setUint16(12, 33, true); // 1980-01-01, stable DOS date
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, entry.blob.size, true);
    local.view.setUint32(22, entry.blob.size, true);
    local.view.setUint16(26, name.length, true);
    local.bytes.set(name, 30);
    const central = header(46 + name.length);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x800, true);
    central.view.setUint16(14, 33, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, entry.blob.size, true);
    central.view.setUint32(24, entry.blob.size, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    central.bytes.set(name, 46);
    parts.push(local.bytes, entry.blob);
    directory.push(central.bytes);
    offset += local.bytes.length + entry.blob.size;
    progress(i + 1);
  }
  signal.throwIfAborted();
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, entries.length, true);
  end.view.setUint16(10, entries.length, true);
  end.view.setUint32(
    12,
    directory.reduce((n, b) => n + b.length, 0),
    true,
  );
  end.view.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end.bytes], {
    type: 'application/zip',
  });
}
