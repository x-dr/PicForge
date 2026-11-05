import factory from '@jsquash/webp/codec/enc/webp_enc.js';
import wasmURL from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import { defaultOptions } from '@jsquash/webp/meta.js';
let modulePromise: ReturnType<typeof factory> | undefined;
export async function encodeWebp(data: ImageData, quality: number) {
  modulePromise ??= factory({ locateFile: () => wasmURL }).catch(
    (error: unknown) => {
      modulePromise = undefined;
      throw error;
    },
  );
  const encoder = await modulePromise;
  const output = encoder.encode(data.data, data.width, data.height, {
    ...defaultOptions,
    quality: Math.round(quality * 100),
  });
  if (!output) throw new Error('WebP 编码失败，请降低尺寸后重试。');
  return output.buffer as ArrayBuffer;
}
