import { useEffect, useState } from 'react';
import { useAssets } from '../../app/AssetContext';
import { useWatermark } from '../watermark/WatermarkContext';
import { useProcessing } from './ProcessingContext';
import { pipelineRequest, type ProcessingMode } from './model';
import { runRender } from '../../browser/render-engine';
export function useProcessingPreview(mode: ProcessingMode) {
  const { ready, repository } = useAssets();
  const { settings, selectedId } = useProcessing(mode);
  const { logo } = useWatermark();
  const selected = ready.find((a) => a.id === selectedId) ?? ready[0];
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setUrl(undefined);
    setError('');
    if (!selected) return;
    const current = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const request = pipelineRequest(
          repository.sources([selected.id], true)[0],
          settings,
          logo,
          true,
        );
        const blob = await runRender(request, current.signal, () => {});
        if (!current.signal.aborted) setUrl(URL.createObjectURL(blob));
      } catch (e) {
        if (!current.signal.aborted)
          setError(e instanceof Error ? e.message : '预览失败。');
      }
    }, 80);
    return () => {
      clearTimeout(timer);
      current.abort();
    };
  }, [selected, repository, settings, logo, retry]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return { selected, url, error, retry: () => setRetry((n) => n + 1) };
}
