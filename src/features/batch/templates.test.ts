import { describe, expect, it } from 'vitest';
import { defaults } from '../processing/model';
import { parseTemplate, serializeTemplate } from './templates';
import { batchNames } from './naming';
describe('portable templates and safe naming', () => {
  it('round trips every configuration step without storing source files', () => {
    const s = defaults();
    s.transform.crop = true;
    s.transform.ratio = '4:3';
    s.watermarkEnabled = true;
    s.watermark.kind = 'image';
    s.format = 'image/avif';
    const text = serializeTemplate('透明缩略图', s);
    expect(parseTemplate(text)).toEqual({
      version: 1,
      name: '透明缩略图',
      settings: s,
    });
    expect(text).not.toContain('blob:');
  });
  it('rejects incompatible versions, missing/invalid fields and oversized input', () => {
    const t = JSON.parse(serializeTemplate('a', defaults()));
    expect(() => parseTemplate(JSON.stringify({ ...t, version: 2 }))).toThrow(
      '版本',
    );
    t.settings.transform.width = '1200';
    expect(() => parseTemplate(JSON.stringify(t))).toThrow('类型');
    t.settings.transform.width = -1;
    expect(() => parseTemplate(JSON.stringify(t))).toThrow('无效参数');
    expect(() => parseTemplate(' '.repeat(65537))).toThrow('64 KiB');
    expect(() => parseTemplate('{')).toThrow('JSON');
  });
  it('sanitizes paths, applies placeholders and deduplicates names after truncation', () => {
    const names = batchNames(
      ['../a.png', '../A.jpg', 'x'.repeat(200), 'x'.repeat(200)],
      '{name}',
      'image/webp',
    );
    expect(new Set(names.map((s) => s.toLowerCase())).size).toBe(4);
    expect(names.every((s) => !s.includes('/') && s.endsWith('.webp'))).toBe(
      true,
    );
    expect(
      batchNames(['photo.jpeg'], '图-{index}-{name}', 'image/avif'),
    ).toEqual(['图-01-photo.avif']);
  });
});
