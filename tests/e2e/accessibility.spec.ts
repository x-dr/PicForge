import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { red, blue } from '../fixtures/images';

test('workspace controls and text pass automated WCAG checks in desktop and mobile views', async ({
  page,
}) => {
  await page.goto('/');
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.reload();
    if (width === 360) {
      await page.locator('summary').filter({ hasText: '图片素材' }).click();
      await page.locator('summary').filter({ hasText: '拼接设置' }).click();
    }
    await page.getByTestId('file-input').setInputFiles([red, blue]);
    await expect(page.getByTestId('stitch-preview')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map(({ target, failureSummary }) => ({
          target,
          failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
