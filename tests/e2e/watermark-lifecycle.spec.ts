import { test, expect } from '@playwright/test';
import { red, blue, png } from '../fixtures/images';
import {
  ready,
  imageMark,
  generate,
  downloadFirst,
  inspect,
} from '../fixtures/watermark';

test('edits and source removal during a batch do not change the running snapshot', async ({
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
      setTimeout(() => original.call(this, callback, type, quality), 400);
    };
  });
  await page.getByRole('button', { name: '生成水印图片', exact: true }).click();
  await page.getByRole('slider', { name: '不透明度', exact: true }).fill('0');
  await page
    .getByRole('button', { name: '移除 蓝色.png', exact: true })
    .click();
  await page.getByRole('button', { name: '移除水印图片', exact: true }).click();
  await expect(page.getByRole('button', { name: /^下载 / })).toHaveCount(2);
  const image = await inspect(page, await downloadFirst(page), [[75, 35]]);
  expect(image.pixels[0]).toEqual([0, 200, 0, 255]);
  await expect(page.getByText('1 张已就绪', { exact: true })).toBeVisible();
});

test('cancel preserves a completed item and releases result state on clear', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await ready(page, [red, blue]);
  await imageMark(page);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    let calls = 0;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      calls++;
      if (calls === 1) original.call(this, callback, type, quality);
      else setTimeout(() => original.call(this, callback, type, quality), 800);
    };
  });
  await page.getByRole('button', { name: '生成水印图片', exact: true }).click();
  await expect(page.getByTestId('watermark-result').first()).toContainText(
    '已生成',
  );
  await page.getByRole('button', { name: '取消生成', exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByRole('button', { name: /^下载 / })).toHaveCount(1);
  await expect(page.getByTestId('watermark-result').last()).toContainText(
    '已取消',
  );
  await page.getByRole('button', { name: '清空结果', exact: true }).click();
  await expect(page.getByTestId('watermark-result')).toHaveCount(0);
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
});

test('output budget errors and import failures do not block a valid batch item', async ({
  page,
}) => {
  await page.goto('/#watermark');
  await page.getByTestId('file-input').setInputFiles([
    {
      name: '输出超限.png',
      mimeType: 'image/png',
      buffer: png(5000, 3400, [20, 40, 60, 255]),
    },
    red,
    {
      name: '无效.png',
      mimeType: 'image/png',
      buffer: Buffer.from('broken'),
    },
  ]);
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
  await generate(page);
  const results = page.getByTestId('watermark-result');
  await expect(results).toHaveCount(3);
  await expect(results.nth(0)).toContainText('输出超出保护范围');
  await expect(results.nth(1)).toContainText('已生成');
  await expect(results.nth(2)).toContainText('失败');
  await expect(page.getByRole('button', { name: /^下载 / })).toHaveCount(1);
});

test('keyboard skip link stays in the watermark tool and obsolete preview URLs are released', async ({
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
  await page.goto('/#watermark');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: '跳到工作台', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveURL(/#watermark$/);
  await page.getByTestId('file-input').setInputFiles([red]);
  await expect(page.getByTestId('watermark-preview')).toBeVisible();
  await imageMark(page);
  await page.getByRole('button', { name: '移除水印图片', exact: true }).click();
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testURLs: Set<string> }).testURLs.size,
      ),
    )
    .toBe(0);
});
