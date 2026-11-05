import { encodeCanvas } from '../imaging/encode';
import { renderImage } from '../imaging/render';
import type { WorkerRequest, WorkerResponse } from './protocol';
const workerScope = globalThis as unknown as {
  postMessage: (value: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};
workerScope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'probe') {
      const canvas = new OffscreenCanvas(2, 2);
      const ctx = canvas.getContext('2d');
      if (!ctx || typeof createImageBitmap !== 'function')
        throw new Error('Worker capability unavailable');
      ctx.fillStyle = '#6155dc';
      ctx.fillRect(0, 0, 2, 2);
      try {
        await encodeCanvas(canvas, 'image/png', 0.9);
        await encodeCanvas(canvas, 'image/jpeg', 0.9);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
      workerScope.postMessage({ type: 'ready' });
    } else {
      const blob = await renderImage(
        data.request,
        new AbortController().signal,
        (progress) => workerScope.postMessage({ type: 'progress', progress }),
      );
      workerScope.postMessage({ type: 'result', blob });
    }
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : '图片任务失败。',
    });
  }
};
