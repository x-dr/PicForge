import type { WatermarkStyle } from './watermark';
export type InputFormat =
  'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif';
export type OutputFormat = InputFormat;
export interface AssetRecord {
  id: string;
  name: string;
  status: 'loading' | 'ready' | 'error';
  width: number;
  height: number;
  thumbnailUrl?: string;
  error?: string;
}
export interface ImageSource {
  id: string;
  file: Blob;
  width: number;
  height: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Placement {
  id: string;
  source: Rect;
  target: Rect;
  transform?: { rotation: number; flipX: boolean; flipY: boolean };
}
export interface RenderPlan {
  width: number;
  height: number;
  placements: Placement[];
  background: string | null;
  upscaled: boolean;
}
export interface RenderRequest {
  plan: RenderPlan;
  sources: ImageSource[];
  format: OutputFormat;
  quality: number;
  jpegBackground: string;
  preview: boolean;
  watermark?: { style: WatermarkStyle; image?: ImageSource };
}
export type RenderProgress = {
  phase: 'drawing' | 'encoding';
  done: number;
  total: number;
};
export interface ImageHeader {
  width: number;
  height: number;
  format: InputFormat;
  orientation: number;
}
