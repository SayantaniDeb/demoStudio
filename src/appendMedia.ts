import {
  ALL_FORMATS,
  Input,
  UrlSource,
  Output,
  WebMOutputFormat,
  BufferTarget,
  CanvasSource,
  VideoSampleSink,
  AudioSample,
  AudioSampleSource,
} from 'mediabunny';

/** Encode a continuous source offscreen; does not depend on live playback or an active tab. */
export async function joinRecordingSources(
  sources: { url: string; duration?: number; holdLastFrameFor?: number }[],
  onProgress: (value: number) => void,
) {
  if (!sources.length) throw Error('Choose at least one video clip.');
  const inputs: Input[] = [],
    target = new BufferTarget();
  let output: Output<WebMOutputFormat, BufferTarget> | undefined;
  try {
    const clips = [];
    for (const source of sources) {
      const input = new Input({ source: new UrlSource(source.url), formats: ALL_FORMATS });
      inputs.push(input);
      const video = await input.getPrimaryVideoTrack();
      if (!video) throw Error('The clip has no video track.');
      const audio = await input.getPrimaryAudioTrack(),
        origin = Math.max(0, await input.getFirstTimestamp()),
        duration = source.duration ?? (await input.computeDuration()) - origin;
      if (!Number.isFinite(duration) || duration <= 0)
        throw Error('The clip has no readable duration.');
      clips.push({
        url: source.url,
        input,
        video,
        audio,
        origin,
        duration,
        hold: source.holdLastFrameFor || 0,
      });
    }
    const canvas = document.createElement('canvas');
    canvas.width = clips[0].video.displayWidth;
    canvas.height = clips[0].video.displayHeight;
    const ctx = canvas.getContext('2d')!;
    output = new Output({ format: new WebMOutputFormat(), target });
    const videoSource = new CanvasSource(canvas, { codec: 'vp8', bitrate: 16000000 });
    output.addVideoTrack(videoSource, { frameRate: 30 });
    const audioSource = clips.some((c) => c.audio)
      ? new AudioSampleSource({
          codec: 'opus',
          bitrate: 192000,
          transform: { sampleRate: 48000, numberOfChannels: 2 },
        })
      : null;
    if (audioSource) output.addAudioTrack(audioSource);
    await output.start();
    const total = clips.reduce((n, c) => n + c.duration + c.hold, 0);
    let offset = 0;
    for (const clip of clips) {
      const clipOffset = offset,
        frames = Math.ceil(clip.duration * 30),
        timestamps = Array.from(
          { length: frames },
          (_, i) => clip.origin + Math.min(i / 30, Math.max(0, clip.duration - 0.001)),
        );
      const encodeVideo = async () => {
        let frame = 0;
        for await (const sample of new VideoSampleSink(clip.video).samplesAtTimestamps(
          timestamps,
        )) {
          try {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (sample) {
              const scale = Math.min(
                  canvas.width / sample.displayWidth,
                  canvas.height / sample.displayHeight,
                ),
                w = sample.displayWidth * scale,
                h = sample.displayHeight * scale;
              sample.draw(ctx, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
            }
            await videoSource.add(
              clipOffset + frame / 30,
              Math.min(1 / 30, clip.duration - frame / 30),
            );
            frame++;
            onProgress(
              Math.min(99, ((clipOffset + Math.min(frame / 30, clip.duration)) / total) * 100),
            );
          } finally {
            sample?.close();
          }
        }
        for (let frame = 0; frame < Math.ceil(clip.hold * 30); frame++) {
          await videoSource.add(
            clipOffset + clip.duration + frame / 30,
            Math.min(1 / 30, clip.hold - frame / 30),
          );
          onProgress(Math.min(99, ((clipOffset + clip.duration + (frame + 1) / 30) / total) * 100));
        }
      };
      const encodeAudio = async () => {
        if (!audioSource) return;
        const offline = new OfflineAudioContext(
          2,
          Math.ceil((clip.duration + clip.hold) * 48000),
          48000,
        );
        if (clip.audio) {
          const context = new AudioContext();
          try {
            const decoded = await context.decodeAudioData(
                await (await fetch(clip.url)).arrayBuffer(),
              ),
              node = offline.createBufferSource();
            node.buffer = decoded;
            node.connect(offline.destination);
            const length = Math.min(clip.duration, decoded.duration - clip.origin);
            if (length > 0) node.start(0, clip.origin, length);
          } finally {
            await context.close();
          }
        }
        const buffer = await offline.startRendering();
        for (const sample of AudioSample.fromAudioBuffer(buffer, clipOffset)) {
          try {
            await audioSource.add(sample);
          } finally {
            sample.close();
          }
        }
      };

      await Promise.all([encodeVideo(), encodeAudio()]);
      offset += clip.duration + clip.hold;
    }
    videoSource.close();
    audioSource?.close();
    await output.finalize();
    if (!target.buffer?.byteLength)
      throw Error('The joined clip could not be encoded. Your original footage is unchanged.');
    onProgress(100);
    return {
      blob: new Blob([target.buffer], { type: 'video/webm' }),
      duration: total,
      lengths: clips.map((c) => c.duration),
    };
  } catch (error) {
    if (output && output.state !== 'finalized' && output.state !== 'canceled')
      await output.cancel();
    throw error;
  } finally {
    inputs.forEach((input) => input.dispose());
  }
}
