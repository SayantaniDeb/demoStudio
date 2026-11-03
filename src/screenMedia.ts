export type ScreenAsset = {id: string; key: string; start: number; duration: number; blank?: boolean};
export type PlayableScreenAsset = ScreenAsset & {url: string};
type Controller = {assets: PlayableScreenAsset[]; active: PlayableScreenAsset; pending?: number; cancel?: () => void; clock?: {time: number; at: number; running: boolean}; cleanup?: () => void};
const controllers = new WeakMap<HTMLVideoElement, Controller>();
export function assetAt(assets: ScreenAsset[], time: number) {
  return assets.find((asset) => time >= asset.start && time < asset.start + asset.duration)
    || (time >= (assets.at(-1)?.start || 0) ? assets.at(-1) : assets[0]);
}
export function mediaTime(element: HTMLVideoElement | null | undefined) {
  if (!element) return 0;
  const controller = controllers.get(element);
  if (controller?.active.blank && controller.clock) {
    const clock = controller.clock;
    return controller.active.start + Math.min(controller.active.duration, clock.time + (clock.running ? (performance.now() - clock.at) / 1000 : 0));
  }
  return controller?.pending ?? ((controller?.active.start || 0) + element.currentTime);
}
export function mediaDuration(element: HTMLVideoElement) {
  const controller = controllers.get(element);
  return controller ? Math.max(...controller.assets.map((asset) => asset.start + asset.duration)) : element.duration;
}
export function configureScreenMedia(element: HTMLVideoElement, assets: PlayableScreenAsset[]) {
  if (!assets.length) return;
  const previous = controllers.get(element);
  const active = assets.find((asset) => asset.id === previous?.active.id) || assets[0];
  if (previous) {
    previous.assets = assets;
    if (previous.active.id === active.id && previous.active.url === active.url) { previous.active = active; return; }
    previous.cancel?.(); previous.cleanup?.();
  }
  const controller: Controller = {assets, active};
  const playback = () => {
    if (!controller.active.blank) return;
    const current = controller.clock;
    const time = current ? current.time + (current.running ? (performance.now() - current.at) / 1000 : 0) : 0;
    controller.clock = {time, at: performance.now(), running: !element.paused};
  };
  element.addEventListener('play', playback); element.addEventListener('pause', playback);
  controller.cleanup = () => {element.removeEventListener('play', playback); element.removeEventListener('pause', playback);};
  controllers.set(element, controller);
  element.loop = Boolean(active.blank);
  if (element.getAttribute('src') !== active.url) { element.src = active.url; element.load(); }
}
export function seekMediaTime(element: HTMLVideoElement, time: number) {
  const controller = controllers.get(element);
  if (!controller) { element.currentTime = time; return; }
  const asset = assetAt(controller.assets, time) as PlayableScreenAsset | undefined;
  if (!asset) return;
  const local = Math.max(0, Math.min(asset.duration, time - asset.start));
  controller.cancel?.();
  element.loop = Boolean(asset.blank);
  if (asset.blank) controller.clock = {time: local, at: performance.now(), running: !element.paused};
  else controller.clock = undefined;
  if (asset.id === controller.active.id && element.readyState >= 1) {
    controller.pending = undefined;
    element.currentTime = asset.blank ? 0 : local;
    return;
  }
  controller.active = asset;
  controller.pending = asset.start + local;
  const loaded = () => {
    element.removeEventListener('loadedmetadata', loaded);
    element.currentTime = asset.blank ? 0 : Math.min(local, Math.max(0, element.duration - 0.001));
  };
  const ready = () => {
    controller.pending = undefined;
    element.removeEventListener('loadeddata', ready);
    // A seek to the first frame may not produce a native seeked event.
    if (local === 0) element.dispatchEvent(new Event('seeked'));
  };
  controller.cancel = () => {
    element.removeEventListener('loadedmetadata', loaded);
    element.removeEventListener('loadeddata', ready);
  };
  element.addEventListener('loadedmetadata', loaded);
  element.addEventListener('loadeddata', ready);
  element.src = asset.url;
  element.load();
}
export function disconnectScreenMedia(element: HTMLVideoElement) {
  controllers.get(element)?.cancel?.();
  controllers.get(element)?.cleanup?.();
  element.loop = false;
  controllers.delete(element);
}
export async function screenBlobDuration(blob: Blob): Promise<number> {
  const element = document.createElement('video'), url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Could not read the new clip’s duration.')), 15000);
      element.onloadedmetadata = () => {
        clearTimeout(timeout);
        if (Number.isFinite(element.duration) && element.duration > 0) resolve(element.duration);
        else reject(new Error('The new clip has no readable duration.'));
      };
      element.onerror = () => { clearTimeout(timeout); reject(new Error('Could not open the new clip.')); };
      element.preload = 'metadata'; element.src = url;
    });
  } finally { element.removeAttribute('src'); element.load(); URL.revokeObjectURL(url); }
}
