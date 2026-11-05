import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from './Icon';
import styles from './PreviewImage.module.css';

export function PreviewImage({
  src,
  alt,
  className,
  style,
  'data-testid': testId,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState('fit');

  useEffect(() => {
    if (!expanded) return;
    const current = dialog.current;
    const previousOverflow = document.body.style.overflow;
    current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      current?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label="放大预览"
        aria-haspopup="dialog"
        title="点击放大预览"
        onClick={() => {
          setZoom('fit');
          setExpanded(true);
        }}
      >
        <img
          src={src}
          alt={alt}
          className={className}
          style={style}
          data-testid={testId}
        />
      </button>
      {expanded && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-label="放大预览"
          onClose={() => setExpanded(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget)
              event.currentTarget.close();
          }}
        >
          <div className={styles.toolbar}>
            <strong>放大预览</strong>
            <div className={styles.controls}>
              <select
                aria-label="放大预览缩放"
                value={zoom}
                onChange={(event) => {
                  setZoom(event.target.value);
                  viewport.current?.scrollTo(0, 0);
                }}
              >
                <option value="fit">适应窗口</option>
                <option value="0.5">50%</option>
                <option value="1">100%</option>
                <option value="2">200%</option>
              </select>
              <button
                type="button"
                className="icon-button"
                aria-label="关闭放大预览"
                title="关闭（Esc）"
                onClick={() => dialog.current?.close()}
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
          <div
            ref={viewport}
            className={styles.viewport}
            role="region"
            aria-label="放大图片，可滚动查看"
            tabIndex={0}
          >
            <img
              className={`${styles.image} ${zoom === 'fit' ? styles.fit : ''} checkerboard`}
              src={src}
              alt={alt}
              style={zoom === 'fit' ? undefined : { zoom: Number(zoom) }}
            />
          </div>
          <p className={styles.caption}>{alt}</p>
        </dialog>
      )}
    </>
  );
}
