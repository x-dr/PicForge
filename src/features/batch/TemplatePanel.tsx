import { useRef, useState } from 'react';
import { downloadImage } from '../../browser/download';
import { useProcessing } from '../processing/ProcessingContext';
import { useWatermark } from '../watermark/WatermarkContext';
import {
  loadTemplates,
  parseTemplate,
  saveTemplates,
  serializeTemplate,
  type BatchTemplate,
} from './templates';
import styles from '../processing/Processing.module.css';
export function TemplatePanel() {
  const { settings, patch } = useProcessing('batch');
  const { removeLogo } = useWatermark();
  const [templates, setTemplates] = useState(loadTemplates);
  const [name, setName] = useState('我的批量模板');
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const apply = (t: BatchTemplate) => {
    patch(t.settings);
    if (t.settings.watermarkEnabled && t.settings.watermark.kind === 'image')
      removeLogo();
    setName(t.name);
    setMessage(
      `已应用「${t.name}」。${t.settings.watermarkEnabled && t.settings.watermark.kind === 'image' ? '请重新选择本地水印图片。' : ''}`,
    );
  };
  return (
    <fieldset>
      <legend>模板 · 保存与迁移</legend>
      <label className="field">
        <span>模板名称</span>
        <input
          className={styles.textInput}
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button
          className="button secondary"
          onClick={() => {
            try {
              const t = parseTemplate(serializeTemplate(name, settings));
              const next = [
                t,
                ...templates.filter((item) => item.name !== t.name),
              ].slice(0, 10);
              setTemplates(next);
              setMessage(
                saveTemplates(next)
                  ? '模板已保存到此浏览器。'
                  : '浏览器存储不可用，请导出模板文件。',
              );
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          保存模板
        </button>
        <button
          className="text-button"
          onClick={() => {
            try {
              downloadImage(
                new Blob([serializeTemplate(name, settings)], {
                  type: 'application/json',
                }),
                'PicForge-template.json',
              );
              setMessage('已生成模板文件并发起下载。');
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          导出模板
        </button>
        <button className="text-button" onClick={() => input.current?.click()}>
          导入模板
        </button>
      </div>
      <input
        hidden
        ref={input}
        type="file"
        accept="application/json,.json"
        data-testid="template-input"
        aria-label="导入模板文件"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            if (file.size > 64 * 1024) throw new Error('模板不能超过 64 KiB。');
            apply(parseTemplate(await file.text()));
          } catch (error) {
            setMessage(`${(error as Error).message} 已保留当前设置。`);
          }
        }}
      />
      {templates.length > 0 && (
        <ul className={styles.templateList}>
          {templates.map((t) => (
            <li key={t.name}>
              <button
                className="text-button"
                onClick={() => apply(t)}
                aria-label={`应用模板 ${t.name}`}
              >
                {t.name}
              </button>
              <button
                className="text-button muted"
                aria-label={`删除模板 ${t.name}`}
                onClick={() => {
                  const next = templates.filter((item) => item !== t);
                  setTemplates(next);
                  setMessage(
                    saveTemplates(next)
                      ? '模板已删除。'
                      : '存储不可用，未能持久保存删除结果。',
                  );
                }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="microcopy">
        最多保存 10 份，仅包含参数；图片水印需重新选择 Logo。
      </p>
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
    </fieldset>
  );
}
