import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { red, blue, png } from '../fixtures/images';
import { downloadFirst, inspect } from '../fixtures/watermark';
async function open(page: Page, mode: string, files = [red]) {
  await page.goto(`/#${mode}`);
  await page.reload();
  await page.getByTestId('file-input').setInputFiles(files);
  await expect(page.getByTestId('processing-preview')).toBeVisible();
}
async function generate(page: Page) {
  await page
    .getByRole('button', {
      name: /^(生成处理图片|开始格式转换|开始批量处理|替换结果并生成)$/,
    })
    .click();
  await expect(
    page.getByText('处理结束，成功结果可下载。', { exact: true }),
  ).toBeVisible();
}

test('crop, proportional resize, rotation, flip, reset and actual output bytes', async ({
  page,
}) => {
  await open(page, 'transform');
  await page.getByRole('checkbox', { name: '启用裁剪', exact: true }).check();
  await page.getByLabel('裁剪比例', { exact: true }).selectOption('1:1');
  await expect(page.getByTestId('processing-dimensions')).toHaveText(
    '40 × 40 px',
  );
  await page.getByRole('checkbox', { name: '启用缩放', exact: true }).check();
  await page
    .getByRole('spinbutton', { name: '缩放宽度', exact: true })
    .fill('20');
  await page.getByLabel('顺时针旋转', { exact: true }).selectOption('90');
  await page.getByRole('button', { name: '水平翻转', exact: true }).click();
  await generate(page);
  const result = await inspect(page, await downloadFirst(page), [[10, 10]]);
  expect([result.width, result.height]).toEqual([20, 20]);
  expect(result.pixels[0]).toEqual([230, 40, 40, 255]);
  await expect(page.getByTestId('processing-result')).toContainText(
    /原图 .* KiB · (增大|减少)/,
  );
  await page.getByRole('button', { name: '恢复默认参数', exact: true }).click();
  await expect(page.getByTestId('processing-dimensions')).toHaveText(
    '80 × 40 px',
  );
});

test('real PNG/JPEG/WebP/AVIF conversions preserve dimensions and transparency, AVIF imports again', async ({
  page,
  browser,
}, info) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') requests.push(r.method());
  });
  await open(page, 'convert', [
    {
      name: '透明.png',
      mimeType: 'image/png',
      buffer: png(32, 20, [0, 0, 0, 0]),
    },
  ]);
  const record: Record<string, unknown> = { browser: browser.version() };
  for (const [format, extension] of [
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/webp', 'webp'],
    ['image/avif', 'avif'],
  ]) {
    await page.getByLabel('输出格式', { exact: true }).selectOption(format);
    await generate(page);
    const download = await downloadFirst(page);
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`\\.${extension}$`),
    );
    const image = await inspect(page, download, [[0, 0]]);
    expect([image.width, image.height]).toEqual([32, 20]);
    expect(image.pixels[0][3]).toBe(format === 'image/jpeg' ? 255 : 0);
    if (format === 'image/jpeg')
      expect(image.pixels[0].slice(0, 3)).toEqual([255, 255, 255]);
    record[format] = {
      bytes: (await readFile((await download.path())!)).length,
      image,
    };
    if (format === 'image/avif') {
      await page.getByTestId('file-input').setInputFiles({
        name: '重新导入.avif',
        mimeType: 'image/avif',
        buffer: await readFile((await download.path())!),
      });
      await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
    }
  }
  expect(requests).toEqual([]);
  await mkdir('test-results', { recursive: true });
  await writeFile(
    `test-results/processing-${info.project.name}.json`,
    JSON.stringify(record, null, 2),
  );
});

test('multi-step batch keeps partial successes and produces a ZIP readable by Python zipfile', async ({
  page,
}) => {
  await open(page, 'batch', [
    red,
    blue,
    { name: '坏图.png', mimeType: 'image/png', buffer: Buffer.from('broken') },
  ]);
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: '启用缩放', exact: true }).check();
  await page
    .getByRole('spinbutton', { name: '缩放宽度', exact: true })
    .fill('20');
  await page.getByLabel('顺时针旋转', { exact: true }).selectOption('90');
  await page
    .getByRole('checkbox', { name: '启用批量水印', exact: true })
    .check();
  await page.getByLabel('水印类型', { exact: true }).selectOption('image');
  await page.getByTestId('batch-logo-input').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: png(10, 10, [0, 200, 0, 255]),
  });
  await page
    .getByRole('slider', { name: '水印不透明度', exact: true })
    .fill('100');
  await page.getByRole('slider', { name: '水印大小', exact: true }).fill('50');
  await generate(page);
  await expect(page.getByTestId('processing-result')).toHaveCount(3);
  await expect(page.getByTestId('processing-result').last()).toContainText(
    '失败',
  );
  const image = await inspect(page, await downloadFirst(page), [[9, 19]]);
  expect([image.width, image.height]).toEqual([10, 20]);
  expect(image.greenPixels).toBeGreaterThan(0);
  const zipEvent = page.waitForEvent('download');
  await page
    .getByRole('button', { name: '下载成功项 ZIP', exact: true })
    .click();
  const zip = await zipEvent;
  const entries = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        'import sys,zipfile,json; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps([{ "name": n, "size":len(z.read(n)) } for n in z.namelist()]))',
        (await zip.path())!,
      ],
      { encoding: 'utf8' },
    ),
  );
  expect(entries.map((e: { name: string }) => e.name)).toEqual([
    '红色-01.png',
    '蓝色-02.png',
  ]);
});

test('template files round trip, reject invalid content, and require a fresh Logo', async ({
  page,
}) => {
  await open(page, 'batch');
  await page.getByRole('checkbox', { name: '启用裁剪', exact: true }).check();
  await page.getByLabel('裁剪比例', { exact: true }).selectOption('1:1');
  await page.getByLabel('模板名称', { exact: true }).fill('方图模板');
  await page.getByRole('button', { name: '保存模板', exact: true }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出模板', exact: true }).click();
  const bytes = await readFile((await (await event).path())!);
  await page.getByRole('button', { name: '恢复默认参数', exact: true }).click();
  await page.getByTestId('template-input').setInputFiles({
    name: 'template.json',
    mimeType: 'application/json',
    buffer: bytes,
  });
  await expect(
    page.getByRole('checkbox', { name: '启用裁剪', exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel('裁剪比例', { exact: true })).toHaveValue('1:1');
  await page.getByTestId('template-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":9}'),
  });
  await expect(
    page.getByText('模板版本不支持。 已保留当前设置。'),
  ).toBeVisible();
  const template = JSON.parse(bytes.toString());
  template.settings.watermarkEnabled = true;
  template.settings.watermark.kind = 'image';
  await page.getByTestId('template-input').setInputFiles({
    name: 'image.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(template)),
  });
  await expect(
    page.getByRole('button', { name: '开始批量处理', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('请重新选择本地水印图片。', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: '应用模板 方图模板', exact: true }),
  ).toBeVisible();
});

test('three new workspaces are responsive and pass automated WCAG checks', async ({
  page,
}, info) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mode of ['transform', 'convert', 'batch']) {
      await open(page, mode);
      if (width === 360)
        await page
          .locator('summary')
          .filter({
            hasText:
              mode === 'transform'
                ? '图片处理设置'
                : mode === 'convert'
                  ? '格式转换设置'
                  : '批量流程设置',
          })
          .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      if (info.project.name === 'chromium')
        await page.screenshot({
          path: `docs/screenshots/${mode}-${width}.png`,
          fullPage: true,
        });
    }
  }
});
