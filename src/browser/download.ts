import type { OutputFormat } from '../imaging/types';
const activeDownloads = new Map<string, ReturnType<typeof setTimeout>>();
export function outputFilename(input: string, format: OutputFormat): string {
  const cleaned = Array.from(input)
    .map((character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        ? '-'
        : character,
    )
    .join('');
  const name =
    cleaned
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\.(png|jpe?g|webp|avif)$/i, '')
      .trim()
      .slice(0, 80) || 'PicForge-拼图';
  return `${name}.${format === 'image/jpeg' ? 'jpg' : format.slice(6)}`;
}
export function downloadImage(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  activeDownloads.set(
    url,
    setTimeout(() => {
      URL.revokeObjectURL(url);
      activeDownloads.delete(url);
    }, 60_000),
  );
}
export function releaseDownloads(): void {
  for (const [url, timer] of activeDownloads) {
    clearTimeout(timer);
    URL.revokeObjectURL(url);
  }
  activeDownloads.clear();
}
