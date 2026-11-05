import { useEffect, useRef, useState } from 'react';
import { useAssets } from '../../app/AssetContext';
import { downloadImage } from '../../browser/download';
import { useWatermark } from '../watermark/WatermarkContext';
import { useFormatCapability } from '../convert/use-format-capability';
import { useProcessing } from './ProcessingContext';
import { pipelineValidation, type ProcessingMode } from './model';
import toolbar from '../../app/ExportPanel.module.css';
import resultStyle from '../watermark/Watermark.module.css';
import styles from './Processing.module.css';
const status = {
  pending: '等待处理',
  working: '正在生成',
  done: '已生成',
  error: '失败',
  cancelled: '已取消',
};
export function ProcessingResults({ mode }: { mode: ProcessingMode }) {
  const { assets, ready, budget } = useAssets();
  const { settings, selectedId, jobs } = useProcessing(mode);
  const { logo, logoLoading } = useWatermark();
  const capability = useFormatCapability(settings.format);
  const validation = pipelineValidation(settings, logo);
  const [message, setMessage] = useState('');
  const [packing, setPacking] = useState(false);
  const zipController = useRef<AbortController | null>(null);
  useEffect(() => () => zipController.current?.abort(), []);
  const selected = ready.find((a) => a.id === selectedId) ?? ready[0];
  const done = jobs.results.filter((r) => r.status === 'done' && r.blob);
  const zip = async () => {
    if (zipController.current) return;
    const current = new AbortController();
    zipController.current = current;
    setPacking(true);
    setMessage('正在准备 ZIP…');
    try {
      const { createZip } = await import('../../browser/zip');
      current.signal.throwIfAborted();
      const blob = await createZip(
        done.map((r) => ({ name: r.filename, blob: r.blob! })),
        budget.peakBytes / 8 + 64 * 1024,
        current.signal,
        (n) => setMessage(`正在打包 ${n}/${done.length}`),
      );
      current.signal.throwIfAborted();
      downloadImage(blob, 'PicForge-batch.zip');
      setMessage('已生成 ZIP 并发起下载。');
    } catch (e) {
      if (!current.signal.aborted)
        setMessage(
          e instanceof Error ? e.message : 'ZIP 生成失败，可重试或逐项下载。',
        );
    } finally {
      if (zipController.current === current) {
        zipController.current = null;
        setPacking(false);
      }
    }
  };
  return (
    <section className={resultStyle.results} aria-label="图片生成与结果">
      <div className={`${toolbar.exportPanel} ${resultStyle.batchToolbar}`}>
        <div className={toolbar.exportInfo}>
          <div>
            <strong>
              {mode === 'transform'
                ? selected
                  ? `当前图片 · ${selected.name}`
                  : '选择图片开始处理'
                : `${ready.length} 张图片 · ${mode === 'batch' ? '同一份流程' : '格式转换'}`}
            </strong>
            <span>
              {mode === 'transform'
                ? '生成当前预览图片'
                : '逐张生成，成功结果可保留'}
            </span>
          </div>
        </div>
        <div className={toolbar.exportAction}>
          {jobs.working ? (
            <button className="button secondary" onClick={jobs.cancel}>
              取消处理
            </button>
          ) : (
            <button
              className="button primary"
              disabled={
                !ready.length ||
                assets.some((a) => a.status === 'loading') ||
                !!validation ||
                capability.checking ||
                !capability.supported ||
                packing ||
                (settings.watermarkEnabled && logoLoading)
              }
              onClick={() => {
                setMessage('');
                jobs.start(
                  mode === 'transform' ? (selected ? [selected] : []) : assets,
                  settings,
                  logo,
                );
              }}
            >
              {jobs.results.length
                ? '替换结果并生成'
                : mode === 'transform'
                  ? '生成处理图片'
                  : mode === 'convert'
                    ? '开始格式转换'
                    : '开始批量处理'}
            </button>
          )}
        </div>
        <p className={resultStyle.batchStatus} role="status">
          {jobs.working
            ? jobs.progress
            : validation ||
              jobs.progress ||
              (capability.checking
                ? '正在检测格式能力…'
                : '使用点击生成时的参数，原图不会修改。')}
        </p>
      </div>
      {jobs.results.length > 0 && (
        <div className={resultStyle.resultBody}>
          <div className={resultStyle.resultHeading}>
            <h2>
              生成结果{' '}
              <span>
                {done.length}/{jobs.results.length}
              </span>
            </h2>
            <button
              className="text-button muted"
              disabled={jobs.working || packing}
              onClick={() => {
                jobs.clear();
                setMessage('');
              }}
            >
              清空结果
            </button>
          </div>
          <p className="microcopy">
            重试沿用本批次配置。修改参数后重新生成会替换旧结果。
          </p>
          {mode !== 'transform' && (
            <div className={styles.actions}>
              <button
                className="button secondary"
                disabled={jobs.working || !done.length || packing}
                onClick={() => void zip()}
              >
                下载成功项 ZIP
              </button>
              {packing && (
                <button
                  className="text-button"
                  onClick={() => {
                    zipController.current?.abort();
                    zipController.current = null;
                    setPacking(false);
                    setMessage('已取消打包，成功结果仍可下载。');
                  }}
                >
                  取消打包
                </button>
              )}
              <button
                className="text-button"
                disabled={
                  jobs.working ||
                  packing ||
                  !jobs.results.some(
                    (r) =>
                      ['error', 'cancelled'].includes(r.status) && r.request,
                  )
                }
                onClick={() => jobs.retry(jobs.results)}
              >
                重试未完成项
              </button>
            </div>
          )}
          <ol className={resultStyle.resultList} aria-label="图片处理结果">
            {jobs.results.map((item) => (
              <li key={item.id} data-testid="processing-result">
                <div className={resultStyle.resultInfo}>
                  <strong title={item.filename}>{item.filename}</strong>
                  <span>
                    {status[item.status]}
                    {item.blob
                      ? ` · ${item.width} × ${item.height} px · ${(item.blob.size / 1024).toFixed(1)} KiB`
                      : ''}
                  </span>
                  {item.blob && item.originalBytes > 0 && (
                    <span>
                      原图 {(item.originalBytes / 1024).toFixed(1)} KiB ·{' '}
                      {item.blob.size > item.originalBytes ? '增大' : '减少'}{' '}
                      {Math.abs(
                        (item.blob.size / item.originalBytes - 1) * 100,
                      ).toFixed(1)}
                      %
                    </span>
                  )}
                  {item.message && (
                    <p className="asset-error">{item.message}</p>
                  )}
                </div>
                {item.blob && (
                  <button
                    className="button secondary"
                    aria-label={`下载 ${item.filename}`}
                    onClick={() => {
                      downloadImage(item.blob!, item.filename);
                      setMessage(`已生成文件并发起下载：${item.filename}`);
                    }}
                  >
                    下载
                  </button>
                )}
                {['error', 'cancelled'].includes(item.status) &&
                  item.request && (
                    <button
                      className="text-button"
                      disabled={jobs.working || packing}
                      aria-label={`重试 ${item.filename}`}
                      onClick={() => jobs.retry([item])}
                    >
                      重试
                    </button>
                  )}
              </li>
            ))}
          </ol>
        </div>
      )}
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
