import type { Settings } from './storage';
import type { DemoSegment } from './demoTimeline';
export const clipEffectKeys = ['autoZoom','zoomSource','zoomFollowsPath','focusPoints','focusX','focusY','pointerMotion','cursorStyle','cursorSize','showCursor','replaceCursor','cursorSeed'] as const;
export type ClipEffects = Pick<Settings, typeof clipEffectKeys[number]>;
export function effectsSnapshot(settings: Settings): ClipEffects {
  return Object.fromEntries(clipEffectKeys.map(key => [key, settings[key]])) as ClipEffects;
}
export function clipEffectSettings(settings: Settings, id?: string): Settings {
  return {...settings, ...(id ? settings.clipEffects?.[id] : undefined)};
}
export function editClipEffects(settings: Settings, segments: DemoSegment[], id: string, patch: Partial<Settings>): Settings {
  const inherited = effectsSnapshot(settings);
  const effects = {...settings.clipEffects};
  for (const segment of segments) effects[segment.id] ??= {...inherited};
  effects[id] = {...effects[id], ...Object.fromEntries(clipEffectKeys.filter(key => key in patch).map(key => [key, patch[key]]))};
  return {...settings, clipEffects: effects};
}
