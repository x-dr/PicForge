export interface DecodedImage {
  image: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

export async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Some browsers decode supported formats only through HTMLImageElement.
    }
  }
  if (typeof Image === 'undefined')
    throw new Error('当前浏览器无法解码此图片，请尝试其他图片或浏览器。');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {
        image.src = '';
      },
    };
  } catch {
    throw new Error('图片解码失败，文件可能损坏。请移除此项后重新选择。');
  } finally {
    URL.revokeObjectURL(url);
  }
}
