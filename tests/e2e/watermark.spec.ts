import { test, expect } from '@playwright/test';
import {
  ready,
  imageMark,
  generate,
  downloadFirst,
  inspect,
} from '../fixtures/watermark';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { red, blue, png } from '../fixtures/images';

test('image watermark exports rotation, anchor and original dimensions with no image uploads', async ({
  page,
}) => {
  const outgoing: string[] = [];
  page.on('request', (request) => {
    if (
      ['POST', 'PUT', 'PATCH'].includes(request.method()) ||
      (/^https?:/.test(request.url()) &&
        new URL(request.url()).hostname !== '127.0.0.1')
    )
      outgoing.push(request.url());
  });
  await ready(page);
  await imageMark(page);
  await page.getByRole('slider', { name: '旋转角度', exact: true }).fill('90');
  await generate(page);
  const download = await downloadFirst(page);
  expect(download.suggestedFilename()).toBe('红色-水印-01.png');
  const image = await inspect(page, download, [
    [75, 25],
    [65, 35],
  ]);
  expect([image.width, image.height]).toEqual([80, 40]);
  expect(image.pixels).toEqual([
    [0, 200, 0, 255],
    [230, 40, 40, 255],
  ]);
  expect(outgoing).toEqual([]);
});

test('tiling and opacity change actual pixels', async ({ page }) => {
  await ready(page);
  await imageMark(page);
  await page.getByRole('slider', { name: '不透明度', exact: true }).fill('50');
  await page.getByRole('checkbox', { name: /平铺水印/ }).check();
  await page.getByRole('slider', { name: '平铺间隔', exact: true }).fill('0');
  await generate(page);
  const image = await inspect(page, await downloadFirst(page), [
    [5, 5],
    [45, 25],
  ]);
  for (const pixel of image.pixels) {
    expect(Math.abs(pixel[0] - 115)).toBeLessThanOrEqual(1);
    expect(Math.abs(pixel[1] - 120)).toBeLessThanOrEqual(1);
    expect(Math.abs(pixel[2] - 20)).toBeLessThanOrEqual(1);
  }
});

test('PNG keeps transparency and JPEG flattens onto white', async ({
  page,
}) => {
  await ready(page, [
    {
      name: '透明.png',
      mimeType: 'image/png',
      buffer: png(80, 40, [0, 0, 0, 0]),
    },
  ]);
  await imageMark(page);
  await generate(page);
  const image = await inspect(page, await downloadFirst(page), [
    [0, 0],
    [75, 35],
  ]);
  expect(image.pixels).toEqual([
    [0, 0, 0, 0],
    [0, 200, 0, 255],
  ]);
  await page.getByRole('button', { name: 'JPEG', exact: true }).click();
  await generate(page);
  const jpeg = await downloadFirst(page);
  expect(jpeg.suggestedFilename()).toBe('透明-水印-01.jpg');
  const flat = await inspect(page, jpeg, [[0, 0]]);
  expect(flat.signature.slice(0, 3)).toEqual([255, 216, 255]);
  expect(flat.pixels[0]).toEqual([255, 255, 255, 255]);
});

test('Chinese text preview and exported pixels match on the same browser', async ({
  page,
}) => {
  await ready(page, [{ ...red, buffer: png(400, 200, [230, 40, 40, 255]) }]);
  await page
    .getByRole('textbox', { name: '水印文字', exact: true })
    .fill('我的作品 © 中文');
  await page.getByRole('button', { name: '居中', exact: true }).click();
  await page.getByRole('slider', { name: '文字大小', exact: true }).fill('20');
  await page.getByRole('slider', { name: '不透明度', exact: true }).fill('100');
  await page.getByRole('slider', { name: '旋转角度', exact: true }).fill('-30');
  await page.getByLabel('文字颜色', { exact: true }).fill('#00c800');
  await expect(page.getByText('预览已更新', { exact: true })).toBeVisible();
  const previewPixels = await page
    .getByTestId('watermark-preview')
    .evaluate(async (element: HTMLImageElement) => {
      await element.decode();
      const canvas = document.createElement('canvas');
      canvas.width = element.naturalWidth;
      canvas.height = element.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(element, 0, 0);
      return Array.from(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      );
    });
  await generate(page);
  const download = await downloadFirst(page);
  const image = await inspect(page, download, []);
  expect(image.greenPixels).toBeGreaterThan(100);
  const bytes = await readFile((await download.path())!);
  const difference = await page.evaluate(
    async ({ bytes, previewPixels }) => {
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        return (
          pixels.reduce(
            (sum, value, index) => sum + Math.abs(value - previewPixels[index]),
            0,
          ) / pixels.length
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { bytes: Array.from(bytes), previewPixels },
  );
  // The preview's base uses a thumbnail; a uniform background isolates text.
  expect(difference).toBeLessThan(0.1);
});

test('partial encoding failure keeps success and retries with the batch snapshot', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await ready(page, [red, blue]);
  await imageMark(page);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    let call = 0;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      call++;
      if (call === 1) callback(null);
      else original.call(this, callback, type, quality);
    };
  });
  await generate(page);
  await expect(page.getByTestId('watermark-result').first()).toContainText(
    '失败',
  );
  await expect(page.getByTestId('watermark-result').last()).toContainText(
    '已生成',
  );
  await page.getByRole('slider', { name: '不透明度', exact: true }).fill('0');
  await page
    .getByRole('button', { name: '重试 红色-水印-01.png', exact: true })
    .click();
  await expect(page.getByTestId('watermark-result').first()).toContainText(
    '已生成',
  );
  const image = await inspect(page, await downloadFirst(page), [[75, 35]]);
  expect(image.pixels[0]).toEqual([0, 200, 0, 255]);
});

