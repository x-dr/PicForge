import { expect, it } from 'vitest';
import { matchesOutput } from './output-signature';
it('recognizes PNG, JPEG, WebP and AVIF and rejects fallback PNG under a different extension', () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(matchesOutput(png, 'image/png')).toBe(true);
  expect(matchesOutput(png, 'image/avif')).toBe(false);
  expect(matchesOutput(png, 'image/webp')).toBe(false);
  expect(matchesOutput(new Uint8Array([255, 216, 255]), 'image/jpeg')).toBe(
    true,
  );
  expect(
    matchesOutput(new TextEncoder().encode('RIFF0000WEBP'), 'image/webp'),
  ).toBe(true);
  expect(
    matchesOutput(
      new TextEncoder().encode('0000ftypavif0000mif1'),
      'image/avif',
    ),
  ).toBe(true);
});
