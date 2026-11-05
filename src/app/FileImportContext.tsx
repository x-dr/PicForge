import {
  createContext,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type DragEvent,
  useEffect,
} from 'react';
import { useAssets } from './AssetContext';
import { createDemoImages } from '../browser/demo-images';

const FileImportContext = createContext<{
  open: () => void;
  demo: () => Promise<void>;
  demoLoading: boolean;
} | null>(null);
export function FileImportProvider({ children }: { children: ReactNode }) {
  const { addFiles, setImportMessage } = useAssets();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const depth = useRef(0);
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length) {
        event.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [addFiles]);
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };
  const demo = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      addFiles(await createDemoImages());
    } catch {
      setImportMessage('示例生成失败，请直接选择本地图片。');
    } finally {
      setDemoLoading(false);
    }
  };
  const fileDrag = (event: DragEvent) =>
    event.dataTransfer.types.includes('Files');
  return (
    <FileImportContext.Provider
      value={{ open: () => input.current?.click(), demo, demoLoading }}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onChange={change}
        hidden
        tabIndex={-1}
        aria-label="导入图片文件"
        data-testid="file-input"
      />
      <div
        className="app-shell"
        onDragEnter={(event) => {
          if (fileDrag(event)) {
            event.preventDefault();
            depth.current++;
            setDragging(true);
          }
        }}
        onDragOver={(event) => {
          if (fileDrag(event)) event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (fileDrag(event)) {
            depth.current--;
            if (depth.current <= 0) setDragging(false);
          }
        }}
        onDrop={(event) => {
          if (!fileDrag(event)) return;
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        {children}
        {dragging && (
          <div className="drop-overlay">
            <div>
              <span className="drop-symbol">＋</span>
              <strong>松开，添加图片</strong>
              <span>图片将在你的设备上处理</span>
            </div>
          </div>
        )}
      </div>
    </FileImportContext.Provider>
  );
}
export function useFileImport() {
  const value = useContext(FileImportContext);
  if (!value) throw new Error('FileImportProvider missing');
  return value;
}
