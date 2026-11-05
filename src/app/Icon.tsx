import type { CSSProperties } from 'react';
const paths = {
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  image:
    'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm-1 14 6-6 4 4 3-3 5 5M15 8h.01',
  vertical: 'M5 3h14v7H5zM5 14h14v7H5z',
  horizontal: 'M3 5h7v14H3zM14 5h7v14h-7z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  watermark: 'M4 4h16v16H4zM8 9V7h8v2M12 7v10M9 17h6',
  arrowUp: 'm6 14 6-6 6 6',
  arrowDown: 'm6 10 6 6 6-6',
  close: 'm6 6 12 12M6 18 18 6',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  grip: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  fit: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  check: 'm5 12 4 4L19 6',
  info: 'M12 8h.01M12 11v6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  help: 'M9 9a3 3 0 1 1 4 2.8c-1 .4-1 1.2-1 2.2M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  reset: 'M3 10a9 9 0 1 1 1 7M3 4v6h6',
  lock: 'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
