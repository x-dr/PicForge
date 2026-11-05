import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { useAssets } from './AssetContext';
import { useFileImport } from './FileImportContext';
import styles from './AssetPanel.module.css';

export function AssetPanel() {
  const {
    assets,
    ready,
    move,
    remove,
    clear,
    importMessage,
    setImportMessage,
  } = useAssets();
  const doc = { assets };
  const { open } = useFileImport();
  const [expanded, setExpanded] = useState(
    () => !matchMedia('(max-width: 767px)').matches,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const moveTo = (id: string, target: string) => {
    move(
      id,
      doc.assets.findIndex((asset) => asset.id === target),
    );
    setDragId(null);
  };
  return (
    <details
      className={styles.assets}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="panel-heading">
        <span>
          图片素材 <span className="count-badge">{doc.assets.length}</span>
        </span>
        <Icon name="arrowDown" size={16} />
      </summary>
      <div className={styles.assetBody}>
        <button className="button primary add-button" onClick={open}>
          <Icon name="plus" size={18} />
          添加图片
        </button>
        <p className="microcopy center">
          JPEG、PNG、WebP、AVIF · 每张 ≤ 20 MiB
        </p>
        {importMessage && (
          <div className="message warning" role="alert">
            <span>{importMessage}</span>
            <button
              className="icon-button"
              aria-label="关闭导入提示"
              onClick={() => setImportMessage('')}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        <div className={styles.listHeader}>
          <span>
            {doc.assets.length ? `${ready.length} 张已就绪` : '等待添加素材'}
          </span>
          <button
            className="text-button muted"
            disabled={!doc.assets.length}
            onClick={() => dialog.current?.showModal()}
          >
            <Icon name="trash" size={13} />
            清空
          </button>
        </div>
        {doc.assets.length > 0 ? (
          <ol className={styles.assetList} aria-label="图片素材顺序">
            {doc.assets.map((asset, index) => (
              <li
                key={asset.id}
                className={`${styles.assetItem} ${dragId === asset.id ? styles.dragging : ''}`}
                data-asset-id={asset.id}
                onDragOver={(event) => {
                  if (dragId) event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!dragId) return;
                  event.preventDefault();
                  event.stopPropagation();
                  moveTo(dragId, asset.id);
                }}
              >
                <div className={styles.assetTop}>
                  <button
                    className={`icon-button ${styles.grip}`}
                    aria-label={`拖动排序 ${asset.name}`}
                    title="拖动排序；也可使用下方上移、下移按钮"
                    draggable
                    onDragStart={(event) => {
                      setDragId(asset.id);
                      event.dataTransfer.setData('text/plain', asset.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragId(null)}
                    onPointerDown={(event) => {
                      if (event.pointerType !== 'touch') return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDragId(asset.id);
                    }}
                    onPointerUp={(event) => {
                      if (event.pointerType !== 'touch' || !dragId) return;
                      const target = window.document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest<HTMLElement>('[data-asset-id]')
                        ?.dataset.assetId;
                      if (target) moveTo(asset.id, target);
                      else setDragId(null);
                    }}
                    onPointerCancel={(event) => {
                      if (event.pointerType === 'touch') setDragId(null);
                    }}
                  >
                    <Icon name="grip" size={16} />
                  </button>
                  <span className={styles.thumbnail}>
                    {asset.thumbnailUrl ? (
                      <img src={asset.thumbnailUrl} alt="" />
                    ) : asset.status === 'loading' ? (
                      <span className="spinner" />
                    ) : (
                      <Icon name="image" />
                    )}
                    <span className={styles.assetIndex}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </span>
                  <div className={styles.assetInfo}>
                    <strong title={asset.name}>{asset.name}</strong>
                    <span>
                      {asset.status === 'ready'
                        ? `${asset.width} × ${asset.height}`
                        : asset.status === 'loading'
                          ? '正在检查图片…'
                          : '导入失败'}
                    </span>
                  </div>
                  <button
                    className="icon-button remove-button"
                    aria-label={`移除 ${asset.name}`}
                    onClick={() => remove(asset.id)}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
                {asset.error && (
                  <p className="asset-error" role="alert">
                    {asset.error}
                  </p>
                )}
                <div className={styles.assetActions}>
                  <span>
                    {asset.status === 'ready' ? (
                      <>
                        <span className="status-dot" />
                        已就绪
                      </>
                    ) : asset.status === 'error' ? (
                      '请重新选择图片'
                    ) : (
                      '本地处理中'
                    )}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label={`上移 ${asset.name}`}
                      disabled={index === 0}
                      onClick={() => move(asset.id, index - 1)}
                    >
                      <Icon name="arrowUp" size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`下移 ${asset.name}`}
                      disabled={index === doc.assets.length - 1}
                      onClick={() => move(asset.id, index + 1)}
                    >
                      <Icon name="arrowDown" size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.emptyList}>
            <span className={styles.emptyListIcon}>
              <Icon name="image" size={27} />
            </span>
            <p>好作品，从一张图开始</p>
            <span>点击添加，或拖入本地图片</span>
          </div>
        )}
        <div className={styles.assetTip}>
          <Icon name="info" size={15} />
          <span>
            拖动手柄调整顺序
            <br />
            也支持上移、下移与粘贴导入
          </span>
        </div>
      </div>
      <div className={styles.privacyCard}>
        <Icon name="shield" size={23} />
        <div>
          <strong>你的图片，只留在本机</strong>
          <p>
            无需上传，无需登录
            <br />
            刷新页面后自动释放
          </p>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby="clear-title"
      >
        <h2 id="clear-title">清空当前素材？</h2>
        <p>
          将移除这 {doc.assets.length}{' '}
          张素材，两个工具的素材列表将同步清空。编辑参数和已生成的水印结果会保留，原始文件不会被修改。
        </p>
        <form method="dialog">
          <button className="button secondary" autoFocus>
            保留素材
          </button>
          <button className="button danger" onClick={() => clear()}>
            确认清空
          </button>
        </form>
      </dialog>
    </details>
  );
}
