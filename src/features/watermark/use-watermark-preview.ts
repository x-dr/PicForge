import { useEffect, useState } from 'react';
import { useAssets } from '../../app/AssetContext';
import { runRender } from '../../browser/render-engine';
import { watermarkRequest } from './model';
import { useWatermark } from './WatermarkContext';

export function useWatermarkPreview() {
  const { ready, repository } = useAssets();
  const { settings, selectedId, logo, validation } = useWatermark();
  const selected = ready.find((item) => item.id === selectedId) ?? ready[0];
  const [url, setUrl] = useState<string>();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setUrl(undefined);
    setError('');
    if (!selected || validation) {
      setStatus(validation);
      return;
    }
    const current = new AbortController();
    setStatus('正在更新预览');
    const timer = setTimeout(async () => {
      try {
        const request = watermarkRequest(
          repository.sources([selected.id], true)[0],
          settings,
          logo,
          true,
        );
        const blob = await runRender(request, current.signal, () => {});
        if (!current.signal.aborted) {
          setUrl(URL.createObjectURL(blob));
          setStatus('预览已更新');
        }
      } catch (cause) {
        if (!current.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : '预览失败，请重试。',
          );
          setStatus('预览失败');
        }
      }
    }, 80);
    return () => {
      clearTimeout(timer);
      current.abort();
    };
  }, [selected, repository, settings, logo, validation, retry]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return {
    url,
    status,
    error,
    selected,
    retry: () => setRetry((value) => value + 1),
  };
}
