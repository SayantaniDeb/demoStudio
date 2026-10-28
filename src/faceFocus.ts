let detectorPromise: Promise<any> | undefined;
export async function detectCameraFace(video: HTMLVideoElement) {
  if (video.readyState < 2 || !video.videoWidth)
    throw new Error('Play or seek the camera take to a clear frame first.');
  detectorPromise ??= (async () => {
    const url = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs';
    const { FaceDetector, FilesetResolver } = await import(/* @vite-ignore */ url);
    const files = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm',
    );
    return FaceDetector.createFromOptions(files, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    });
  })().catch((error) => {
    detectorPromise = undefined;
    throw new Error('Could not load face detection. Check your connection and try again.');
  });
  const detector = await detectorPromise;
  const frame = document.createElement('canvas');
  frame.width = video.videoWidth;
  frame.height = video.videoHeight;
  frame.getContext('2d')!.drawImage(video, 0, 0);
  const faces = detector.detect(frame).detections || [];
  const face = faces.sort(
    (a: any, b: any) =>
      b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height,
  )[0];
  if (!face)
    throw new Error('No clear face in this frame. Seek to a brighter frame and try again.');
  const b = face.boundingBox;
  return {
    x: ((b.originX + b.width / 2) / video.videoWidth) * 100,
    y: ((b.originY + b.height / 2) / video.videoHeight) * 100,
    width: (b.width / video.videoWidth) * 100,
    height: (b.height / video.videoHeight) * 100,
  };
}
