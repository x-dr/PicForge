import { renderImage } from '../imaging/render';
import type { RenderProgress, RenderRequest } from '../imaging/types';
import type { WorkerResponse } from '../workers/protocol';
import { withRenderSlot } from './render-queue';

function createRenderWorker(): Worker {
  return new Worker(new URL('../workers/render.worker.ts', import.meta.url), {
    type: 'module',
  });
}
let capability: Promise<boolean> | undefined;
export function probeWorker(): Promise<boolean> {
  capability ??= new Promise<boolean>((resolve) => {
    if (
      typeof Worker === 'undefined' ||
      typeof OffscreenCanvas === 'undefined'
    ) {
      resolve(false);
      return;
    }
    let worker: Worker;
    try {
      worker = createRenderWorker();
    } catch {
      resolve(false);
      return;
    }
    const finish = (value: boolean) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(value);
    };
    const timeout = setTimeout(() => finish(false), 5000);
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) =>
      finish(data.type === 'ready');
    worker.onerror = (event) => {
      event.preventDefault();
      finish(false);
    };
    worker.postMessage({ type: 'probe' });
  });
  return capability;
}
async function renderInWorker(
  request: RenderRequest,
  signal: AbortSignal,
  onProgress: (value: RenderProgress) => void,
): Promise<Blob> {
  signal.throwIfAborted();
  return new Promise<Blob>((resolve, reject) => {
    const worker = createRenderWorker();
    const cleanup = () => {
      worker.terminate();
      signal.removeEventListener('abort', abort);
      clearTimeout(timeout);
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('处理时间过长，请降低尺寸后重试。'));
    }, 60_000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.type === 'progress') onProgress(data.progress);
      if (data.type === 'result') {
        cleanup();
        resolve(data.blob);
      }
      if (data.type === 'error') {
        cleanup();
        reject(new Error(data.message));
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      cleanup();
      reject(new Error('后台图片任务失败，请重试或降低尺寸。'));
    };
    worker.postMessage({ type: 'render', request });
  });
}
export async function runRender(
  request: RenderRequest,
  signal: AbortSignal,
  onProgress: (value: RenderProgress) => void,
): Promise<Blob> {
  return withRenderSlot(signal, () =>
    executeRender(request, signal, onProgress),
  );
}
async function executeRender(
  request: RenderRequest,
  signal: AbortSignal,
  onProgress: (value: RenderProgress) => void,
): Promise<Blob> {
  // Use the document's font set for both text preview and export.
  const workerAvailable =
    request.watermark?.style.kind === 'text' ? false : await probeWorker();
  signal.throwIfAborted();
  if (workerAvailable) {
    try {
      return await renderInWorker(request, signal, onProgress);
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  signal.throwIfAborted();
  return renderImage(request, signal, onProgress);
}
