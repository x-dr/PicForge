import { expect, it } from 'vitest';
import { withRenderSlot } from './render-queue';
it('serializes tools and removes cancelled waiting jobs without blocking successors', async () => {
  let release!: () => void;
  const events: string[] = [];
  const first = withRenderSlot(new AbortController().signal, async () => {
    events.push('first');
    await new Promise<void>((r) => {
      release = r;
    });
    events.push('end');
  });
  await Promise.resolve();
  const cancelled = new AbortController();
  const second = withRenderSlot(cancelled.signal, async () => {
    events.push('cancelled');
  });
  const third = withRenderSlot(new AbortController().signal, async () => {
    events.push('third');
  });
  cancelled.abort();
  await expect(second).rejects.toThrow();
  release();
  await first;
  await third;
  expect(events).toEqual(['first', 'end', 'third']);
});
