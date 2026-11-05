import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadPreferences, savePreferences } from '../../browser/preferences';
import { useAssets } from '../../app/AssetContext';
import { normalizeSettings, type EditorAction } from './document';
import { calculateLayout } from './layout';

function useEditorState() {
  const assets = useAssets();
  const [settings, setSettings] = useState(loadPreferences);
  useEffect(() => {
    savePreferences(settings);
  }, [settings]);
  const plan = useMemo(
    () => calculateLayout(assets.ready, settings),
    [assets.ready, settings],
  );
  const dispatch = (action: EditorAction) => {
    if (action.type === 'settings')
      setSettings((current) =>
        normalizeSettings({ ...current, ...action.patch }),
      );
    if (action.type === 'move') assets.move(action.id, action.to);
  };
  return {
    ...assets,
    document: { assets: assets.assets, settings },
    plan,
    dispatch,
  };
}
const EditorContext = createContext<ReturnType<typeof useEditorState> | null>(
  null,
);
export function EditorProvider({ children }: { children: ReactNode }) {
  return (
    <EditorContext.Provider value={useEditorState()}>
      {children}
    </EditorContext.Provider>
  );
}
export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error('EditorProvider missing');
  return context;
}
