import { useRef } from 'react';
import type { AssetRecord } from '../../imaging/types';
import { cropRectangle, type TransformSettings } from '../../imaging/transform';
import styles from '../processing/Processing.module.css';
export function CropSelection({
  asset,
  settings,
  patch,
}: {
  asset: AssetRecord;
  settings: TransformSettings;
  patch: (s: Partial<TransformSettings>) => void;
}) {
  const start = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const rect = cropRectangle(asset.width, asset.height, settings);
  return (
    <div className={styles.cropEditor}>
      <p>在原图上拖动以选择裁剪区域，也可在设置中输入百分比。</p>
      <div
        className={styles.cropSurface}
        data-testid="crop-surface"
        style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const box = e.currentTarget.getBoundingClientRect();
          start.current = {
            x: ((e.clientX - box.left) / box.width) * 100,
            y: ((e.clientY - box.top) / box.height) * 100,
            pointer: e.pointerId,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!start.current || start.current.pointer !== e.pointerId) return;
          const box = e.currentTarget.getBoundingClientRect();
          const x = Math.max(
            0,
            Math.min(100, ((e.clientX - box.left) / box.width) * 100),
          );
          const y = Math.max(
            0,
            Math.min(100, ((e.clientY - box.top) / box.height) * 100),
          );
          patch({
            x: Math.min(start.current.x, x),
            y: Math.min(start.current.y, y),
            cropWidth: Math.abs(x - start.current.x),
            cropHeight: Math.abs(y - start.current.y),
          });
        }}
        onPointerUp={() => {
          start.current = null;
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
      >
        <img src={asset.thumbnailUrl} alt="裁剪参考原图" draggable={false} />
        <div
          className={styles.cropRectangle}
          style={{
            left: `${(rect.x / asset.width) * 100}%`,
            top: `${(rect.y / asset.height) * 100}%`,
            width: `${(rect.width / asset.width) * 100}%`,
            height: `${(rect.height / asset.height) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
