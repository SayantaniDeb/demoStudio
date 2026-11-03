import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
export type Settings = {
  musicClips?: {id:string;start:number;end:number;offset:number;track:'none'|'warm'|'pulse'|'ambient';volume:number;asset?:string;name?:string}[];
  featureRanges?: Record<string, {start:number;end:number}>;
  clipEffects?: Record<string, import('./clipEffects').ClipEffects>;
  captionSourceLanguage?: 'auto'|'hi'|'en'|'bn';
  captionOutputLanguage?: 'original' | 'english';
  captionDetectedLanguage?: string;
  captionVariants?: Partial<Record<'original'|'english', import('./captions').Caption[]>>;
  libraryRecordingID?: string;
  screenAssets?: import('./screenMedia').ScreenAsset[];
  backgroundPreset?: string;
  captionLayout?: { x: number; y: number; scale: number };
  clipVolumes?: Record<string, number>;
  screenVisible?: boolean;
  zoomTrackEnabled?: boolean;
  clipZooms?: Record<string, number>;
  customTemplates?: import('./websiteDemo').WebsiteDemo[];
  backgroundImage?: string;
  titleAuto?: boolean;
  primaryMedia?: 'screen' | 'camera';
  displayLayouts?: Record<
    string,
    {
      screenX: number;
      screenY: number;
      screenScale: number;
      screenFit?: 'contain' | 'cover';
      cameraX?: number;
      cameraY?: number;
      cameraSize?: number;
    }
  >;
  mobileClipFraming?: Record<string, 'fit' | 'follow'>;
  cameraTakes?: {
    hidden?: boolean;
    id: string;
    start: number;
    end: number;
    assetId?: string;
    sourceStart?: number;
    sourceEnd?: number;
  }[];
  cameraClipsEdited?: boolean;
  cameraDuration?: number;
  cameraCutout?: boolean;
  cameraFocusX?: number;
  cameraFocusY?: number;
  mobileCameraPosition?:
    'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  mobileCameraLayout?: 'outside' | 'overlay';
  outputFormat?: '16:9' | '9:16';
  cameraLayout?: 'beside' | 'overlay';
  showCursor?: boolean;
  screenRadius?: number;
  screenShadow?: number;
  cameraShape?: 'circle' | 'rounded' | 'square';
  cameraPosition?:
    'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  cameraSize?: number;
  cameraRatio?: '1:1' | '4:3' | '16:9' | '9:16';
  zoomFollowsPath?: boolean;
  cursorTelemetry?: import('./extensionBridge').CursorSample[];
  pointerMotion?: 'manual' | 'focus' | 'recorded';
  manualPointer?: Record<string, import('./manualPointer').PointerPoint[]>;
  websiteProject?: import('./websiteDemo').WebsiteDemo;
  mediaProject?: import('./websiteDemo').WebsiteDemo;
  uploadKind?: 'video' | 'image';
  uploadName?: string;
  recordingSegments?: import('./demoTimeline').DemoSegment[];
  websiteSegments?: import('./demoTimeline').DemoSegment[];
  demoAudio?: import('./demoAudio').DemoAudioSettings;
  musicName?: string;
  websiteDemo?: import('./websiteDemo').WebsiteDemo;
  demoBrand?: string;
  demoQuery?: string;
  demoFilename?: string;
  demoHeadline?: string;
  cursorSeed?: import('./cursor').CursorSeed;
  replaceCursor?: boolean;
  capturedCursorHidden?: boolean;
  cursorStyle?: import('./cursor').CursorAppearance;
  cursorSize?: number;
  scenes?: import('./components').DemoScene[];
  zoomSource?: 'cursor';
  autoZoom?: boolean;
  focusPoints?: import('./motion').FocusPoint[];
  title: string;
  trimStart: number;
  trimEnd: number;
  zoom: number;
  focusX: number;
  focusY: number;
  background: string;
  camera: boolean;
  captionAppearance?: import('./captions').CaptionAppearance;
  captionStyle?: import('./captions').CaptionStyle;
  captions?: import('./captions').Caption[];
  captionsEnabled?: boolean;
  caption: string;
  sceneTitle: string;
  sceneBody: string;
};
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId);
export async function saveCloud(settings: Settings) {
  if (!firebaseReady)
    throw new Error('Add Firebase configuration to .env.local to enable cloud saving.');
  const cloudSettings = JSON.parse(JSON.stringify(settings));
  if (cloudSettings.websiteDemo) {
    delete cloudSettings.websiteDemo.sourceImages;
    if (cloudSettings.websiteDemo.motion) {
      delete cloudSettings.websiteDemo.motion.assets;
      delete cloudSettings.websiteDemo.motion.designScreens;
    }
    if (cloudSettings.websiteDemo.storyboard) delete cloudSettings.websiteDemo.storyboard.assets;
  }
  for (const key of ['websiteProject', 'mediaProject']) {
    const project = cloudSettings[key];
    if (project?.motion) {
      delete project.motion.assets;
      delete project.motion.designScreens;
    }
    if (project?.storyboard) delete project.storyboard.assets;
    delete project?.sourceImages;
  }
  const app = initializeApp(config);
  const auth = getAuth(app);
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  await setDoc(doc(getFirestore(app), 'users', user.uid, 'projects', 'current'), {
    ...cloudSettings,
    updatedAt: new Date().toISOString(),
  });
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('frame-project', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('assets');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function storeAsset(key: string, blob: Blob) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite');
    tx.objectStore('assets').put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function loadAsset(key: string): Promise<Blob | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets');
    const req = tx.objectStore('assets').get(key);
    req.onsuccess = () => {
      resolve(req.result);
      db.close();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearRecordingAssets() {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite'),
        store = tx.objectStore('assets'),
        cursor = store.openCursor();
      cursor.onsuccess = () => {
        const item = cursor.result;
        if (!item) return;
        const key = String(item.key);
        if (
          ['screen', 'camera', 'primary-media-type'].includes(key) ||
          key.startsWith('camera-take-') || key.startsWith('recording-')
        )
          item.delete();
        item.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteAsset(key: string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite');
      tx.objectStore('assets').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
