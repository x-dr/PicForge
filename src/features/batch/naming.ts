import { outputFilename } from '../../browser/download';
import type { OutputFormat } from '../../imaging/types';
export function batchNames(
  names: string[],
  rule: string,
  format: OutputFormat,
): string[] {
  const used = new Set<string>();
  return names.map((name, i) => {
    const base = rule
      .replaceAll('{name}', name.replace(/\.[^.]+$/, ''))
      .replaceAll('{index}', String(i + 1).padStart(2, '0'));
    let filename = outputFilename(base, format);
    let suffix = 2;
    while (used.has(filename.toLocaleLowerCase()))
      filename = outputFilename(`${base.slice(0, 65)}-${suffix++}`, format);
    used.add(filename.toLocaleLowerCase());
    return filename;
  });
}
