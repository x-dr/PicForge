import { expect, it } from 'vitest';
import { ResultBudget } from './result-budget';
it('shares retained results across tools and releases replaced or cleared batches', () => {
  const budget = new ResultBudget(100);
  budget.replace('watermark', 70);
  budget.replace('convert', 20);
  expect(budget.canReplace('batch', 11)).toBe(false);
  expect(budget.canReplace('convert', 30)).toBe(true);
  budget.release('watermark');
  expect(budget.total).toBe(20);
  expect(budget.canReplace('batch', 80)).toBe(true);
});
