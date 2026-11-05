import { test, expect } from '@playwright/test';
import { red, blue } from '../fixtures/images';

test('main thread and HTMLImage fallback work when Worker, bitmap and storage APIs are unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: undefined });
    Object.defineProperty(window, 'createImageBitmap', { value: undefined });
    Storage.prototype.getItem = () => {
      throw new Error('storage unavailable');
    };
    Storage.prototype.setItem = () => {
      throw new Error('storage unavailable');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles([red, blue]);
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
  await expect(page.getByTestId('stitch-preview')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出图片', exact: true }).click();
  await download;
  expect(errors).toEqual([]);
});

test('cancel prevents stale download and a subsequent export succeeds with a parameter snapshot', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(message: unknown) {
        if ((message as { type: string }).type === 'render')
          setTimeout(() => super.postMessage(message), 800);
        else super.postMessage(message);
      }
    };
  });
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles([red]);
  await expect(page.getByText('1 张已就绪', { exact: true })).toBeVisible();
  await page
    .getByRole('spinbutton', { name: '内容宽度', exact: true })
    .fill('100');
  const downloads: string[] = [];
  page.on('download', (download) =>
    downloads.push(download.suggestedFilename()),
  );
  await page.getByRole('button', { name: '导出图片', exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(
    page.getByText('已取消生成，可以调整参数后重试。'),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  expect(downloads).toEqual([]);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出图片', exact: true }).click();
  await page
    .getByRole('textbox', { name: '文件名称', exact: true })
    .fill('修改后的名称');
  await page
    .getByRole('button', { name: '移除 红色.png', exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe('PicForge-拼图.png');
  expect(downloads).toHaveLength(1);
});

test('encoding failure retains the document and can be retried', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles([red]);
  await expect(page.getByTestId('stitch-preview')).toBeVisible();
  await expect(
    page.getByText('从原图导出完整画质', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      HTMLCanvasElement.prototype.toBlob = original;
      callback(null);
      void type;
      void quality;
    };
  });
  await page.getByRole('button', { name: '导出图片', exact: true }).click();
  await expect(
    page.getByText('编码返回空结果，请降低尺寸后重试。'),
  ).toBeVisible();
  await expect(page.getByText('1 张已就绪', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '重试导出', exact: true }).click();
  await download;
});

test('repeated import and clear releases all thumbnail, decode and preview object URLs', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const active = new Set<string>();
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    (window as unknown as { testURLs: Set<string> }).testURLs = active;
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
  });
  await page.goto('/');
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('file-input').setInputFiles([red, blue]);
    await expect(page.getByTestId('stitch-preview')).toBeVisible();
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await page.getByRole('button', { name: '确认清空', exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { testURLs: Set<string> }).testURLs.size,
        ),
      )
      .toBe(0);
  }
});

test('rapid edits show the latest preview and removed pending assets do not reappear', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles([red, blue]);
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
  const size = page.getByRole('spinbutton', { name: '内容宽度', exact: true });
  for (const value of ['200', '300', '150', '400']) await size.fill(value);
  await page
    .getByRole('button', { name: '移除 蓝色.png', exact: true })
    .click();
  await expect(page.getByTestId('stitch-preview')).toHaveAttribute(
    'alt',
    '1 张图片的拼接预览，输出 432 × 232 像素',
  );
  await page.getByTestId('file-input').setInputFiles([blue]);
  await page
    .getByRole('button', { name: '移除 蓝色.png', exact: true })
    .click();
  await expect(page.getByText('1 张已就绪', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('list', { name: '图片素材顺序' }).locator('li'),
  ).toHaveCount(1);
});
