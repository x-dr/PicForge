import type { AssetRecord } from './types';

export type AssetAction =
  | { type: 'add'; assets: AssetRecord[] }
  | { type: 'resolved'; id: string; value: Partial<AssetRecord> }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; to: number }
  | { type: 'clear' };

export function assetReducer(
  assets: AssetRecord[],
  action: AssetAction,
): AssetRecord[] {
  switch (action.type) {
    case 'add':
      return [...assets, ...action.assets];
    case 'resolved':
      if (!assets.some((asset) => asset.id === action.id)) return assets;
      return assets.map((asset) =>
        asset.id === action.id
          ? { ...asset, ...action.value, id: asset.id }
          : asset,
      );
    case 'remove':
      return assets.filter((asset) => asset.id !== action.id);
    case 'clear':
      return [];
    case 'move': {
      const from = assets.findIndex((asset) => asset.id === action.id);
      if (
        from < 0 ||
        action.to < 0 ||
        action.to >= assets.length ||
        from === action.to
      )
        return assets;
      const result = [...assets];
      const [asset] = result.splice(from, 1);
      result.splice(action.to, 0, asset);
      return result;
    }
  }
}
