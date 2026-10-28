import { makeSoundtrack } from '../demoAudio';
export const directorMusicTracks = [
  { id: 'warm', name: 'Warm keys', description: 'Gentle demo rhythm' },
  { id: 'pulse', name: 'Studio pulse', description: 'Upbeat reveals' },
  { id: 'ambient', name: 'Soft atmosphere', description: 'Calm and spacious' },
] as const;
export type BuiltinMusic = (typeof directorMusicTracks)[number]['id'];
// Use the same synthesizer as Screen Demo Studio, encoded for Remotion playback/export.
export async function createDirectorMusic(track: BuiltinMusic, durations: number[] = [8]) {
  const duration = durations.reduce((total, seconds) => total + seconds, 0),
    boundaries = durations
      .slice(0, -1)
      .reduce<number[]>((cuts, seconds) => [...cuts, (cuts.at(-1) ?? 0) + seconds], []);
  const buffer = await makeSoundtrack(duration, boundaries, undefined, {
    musicTrack: track,
    effects: false,
    musicVolume: 1,
    effectVolume: 0,
  });
  const channels = buffer.numberOfChannels,
    length = buffer.length * channels * 2,
    bytes = new ArrayBuffer(44 + length),
    view = new DataView(bytes);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, length, true);
  const fade = Math.min(0.35, duration / 4);
  const samples = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
  let offset = 44;
  for (let i = 0; i < buffer.length; i++)
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(
        -1,
        Math.min(
          1,
          samples[c][i] *
            Math.min(1, i / buffer.sampleRate / fade, (duration - i / buffer.sampleRate) / fade),
        ),
      );
      view.setInt16(offset, sample * (sample < 0 ? 32768 : 32767), true);
      offset += 2;
    }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error('Could not prepare music.'));
    reader.readAsDataURL(new Blob([bytes], { type: 'audio/wav' }));
  });
}
