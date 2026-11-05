import { useEffect, useState } from 'react';
import { encodeCanvas } from '../../imaging/encode';
import type { OutputFormat } from '../../imaging/types';
interface Capability {
  checking: boolean;
  supported: boolean;
  encoding: string;
  decoding: string;
  error: string;
}
const cache = new Map<OutputFormat, Promise<Capability>>();
async function probe(format: OutputFormat): Promise<Capability> {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext('2d');
  try {
    if (!ctx) throw new Error('无法创建测试画布。');
    ctx.fillStyle = '#7755cc';
    ctx.fillRect(0, 0, 1, 1);
    const native = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, format, 0.8),
    );
    await encodeCanvas(canvas, format, 0.8);
    return {
      checking: false,
      supported: true,
      encoding: native?.type === format ? '浏览器编码' : '本地 WASM 编码',
      decoding: '重新解码已验证',
      error: '',
    };
  } catch (e) {
    return {
      checking: false,
      supported: false,
      encoding: '不可用',
      decoding: '往返未通过',
      error: e instanceof Error ? e.message : '格式检测失败。',
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
export function useFormatCapability(format: OutputFormat) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<Capability>({
    checking: true,
    supported: false,
    encoding: '',
    decoding: '',
    error: '',
  });
  useEffect(() => {
    const changed = () => setRevision((n) => n + 1);
    window.addEventListener('picforge-format-recheck', changed);
    return () => window.removeEventListener('picforge-format-recheck', changed);
  }, []);
  useEffect(() => {
    let active = true;
    setState({
      checking: true,
      supported: false,
      encoding: '',
      decoding: '',
      error: '',
    });
    if (!cache.has(format)) cache.set(format, probe(format));
    void cache.get(format)!.then((s) => {
      if (active) setState(s);
    });
    return () => {
      active = false;
    };
  }, [format, revision]);
  return {
    ...state,
    retry: () => {
      cache.delete(format);
      window.dispatchEvent(new Event('picforge-format-recheck'));
    },
  };
}
