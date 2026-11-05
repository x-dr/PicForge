import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import { AssetRepository } from '../imaging/asset-repository';
import { DESKTOP_BUDGET, MOBILE_BUDGET } from '../imaging/budget';
import { releaseDownloads } from '../browser/download';
import { assetReducer } from '../imaging/asset-state';
import { ResultBudget } from '../imaging/result-budget';

function useAssetState() {
  const [assets, dispatch] = useReducer(assetReducer, []);
  const [repository] = useState(() => new AssetRepository());
  const [budget] = useState(() =>
    matchMedia('(pointer: coarse)').matches ? MOBILE_BUDGET : DESKTOP_BUDGET,
  );
  const [importMessage, setImportMessage] = useState('');
  const [resultBudget] = useState(() => new ResultBudget(budget.peakBytes / 4));
  useEffect(
    () => () => {
      repository.clear();
      releaseDownloads();
    },
    [repository],
  );
  const ready = useMemo(
    () => assets.filter((asset) => asset.status === 'ready'),
    [assets],
  );
  const addFiles = (files: File[]) => {
    const available = budget.maxImages - repository.count;
    const selected = files.slice(0, available);
    setImportMessage(
      files.length > available
        ? `最多保留 ${budget.maxImages} 张图片，已添加前 ${selected.length} 张。请移除部分素材后再添加。`
        : '',
    );
    const records = selected.map((file) => repository.add(file));
    dispatch({ type: 'add', assets: records });
    for (const record of records)
      repository.load(record.id, budget, (value) =>
        dispatch({ type: 'resolved', id: record.id, value }),
      );
  };
  const remove = (id: string) => {
    repository.remove(id);
    dispatch({ type: 'remove', id });
  };
  const clear = () => {
    repository.clear();
    dispatch({ type: 'clear' });
    setImportMessage('');
  };
  const move = (id: string, to: number) => dispatch({ type: 'move', id, to });
  return {
    assets,
    ready,
    repository,
    budget,
    resultBudget,
    addFiles,
    remove,
    clear,
    move,
    importMessage,
    setImportMessage,
  };
}
const AssetContext = createContext<ReturnType<typeof useAssetState> | null>(
  null,
);
export function AssetProvider({ children }: { children: ReactNode }) {
  return (
    <AssetContext.Provider value={useAssetState()}>
      {children}
    </AssetContext.Provider>
  );
}
export function useAssets() {
  const value = useContext(AssetContext);
  if (!value) throw new Error('AssetProvider missing');
  return value;
}
