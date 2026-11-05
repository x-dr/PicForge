import { expect, it } from 'vitest';
import { outputFilename } from './download';
it('uses actual encoding suffixes and safe filenames', () => {
  expect(outputFilename('海边.png', 'image/jpeg')).toBe('海边.jpg');
  expect(outputFilename('', 'image/png')).toBe('PicForge-拼图.png');
  expect(outputFilename('../a:b.webp', 'image/png')).toBe('..-a-b.png');
});
