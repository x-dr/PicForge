import {
  defaults,
  normalizePipeline,
  type PipelineSettings,
} from '../processing/model';
export interface BatchTemplate {
  version: 1;
  name: string;
  settings: PipelineSettings;
}
export const TEMPLATE_KEY = 'picforge-batch-templates-v1';
function sameShape(input: unknown, expected: unknown): boolean {
  if (expected !== null && typeof expected === 'object') {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      return false;
    const a = input as Record<string, unknown>;
    const b = expected as Record<string, unknown>;
    return (
      Object.keys(a).length === Object.keys(b).length &&
      Object.entries(b).every(
        ([k, v]) => Object.hasOwn(a, k) && sameShape(a[k], v),
      )
    );
  }
  return typeof input === typeof expected;
}
function equalValues(a: unknown, b: unknown): boolean {
  if (a && b && typeof a === 'object' && typeof b === 'object')
    return Object.entries(a).every(([k, v]) =>
      equalValues(v, (b as Record<string, unknown>)[k]),
    );
  return a === b;
}
export function parseTemplate(text: string): BatchTemplate {
  if (new TextEncoder().encode(text).length > 64 * 1024)
    throw new Error('模板不能超过 64 KiB。');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('模板不是有效的 JSON。');
  }
  if (!value || typeof value !== 'object') throw new Error('模板结构无效。');
  const t = value as BatchTemplate;
  if (t.version !== 1) throw new Error('模板版本不支持。');
  if (
    typeof t.name !== 'string' ||
    !t.name.trim() ||
    t.name.length > 40 ||
    !sameShape(t.settings, defaults())
  )
    throw new Error('模板参数不完整或类型错误。');
  const normalized = normalizePipeline(t.settings);
  if (
    !equalValues(t.settings, normalized) ||
    !normalized.naming.trim() ||
    /[{}]/.test(normalized.naming.replace(/\{name\}|\{index\}/g, ''))
  )
    throw new Error('模板含无效参数，请检查尺寸、格式和命名规则。');
  return { version: 1, name: t.name.trim(), settings: normalized };
}
export function serializeTemplate(
  name: string,
  settings: PipelineSettings,
): string {
  const template = {
    version: 1,
    name: name.trim().slice(0, 40) || '我的批量模板',
    settings: normalizePipeline(settings),
  };
  return JSON.stringify(parseTemplate(JSON.stringify(template)), null, 2);
}
export function loadTemplates(): BatchTemplate[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(TEMPLATE_KEY) ?? '[]',
    );
    if (!Array.isArray(value) || value.length > 10) return [];
    return value.map((t) => parseTemplate(JSON.stringify(t)));
  } catch {
    return [];
  }
}
export function saveTemplates(templates: BatchTemplate[]): boolean {
  try {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates.slice(0, 10)));
    return true;
  } catch {
    return false;
  }
}
