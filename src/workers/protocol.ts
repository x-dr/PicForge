import type { RenderProgress, RenderRequest } from '../imaging/types';
export type WorkerRequest =
  { type: 'probe' } | { type: 'render'; request: RenderRequest };
export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; progress: RenderProgress }
  | { type: 'result'; blob: Blob }
  | { type: 'error'; message: string };
