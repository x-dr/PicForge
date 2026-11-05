import { test, expect, type Page, type Download } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { red, blue, green, png, withExif } from '../fixtures/images';

async function addImages(page: Page, files = [red, blue]) {
  await page.getByTestId('file-input').setInputFiles(files);
  await expect(
    page.getByText(`${files.length} 张已就绪`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('stitch-preview')).toBeVisible();
}
async function dimensions(page: Page, size = '100') {
  await page
    .getByRole('spinbutton', { name: '内容宽度', exact: true })
    .fill(size);
  await page
    .getByRole('spinbutton', { name: '图片间距', exact: true })
    .fill('10');
  await page
    .getByRole('spinbutton', { name: '外边距', exact: true })
    .fill('10');
}
async function exportImage(page: Page): Promise<Download> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出图片', exact: true }).click();
  return download;
}
async function inspectDownload(
  page: Page,
  download: Download,
  coordinates: [number, number][],
) {
  const bytes = await readFile((await download.path())!);
  return page.evaluate(
    async ({ data, coordinates }) => {
      const blob = new Blob([new Uint8Array(data)]);
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const pixels = coordinates.map(([x, y]) =>
        Array.from(ctx.getImageData(x, y, 1, 1).data),
      );
      URL.revokeObjectURL(url);
      return {
        width: canvas.width,
        height: canvas.height,
        pixels,
        signature: data.slice(0, 8),
      };
    },
    { data: Array.from(bytes), coordinates },
  );
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('vertical PNG uses original geometry, order, transparency and actual suffix', async ({
  page,
}) => {
  const network: string[] = [];
  const origin = new URL(page.url()).origin;
  page.on('request', (request) => {
    if (
      ['POST', 'PUT', 'PATCH'].includes(request.method()) ||
      (/^https?:/.test(request.url()) &&
        new URL(request.url()).origin !== origin)
    )
      network.push(request.url());
  });
  await addImages(page);
  await dimensions(page);
  await page.getByRole('button', { name: '透明背景', exact: true }).click();
  await page
    .getByRole('textbox', { name: '文件名称', exact: true })
    .fill('故事.jpg');
  const download = await exportImage(page);
  expect(download.suggestedFilename()).toBe('故事.png');
  const image = await inspectDownload(page, download, [
    [0, 0],
    [20, 20],
    [20, 80],
  ]);
  expect([image.width, image.height]).toEqual([120, 280]);
  expect(image.pixels[0][3]).toBe(0);
  expect(image.pixels[1]).toEqual([230, 40, 40, 255]);
  expect(image.pixels[2]).toEqual([30, 70, 230, 255]);
  expect(image.signature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  await expect(
    page.getByRole('status').filter({ hasText: '已生成文件并发起下载' }),
  ).toBeVisible();
  expect(network).toEqual([]);
});

test('horizontal layout and keyboard reorder determine exported pixels', async ({
  page,
}) => {
  await addImages(page);
  await page
    .getByRole('button', { name: '上移 蓝色.png', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('list', { name: '图片素材顺序' }).locator('li').first(),
  ).toContainText('蓝色.png');
  await page.getByRole('button', { name: '横向', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: '内容高度', exact: true })
    .fill('100');
  await page
    .getByRole('spinbutton', { name: '图片间距', exact: true })
    .fill('10');
  await page
    .getByRole('spinbutton', { name: '外边距', exact: true })
    .fill('10');
  const image = await inspectDownload(page, await exportImage(page), [
    [20, 20],
    [80, 20],
  ]);
  expect([image.width, image.height]).toEqual([280, 120]);
  expect(image.pixels).toEqual([
    [30, 70, 230, 255],
    [230, 40, 40, 255],
  ]);
});

test('exports original pixel detail rather than enlarging the thumbnail', async ({
  page,
}) => {
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    for (let x = 0; x < 1024; x++) {
      ctx.fillStyle = x % 2 ? '#ffffff' : '#000000';
      ctx.fillRect(x, 0, 1, 64);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await addImages(page, [
    {
      name: '像素条纹.png',
      mimeType: 'image/png',
      buffer: Buffer.from(source, 'base64'),
    },
  ]);
  await dimensions(page, '1024');
  await page.getByRole('spinbutton', { name: '外边距', exact: true }).fill('0');
  const image = await inspectDownload(page, await exportImage(page), [
    [0, 10],
    [1, 10],
  ]);
  expect(image.pixels).toEqual([
    [0, 0, 0, 255],
    [255, 255, 255, 255],
  ]);
});

test('grid retains the final empty cell and supports center cropping', async ({
  page,
}) => {
  await addImages(page, [red, blue, green]);
  await page.getByRole('button', { name: '宫格', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: '单元格宽', exact: true })
    .fill('100');
  await page
    .getByRole('spinbutton', { name: '单元格高', exact: true })
    .fill('100');
  await page
    .getByRole('spinbutton', { name: '图片间距', exact: true })
    .fill('0');
  await page.getByRole('spinbutton', { name: '外边距', exact: true }).fill('0');
  let image = await inspectDownload(page, await exportImage(page), [
    [10, 10],
    [10, 30],
    [150, 150],
  ]);
  expect([image.width, image.height]).toEqual([200, 200]);
  expect(image.pixels).toEqual([
    [255, 255, 255, 255],
    [230, 40, 40, 255],
    [255, 255, 255, 255],
  ]);
  await page
    .getByRole('combobox', { name: '图片适应', exact: true })
    .selectOption('cover');
  image = await inspectDownload(page, await exportImage(page), [[10, 10]]);
  expect(image.pixels[0]).toEqual([230, 40, 40, 255]);
});

test('JPEG flattens transparency onto the explicit background', async ({
  page,
}) => {
  await addImages(page, [
    {
      name: '透明.png',
      mimeType: 'image/png',
      buffer: png(80, 40, [0, 0, 0, 0]),
    },
  ]);
  await dimensions(page);
  await page.getByRole('button', { name: '透明背景', exact: true }).click();
  await page.getByRole('button', { name: 'JPEG', exact: true }).click();
  const download = await exportImage(page);
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);
  const image = await inspectDownload(page, download, [
    [0, 0],
    [20, 20],
  ]);
  expect(image.signature.slice(0, 3)).toEqual([255, 216, 255]);
  expect(image.pixels).toEqual([
    [255, 255, 255, 255],
    [255, 255, 255, 255],
  ]);
});

test('rejects damaged, unsupported, animated and oversized sources while preserving valid images', async ({
  page,
}) => {
  const oversized = Buffer.from(red.buffer);
  oversized.writeUInt32BE(9000, 16);
  const animatedWebp = Buffer.alloc(30);
  animatedWebp.write('RIFF');
  animatedWebp.writeUInt32LE(22, 4);
  animatedWebp.write('WEBPVP8X', 8);
  animatedWebp.writeUInt32LE(10, 16);
  animatedWebp[20] = 2;
  await page.getByTestId('file-input').setInputFiles([
    red,
    {
      name: '假图片.png',
      mimeType: 'image/png',
      buffer: Buffer.from('<svg/>'),
    },
    {
      name: '损坏.png',
      mimeType: 'image/png',
      buffer: red.buffer.subarray(0, 30),
    },
    {
      name: '动画.png',
      mimeType: 'image/png',
      buffer: png(1, 1, undefined, true),
    },
    { name: '动画.webp', mimeType: 'image/webp', buffer: animatedWebp },
    { name: '超大.png', mimeType: 'image/png', buffer: oversized },
  ]);
  await expect(page.getByText('1 张已就绪', { exact: true })).toBeVisible();
  await expect(
    page.getByText('5 张图片导入失败，导出仅包含 1 张有效图片。'),
  ).toBeVisible();
  await expect(
    page.getByText('格式不支持。请选择', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('暂不支持动态 PNG', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('暂不支持动态 WebP', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('原图像素超出', { exact: false })).toBeVisible();
  await exportImage(page);
});

test('supports static WebP with incorrect extension and MIME', async ({
  page,
}) => {
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 80;
    c.height = 40;
    c.getContext('2d')!.fillRect(0, 0, 80, 40);
    return c.toDataURL('image/webp');
  });
  test.skip(
    !data.startsWith('data:image/webp'),
    'Browser does not encode WebP test fixtures',
  );
  await addImages(page, [
    {
      name: '实际webp.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(data.split(',')[1], 'base64'),
    },
  ]);
  await expect(page.getByText('80 × 40', { exact: true })).toBeVisible();
  await exportImage(page);
});

test('EXIF rotations and mirror orientations are normalized once', async ({
  page,
}) => {
  const jpeg = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 80;
    c.height = 40;
    const ctx = c.getContext('2d')!;
    for (const [index, color] of [
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#ffff00',
    ].entries()) {
      ctx.fillStyle = color;
      ctx.fillRect((index % 2) * 40, Math.floor(index / 2) * 20, 40, 20);
    }
    return c.toDataURL('image/jpeg', 1).split(',')[1];
  });
  await page.getByRole('button', { name: '宫格', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: '单元格宽', exact: true })
    .fill('80');
  await page
    .getByRole('spinbutton', { name: '单元格高', exact: true })
    .fill('80');
  await page
    .getByRole('spinbutton', { name: '图片间距', exact: true })
    .fill('0');
  await page.getByRole('spinbutton', { name: '外边距', exact: true }).fill('0');
  const colors = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
  ];
  const expected = [
    [0, 1, 2, 3],
    [1, 0, 3, 2],
    [3, 2, 1, 0],
    [2, 3, 0, 1],
    [0, 2, 1, 3],
    [2, 0, 3, 1],
    [3, 1, 2, 0],
    [1, 3, 0, 2],
  ];
  for (let orientation = 1; orientation <= 8; orientation++) {
    await addImages(page, [
      {
        name: `方向${orientation}.jpg`,
        mimeType: 'image/jpeg',
        buffer: withExif(Buffer.from(jpeg, 'base64'), orientation),
      },
    ]);
    const coordinates: [number, number][] =
      orientation >= 5
        ? [
            [30, 10],
            [50, 10],
            [30, 70],
            [50, 70],
          ]
        : [
            [10, 30],
            [70, 30],
            [10, 50],
            [70, 50],
          ];
    const image = await inspectDownload(
      page,
      await exportImage(page),
      coordinates,
    );
    for (let i = 0; i < 4; i++)
      for (let channel = 0; channel < 3; channel++)
        expect(
          Math.abs(
            image.pixels[i][channel] -
              colors[expected[orientation - 1][i]][channel],
          ),
        ).toBeLessThan(8);
    await page
      .getByRole('button', { name: `移除 方向${orientation}.jpg`, exact: true })
      .click();
  }
});

test('clear requires confirmation and preserves preferences without retaining files', async ({
  page,
}) => {
  await addImages(page);
  await dimensions(page, '320');
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page
    .getByRole('button', { name: '保留素材', exact: true })
    .press('Enter');
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await expect(page.getByTestId('stitch-preview')).toHaveCount(0);
  await expect(
    page.getByRole('spinbutton', { name: '内容宽度', exact: true }),
  ).toHaveValue('320');
  await page.reload();
  await expect(
    page.getByRole('spinbutton', { name: '内容宽度', exact: true }),
  ).toHaveValue('320');
  await expect(
    page.getByRole('button', { name: '导出图片', exact: true }),
  ).toBeDisabled();
});

test('oversized output can be reduced and retried', async ({ page }) => {
  await addImages(page, [red, blue, green]);
  await dimensions(page, '4000');
  await expect(
    page.getByRole('button', { name: '导出图片', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('输出超出保护范围', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: '尺寸减半', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '导出图片', exact: true }),
  ).toBeEnabled();
});

test('mobile, tablet and desktop layouts have no horizontal overflow', async ({
  page,
}, info) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.reload();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('button', { name: '选择本地图片', exact: true }),
    ).toBeVisible();
    if (width === 360) {
      await page.locator('summary').filter({ hasText: '拼接设置' }).click();
      await expect(
        page.getByRole('button', { name: '纵向', exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    if (info.project.name === 'chromium')
      await page.screenshot({
        path: `test-results/workspace-${width}.png`,
        fullPage: true,
      });
  }
  await page.getByRole('button', { name: '试试示例图片', exact: true }).click();
  await expect(page.getByText('3 张已就绪', { exact: true })).toBeVisible();
  await expect(page.getByTestId('stitch-preview')).toBeVisible();
  if (info.project.name === 'chromium')
    await page.screenshot({
      path: 'test-results/workspace-populated.png',
      fullPage: true,
    });
});
