import { test, expect } from '@playwright/test';
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import { png, red } from '../fixtures/images';

test('Worker probe actually completes PNG and JPEG encode/decode round trips', async ({
  page,
}) => {
  await page.goto('/');
  const asset = (await readdir('dist/assets')).find((name) =>
    name.startsWith('render.worker-'),
  )!;
  const result = await page.evaluate(
    (asset) =>
      new Promise<string>((resolve) => {
        const worker = new Worker(`/assets/${asset}`, { type: 'module' });
        const timer = setTimeout(() => {
          worker.terminate();
          resolve('timeout');
        }, 5000);
        worker.onmessage = ({ data }) => {
          clearTimeout(timer);
          worker.terminate();
          resolve(data.type);
        };
        worker.onerror = () => {
          clearTimeout(timer);
          worker.terminate();
          resolve('error');
        };
        worker.postMessage({ type: 'probe' });
      }),
    asset,
  );
  expect(result).toBe('ready');
});

test('file size and session count limits remain recoverable', async ({
  page,
}) => {
  await page.goto('/');
  const files = Array.from({ length: 21 }, (_, index) => ({
    ...red,
    name: `图片-${index}.png`,
  }));
  await page.getByTestId('file-input').setInputFiles(files);
  await expect(
    page.getByText('最多保留 20 张图片', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('20 张已就绪', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await page.getByTestId('file-input').setInputFiles([
    {
      name: '体积超限.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
    },
  ]);
  await expect(
    page.getByText('单张图片不能超过 20 MiB，请先压缩文件。'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '移除 体积超限.png', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '导出图片', exact: true }),
  ).toBeDisabled();
});

test('records repeatable desktop preview and export timing', async ({
  page,
  browser,
}, info) => {
  test.skip(
    info.project.name !== 'chromium',
    'Performance is measured separately on one fixed desktop browser.',
  );
  await page.goto('/');
  const files = Array.from({ length: 10 }, (_, index) => ({
    name: `性能-${index}.png`,
    mimeType: 'image/png',
    buffer: png(1920, 1080, [index * 20, 100, 150, 255]),
  }));
  await page.getByTestId('file-input').setInputFiles(files);
  await expect(page.getByText('10 张已就绪', { exact: true })).toBeVisible();
  await expect(page.getByTestId('stitch-preview')).toBeVisible();
  const timings: number[] = [];
  for (const width of [
    '1190',
    '1180',
    '1170',
    '1160',
    '1150',
    '1140',
    '1130',
    '1120',
    '1110',
    '1100',
  ]) {
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[aria-label="内容宽度"]',
      )!;
      const image = document.querySelector<HTMLImageElement>(
        '[data-testid="stitch-preview"]',
      )!;
      const scope = window as unknown as {
        picforgeTestMeasurement: Promise<number>;
      };
      scope.picforgeTestMeasurement = new Promise((resolve) => {
        input.addEventListener(
          'input',
          () => {
            const start = performance.now();
            const observer = new MutationObserver(async () => {
              observer.disconnect();
              await image.decode();
              requestAnimationFrame(() => resolve(performance.now() - start));
            });
            observer.observe(image, {
              attributes: true,
              attributeFilter: ['src'],
            });
          },
          { once: true },
        );
      });
    });
    await page
      .getByRole('spinbutton', { name: '内容宽度', exact: true })
      .fill(width);
    timings.push(
      Math.round(
        await page.evaluate(
          () =>
            (window as unknown as { picforgeTestMeasurement: Promise<number> })
              .picforgeTestMeasurement,
        ),
      ),
    );
  }
  const exportTimes: Record<string, number[]> = {};
  for (const format of ['PNG', 'JPEG']) {
    exportTimes[format] = [];
    await page.getByRole('button', { name: format, exact: true }).click();
    for (let attempt = 0; attempt < 3; attempt++) {
      const download = page.waitForEvent('download');
      const start = Date.now();
      await page.getByRole('button', { name: '导出图片', exact: true }).click();
      await download;
      exportTimes[format].push(Date.now() - start);
    }
  }
  const record = {
    date: '2026-11-05',
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0].model,
    logicalCpus: os.cpus().length,
    totalMemoryGiB: Math.round(os.totalmem() / 1024 ** 3),
    browser: browser.version(),
    mode: 'production, headless, concurrent test runner; preview measured from input event to decoded image and next animation frame; export includes Playwright IPC',
    samples:
      '10 generated solid-color PNG images, each 1920 × 1080; not a photographic workload',
    previewMs: timings,
    p95Ms: [...timings].sort((a, b) => a - b)[
      Math.ceil(timings.length * 0.95) - 1
    ],
    exportSize: '1132 × 6366',
    exportMs: exportTimes,
  };
  await mkdir('test-results', { recursive: true });
  await writeFile(
    'test-results/performance.json',
    JSON.stringify(record, null, 2),
  );
  await info.attach('performance', {
    body: JSON.stringify(record, null, 2),
    contentType: 'application/json',
  });
});
