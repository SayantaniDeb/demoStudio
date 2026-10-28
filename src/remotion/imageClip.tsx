import { Img } from 'remotion';
import { renderMediaOnWeb } from '@remotion/web-renderer';
function StillImage({ src }: { src: string }) {
  return <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
}
export async function imageToCameraClip(file: File, seconds: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(2, Math.round((bitmap.width * scale) / 2) * 2),
    height = Math.max(2, Math.round((bitmap.height * scale) / 2) * 2);
  bitmap.close();
  const src = URL.createObjectURL(file);
  try {
    const result = await renderMediaOnWeb({
      composition: {
        id: 'camera-image',
        component: StillImage,
        defaultProps: { src },
        width,
        height,
        fps: 30,
        durationInFrames: Math.max(3, Math.ceil(seconds * 30)),
      },
      inputProps: { src },
      container: 'mp4',
      videoCodec: 'h264',
      muted: true,
      outputTarget: 'arraybuffer',
    });
    return new File([await result.getBlob()], file.name + '.mp4', { type: 'video/mp4' });
  } finally {
    URL.revokeObjectURL(src);
  }
}
