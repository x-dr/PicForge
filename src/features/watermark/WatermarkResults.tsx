import { useState } from 'react';
import { Icon } from '../../app/Icon';
import { useAssets } from '../../app/AssetContext';
import { downloadImage } from '../../browser/download';
import { useWatermark } from './WatermarkContext';
import toolbar from '../../app/ExportPanel.module.css';
import styles from './Watermark.module.css';

const STATUS = {
  pending: '等待处理',
  working: '正在生成',
  done: '已生成',
  error: '失败',
  cancelled: '已取消',
};
export function WatermarkResults() {
  const { assets, ready } = useAssets();
  const { batch, validation, logoLoading } = useWatermark();
  const [downloadMessage, setDownloadMessage] = useState('');
  const done = batch.results.filter((item) => item.status === 'done').length;
  return (
    <section className={styles.results} aria-label="水印生成与结果">
      <div className={`${toolbar.exportPanel} ${styles.batchToolbar}`}>
        <div className={toolbar.exportInfo}>
          <span className={toolbar.exportIcon}>
            <Icon name="shield" size={20} />
          </span>
          <div>
            <strong>
              {ready.length
                ? `${ready.length} 张图片 · 一份专属水印`
                : '准备好你的第一份署名'}
            </strong>
            <span>保持原始尺寸 · 生成后逐项下载</span>
          </div>
        </div>
        <div className={toolbar.exportAction}>
          {batch.working ? (
            <>
              <span className="spinner" />
              <button className="button secondary" onClick={batch.cancel}>
                取消生成
              </button>
            </>
          ) : (
            <button
              className="button primary"
              disabled={
                !!validation ||
                logoLoading ||
                !ready.length ||
                assets.some((item) => item.status === 'loading')
              }
              onClick={() => {
                setDownloadMessage('');
                batch.start();
              }}
            >
              <Icon name="sparkles" size={17} />
              {batch.results.length ? '重新生成全部' : '生成水印图片'}
            </button>
          )}
        </div>
        {(validation || batch.progress) && (
          <p className={styles.batchStatus} role="status">
            {batch.working ? batch.progress : validation || batch.progress}
          </p>
        )}
      </div>
      {batch.results.length > 0 && (
        <div className={styles.resultBody}>
          <div className={styles.resultHeading}>
            <h2>
              生成结果{' '}
              <span>
                {done}/{batch.results.length}
              </span>
            </h2>
            <button
              className="text-button muted"
              disabled={batch.working}
              onClick={() => {
                batch.clear();
                setDownloadMessage('');
              }}
            >
              清空结果
            </button>
          </div>
          <p className="microcopy">
            本批次使用点击生成时的配置；单项重试沿用该配置。重新生成全部会替换下方结果。
          </p>
          <ol className={styles.resultList} aria-label="水印处理结果">
            {batch.results.map((item) => (
              <li key={item.id} data-testid="watermark-result">
                <div className={styles.resultInfo}>
                  <strong title={item.filename}>{item.filename}</strong>
                  <span>
                    {STATUS[item.status]}
                    {item.blob
                      ? ` · ${item.width} × ${item.height} px · ${(item.blob.size / 1024).toFixed(1)} KiB`
                      : ''}
                  </span>
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
                      setDownloadMessage(
                        `已生成文件并发起下载：${item.filename}`,
                      );
                    }}
                  >
                    <Icon name="download" size={15} />
                    下载
                  </button>
                )}
                {['error', 'cancelled'].includes(item.status) &&
                  item.request && (
                    <button
                      className="text-button"
                      disabled={batch.working}
                      aria-label={`重试 ${item.filename}`}
                      onClick={() => batch.retry(item)}
                    >
                      重试
                    </button>
                  )}
              </li>
            ))}
          </ol>
          {downloadMessage && (
            <p className="message success" role="status">
              {downloadMessage}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
