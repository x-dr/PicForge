import factory from '@jsquash/avif/codec/enc/avif_enc.js';
import wasmURL from '@jsquash/avif/codec/enc/avif_enc.wasm?url';
import { defaultOptions } from '@jsquash/avif/meta.js';
let modulePromise: ReturnType<typeof factory> | undefined;
export async function encodeAvif(data: ImageData, quality: number) {
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
    qualityAlpha: 100,
    speed: 8,
  });
  if (!output) throw new Error('AVIF 编码失败，请降低尺寸后重试。');
  return output.buffer as ArrayBuffer;
}
