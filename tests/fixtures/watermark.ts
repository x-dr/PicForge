import { expect, type Page, type Download } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { red, png } from './images';

const logo = {
  name: '标记.png',
  mimeType: 'image/png',
  buffer: png(20, 10, [0, 200, 0, 255]),
};
export async function ready(page: Page, files = [red]) {
  await page.goto('/#watermark');
  await page.getByTestId('file-input').setInputFiles(files);
  await expect(
    page.getByText(`${files.length} 张已就绪`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('watermark-preview')).toBeVisible();
}
export async function imageMark(page: Page) {
  await page.getByRole('button', { name: '图片水印', exact: true }).click();
  await page.getByTestId('logo-input').setInputFiles(logo);
  await expect(page.getByRole('img', { name: '当前水印图片' })).toBeVisible();
  await page.getByRole('slider', { name: '水印宽度', exact: true }).fill('50');
  await page.getByRole('slider', { name: '不透明度', exact: true }).fill('100');
  await page.getByRole('slider', { name: '边缘留白', exact: true }).fill('0');
  await expect(page.getByText('预览已更新', { exact: true })).toBeVisible();
}
export async function generate(page: Page) {
  await page
    .getByRole('button', { name: /^(生成水印图片|重新生成全部)$/ })
    .click();
  await expect(
    page.getByText('处理结束，成功结果可逐项下载。', { exact: true }),
  ).toBeVisible();
}
export async function downloadFirst(page: Page) {
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: /^下载 / })
    .first()
    .click();
  return download;
}
export async function inspect(
  page: Page,
  download: Download,
  coordinates: [number, number][],
) {
  const bytes = await readFile((await download.path())!);
  return page.evaluate(
    async ({ bytes, coordinates }) => {
      const image = new Image();
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
      try {
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        return {
          width: canvas.width,
          height: canvas.height,
          pixels: coordinates.map(([x, y]) =>
            Array.from(ctx.getImageData(x, y, 1, 1).data),
          ),
          signature: bytes.slice(0, 8),
          greenPixels: Array.from(
            ctx.getImageData(0, 0, canvas.width, canvas.height).data,
          ).filter(
            (value, index, data) =>
              index % 4 === 1 && value > 100 && data[index - 1] < 100,
          ).length,
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { bytes: Array.from(bytes), coordinates },
  );
}
