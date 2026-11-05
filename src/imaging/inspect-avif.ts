import type { ImageHeader } from './types';
interface Box {
  type: string;
  start: number;
  end: number;
}
// Accept the direct, static AV1 subset; reject grids/animation/transforms before decode.
export function inspectAvif(buffer: ArrayBuffer): ImageHeader {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const text = (at: number, n: number) =>
    String.fromCharCode(...bytes.subarray(at, at + n));
  const malformed = () => new Error('AVIF 容器损坏或不支持，请先转换为 PNG。');
  const boxes = (start: number, end: number): Box[] => {
    const result: Box[] = [];
    for (let at = start; at < end;) {
      if (result.length >= 4096) throw malformed();
      if (at + 8 > end) throw malformed();
      const size = view.getUint32(at);
      if (size < 8 || at + size > end) throw malformed();
      result.push({ type: text(at + 4, 4), start: at + 8, end: at + size });
      at += size;
    }
    return result;
  };
  const top = boxes(0, bytes.length);
  const ftyp = top.find((b) => b.type === 'ftyp');
  if (!ftyp || ftyp.end - ftyp.start < 8) throw malformed();
  const brands = [text(ftyp.start, 4)];
  for (let at = ftyp.start + 8; at + 4 <= ftyp.end; at += 4)
    brands.push(text(at, 4));
  if (
    !brands.includes('avif') ||
    brands.includes('avis') ||
    top.some((b) => b.type === 'moov')
  )
    throw new Error('仅支持静态 AVIF，不支持动画或序列。');
  const meta = top.find((b) => b.type === 'meta');
  if (!meta || meta.start + 4 > meta.end) throw malformed();
  const children = boxes(meta.start + 4, meta.end);
  const pitm = children.find((b) => b.type === 'pitm');
  if (!pitm || pitm.end - pitm.start < 6 || view.getUint8(pitm.start) !== 0)
    throw malformed();
  const primary = view.getUint16(pitm.start + 4);
  const iinf = children.find((b) => b.type === 'iinf');
  if (!iinf || iinf.start + 6 > iinf.end || view.getUint8(iinf.start) !== 0)
    throw malformed();
  const entries = boxes(iinf.start + 6, iinf.end);
  const entry = entries.find(
    (b) =>
      b.type === 'infe' &&
      b.end - b.start >= 12 &&
      view.getUint8(b.start) === 2 &&
      view.getUint16(b.start + 4) === primary,
  );
  if (!entry || text(entry.start + 8, 4) !== 'av01')
    throw new Error('暂不支持网格或派生 AVIF，请先转换为 PNG。');
  const iprp = children.find((b) => b.type === 'iprp');
  if (!iprp) throw malformed();
  const properties = boxes(iprp.start, iprp.end);
  const ipco = properties.find((b) => b.type === 'ipco');
  const ipma = properties.find((b) => b.type === 'ipma');
  if (!ipco || !ipma || ipma.start + 8 > ipma.end) throw malformed();
  const propertyList = boxes(ipco.start, ipco.end);
  if (view.getUint8(ipma.start) !== 0) throw malformed();
  const wide = (view.getUint32(ipma.start) & 1) !== 0;
  const count = view.getUint32(ipma.start + 4);
  if (count > 4096) throw malformed();
  let at = ipma.start + 8;
  let dimensions: { width: number; height: number } | undefined;
  for (let i = 0; i < count; i++) {
    if (at + 3 > ipma.end) throw malformed();
    const id = view.getUint16(at);
    at += 2;
    const n = view.getUint8(at++);
    for (let j = 0; j < n; j++) {
      if (at + (wide ? 2 : 1) > ipma.end) throw malformed();
      const index = wide
        ? view.getUint16(at) & 0x7fff
        : view.getUint8(at) & 0x7f;
      at += wide ? 2 : 1;
      if (id !== primary || index === 0) continue;
      const prop = propertyList[index - 1];
      if (!prop) throw malformed();
      if (['irot', 'imir', 'clap'].includes(prop.type))
        throw new Error(
          '暂不支持带旋转、镜像或显示裁切的 AVIF，请先转换为 PNG。',
        );
      if (prop.type === 'ispe') {
        if (prop.end - prop.start !== 12 || dimensions) throw malformed();
        dimensions = {
          width: view.getUint32(prop.start + 4),
          height: view.getUint32(prop.start + 8),
        };
      }
    }
  }
  if (!dimensions) throw malformed();
  return { ...dimensions, format: 'image/avif', orientation: 1 };
}
