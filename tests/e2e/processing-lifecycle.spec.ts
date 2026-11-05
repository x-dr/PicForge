import { test, expect, type Page } from '@playwright/test';
import { red, blue, png } from '../fixtures/images';
import { downloadFirst, inspect } from '../fixtures/watermark';
async function ready(page: Page) {
  await page.goto('/#batch');
  await page.getByTestId('file-input').setInputFiles([red, blue]);
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
  await expect(page.getByTestId('processing-preview')).toBeVisible();
}
test('cancel retains successes, stale completions cannot overwrite retry, retry keeps the batch snapshot', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await ready(page);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb, type, quality) {
      if (this.width === 40 && this.height === 80)
        setTimeout(() => original.call(this, cb, type, quality), 600);
      else original.call(this, cb, type, quality);
    };
  });
  await page.getByRole('button', { name: '开始批量处理', exact: true }).click();
  const items = page.getByTestId('processing-result');
  await expect(items.first()).toContainText('已生成');
  await page.getByRole('button', { name: '取消处理', exact: true }).click();
  await expect(items.last()).toContainText('已取消');
  await page.getByLabel('输出格式', { exact: true }).selectOption('image/jpeg');
  await page.getByLabel('命名规则', { exact: true }).fill('新配置-{index}');
  await page
    .getByRole('button', { name: '重试 蓝色-02.png', exact: true })
    .click();
  await expect(items.last()).toContainText('已生成');
  await expect(
    page.getByRole('button', { name: /^下载 .*\.png$/ }),
  ).toHaveCount(2);
  await expect(items.last()).toContainText('40 × 80 px');
});

test('removing sources and editing while processing preserves the captured batch', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await ready(page);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb, type, quality) {
      setTimeout(() => original.call(this, cb, type, quality), 300);
    };
  });
  await page.getByRole('button', { name: '开始批量处理', exact: true }).click();
  await page
    .getByRole('button', { name: '移除 蓝色.png', exact: true })
    .click();
  await page.getByRole('checkbox', { name: '启用缩放', exact: true }).check();
  await page
    .getByRole('spinbutton', { name: '缩放宽度', exact: true })
    .fill('10');
  await expect(page.getByRole('button', { name: /^下载 / })).toHaveCount(2);
  await expect(page.getByTestId('processing-result').first()).toContainText(
    '80 × 40 px',
  );
  await expect(page.getByTestId('processing-result').last()).toContainText(
    '40 × 80 px',
  );
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await expect(page.getByRole('button', { name: /^下载 / })).toHaveCount(2);
});

test('rotation and mirrors map actual colored corners for every quarter turn', async ({
  page,
}) => {
  await page.goto('/#transform');
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    for (const [i, color] of [
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#ffff00',
    ].entries()) {
      ctx.fillStyle = color;
      ctx.fillRect((i % 2) * 40, Math.floor(i / 2) * 20, 40, 20);
    }
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!)));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.getByTestId('file-input').setInputFiles({
    name: 'corners.png',
    mimeType: 'image/png',
    buffer: Buffer.from(bytes),
  });
  await expect(page.getByTestId('processing-preview')).toBeVisible();
  const colors = [
    [255, 0, 0, 255],
    [0, 255, 0, 255],
    [0, 0, 255, 255],
    [255, 255, 0, 255],
  ];
  for (const [rotation, flip, order] of [
    [0, false, [0, 1, 2, 3]],
    [90, false, [2, 0, 3, 1]],
    [180, false, [3, 2, 1, 0]],
    [270, false, [1, 3, 0, 2]],
    [0, true, [1, 0, 3, 2]],
    [90, true, [3, 1, 2, 0]],
  ] as const) {
    await page
      .getByLabel('顺时针旋转', { exact: true })
      .selectOption(String(rotation));
    const button = page.getByRole('button', { name: '水平翻转', exact: true });
    if ((await button.getAttribute('aria-pressed')) !== String(flip))
      await button.click();
    await page
      .getByRole('button', { name: /^(生成处理图片|替换结果并生成)$/ })
      .click();
    await expect(page.getByTestId('processing-result')).toContainText('已生成');
    const swapped = rotation % 180 !== 0;
    const w = swapped ? 40 : 80;
    const h = swapped ? 80 : 40;
    const result = await inspect(page, await downloadFirst(page), [
      [2, 2],
      [w - 3, 2],
      [2, h - 3],
      [w - 3, h - 3],
    ]);
    expect([result.width, result.height]).toEqual([w, h]);
    expect(result.pixels).toEqual(order.map((i) => colors[i]));
  }
});

test('drag crop, JPEG quality and no-storage templates remain usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
  });
  await page.goto('/#transform');
  await page.getByTestId('file-input').setInputFiles([red]);
  await expect(page.getByTestId('processing-preview')).toBeVisible();
  await page.getByRole('checkbox', { name: '启用裁剪', exact: true }).check();
  const box = (await page.getByTestId('crop-surface').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75, {
    steps: 3,
  });
  await page.mouse.up();
  await expect(page.getByTestId('processing-dimensions')).toHaveText(
    '40 × 20 px',
  );
  await page.getByLabel('输出格式', { exact: true }).selectOption('image/jpeg');
  await page.getByRole('slider', { name: '编码质量', exact: true }).fill('30');
  await page.getByRole('button', { name: '生成处理图片', exact: true }).click();
  await expect(page.getByTestId('processing-result')).toContainText('已生成');
  expect((await downloadFirst(page)).suggestedFilename()).toMatch(/\.jpg$/);
  await page.getByRole('link', { name: '批量工具', exact: true }).click();
  await page.getByRole('button', { name: '保存模板', exact: true }).click();
  await expect(
    page.getByText('浏览器存储不可用，请导出模板文件。', { exact: true }),
  ).toBeVisible();
});

test('output and AVIF budgets fail per item and a smaller output recovers', async ({
  page,
}) => {
  await page.goto('/#batch');
  await page
    .getByTestId('file-input')
    .setInputFiles([
      { name: 'big.png', mimeType: 'image/png', buffer: png(4100, 4100) },
      red,
    ]);
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '开始批量处理', exact: true }).click();
  await expect(page.getByTestId('processing-result').first()).toContainText(
    '输出超出保护范围',
  );
  await expect(page.getByTestId('processing-result').last()).toContainText(
    '已生成',
  );
  await page.getByLabel('输出格式', { exact: true }).selectOption('image/avif');
  await page.getByRole('checkbox', { name: '启用缩放', exact: true }).check();
  await page
    .getByRole('spinbutton', { name: '缩放宽度', exact: true })
    .fill('2100');
  await page
    .getByRole('button', { name: '替换结果并生成', exact: true })
    .click();
  await expect(page.getByTestId('processing-result').first()).toContainText(
    'AVIF 编码像素超出专项预算',
  );
  await page
    .getByRole('spinbutton', { name: '缩放宽度', exact: true })
    .fill('32');
  await page
    .getByRole('button', { name: '替换结果并生成', exact: true })
    .click();
  await expect(page.getByRole('button', { name: /^下载 / })).toHaveCount(2);
});
