import type { AssetRecord } from '../../imaging/types';
import { assetReducer, type AssetAction } from '../../imaging/asset-state';
export type { AssetRecord } from '../../imaging/types';
export type LayoutMode = 'vertical' | 'horizontal' | 'grid';
export interface StitchSettings {
  mode: LayoutMode;
  size: number;
  columns: number;
  cellWidth: number;
  cellHeight: number;
  fit: 'contain' | 'cover';
  gap: number;
  padding: number;
  background: string;
  transparent: boolean;
  format: 'image/png' | 'image/jpeg';
  quality: number;
  filename: string;
  jpegBackground: string;
}
export const DEFAULT_SETTINGS: StitchSettings = {
  mode: 'vertical',
  size: 1200,
  columns: 2,
  cellWidth: 600,
  cellHeight: 600,
  fit: 'contain',
  gap: 16,
  padding: 16,
  background: '#ffffff',
  transparent: false,
  format: 'image/png',
  quality: 0.92,
  filename: 'PicForge-拼图',
  jpegBackground: '#ffffff',
};
export const NUMBER_LIMITS = {
  size: [64, 4000],
  columns: [1, 10],
  cellWidth: [32, 4000],
  cellHeight: [32, 4000],
  gap: [0, 200],
  padding: [0, 200],
} as const;
export type NumericSetting = keyof typeof NUMBER_LIMITS;
export function normalizeSettings(
  input: Partial<StitchSettings>,
): StitchSettings {
  const result = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(NUMBER_LIMITS) as NumericSetting[]) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const [min, max] = NUMBER_LIMITS[key];
      result[key] = Math.min(max, Math.max(min, Math.round(value)));
    }
  }
  if (['vertical', 'horizontal', 'grid'].includes(input.mode ?? ''))
    result.mode = input.mode!;
  if (input.fit === 'contain' || input.fit === 'cover') result.fit = input.fit;
  if (input.format === 'image/png' || input.format === 'image/jpeg')
    result.format = input.format;
  for (const key of ['background', 'jpegBackground'] as const) {
    if (/^#[0-9a-f]{6}$/i.test(input[key] ?? '')) result[key] = input[key]!;
  }
  if (typeof input.transparent === 'boolean')
    result.transparent = input.transparent;
  if (typeof input.quality === 'number' && Number.isFinite(input.quality))
    result.quality = Math.min(1, Math.max(0.1, input.quality));
  if (typeof input.filename === 'string')
    result.filename = input.filename.slice(0, 80);
  return result;
}
export interface StitchDocument {
  assets: AssetRecord[];
  settings: StitchSettings;
  revision: number;
}
export type EditorAction =
  AssetAction | { type: 'settings'; patch: Partial<StitchSettings> };
export function editorReducer(
  state: StitchDocument,
  action: EditorAction,
): StitchDocument {
  if (action.type === 'settings') {
    return {
      ...state,
      settings: normalizeSettings({ ...state.settings, ...action.patch }),
      revision: state.revision + 1,
    };
  }
  const assets = assetReducer(state.assets, action);
  return assets === state.assets
    ? state
    : { ...state, assets, revision: state.revision + 1 };
}
