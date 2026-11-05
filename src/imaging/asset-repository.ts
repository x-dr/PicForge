import { importImage } from './import-image';
import type { ImageBudget } from './budget';
import type { ImageSource, AssetRecord } from './types';
interface AssetResource {
  file: File;
  original?: Blob;
  thumbnail?: Blob;
  url?: string;
  width: number;
  height: number;
  controller: AbortController;
}
export class AssetRepository {
  private resources = new Map<string, AssetResource>();
  private queue: Promise<void> = Promise.resolve();
  get count() {
    return this.resources.size;
  }
  add(file: File): AssetRecord {
    const id = crypto.randomUUID();
    this.resources.set(id, {
      file,
      width: 0,
      height: 0,
      controller: new AbortController(),
    });
    return { id, name: file.name, status: 'loading', width: 0, height: 0 };
  }
  load(
    id: string,
    budget: ImageBudget,
    onResolve: (record: Partial<AssetRecord>) => void,
  ): void {
    this.queue = this.queue.then(async () => {
      const item = this.resources.get(id);
      if (!item) return;
      try {
        const result = await importImage(
          item.file,
          budget,
          item.controller.signal,
        );
        if (!this.resources.has(id)) return;
        item.original = result.file;
        item.thumbnail = result.thumbnail;
        item.width = result.width;
        item.height = result.height;
        item.url = URL.createObjectURL(result.thumbnail);
        onResolve({
          status: 'ready',
          width: item.width,
          height: item.height,
          thumbnailUrl: item.url,
        });
      } catch (error) {
        if (!item.controller.signal.aborted && this.resources.has(id))
          onResolve({
            status: 'error',
            error:
              error instanceof Error ? error.message : '导入失败，请重新选择。',
          });
      }
    });
  }
  sources(ids: string[], preview: boolean): ImageSource[] {
    return ids.map((id) => {
      const item = this.resources.get(id);
      const file = preview ? item?.thumbnail : item?.original;
      if (!item || !file) throw new Error('素材尚未就绪，请等待导入完成。');
      return { id, file, width: item.width, height: item.height };
    });
  }
  remove(id: string): void {
    const item = this.resources.get(id);
    if (!item) return;
    item.controller.abort();
    if (item.url) URL.revokeObjectURL(item.url);
    this.resources.delete(id);
  }
  clear(): void {
    for (const id of this.resources.keys()) this.remove(id);
  }
}
