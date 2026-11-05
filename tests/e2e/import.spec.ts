import { test, expect } from '@playwright/test';
import { red, blue } from '../fixtures/images';

test('file drop, clipboard paste and pointer sorting retain a stable sequence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const data = await page.evaluateHandle((bytes) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(bytes)], '拖入.png', { type: 'image/png' }),
    );
    return transfer;
  }, Array.from(red.buffer));
  await page.locator('main').dispatchEvent('drop', { dataTransfer: data });
  await expect(page.getByText('1 张已就绪', { exact: true })).toBeVisible();
  await page.evaluate((bytes) => {
    const clipboardData = new DataTransfer();
    clipboardData.items.add(
      new File([new Uint8Array(bytes)], '粘贴.png', { type: 'image/png' }),
    );
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
    });
    // Firefox does not retain constructor-provided clipboard files in synthetic events.
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    window.dispatchEvent(event);
  }, Array.from(blue.buffer));
  await expect(page.getByText('2 张已就绪', { exact: true })).toBeVisible();
  const list = page.getByRole('list', { name: '图片素材顺序' });
  await page
    .getByRole('button', { name: '拖动排序 粘贴.png', exact: true })
    .dragTo(list.locator('li').first());
  await expect(list.locator('li').first()).toContainText('粘贴.png');
  expect(errors).toEqual([]);
});
