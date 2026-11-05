import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAssets } from '../../app/AssetContext';
import { importImage } from '../../imaging/import-image';
import type { ImageSource } from '../../imaging/types';
import {
  DEFAULT_SETTINGS,
  updateSettings,
  type WatermarkSettings,
} from './model';
import { useWatermarkBatch } from './use-watermark-batch';

interface Logo extends ImageSource {
  name: string;
  url: string;
}
function useWatermarkState() {
  const { budget } = useAssets();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedId, select] = useState('');
  const [logo, setLogo] = useState<Logo>();
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(
    () => () => {
      if (logo) URL.revokeObjectURL(logo.url);
    },
    [logo],
  );
  const loadLogo = async (file: File) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLogoLoading(true);
    setLogoError('');
    try {
      const imported = await importImage(file, budget, current.signal);
      if (!current.signal.aborted)
        setLogo({
          id: crypto.randomUUID(),
          name: file.name,
          file: imported.file,
          width: imported.width,
          height: imported.height,
          url: URL.createObjectURL(imported.thumbnail),
        });
    } catch (error) {
      if (!current.signal.aborted)
        setLogoError(
          error instanceof Error ? error.message : '水印图片导入失败。',
        );
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setLogoLoading(false);
      }
    }
  };
  const removeLogo = () => {
    controller.current?.abort();
    controller.current = null;
    setLogo(undefined);
    setLogoLoading(false);
    setLogoError('');
  };
  const patch = (input: Partial<WatermarkSettings>) =>
    setSettings((current) => updateSettings(current, input));
  const batch = useWatermarkBatch(settings, logo);
  const validation =
    settings.kind === 'text'
      ? !settings.text.trim()
        ? '请先填写水印文字。'
        : ''
      : !logo
        ? '请先选择水印图片。'
        : '';
  return {
    settings,
    patch,
    selectedId,
    select,
    logo,
    loadLogo,
    removeLogo,
    logoLoading,
    logoError,
    validation,
    batch,
  };
}
const WatermarkContext = createContext<ReturnType<
  typeof useWatermarkState
> | null>(null);
export function WatermarkProvider({ children }: { children: ReactNode }) {
  return (
    <WatermarkContext.Provider value={useWatermarkState()}>
      {children}
    </WatermarkContext.Provider>
  );
}
export function useWatermark() {
  const value = useContext(WatermarkContext);
  if (!value) throw new Error('WatermarkProvider missing');
  return value;
}
