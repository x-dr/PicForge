import { useEffect, useState } from 'react';
import { runRender } from '../../browser/render-engine';
import { useEditor } from './EditorContext';

export function usePreview() {
  const {
    plan,
    ready,
    repository,
    document: { settings },
  } = useEditor();
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'empty' | 'loading' | 'ready' | 'error'>(
    'empty',
  );
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!plan) {
      setUrl(null);
      setState('empty');
      return;
    }
    const controller = new AbortController();
    setState('loading');
    setError('');
    const timer = setTimeout(async () => {
      try {
        const blob = await runRender(
          {
            plan,
            sources: repository.sources(
              ready.map((asset) => asset.id),
              true,
            ),
            format: settings.format,
            quality: settings.quality,
            jpegBackground: settings.jpegBackground,
            preview: true,
          },
          controller.signal,
          () => {},
        );
        if (controller.signal.aborted) return;
        setUrl(URL.createObjectURL(blob));
        setState('ready');
      } catch (cause) {
        if (!controller.signal.aborted) {
          setState('error');
          setError(
            cause instanceof Error ? cause.message : '预览失败，请重试。',
          );
        }
      }
    }, 80);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    plan,
    ready,
    repository,
    settings.format,
    settings.quality,
    settings.jpegBackground,
    retry,
  ]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return { url, state, error, retry: () => setRetry((value) => value + 1) };
}
