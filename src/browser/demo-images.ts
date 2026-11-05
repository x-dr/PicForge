/** Small, original Canvas landscapes; generated locally without network requests. */
export async function createDemoImages(): Promise<File[]> {
  const palettes = [
    {
      sky: ['#e6c5ba', '#f4ddd0'],
      sun: '#e1a57e',
      far: '#9e919f',
      near: '#6b7e83',
      title: '山间来信',
      name: '01-山间来信.png',
    },
    {
      sky: ['#b9d4d3', '#e2e8d8'],
      sun: '#efe8c6',
      far: '#829f99',
      near: '#486f68',
      title: '慢慢，向远方',
      name: '02-向远方.png',
    },
    {
      sky: ['#d8c3bb', '#efd6be'],
      sun: '#f5e3b9',
      far: '#af8278',
      near: '#795b63',
      title: '日落以后',
      name: '03-日落以后.png',
    },
  ];
  const files: File[] = [];
  for (const [index, palette] of palettes.entries()) {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 640);
    gradient.addColorStop(0, palette.sky[0]);
    gradient.addColorStop(1, palette.sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 960, 640);
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(700 - index * 130, 180, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.far;
    ctx.beginPath();
    ctx.moveTo(0, 380);
    ctx.lineTo(160, 210);
    ctx.lineTo(370, 410);
    ctx.lineTo(580, 250);
    ctx.lineTo(960, 460);
    ctx.lineTo(960, 640);
    ctx.lineTo(0, 640);
    ctx.fill();
    ctx.fillStyle = palette.near;
    ctx.beginPath();
    ctx.moveTo(0, 520);
    ctx.bezierCurveTo(230, 310, 450, 670, 960, 370);
    ctx.lineTo(960, 640);
    ctx.lineTo(0, 640);
    ctx.fill();
    ctx.fillStyle = '#ffffffdd';
    ctx.font = '18px sans-serif';
    ctx.fillText(`PICFORGE  /  FIELD NOTES  0${index + 1}`, 52, 65);
    ctx.font = '36px sans-serif';
    ctx.fillText(palette.title, 52, 570);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) =>
        blob ? resolve(blob) : reject(new Error('示例生成失败。')),
      ),
    );
    files.push(new File([blob], palette.name, { type: 'image/png' }));
    canvas.width = 0;
    canvas.height = 0;
  }
  return files;
}
