import { useEffect, useRef, useState } from 'react';
import { useAssets } from '../../app/AssetContext';
import { checkOutput } from '../../imaging/budget';
import { runRender } from '../../browser/render-engine';
import { outputFilename } from '../../browser/download';
import type {
  ImageSource,
  RenderProgress,
  RenderRequest,
} from '../../imaging/types';
import { watermarkRequest, type WatermarkSettings } from './model';

export interface WatermarkResult {
  id: string;
  name: string;
  filename: string;
  width: number;
  height: number;
  status: 'pending' | 'working' | 'done' | 'error' | 'cancelled';
  message?: string;
  blob?: Blob;
  request?: RenderRequest;
}
export function useWatermarkBatch(
  settings: WatermarkSettings,
  logo?: ImageSource,
) {
  const { assets, repository, budget, resultBudget } = useAssets();
  const owner = useRef(crypto.randomUUID());
  const [results, setResults] = useState<WatermarkResult[]>([]);
  const resultRef = useRef(results);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => resultBudget.release(owner.current), [resultBudget]);
  const replace = (next: WatermarkResult[]) => {
    resultBudget.replace(
      owner.current,
      next.reduce((n, r) => n + (r.blob?.size ?? 0), 0),
    );
    resultRef.current = next;
    setResults(next);
  };
  const update = (id: string, patch: Partial<WatermarkResult>) =>
    replace(
      resultRef.current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  const run = async (items: WatermarkResult[]) => {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setWorking(true);
    try {
      for (const [index, item] of items.entries()) {
        if (current.signal.aborted) break;
        if (!item.request) continue;
        update(item.id, { status: 'working', message: undefined });
        const showProgress = (phase?: RenderProgress) => {
          if (!current.signal.aborted)
            setProgress(
              `正在处理 ${index + 1}/${items.length} · ${phase?.phase === 'encoding' ? '正在编码' : '正在绘制'}`,
            );
        };
        showProgress();
        try {
          const { request } = item;
          const sourcePixels =
            request.sources[0].width * request.sources[0].height +
            (request.watermark?.image
              ? request.watermark.image.width * request.watermark.image.height
              : 0);
          const issue = checkOutput(
            item.width,
            item.height,
            sourcePixels,
            budget,
          );
          if (issue) throw new Error(`${issue} 请先缩小原图后重新导入。`);
          const limit = budget.peakBytes / 4;
          const retained = resultRef.current.reduce(
            (sum, result) => sum + (result.blob?.size ?? 0),
            0,
          );
          if (retained >= limit)
            throw new Error('已达结果内存预算，请下载并清空结果，再分批生成。');
          const blob = await runRender(request, current.signal, showProgress);
          current.signal.throwIfAborted();
          if (retained + blob.size > limit)
            throw new Error('已达结果内存预算，请下载并清空结果，再分批生成。');
          if (!resultBudget.canReplace(owner.current, retained + blob.size))
            throw new Error(
              '所有工具的结果已达会话预算，请下载并清空其他工具的结果。',
            );
          update(item.id, { status: 'done', blob, request: undefined });
        } catch (error) {
          if (current.signal.aborted) break;
          update(item.id, {
            status: 'error',
            message:
              error instanceof Error ? error.message : '生成失败，请重试。',
          });
        }
      }
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setWorking(false);
        setProgress('处理结束，成功结果可逐项下载。');
      }
    }
  };
  const start = () => {
    if (
      controller.current ||
      !assets.length ||
      assets.some((item) => item.status === 'loading')
    )
      return;
    const snapshot = { ...settings };
    const items: WatermarkResult[] = assets.map((asset, index) => {
      let request: RenderRequest | undefined;
      let message = asset.error;
      try {
        if (asset.status === 'ready')
          request = watermarkRequest(
            repository.sources([asset.id], false)[0],
            snapshot,
            logo,
          );
      } catch (error) {
        message = error instanceof Error ? error.message : '素材已失效。';
      }
      return {
        id: crypto.randomUUID(),
        name: asset.name,
        filename: outputFilename(
          `${asset.name.replace(/\.[^.]+$/, '')}-水印-${String(index + 1).padStart(2, '0')}`,
          snapshot.format,
        ),
        width: asset.width,
        height: asset.height,
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
      resultRef.current.map((item) =>
        ['pending', 'working'].includes(item.status)
          ? {
              ...item,
              status: 'cancelled',
              message: '已取消，可按本批次原配置重试。',
            }
          : item,
      ),
    );
    setWorking(false);
    setProgress('已取消，已完成的结果已保留。');
  };
  const retry = (item: WatermarkResult) => {
    if (!controller.current && item.request) void run([item]);
  };
  const clear = () => {
    if (!controller.current) {
      replace([]);
      setProgress('');
    }
  };
  return { results, working, progress, start, cancel, retry, clear };
}
