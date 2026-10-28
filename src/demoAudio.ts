export type DemoAudioSettings = {
  musicTrack?: 'none' | 'warm' | 'pulse' | 'ambient';
  effects: boolean;
  musicVolume: number;
  effectVolume: number;
};
export const defaultAudio: DemoAudioSettings = {
  musicTrack: 'warm',
  effects: true,
  musicVolume: 0.16,
  effectVolume: 0.12,
};
export async function makeSoundtrack(
  duration: number,
  boundaries: number[],
  music: AudioBuffer | undefined,
  settings: DemoAudioSettings,
) {
  const context = new OfflineAudioContext(2, Math.ceil(duration * 44100), 44100);
  if (music) {
    const source = context.createBufferSource();
    source.buffer = music;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = settings.musicVolume;
    source.connect(gain).connect(context.destination);
    source.start(0);
    source.stop(duration);
  }
  if (!music && settings.musicTrack && settings.musicTrack !== 'none') {
    const track = settings.musicTrack,
      beat = 60 / (track === 'pulse' ? 108 : track === 'ambient' ? 72 : 90);
    const bus = context.createGain();
    bus.gain.value = settings.musicVolume * 0.35;
    bus.connect(context.destination);
    const note = (
      frequency: number,
      time: number,
      length: number,
      volume: number,
      type: OscillatorType = 'sine',
    ) => {
      if (time >= duration) return;
      const osc = context.createOscillator(),
        gain = context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, time + length));
      osc.connect(gain).connect(bus);
      osc.start(time);
      osc.stop(Math.min(duration, time + length + 0.01));
    };
    const chords = [
      [130.81, 164.81, 196],
      [110, 130.81, 164.81],
      [87.31, 110, 130.81],
      [98, 123.47, 146.83],
    ];
    for (let bar = 0; bar * beat * 4 < duration; bar++) {
      const chord = chords[bar % 4],
        start = bar * beat * 4;
      chord.forEach((f) => note(f, start, beat * 3.9, 0.22));
      if (track !== 'ambient')
        for (let n = 0; n < 8; n++)
          note(chord[n % 3] * 2, start + (n * beat) / 2, beat * 0.75, 0.24, 'triangle');
      if (track === 'pulse')
        for (let n = 0; n < 4; n++) note(n % 2 ? 165 : 65, start + n * beat, 0.12, 0.45);
    }
    for (const time of boundaries.filter((t) => t > 0 && t < duration))
      [523.25, 659.25, 783.99].forEach((f, i) => note(f, time + i * 0.06, 0.5, 0.22));
  }
  if (settings.effects) {
    for (const time of boundaries.filter((t) => t > 0.2 && t < duration)) {
      const length = 0.5,
        buffer = context.createBuffer(1, Math.ceil(length * 44100), 44100),
        samples = buffer.getChannelData(0);
      let seed = 117;
      for (let i = 0; i < samples.length; i++) {
        seed = (seed * 16807) % 2147483647;
        samples[i] = ((seed / 2147483647) * 2 - 1) * Math.sin((Math.PI * i) / samples.length);
      }
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, Math.max(0, time - 0.25));
      filter.frequency.linearRampToValueAtTime(2200, time + 0.25);
      const gain = context.createGain();
      gain.gain.value = settings.effectVolume;
      noise.connect(filter).connect(gain).connect(context.destination);
      noise.start(Math.max(0, time - 0.25));
    }
  }
  return context.startRendering();
}
export class DemoAudioPlayer {
  context?: AudioContext;
  source?: AudioBufferSourceNode;
  async play(buffer: AudioBuffer, offset = 0, destination?: AudioNode) {
    this.stop();
    this.context ??= new AudioContext();
    await this.context.resume();
    this.source = this.context.createBufferSource();
    this.source.buffer = buffer;
    this.source.connect(destination || this.context.destination);
    this.source.start(0, Math.min(offset, Math.max(0, buffer.duration - 0.001)));
  }
  stop() {
    try {
      this.source?.stop();
    } catch {}
    this.source = undefined;
  }
}
