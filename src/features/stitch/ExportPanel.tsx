import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../app/Icon';
import { checkOutput } from '../../imaging/budget';
import type { RenderProgress } from '../../imaging/types';
import { downloadImage, outputFilename } from '../../browser/download';
import { runRender } from '../../browser/render-engine';
import { useEditor } from './EditorContext';
import styles from '../../app/ExportPanel.module.css';

export function ExportPanel() {
  const {
    document: doc,
    ready,
    plan,
    budget,
    repository,
    dispatch,
  } = useEditor();
  const [job, setJob] = useState<{
    status: 'idle' | 'working' | 'done' | 'error';
    message: string;
    bytes?: number;
  }>({ status: 'idle', message: '' });
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const budgetError = plan
    ? checkOutput(
        plan.width,
        plan.height,
        Math.max(...ready.map((asset) => asset.width * asset.height)),
        budget,
      )
    : null;
  const loading = doc.assets.some((asset) => asset.status === 'loading');
  const errors = doc.assets.filter((asset) => asset.status === 'error').length;
  const working = job.status === 'working';
  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    setJob({ status: 'idle', message: '已取消生成，可以调整参数后重试。' });
    setProgress(null);
  };
  const generate = async () => {
    if (!plan || budgetError || loading || working) return;
    const current = new AbortController();
    controller.current = current;
    const settings = { ...doc.settings };
    const filename = outputFilename(settings.filename, settings.format);
    setJob({ status: 'working', message: '正在准备图片…' });
    setProgress(null);
    try {
      const sources = repository.sources(
        ready.map((asset) => asset.id),
        false,
      );
      const blob = await runRender(
        {
          plan,
          sources,
          format: settings.format,
          quality: settings.quality,
          jpegBackground: settings.jpegBackground,
          preview: false,
        },
        current.signal,
        (value) => {
          if (!current.signal.aborted) setProgress(value);
        },
      );
      if (current.signal.aborted) return;
      downloadImage(blob, filename);
      setJob({
        status: 'done',
        message: `已生成文件并发起下载：${filename}`,
        bytes: blob.size,
      });
    } catch (error) {
      if (!current.signal.aborted)
        setJob({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : '生成失败，请重试或降低尺寸。',
        });
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setProgress(null);
      }
    }
  };
  const phase =
    progress?.phase === 'drawing'
      ? `正在绘制 ${progress.done}/${progress.total}`
      : progress?.phase === 'encoding'
        ? '正在编码，请稍候…'
        : '正在准备图片…';
  const reduceSize = () =>
    dispatch({
      type: 'settings',
      patch: {
        size: Math.max(64, Math.floor(doc.settings.size / 2)),
        cellWidth: Math.max(32, Math.floor(doc.settings.cellWidth / 2)),
        cellHeight: Math.max(32, Math.floor(doc.settings.cellHeight / 2)),
        gap: Math.floor(doc.settings.gap / 2),
        padding: Math.floor(doc.settings.padding / 2),
      },
    });
  return (
    <section className={styles.exportPanel} aria-label="图片导出">
      <div className={styles.exportInfo}>
        <span className={styles.exportIcon}>
          <Icon name="image" size={20} />
        </span>
        <div>
          <strong>
            {plan
              ? `${plan.width.toLocaleString()} × ${plan.height.toLocaleString()}`
              : '准备好你的第一张拼图'}
          </strong>
          <span>
            {plan
              ? `${doc.settings.format === 'image/png' ? 'PNG 无损' : 'JPEG'} · ${ready.length} 张图片 · 按原图绘制`
              : '添加图片后，即可预览并下载'}
          </span>
        </div>
      </div>
      <div className={styles.exportAction}>
        {working ? (
          <>
            <span className={styles.exportPhase} role="status">
              <span className="spinner" />
              {phase}
            </span>
            <button className="button secondary" onClick={cancel}>
              取消
            </button>
          </>
        ) : (
          <button
            className="button primary export-button"
            disabled={!plan || !!budgetError || loading}
            onClick={generate}
          >
            <Icon name="download" size={18} />
            {job.status === 'error' ? '重试导出' : '导出图片'}
            <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
      {(budgetError || job.message || plan?.upscaled || errors > 0) && (
        <div className={styles.exportMessages}>
          {budgetError && (
            <div className="message warning" role="alert">
              <span>{budgetError}</span>
              <button className="text-button" onClick={reduceSize}>
                尺寸减半
              </button>
            </div>
          )}
          {job.message && !working && (
            <div
              className={`message ${job.status === 'error' ? 'warning' : job.status === 'done' ? 'success' : ''}`}
              role={job.status === 'error' ? 'alert' : 'status'}
            >
              <span>
                {job.message}
                {job.bytes !== undefined &&
                  `（${(job.bytes / 1024 / 1024).toFixed(2)} MiB）`}
              </span>
              {job.status === 'error' && (
                <button className="text-button" onClick={reduceSize}>
                  尺寸减半
                </button>
              )}
            </div>
          )}
          {plan?.upscaled && !budgetError && (
            <p className="microcopy">
              <Icon name="info" size={13} />
              部分图片将被放大，清晰度可能降低。
            </p>
          )}
          {errors > 0 && (
            <p className="microcopy">
              {errors} 张图片导入失败，导出仅包含 {ready.length} 张有效图片。
            </p>
          )}
        </div>
      )}
    </section>
  );
}
