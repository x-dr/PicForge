import { useState } from 'react';
import { useAssets } from '../../app/AssetContext';
import { Icon } from '../../app/Icon';
import { TransformFields } from '../transform/TransformFields';
import { FormatFields } from '../convert/FormatFields';
import { BatchWatermarkFields } from '../batch/BatchWatermarkFields';
import { TemplatePanel } from '../batch/TemplatePanel';
import { useProcessing } from './ProcessingContext';
import { defaults, type ProcessingMode } from './model';
import panel from '../../app/SettingsPanel.module.css';
import styles from './Processing.module.css';
export function ProcessingSettings({ mode }: { mode: ProcessingMode }) {
  const { ready } = useAssets();
  const { settings, patch, selectedId } = useProcessing(mode);
  const selected = ready.find((a) => a.id === selectedId) ?? ready[0];
  const [expanded, setExpanded] = useState(
    () => !matchMedia('(max-width: 767px)').matches,
  );
  return (
    <details
      className={`${panel.settings} ${styles.settingsPanel}`}
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary className="panel-heading">
        <span>
          {mode === 'batch'
            ? '批量流程设置'
            : mode === 'convert'
              ? '格式转换设置'
              : '图片处理设置'}
        </span>
        <Icon name="arrowDown" size={16} />
      </summary>
      <div className={`${panel.settingsBody} ${styles.settings}`}>
        {mode === 'batch' && (
          <p className="microcopy">
            按序执行启用的步骤：裁剪 → 缩放 → 方向 → 水印 →
            编码。每张图片单独生成。
          </p>
        )}
        {mode !== 'convert' && (
          <TransformFields
            value={settings.transform}
            patch={(t) => patch({ transform: { ...settings.transform, ...t } })}
            selected={selected}
          />
        )}
        {mode === 'batch' && <BatchWatermarkFields />}
        <FormatFields mode={mode} />
        <fieldset>
          <legend>文件命名</legend>
          <label className="field">
            <span>命名规则</span>
            <input
              className={styles.textInput}
              value={settings.naming}
              maxLength={100}
              onChange={(e) => patch({ naming: e.target.value })}
            />
          </label>
          <p className="microcopy">
            {'{name}'} 为原文件名，{'{index}'} 为两位序号；同名自动去重。
          </p>
        </fieldset>
        {mode === 'batch' && <TemplatePanel />}
        <button
          className="text-button reset-button"
          onClick={() => patch(defaults())}
        >
          <Icon name="reset" size={14} />
          恢复默认参数
        </button>
      </div>
    </details>
  );
}
