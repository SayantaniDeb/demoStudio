type NativeWindow = Window & {
  webkit?: { messageHandlers?: { nativeRecorder?: { postMessage(message: string): void } } };
};

export function showNativeRecorder(): boolean {
  const bridge = (window as NativeWindow).webkit?.messageHandlers?.nativeRecorder;
  if (!bridge) return false;
  bridge.postMessage('record');
  return true;
}

export function isNativeMac(): boolean {
  return Boolean((window as NativeWindow).webkit?.messageHandlers?.nativeRecorder);
}

async function nativeCommand(command: string, fields: Record<string, unknown> = {}): Promise<any> {
  const request = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { window.removeEventListener('demotake-native-result', listener); reject(new Error('Native video processing timed out. Your original clips are safe.')); }, 600000);
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.request !== request) return;
      clearTimeout(timeout); window.removeEventListener('demotake-native-result', listener);
      if (detail.error) reject(new Error(detail.error)); else resolve(detail);
    };
    window.addEventListener('demotake-native-result', listener);
    (window as NativeWindow).webkit!.messageHandlers!.nativeRecorder!.postMessage(JSON.stringify({command, request, ...fields}));
  });
}

export async function joinNativeVideos(sources: {url: string; duration?: number; holdLastFrameFor?: number}[], progress: (value: number) => void) {
  const inputs = [];
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    const response = await fetch(source.url);
    if (!response.ok) throw new Error('Could not read a clip for appending.');
    const blob = await response.blob();
    const {key} = await nativeCommand('upload', {mime: blob.type});
    for (let offset = 0; offset < blob.size; offset += 524288) {
      const bytes = new Uint8Array(await blob.slice(offset, offset + 524288).arrayBuffer());
      let text = '';
      for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
      await nativeCommand('chunk', {key, data: btoa(text)});
      progress(40 * (index + Math.min(1, (offset + bytes.length) / blob.size)) / sources.length);
    }
    inputs.push({key, duration: source.duration, hold: source.holdLastFrameFor});
  }
  progress(45);
  const result = await nativeCommand('join', {sources: inputs});
  if (typeof result.url !== 'string' || !result.url.startsWith(`${location.origin}/recordings/`)) throw new Error('Invalid native join result.');
  const response = await fetch(result.url);
  if (!response.ok) throw new Error('Could not load the appended video.');
  const blob = await response.blob();
  progress(100);
  return {blob, duration: result.duration as number, lengths: result.lengths as number[]};
}

export async function saveNativeRecordingName(title: string, recordingID: string | undefined, source: string): Promise<{name: string; recordingID: string}> {
  let match: Record<string, unknown> = {};
  let original: Blob | undefined;
  if (!recordingID) {
    const response = await fetch(source);
    if (!response.ok) throw new Error('Could not read the original recording.');
    const blob = await response.blob();
    original = blob;
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
    match = {bytes: blob.size, hash: Array.from(digest, (value) => value.toString(16).padStart(2, '0')).join('')};
  }
  try {
    return await nativeCommand('save-title', {title, recordingID, ...match});
  } catch (error) {
    if (!original || !(error instanceof Error) || !error.message.includes('not linked to a unique library recording')) throw error;
    const {key} = await nativeCommand('upload', {mime: original.type});
    for (let offset = 0; offset < original.size; offset += 524288) {
      const bytes = new Uint8Array(await original.slice(offset, offset + 524288).arrayBuffer());
      let text = '';
      for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
      await nativeCommand('chunk', {key, data: btoa(text)});
    }
    return nativeCommand('save-title', {title, uploadKey: key});
  }
}

export function setNativePreviewFullscreen(enabled: boolean) {
  if (isNativeMac()) void nativeCommand('preview-fullscreen', {enabled}).catch(() => {});
}

export function setNativeTheme(dark: boolean) { if (isNativeMac()) void nativeCommand('theme', {dark}).catch(() => {}); }
