import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import edgeone from '../../edgeone.json' with { type: 'json' };
import { red } from '../fixtures/images';
import { downloadFirst, inspect } from '../fixtures/watermark';
for (const deployment of ['Nginx', 'EdgeOne'] as const) {
  test(`${deployment} production CSP permits Worker/WASM and encoder delivery recovers after a network failure`, async ({
    page,
  }) => {
    const policy =
      deployment === 'Nginx'
        ? (await readFile('deploy/nginx.conf', 'utf8')).match(
            /Content-Security-Policy "([^"]+)"/,
          )![1]
        : edgeone.headers
            .find((rule) => rule.source === '/*')!
            .headers.find((header) => header.key === 'Content-Security-Policy')!
            .value;
    let blocked = true;
    const wasmRequests: string[] = [];
    await page.route('**/*', async (route) => {
      if (
        !route.request().url().startsWith('http:') &&
        !route.request().url().startsWith('https:')
      ) {
        await route.continue();
        return;
      }
      if (route.request().url().endsWith('.wasm')) {
        wasmRequests.push(route.request().url());
        if (blocked) {
          await route.abort('failed');
          return;
        }
      }
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), 'content-security-policy': policy },
      });
    });
    await page.goto('/#convert');
    const workerAsset = (await readdir('dist/assets')).find((name) =>
      name.startsWith('render.worker-'),
    )!;
    const workerReady = await page.evaluate(
      (asset) =>
        new Promise<boolean>((resolve) => {
          const worker = new Worker(`/assets/${asset}`, { type: 'module' });
          const finish = (ready: boolean) => {
            clearTimeout(timer);
            worker.terminate();
            resolve(ready);
          };
          const timer = setTimeout(() => finish(false), 5000);
          worker.onmessage = ({ data }) => finish(data.type === 'ready');
          worker.onerror = () => finish(false);
          worker.postMessage({ type: 'probe' });
        }),
      workerAsset,
    );
    expect(workerReady).toBe(true);
    await page.getByTestId('file-input').setInputFiles([red]);
    await expect(page.getByTestId('processing-preview')).toBeVisible();
    expect(wasmRequests).toEqual([]);
    await page
      .getByLabel('输出格式', { exact: true })
      .selectOption('image/avif');
    await expect(
      page.getByRole('button', { name: '重新检测格式', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '开始格式转换', exact: true }),
    ).toBeDisabled();
    blocked = false;
    await page
      .getByRole('button', { name: '重新检测格式', exact: true })
      .click();
    await page
      .getByRole('button', { name: '开始格式转换', exact: true })
      .click();
    await expect(page.getByTestId('processing-result')).toContainText('已生成');
    const image = await inspect(page, await downloadFirst(page), [[0, 0]]);
    expect([image.width, image.height]).toEqual([80, 40]);
    expect(wasmRequests.length).toBeGreaterThan(1);
    expect(
      wasmRequests.every((url) => url.startsWith(new URL(page.url()).origin)),
    ).toBe(true);
  });
}
