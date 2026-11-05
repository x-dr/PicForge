import { useEffect, useRef, useState } from 'react';
import { useAssets } from '../../app/AssetContext';
import { runRender } from '../../browser/render-engine';
import { batchNames } from '../batch/naming';
import { processingIssue } from './budget';
import { pipelineRequest, type PipelineSettings } from './model';
import type {
  AssetRecord,
  ImageSource,
  RenderRequest,
} from '../../imaging/types';
export interface ProcessingResult {
  id: string;
  filename: string;
  originalBytes: number;
  width: number;
  height: number;
  status: 'pending' | 'working' | 'done' | 'error' | 'cancelled';
  message?: string;
  blob?: Blob;
  request?: RenderRequest;
}
export function useProcessingJobs() {
  const { repository, budget, resultBudget } = useAssets();
  const owner = useRef(crypto.randomUUID());
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const ref = useRef(results);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => resultBudget.release(owner.current), [resultBudget]);
  const replace = (items: ProcessingResult[]) => {
    resultBudget.replace(
      owner.current,
      items.reduce((n, r) => n + (r.blob?.size ?? 0), 0),
    );
    ref.current = items;
    setResults(items);
  };
  const patch = (id: string, input: Partial<ProcessingResult>) =>
    replace(ref.current.map((r) => (r.id === id ? { ...r, ...input } : r)));
  const run = async (items: ProcessingResult[]) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setWorking(true);
    try {
      for (const [index, item] of items.entries()) {
        if (current.signal.aborted) break;
        if (!item.request) continue;
        patch(item.id, { status: 'working', message: undefined });
        try {
          const issue = processingIssue(item.request, budget);
          if (issue) throw new Error(issue);
          const retained = ref.current.reduce(
            (n, r) => n + (r.blob?.size ?? 0),
            0,
          );
          const limit = budget.peakBytes / 8;
          if (retained >= limit)
            throw new Error('结果已达内存预算，请下载并清空结果，再分批生成。');
          const blob = await runRender(item.request, current.signal, (p) => {
            if (!current.signal.aborted)
              setProgress(
                `正在处理 ${index + 1}/${items.length} · ${p.phase === 'encoding' ? '正在编码' : '正在绘制'}`,
              );
          });
          current.signal.throwIfAborted();
          if (retained + blob.size > limit)
            throw new Error('结果已达内存预算，请下载并清空结果，再分批生成。');
          if (!resultBudget.canReplace(owner.current, retained + blob.size))
            throw new Error(
              '所有工具的结果已达会话预算，请下载并清空其他工具的结果。',
            );
          patch(item.id, { status: 'done', blob, request: undefined });
        } catch (error) {
          if (current.signal.aborted) break;
          patch(item.id, {
            status: 'error',
            message:
              error instanceof Error ? error.message : '处理失败，请重试。',
          });
        }
      }
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setWorking(false);
        setProgress('处理结束，成功结果可下载。');
      }
    }
  };
  const start = (
    assets: AssetRecord[],
    settings: PipelineSettings,
    logo?: ImageSource,
  ) => {
    if (
      controller.current ||
      !assets.length ||
      assets.some((a) => a.status === 'loading')
    )
      return;
    const snapshot = structuredClone(settings);
    const names = batchNames(
      assets.map((a) => a.name),
      snapshot.naming,
      snapshot.format,
    );
    const items = assets.map((asset, index): ProcessingResult => {
      let request: RenderRequest | undefined;
      let message = asset.error;
      let originalBytes = 0;
      try {
        if (asset.status === 'ready') {
          const source = repository.sources([asset.id], false)[0];
          originalBytes = source.file.size;
          request = pipelineRequest(source, snapshot, logo);
        }
      } catch (error) {
        message = error instanceof Error ? error.message : '素材已失效。';
      }
      return {
        id: crypto.randomUUID(),
        filename: names[index],
        originalBytes,
        width: request?.plan.width ?? 0,
        height: request?.plan.height ?? 0,
        status: request ? 'pending' : 'error',
        message,
        request,
      };
    });
    replace(items);
    void run(items);
  };
  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    replace(
      ref.current.map((r) =>
        ['pending', 'working'].includes(r.status)
          ? {
              ...r,
              status: 'cancelled',
              message: '已取消，可按本批次配置重试。',
            }
          : r,
      ),
    );
    setWorking(false);
    setProgress('已取消，已完成结果已保留。');
  };
  const retry = (items: ProcessingResult[]) => {
    if (!controller.current)
      void run(
        items.filter(
          (r) => r.request && ['error', 'cancelled'].includes(r.status),
        ),
      );
  };
  const clear = () => {
    if (!controller.current) {
      replace([]);
      setProgress('');
    }
  };
  return { results, working, progress, start, cancel, retry, clear };
}