test('cancel ignores late encodes and pending items can be retried', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await ready(page, [red, blue]);
  await imageMark(page);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      setTimeout(() => original.call(this, callback, type, quality), 600);
    };
  });
  await page.getByRole('button', { name: '生成水印图片', exact: true }).click();
  await page.getByRole('button', { name: '取消生成', exact: true }).click();
  await page.waitForTimeout(800);
  await expect(page.getByRole('button', { name: /^下载 / })).toHaveCount(0);
  await expect(page.getByTestId('watermark-result').first()).toContainText(
    '已取消',
  );
  await page
    .getByRole('button', { name: '重试 蓝色-水印-02.png', exact: true })
    .click();
  await expect(page.getByTestId('watermark-result').last()).toContainText(
    '已生成',
  );
});

test('shared assets and both tool settings survive navigation, results survive clearing assets', async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole('textbox', { name: '水印文字', exact: true })
    .fill('保留署名');
  await generate(page);
  await page.getByRole('link', { name: '图片拼接', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: '内容宽度', exact: true })
    .fill('320');
  await expect(page.getByTestId('stitch-preview')).toBeVisible();
  await page.getByRole('link', { name: '图片水印', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: '水印文字', exact: true }),
  ).toHaveValue('保留署名');
  await expect(page.getByTestId('watermark-result')).toContainText('已生成');
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await expect(page.getByTestId('watermark-preview')).toHaveCount(0);
  const download = await downloadFirst(page);
  expect(download.suggestedFilename()).toBe('红色-水印-01.png');
  await page.getByRole('link', { name: '图片拼接', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: '内容宽度', exact: true }),
  ).toHaveValue('320');
});

test('empty text, invalid logo and main-thread decode fallback remain recoverable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: undefined });
    Object.defineProperty(window, 'createImageBitmap', { value: undefined });
  });
  await ready(page);
  await page
    .getByRole('textbox', { name: '水印文字', exact: true })
    .fill('   ');
  await expect(
    page.getByRole('button', { name: '生成水印图片', exact: true }),
  ).toBeDisabled();
  await imageMark(page);
  await page.getByTestId('logo-input').setInputFiles({
    name: '损坏.png',
    mimeType: 'image/png',
    buffer: Buffer.from('broken'),
  });
  await expect(
    page.getByText('已保留上一张有效水印。', { exact: false }),
  ).toBeVisible();
  await generate(page);
  expect(
    (await inspect(page, await downloadFirst(page), [[75, 35]])).pixels[0],
  ).toEqual([0, 200, 0, 255]);
});

test('watermark workspace fits mobile, tablet and desktop and passes automated accessibility checks', async ({
  page,
}, info) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#watermark');
    await page.reload();
    if (width === 360) {
      await page.locator('summary').filter({ hasText: '图片素材' }).click();
      await page.locator('summary').filter({ hasText: '水印设置' }).click();
    }
    await page
      .getByRole('button', { name: '试试示例图片', exact: true })
      .click();
    await expect(page.getByTestId('watermark-preview')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('link', { name: '图片水印', exact: true }),
    ).toBeVisible();
    await generate(page);
    if (info.project.name === 'chromium')
      await page.screenshot({
        path: `test-results/watermark-${width}.png`,
        fullPage: true,
      });
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  }
});
