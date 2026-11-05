import type { OutputFormat } from './types';
export function matchesOutput(bytes: Uint8Array, format: OutputFormat) {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (format === 'image/png')
    return bytes.length >= 8 && ascii(0, 8) === '\x89PNG\r\n\x1a\n';
  if (format === 'image/jpeg')
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (format === 'image/webp')
    return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  return (
    ascii(4, 8) === 'ftyp' &&
    Array.from(
      { length: Math.max(0, Math.floor(bytes.length / 4) - 2) },
      (_, i) => ascii(8 + i * 4, 12 + i * 4),
    ).includes('avif')
  );
}
