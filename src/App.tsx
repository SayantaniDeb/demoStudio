import { clipEffectKeys, clipEffectSettings, editClipEffects, effectsSnapshot } from './clipEffects';
import { StudioSlot } from './components/StudioSlot';
import { cameraFade } from './cameraFade';
import { LoadingView } from './components/LoadingView';
import { recordedPointerAt } from './recordedPointer';
import { ClipWaveform } from './components/ClipWaveform';
import { InspectorControls } from './components/InspectorControls';
import { moveTimelineClip } from './moveTimelineClip';
import { TimelineTicks } from './components/TimelineTicks';
import { pointerLayers } from './automaticPointer';
import { PointerPreview } from './components/PointerPreview';
import { TimelineViewport } from './components/TimelineViewport';
import { configureScreenMedia, disconnectScreenMedia, mediaTime, mediaDuration, seekMediaTime, screenBlobDuration } from './screenMedia';
import { useEditHistory } from './useEditHistory';
import { Undo2, Redo2 } from 'lucide-react';
import { screenRange, trimScreenEdge, screenOpacity, cameraSoloMix } from './screenTrims';
import { placeCamera, soloCameraRect, screenMediaScale, zoomedScreenBounds, expandedMediaOffset, mobileZoomPlacement } from './layoutGeometry';
import { backgroundPresets, backgroundCss, paintCanvasBackground } from './backgrounds';
import { EmptyStudioTimeline } from './components/EmptyStudioTimeline';
import { EmptyStudioCanvas } from './components/EmptyStudioCanvas';
import { ExportDialog } from './components/ExportDialog';
import { Timeline, TimelineToolbar, TimelineTrackLabel } from './components/Timeline';
import { lazy, Suspense } from 'react';
const AIDirector = lazy(() => import('./remotion/AIDirector'));

const RemotionDesignStudio = lazy(() => import('./remotion/RemotionDesignStudio'));
import { timelineZoom } from './timelineZoom';
import { HomePage } from './HomePage';
import { CaptionDesignControls } from './components/CaptionDesignControls';
import { CaptionLanguageChoice } from './components/CaptionLanguageChoice';
const MediaWorkspace = lazy(() => import('./MediaWorkspace').then(module => ({default: module.MediaWorkspace})));
import { isNativeMac, showNativeRecorder, saveNativeRecordingName, setNativePreviewFullscreen, setNativeTheme } from './nativeMac';
import { Home, MonitorOff, CameraOff, MicOff, Scan, ZoomIn, KeyRound } from 'lucide-react';
import { StudioStoryboard } from './StudioStoryboard';
import { groqHeaders, setUserGroqKey } from './aiKey';
import { Smartphone } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { detectCameraFace } from './faceFocus';
import { paintAutomaticCursor } from './cursorMorph';
import { prepareCameraCutout, prepareCameraCutoutFrame, cameraCutoutFrame, resetCameraCutoutFrames } from './cameraCutout';
import { CreativeEditor } from './CreativeEditor';
import { creativeChapters, creativeDuration, creativeSVG } from './creative';
import { validateCreative } from '../shared/creative.mjs';
import { companionCommand, type CursorSample } from './extensionBridge';
import { pointerAt, type PointerPoint } from './manualPointer';
import { generateCaptions, renderCaption, captionAt, captionStyles } from './captions';
import type { UploadStoryboardPlan } from './websiteDemo';
import { configureCaptureCursor, type CaptureCursorStatus } from './captureCursor';
import { storyboardFromUpload } from './uploadStoryboard';
import { demoTemplates, renderTemplate, templateChapters, type TemplateId } from './demoTemplates';
import {
  defaultSegments,
  durationOf,
  mapSegments,
  splitSegments,
  type DemoSegment,
} from './demoTimeline';
import { makeSoundtrack, DemoAudioPlayer, defaultAudio } from './demoAudio';
import { renderCinematic, prepareMotion, MOTION_DURATION, motionChapters } from './cinematic';
import { renderStoryboard, prepareStoryImages, storyDuration, storyChapters } from './storyboard';
import { renderWebsite, websiteChapters, DEMO_DURATION, type WebsiteDemo } from './websiteDemo';
import { CursorReplacer, paintCursor, analyzeCursor } from './cursor';
import { generateComponents } from './components';
import { analyzeActivity, viewAt, cursorFocusPoints, frameOffset } from './motion';
import { useEffect, useRef, useState } from 'react';
import {
  Hand,
  Circle,
  Crosshair,
  Target,
  Ban,
  Route,
  ArrowDownToLine,
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  Clapperboard,
  Cloud,
  Film,
  FolderOpen,
  Layers,
  Mic,
  Monitor,
  MousePointer2,
  Music2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Plus,
  Scissors,
  Settings2,
  Sparkles,
  Square,
  Upload,
  Video,
} from 'lucide-react';
import {
  firebaseReady,
  loadAsset,
  saveCloud,
  storeAsset,
  clearRecordingAssets,
  type Settings,
} from './storage';
const defaults: Settings = {
  zoomFollowsPath: true,
  title: 'Untitled product demo',
  trimStart: 0,
  trimEnd: 0,
  zoom: 1,
  focusX: 50,
  focusY: 50,
  background: '#e7e9df',
  camera: true,
  caption: '',
  sceneTitle: 'A little less effort. A lot more possibility.',
  sceneBody: 'Make your next great idea easy to understand.',
};
const clock = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(n % 60)
    .toString()
    .padStart(2, '0')}`;
export default function App() {
  const [mobileView, setMobileView] = useState(
    () => window.matchMedia('(max-width: 767px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setMobileView(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const pendingSourceSeek = useRef<number | null>(null);
  const appendDialog = useRef<HTMLDialogElement>(null),
    appendCapture = useRef(false),
    appendImport = useRef(false),
    appendCamera = useRef(false);
  const [joining, setJoining] = useState(false);
  async function appendScreenBlob(
    blob: Blob,
    length?: number,
    cameraSession?: NonNullable<typeof liveCapture.current>,
  ) {
    if (!source) return receive(blob, 'screen');
    const previousDuration = duration,
      previousSegments = recordingSegments.map((s) => settings.screenVisible === false ? ({ ...s, visibleStart: s.start, visibleEnd: s.start }) : ({ ...s })),
      previousCameraClips = allCameraClips();
    setJoining(true);
    soundPlayer.current.stop(); video.current?.pause(); setPlaying(false);
    try {
      const clipDuration = length || await screenBlobDuration(blob);
      const id = 'recording-' + crypto.randomUUID();
      const assets = settings.screenAssets || [{id: 'original', key: 'screen', start: 0, duration: previousDuration}];
      const start = Math.max(...assets.map((asset) => asset.start + asset.duration));
      await storeAsset(id, blob);
      await Promise.all(cameraSession?.cameraJobs || []);
      setScreenAssetURLs((old) => ({...old, [id]: URL.createObjectURL(blob)}));
      pendingSourceSeek.current = start;
      const total = start + clipDuration;
      localStorage.setItem('frame-duration', String(total));
      setDuration(total);
      setSettings((old) => ({...old, primaryMedia: 'screen', screenVisible: true, trimEnd: 0,
        screenAssets: [...assets, {id, key: id, start, duration: clipDuration}],
        recordingSegments: [...previousSegments, {id, start, end: total}],
        cameraClipsEdited: true,
        cameraTakes: [...previousCameraClips, ...(cameraSession?.cameraClips || []).map((clip) => ({...clip, start: clip.start + start, end: clip.end + start}))],
        camera: old.camera || Boolean(cameraSession?.cameraClips.length),
      }));
      setSelectedSegment(previousSegments.length);
      recordSegment.current = previousSegments.length;
      setTime(durationOf(previousSegments));
      setCompletedExport(null); setFloatingSaveStatus('saved');
      announce('Independent clip added. Earlier clips and edits are kept.');
      return true;
    } catch (error) {
      setFloatingSaveStatus('error'); announce((error as Error).message); return false;
    } finally { appendCapture.current = false; setJoining(false); }
  }
  async function extendScreenForCamera(end: number) {
    if (end <= duration) return;
    const id = 'blank-' + crypto.randomUUID();
    const assets = settings.screenAssets || [{id: 'original', key: 'screen', start: 0, duration}];
    setSettings((old) => ({...old, trimEnd: 0,
      screenAssets: [...assets, {id, key: 'screen', start: duration, duration: end - duration, blank: true}],
      recordingSegments: [...recordingSegments, {id, start: duration, end, visibleEnd: duration}],
    }));
    setDuration(end);
    localStorage.setItem('frame-duration', String(end));
    announce('Canvas time added for your camera clip. Screen recordings remain independent.');
  }
  const draggedClipOffset = useRef(0);
  function dropScreenClip(event: React.DragEvent<HTMLDivElement>) {
    if (recreated || settings.primaryMedia === 'camera') return;
    event.preventDefault(); event.stopPropagation();
    const index = draggedSegment.current; draggedSegment.current = null;
    if (index === null || exporting || recording) return;
    const lane = event.currentTarget.querySelector<HTMLElement>('.segment-track') || event.currentTarget;
    const box = lane.getBoundingClientRect();
    const requested = Math.round(Math.max(0, (event.clientX - box.left) / box.width * timelineDuration - draggedClipOffset.current) * 10) / 10;
    let rawEnd = duration;
    const assets = [...(settings.screenAssets || [{id:'original',key:'screen',start:0,duration}])];
    const next = moveTimelineClip(recordingSegments, index, requested, (length) => {
      const id = 'gap-' + crypto.randomUUID(), start = rawEnd; rawEnd += length;
      assets.push({id,key:'screen',start,duration:length,blank:true});
      return {id,start,end:rawEnd,visibleStart:start,visibleEnd:start,gap:true};
    });
    if (next === recordingSegments) return;
    setSettings(old => ({...old,screenAssets:assets,recordingSegments:next}));
    setDuration(rawEnd); localStorage.setItem('frame-duration',String(rawEnd));
    setSelectedSegment(next.findIndex(s => s.id === recordingSegments[index]?.id));
    setCompletedExport(null); announce('Clip moved. Other clips stay in place. Undo restores its previous position.');
  }
  function openAppendScreen() {
    if (recording || exporting || joining) return;
    appendDialog.current?.showModal();
  }
  function openAppendCamera() {
    appendCamera.current = true;
    const clips = allCameraClips(),
      last = Math.max(0, ...clips.map((c) => c.end));
    let edited = 0;
    for (const segment of recordingSegments) {
      if (last <= segment.end) {
        edited += Math.max(0, last - segment.start);
        break;
      }
      edited += segment.end - segment.start;
    }
    seek(Math.min(displayDuration, edited));
    setTimelineSelection('camera');
    setSelectedCameraClip(null);
    setCameraSetupOpen(true);
    requestAnimationFrame(()=>{document.querySelector<HTMLElement>('.inspector')?.scrollTo({top:0,behavior:'smooth'});});
  }
  const [laneAddMenu,setLaneAddMenu]=useState<{lane:string;time:number;x:number;y:number}|null>(null);
  const [laneTimes, setLaneTimes] = useState<Record<string, number>>({});
  const [home, setHome] = useState(() => !isNativeMac());
  const backgroundImage = useRef<HTMLImageElement | null>(null);
  const [settings, setSettings, undoSettings, canUndo, resetEditHistory, redoSettings, canRedo] = useEditHistory<Settings>(() => {
    try {
      const saved = { ...defaults, ...JSON.parse(localStorage.getItem('frame-settings') || '{}') };
      if (saved.title === 'Untitled product demo') {
        saved.title = saved.uploadName || saved.websiteDemo?.brand || 'Screen recording';
        saved.titleAuto = true;
      }
      return saved;
    } catch {
      return defaults;
    }
  });
  const [savingName, setSavingName] = useState(false);
  async function saveProjectName() {
    const title = settings.title.trim();
    if (!title || savingName) return;
    setSavingName(true);
    try {
      if (isNativeMac() && source) {
        const saved = await saveNativeRecordingName(title, settings.libraryRecordingID, source);
        setSettings((old) => ({...old, title: saved.name, titleAuto: false, libraryRecordingID: saved.recordingID}));
        announce('Name saved. It now appears in your library.');
      } else {
        update('title', title);
        announce('Project name saved on this device.');
      }
    } catch (error) { announce((error as Error).message); }
    finally { setSavingName(false); }
  }
  const [captionAudioSource, setCaptionAudioSource] = useState('screen');
  const [captionBusy, setCaptionBusy] = useState(false),
    [captionProgress, setCaptionProgress] = useState(0);
  const [websiteURL, setWebsiteURL] = useState('');
  const [importingWebsite, setImportingWebsite] = useState(false);
  const backgroundDialog = useRef<HTMLDialogElement>(null);
  const [websiteExport, setWebsiteExport] = useState<{
    run: () => Promise<void>;
    disabled: boolean;
    busy: boolean;
  } | null>(null);
  const [completedExport, setCompletedExport] = useState<{ url: string; name: string } | null>(
    null,
  );
  useEffect(
    () => () => {
      if (completedExport) URL.revokeObjectURL(completedExport.url);
    },
    [completedExport],
  );
  const [recreated, setRecreated] = useState(false);
  const demoTime = useRef(0);
  const demoPlaying = useRef(false);
  const cursorReplacer = useRef<CursorReplacer | null>(null);
  const cameraView = useRef<{
    zoom: number;
    x: number;
    y: number;
    clock: number;
    media: number;
    rendering: boolean;
  } | null>(null);
  const [pickingCursor, setPickingCursor] = useState(false);
  const [originalCursorSize, setOriginalCursorSize] = useState(28);
  const [cursorConfidence, setCursorConfidence] = useState(0);
  const analyzedSource = useRef('');
  const [generating, setGenerating] = useState(false);
  const [captureCursorStatus, setCaptureCursorStatus] = useState<CaptureCursorStatus | null>(null);
  const [captureSurface, setCaptureSurface] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [backgroundTab, setBackgroundTab] = useState<'wallpaper' | 'gradient' | 'color' | 'image'>('wallpaper');
  const [mediaWorkspace, setMediaWorkspace] = useState(false);
  const [fromFileStudio, setFromFileStudio] = useState(false);
  const [fileStudioFile, setFileStudioFile] = useState<File|null>(null);
  const [darkTheme, setDarkTheme] = useState(() => localStorage.getItem('demotake-theme') !== 'light');
  useEffect(() => {localStorage.setItem('demotake-theme',darkTheme ? 'dark' : 'light');document.documentElement.dataset.demotakeTheme = darkTheme ? 'dark' : 'light';setNativeTheme(darkTheme);},[darkTheme]);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('native-mac-editor', isNativeMac());
    const exit = () => setPreviewFullscreen(false);
    window.addEventListener('demotake-exit-fullscreen', exit);
    return () => window.removeEventListener('demotake-exit-fullscreen', exit);
  }, []);
  useEffect(() => { setNativePreviewFullscreen(previewFullscreen); }, [previewFullscreen]);
  useEffect(() => {
    if (!previewFullscreen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreviewFullscreen(false); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [previewFullscreen]);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const liveCamera = useRef<HTMLVideoElement>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [detectedFace, setDetectedFace] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [detectingFace, setDetectingFace] = useState(false);
  async function focusCameraFace() {
    const c =
      (video.current ? cameraForTime(video.current) : null) ||
      (settings.primaryMedia === 'camera' ? camera.current : null);
    if (!c) {
      announce('Seek to a saved camera take first.');
      return;
    }
    setDetectingFace(true);
    try {
      if (c.seeking)
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Camera frame is still loading. Seek and try again.')),
            5000,
          );
          c.addEventListener(
            'seeked',
            () => {
              clearTimeout(timeout);
              resolve();
            },
            { once: true },
          );
        });
      const face = await detectCameraFace(c);
      setDetectedFace(face);
      const ratios = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16 };
      const ratio = settings.cameraShape === 'circle' ? 1 : ratios[settings.cameraRatio || '1:1'];
      const cw = Math.min(c.videoWidth, c.videoHeight * ratio) / 1.15,
        ch = cw / ratio;
      const fx =
        c.videoWidth === cw
          ? 50
          : Math.max(
              0,
              Math.min(100, (((face.x / 100) * c.videoWidth - cw / 2) / (c.videoWidth - cw)) * 100),
            );
      const fy =
        c.videoHeight === ch
          ? 50
          : Math.max(
              0,
              Math.min(
                100,
                (((face.y / 100) * c.videoHeight - ch / 2) / (c.videoHeight - ch)) * 100,
              ),
            );
      setSettings((old) => ({ ...old, cameraFocusX: fx, cameraFocusY: fy }));
      announce('Face detected. Camera framing and the illustrated guide now match this frame.');
    } catch (e) {
      announce((e as Error).message);
    } finally {
      setDetectingFace(false);
    }
  }
  const [cameraTakeURLs, setCameraTakeURLs] = useState<Record<string, string>>({});
  const cameraTakeVideos = useRef<Record<string, HTMLVideoElement | null>>({});
  const takeRange = useRef({ start: 0, end: 0 });
  useEffect(() => {
    let alive = true;
    for (const take of settings.cameraTakes || [])
      if (take.assetId !== 'original' && take.id !== 'original')
        void loadAsset(take.assetId || take.id).then((blob) => {
          if (blob && alive)
            setCameraTakeURLs((old) => ({
              ...old,
              [take.assetId || take.id]: URL.createObjectURL(blob),
            }));
        });
    return () => {
      alive = false;
    };
  }, []);
  const [mobileFeatureOpen,setMobileFeatureOpen]=useState(false);
  const [mobileToolsOpen,setMobileToolsOpen]=useState(false);
  useEffect(()=>{
    if(!mobileFeatureOpen)return;
    const previous=document.activeElement as HTMLElement|null;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileFeatureOpen(false);};
    window.addEventListener('keydown',onKey);
    const timer=setTimeout(()=>document.querySelector<HTMLButtonElement>('.mobile-feature-heading button')?.focus(),0);
    return()=>{clearTimeout(timer);window.removeEventListener('keydown',onKey);previous?.focus();};
  },[mobileFeatureOpen]);
  const [zoomEditorClip, setZoomEditorClip] = useState<string | null>(null);
  const [selectedMusicClip,setSelectedMusicClip]=useState<string|null>(null);
  const pendingMusicTime=useRef<number|null>(null);
  function musicClips() {
    return settings.musicClips ?? ((settings.musicName || (settings.demoAudio||defaultAudio).musicTrack !== 'none') ? [{id:'legacy-music',start:settings.featureRanges?.music?.start||0,end:settings.featureRanges?.music?.end??displayDuration,offset:0,track:(settings.demoAudio||defaultAudio).musicTrack||'none' as const,volume:(settings.demoAudio||defaultAudio).musicVolume,asset:settings.musicName?'music':undefined,name:settings.musicName}] : []);
  }
  function applyMusicClip() {
    const list=musicClips(), existing=list.find(c=>c.id===selectedMusicClip);
    const start=existing?.start??pendingMusicTime.current??time;
    const clip={id:existing?.id||crypto.randomUUID(),start,end:existing?.end??displayDuration,offset:existing?.offset||0,track:(settings.demoAudio||defaultAudio).musicTrack||'none' as const,volume:(settings.demoAudio||defaultAudio).musicVolume,asset:settings.musicName?(existing?.asset||'music'):undefined,name:settings.musicName};
    setSettings(old=>({...old,musicClips:existing?list.map(c=>c.id===existing.id?clip:c):[...list,clip]}));setSelectedMusicClip(clip.id);pendingMusicTime.current=null;
    announce('Music clip applied. Drag its edges to trim.');
  }
  const [musicEditorOpen, setMusicEditorOpen] = useState(false);
  const [cameraSetupOpen, setCameraSetupOpen] = useState(false);
  const cameraClipInput = useRef<HTMLInputElement>(null);
  function setTimelineZoom(id: string, amount: number) {
    const value = Math.max(1, Math.min(4, amount));
    setSettings((old) => ({
      ...old,
      clipZooms: {
        ...(old.clipZooms ||
          Object.fromEntries(
            recordingSegments.map((segment) => [
              segment.id,
              old.zoomTrackEnabled === false ? 1 : old.zoom,
            ]),
          )),
        [id]: value,
      },
      zoomTrackEnabled: true,
      clipEffects: editClipEffects(old, recordingSegments, id, {autoZoom: false, zoomFollowsPath: false}).clipEffects,
    }));
    cameraView.current = null;
  }
  const [timelineSelection, setTimelineSelection] = useState<
    'video' | 'camera' | 'zoom' | 'cursor' | 'caption' | 'music'
  >('video');
  useEffect(() => {
    setMusicEditorOpen(timelineSelection === 'music');
    if (timelineSelection === 'cursor') setCursorExpanded(true);
    if (timelineSelection === 'zoom') setZoomEditorClip(activeSegments[selectedSegment]?.id || null);
  }, [timelineSelection]);
  const [captionSelection, setCaptionSelection] = useState<number | null>(null);
  function deleteTimelineSelection() {
    if (timelineSelection === 'cursor') {
      const id = activeSegments[selectedSegment]?.id;
      if (id) setSettings((old) => ({ ...old, manualPointer: { ...old.manualPointer, [id]: [] } }));
      setPointerMode('off');
      return;
    }
    if (timelineSelection === 'zoom') {
      if (zoomEditorClip) setTimelineZoom(zoomEditorClip, 1);
      setZoomEditorClip(null);
      return;
    }
    if (timelineSelection === 'music') {
      setSettings(old=>({...old,musicClips:musicClips().filter(c=>c.id!==selectedMusicClip)}));
      setSelectedMusicClip(null);
      setMusicEditorOpen(false);
      return;
    }
    if (timelineSelection === 'caption') {
      if (captionSelection === null) update('caption', '');
      else
        update(
          'captions',
          (settings.captions || []).filter((_, i) => i !== captionSelection),
        );
      setCaptionSelection(null);
      return;
    }
    if (timelineSelection === 'camera') {
      if (selectedCameraClip)
        saveCameraClips(allCameraClips().filter((c) => c.id !== selectedCameraClip));
      setSelectedCameraClip(null);
      return;
    }
    if (activeSegments.length === 1) {
      removeScreenTrack();
    } else {
      saveSegments(
        activeSegments.filter((_, i) => i !== Math.min(selectedSegment, activeSegments.length - 1)),
      );
      setSelectedSegment(0);
    }
  }
  function editTimelineZoom(id: string) {
    setTimelineSelection('zoom');
    const i = recordingSegments.findIndex((segment) => segment.id === id);
    if (i < 0) return;
    video.current?.pause();
    camera.current?.pause();
    soundPlayer.current.stop();
    setPlaying(false);
    setSelectedSegment(i);
    setSelectedCameraClip(null);
    setZoomEditorClip(id);
  }
  function addTimelineZoom(id: string) {
    setTimelineZoom(id, 1.25);
    editTimelineZoom(id);
  }
  const [importingCameraImage, setImportingCameraImage] = useState(false);
  async function importCameraMedia(selected: File) {
    if (importingCameraImage) return;
    if (!selected.type.startsWith('image/')) {
      await importCameraClip(selected);
      return;
    }
    const mapped = mapSegments(recordingSegments, time),
      length = recordingSegments[mapped.index].end - mapped.time;
    if (displayDuration - time < 0.1) {
      announce('Move the playhead before the end to add an image.');
      return;
    }
    setImportingCameraImage(true);
    announce('Preparing your image overlay…');
    try {
      const { imageToCameraClip } = await import('./remotion/imageClip');
      const clip = await imageToCameraClip(selected, length);
      await importCameraClip(clip);
    } catch (error) {
      announce(
        `Image import failed: ${error instanceof Error ? error.message : 'Try another image.'}`,
      );
    } finally {
      setImportingCameraImage(false);
    }
  }
  async function importCameraClip(selected: File) {
    let metadata: HTMLVideoElement | undefined;
    const url = URL.createObjectURL(selected);
    try {
      metadata = document.createElement('video');
      metadata.preload = 'metadata';
      metadata.src = url;
      await new Promise<void>((resolve, reject) => {
        metadata!.onloadedmetadata = () => resolve();
        metadata!.onerror = () =>
          reject(new Error('Could not read camera video. Use MP4 or WebM.'));
      });
      if (!Number.isFinite(metadata.duration)) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Camera video has no readable duration.')),
            12000,
          );
          const check = () => {
            if (Number.isFinite(metadata!.duration)) {
              clearTimeout(timeout);
              metadata!.removeEventListener('timeupdate', check);
              resolve();
            }
          };
          metadata!.addEventListener('timeupdate', check);
          metadata!.currentTime = 1e10;
        });
      }
      if (metadata.duration <= 0) throw new Error('Camera video has no readable duration.');
      const appending = appendCamera.current,
        cameraStart = appending
          ? Math.max(0, ...allCameraClips().map((c) => c.end))
          : mapSegments(recordingSegments, time).time;
      appendCamera.current = false;
      if (appending) await extendScreenForCamera(cameraStart + metadata.duration);
      const mapped = { time: cameraStart },
        length = appending
          ? metadata.duration
          : Math.min(metadata.duration, Math.max(0, duration - cameraStart));
      if (length < 0.1) throw new Error('Move the playhead before the end to add camera footage.');
      const id = `camera-take-${Date.now()}`;
      await storeAsset(id, selected);
      setCameraTakeURLs((old) => ({ ...old, [id]: url }));
      const clips = allCameraClips();
      setSettings((old) => ({
        ...old,
        camera: true,
        cameraClipsEdited: true,
        cameraTakes: [
          ...clips,
          {
            id,
            assetId: id,
            start: mapped.time,
            end: mapped.time + length,
            sourceStart: 0,
            sourceEnd: length,
          },
        ],
      }));
      setSelectedCameraClip(id);
      setCameraSetupOpen(false);
      announce('Camera clip added at the playhead.');
    } catch (error) {
      URL.revokeObjectURL(url);
      announce((error as Error).message);
    } finally {
      if (metadata) {
        metadata.removeAttribute('src');
        metadata.load();
      }
    }
  }
  const screenTrackImport = useRef(false);
  function importScreenTrack() {
    screenTrackImport.current = true;
    importMode.current = 'edit';
    file.current?.click();
  }
  function removeScreenTrack() {
    video.current?.pause();
    setPlaying(false);
    setArrangeDisplays(false);
    setPointerMode('off');
    setSelectedCameraClip(null);
    update('screenVisible', false);
    announce(
      'Screen removed. Use Undo to restore it, or Add screen to record new footage. Camera footage is kept.',
    );
  }
  function removeZoomTrack() {
    setPointerMode('off');
    setSettings((old) => ({
      ...old,
      zoomTrackEnabled: false,
      clipZooms: {},
      autoZoom: false,
      zoomFollowsPath: false,
      zoom: 1,
      cursorStyle: 'none',
      replaceCursor: false,
    }));
    cameraView.current = null;
  }
  function addZoomTrack() {
    const id = recordingSegments[selectedSegment]?.id;
    if (id) addTimelineZoom(id);
  }
  function removeMusicTrack() {
    soundPlayer.current.stop();
    musicBuffer.current = undefined;
    setMusicReady(false);
    setSettings((old) => ({
      ...old,
      musicName: undefined,
      demoAudio: { ...(old.demoAudio || defaultAudio), musicTrack: 'none', musicVolume: 0 },
    }));
    void storeAsset('music', new Blob());
  }
  const [selectedCameraClip, setSelectedCameraClip] = useState<string | null>(null);
  function allCameraClips(): NonNullable<Settings['cameraTakes']> {
    return [
      ...(!settings.cameraClipsEdited && camSource && cameraEnd() > 0
        ? [
            {
              id: 'original',
              assetId: 'original',
              start: 0,
              end: cameraEnd(),
              sourceStart: 0,
              sourceEnd: cameraEnd(),
            },
          ]
        : []),
      ...(settings.cameraTakes || []),
    ];
  }
  function saveCameraClips(clips: NonNullable<Settings['cameraTakes']>) {
    setSettings((old) => ({ ...old, cameraClipsEdited: true, cameraTakes: clips }));
  }
  function trimCameraClip(id: string, edge: 'start' | 'end', value: number) {
    const clips = allCameraClips();
    saveCameraClips(
      clips.map((clip) => {
        if (clip.id !== id) return clip;
        const sourceStart = clip.sourceStart || 0,
          sourceEnd = clip.sourceEnd ?? sourceStart + clip.end - clip.start;
        if (edge === 'start') {
          const start = Math.max(clip.start - sourceStart, Math.min(clip.end - 0.1, value));
          return { ...clip, start, sourceStart: sourceStart + start - clip.start, sourceEnd };
        }
        return {
          ...clip,
          end: Math.max(clip.start + 0.1, Math.min(clip.start + sourceEnd - sourceStart, value)),
          sourceEnd,
        };
      }),
    );
  }
  function dragCameraTrim(
    e: React.PointerEvent<HTMLSpanElement>,
    id: string,
    edge: 'start' | 'end',
    segmentSpan: number,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const clip = allCameraClips().find((c) => c.id === id),
      box = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!clip || !box) return;
    const origin = e.clientX;
    const move = (event: PointerEvent) =>
      trimCameraClip(id, edge, clip[edge] + ((event.clientX - origin) / box.width) * segmentSpan);
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  }
  const cameraMoveClick = useRef(false);
  function dragCameraClip(e: React.PointerEvent<HTMLDivElement>, id: string) {
    if (exporting || cameraTake || (e.target as HTMLElement).closest('.camera-trim-edge')) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedCameraClip(id);
    video.current?.pause();
    setPlaying(false);
    const clips = allCameraClips(),
      clip = clips.find((c) => c.id === id),
      track = e.currentTarget.closest('.camera-linked-track')?.getBoundingClientRect();
    if (!clip || !track) return;
    const origin = e.clientX,
      length = clip.end - clip.start;
    const occurrence = activeSegments.findIndex(
      (segment) => clip.start >= segment.start && clip.start < segment.end,
    );
    const index = Math.max(0, occurrence),
      initial =
        durationOf(activeSegments.slice(0, index)) +
        Math.max(0, clip.start - activeSegments[index].start);
    cameraMoveClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) => {
      if (Math.abs(event.clientX - origin) < 4 && !cameraMoveClick.current) return;
      cameraMoveClick.current = true;
      const edited = Math.max(
        0,
        Math.min(
          displayDuration - length,
          initial + ((event.clientX - origin) / track.width) * timelineDuration,
        ),
      );
      const mapped = mapSegments(activeSegments, edited);
      const start = mapped.time;
      saveCameraClips(
        clips.map((c) =>
          c.id === id
            ? {
                ...c,
                assetId: c.assetId || c.id,
                sourceStart: c.sourceStart || 0,
                sourceEnd: c.sourceEnd ?? (c.sourceStart || 0) + length,
                start,
                end: start + length,
              }
            : c,
        ),
      );
    };
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  }
  function splitCameraClip() {
    const clips = allCameraClips(),
      clip = clips.find((c) => c.id === selectedCameraClip),
      at = mediaTime(video.current) || 0;
    if (!clip || at <= clip.start + 0.1 || at >= clip.end - 0.1) {
      announce('Place the playhead inside the selected camera clip to split.');
      return;
    }
    const assetId = clip.assetId || clip.id,
      sourceStart = clip.sourceStart || 0;
    saveCameraClips(
      clips.flatMap((c) =>
        c.id === clip.id
          ? [
              { ...clip, assetId, end: at, sourceEnd: sourceStart + at - clip.start },
              {
                ...clip,
                id: `${clip.id}-split-${Date.now()}`,
                assetId,
                start: at,
                sourceStart: sourceStart + at - clip.start,
                sourceEnd: clip.sourceEnd ?? sourceStart + clip.end - clip.start,
              },
            ]
          : [c],
      ),
    );
  }
  function activeCameraTake(t: number) {
    return allCameraClips()
      .reverse()
      .find((take) => t >= take.start && t < take.end);
  }
  const cameraAudioNodes = useRef(new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>());
  const [clipVolumeOpen, setClipVolumeOpen] = useState(false);
  function clipVolume(id: string) {
    let key = id;
    while (key) {
      const value = settings.clipVolumes?.[key];
      if (value !== undefined) return value;
      key = key.slice(0, -1);
    }
    return 1;
  }
  function selectedVolumeKey() {
    return timelineSelection === 'camera' && selectedCameraClip
      ? 'camera:' + selectedCameraClip
      : 'screen:' + (activeSegments[selectedSegment]?.id || 'recording');
  }
  function syncClipAudio() {
    const v = video.current;
    if (!v) return;
    const segment =
      recordingSegments.find((s) => mediaTime(v) >= s.start && mediaTime(v) < s.end) ||
      recordingSegments[recordSegment.current];
    v.volume = clipVolume('screen:' + (segment?.id || 'recording'));
    const take =
      settings.camera && settings.primaryMedia !== 'camera'
        ? activeCameraTake(mediaTime(v))
        : null;
    const current = take
      ? take.assetId === 'original' || take.id === 'original'
        ? camera.current
        : cameraTakeVideos.current[take.assetId || take.id]
      : null;
    for (const c of [camera.current, ...Object.values(cameraTakeVideos.current)]) {
      if (!c) continue;
      c.muted = c !== current;
      c.volume = take && c === current ? clipVolume('camera:' + take.id) : 0;
      if (c !== current) c.pause();
      const graph = audioGraph.current;
      if (graph && !cameraAudioNodes.current.has(c)) {
        const node = graph.context.createMediaElementSource(c);
        node.connect(graph.destination);
        node.connect(graph.context.destination);
        cameraAudioNodes.current.set(c, node);
      }
    }
  }
  useEffect(() => {
    syncClipAudio();
  }, [settings.clipVolumes, settings.camera]);
  function cameraForTime(v: HTMLVideoElement) {
    syncClipAudio();
    const take = activeCameraTake(mediaTime(v));
    const c = take
      ? take.assetId === 'original' || take.id === 'original'
        ? camera.current
        : cameraTakeVideos.current[take.assetId || take.id]
      : null;
    if (take && c && c.readyState >= 2) {
      const local = (take.sourceStart || 0) + mediaTime(v) - take.start;
      if (Math.abs(c.currentTime - local) > 0.12) c.currentTime = local;
      if (v.paused) {
        c.pause();
      } else if (c.paused) void c.play().catch(() => {});
    }
    return c;
  }
  const [cameraTake, setCameraTake] = useState(false);
  const [cameraCountdown, setCameraCountdown] = useState<number | null>(null);
  const cameraTakePending = useRef(false),
    cameraTakeAttempt = useRef(0);
  const cameraTakeRecorder = useRef<MediaRecorder | null>(null),
    cameraTakeStream = useRef<MediaStream | null>(null),
    cameraTakePreview = useRef<HTMLVideoElement>(null);
  useEffect(
    () => () => {
      cameraTakePending.current = false;
      cameraTakeStream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  function stopCameraTake() {
    cameraTakeAttempt.current++;
    cameraTakePending.current = false;
    setCameraCountdown(null);
    if (!cameraTakeRecorder.current) {
      cameraTakeStream.current?.getTracks().forEach((t) => t.stop());
      cameraTakeStream.current = null;
      setCameraTake(false);
      setFloatingCameraStream(null);
    }
    const rec = cameraTakeRecorder.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    video.current?.pause();
    setPlaying(false);
  }
  async function startCameraTake() {
    if (mobileView) return;
    if (
      !source ||
      !video.current ||
      cameraTakePending.current ||
      cameraTakeRecorder.current ||
      recording ||
      exporting
    )
      return;
    const appending = appendCamera.current;
    appendCamera.current = false;
    const appendStart = Math.max(0, ...allCameraClips().map((c) => c.end));
    let captureStarted = 0;
    const attempt = ++cameraTakeAttempt.current;
    cameraTakePending.current = true;
    setCameraTake(true);
    let stream: MediaStream | undefined;
    try {
      const controller =
        floatingController && !floatingController.closed
          ? floatingController
          : await openRecordingController(true);
      if (!controller) throw new Error('Open floating controls before recording a camera take.');
      if (!cameraTakePending.current || attempt !== cameraTakeAttempt.current) return;
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: microphone,
      });
      if (!cameraTakePending.current || attempt !== cameraTakeAttempt.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      cameraTakeStream.current = stream;
      setFloatingCameraStream(stream);
      video.current.pause();
      setPlaying(false);
      const mapped = mapSegments(recordingSegments, time >= displayDuration - 0.05 ? 0 : time);
      recordSegment.current = mapped.index;
      takeRange.current = {
        start: appending ? appendStart : mapped.time,
        end: appending ? Infinity : recordingSegments[mapped.index].end,
      };
      seekMediaTime(video.current, appending
        ? Math.min(appendStart, Math.max(0, duration - 0.05))
        : mapped.time);
      setPointerMode('off');
      soundPlayer.current.stop();
      if (video.current.seeking)
        await new Promise<void>((resolve) =>
          video.current!.addEventListener('seeked', () => resolve(), { once: true }),
        );
      for (let remaining = 5; remaining > 0; remaining--) {
        if (!cameraTakePending.current || attempt !== cameraTakeAttempt.current) return;
        setCameraCountdown(remaining);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!cameraTakePending.current || attempt !== cameraTakeAttempt.current) return;
      setCameraCountdown(null);
      cameraTakePending.current = false;
      const chunks: BlobPart[] = [];
      const mime = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      cameraTakeRecorder.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        const start = takeRange.current.start,
          end = appending
            ? start + (performance.now() - captureStarted) / 1000
            : Math.min(takeRange.current.end, mediaTime(video.current) || start);
        stream!.getTracks().forEach((t) => t.stop());
        cameraTakeStream.current = null;
        cameraTakeRecorder.current = null;
        setFloatingCameraStream(null);
        setCameraTake(false);
        setPlaying(false);
        video.current?.pause();
        if (end - start < 0.1) {
          announce('Camera take was too short. Try again.');
          return;
        }
        const id = `camera-take-${Date.now()}`,
          blob = new Blob(chunks, { type: rec.mimeType });
        void storeAsset(id, blob)
          .then(async () => {
            if (appending) await extendScreenForCamera(end);
            setCameraTakeURLs((old) => ({ ...old, [id]: URL.createObjectURL(blob) }));
            setSettings((old) => ({
              ...old,
              camera: true,
              cameraTakes: [...(old.cameraTakes || []), { id, start, end }],
            }));
            seek(
              durationOf(recordingSegments.slice(0, mapped.index)) +
                start -
                recordingSegments[mapped.index].start,
            );
            announce('Camera take added at the playhead. Earlier takes are kept.');
          })
          .catch(() => announce('Camera take could not be saved. Local storage may be full.'));
      };
      setCameraTake(true);
      update('camera', true);
      captureStarted = performance.now();
      rec.start(250);
      if (!appending) {
        await video.current.play();
        setPlaying(true);
      } else
        announce('Recording the next camera clip. Stop in the floating controls when finished.');
    } catch (e) {
      if (attempt !== cameraTakeAttempt.current) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      cameraTakePending.current = false;
      setCameraCountdown(null);
      setFloatingCameraStream(null);
      stream?.getTracks().forEach((t) => t.stop());
      if (cameraTakeRecorder.current?.state === 'recording') cameraTakeRecorder.current.stop();
      setCameraTake(false);
      announce((e as Error).message);
    }
  }
  useEffect(() => {
    if (cameraTake && cameraTakePreview.current && cameraTakeStream.current) {
      cameraTakePreview.current.srcObject = cameraTakeStream.current;
      void cameraTakePreview.current.play();
    }
  }, [cameraTake]);
  const [floatingController, setFloatingController] = useState<Window | null>(null),
    [captureArmed, setCaptureArmed] = useState(false);
  useEffect(() => {
    if (mobileView && floatingController) {
      floatingController.close();
      setFloatingController(null);
    }
  }, [mobileView, floatingController]);
  useEffect(() => {
    if (!floatingController || floatingController.closed) return;
    const doc = floatingController.document;
    let theme = doc.getElementById('demotake-controller-theme') as HTMLStyleElement | null;
    if (!theme) { theme = doc.createElement('style'); theme.id = 'demotake-controller-theme'; doc.head.appendChild(theme); }
    theme.textContent = darkTheme ? 'body,.floating-capture,.floating-capture header{background:#191b21;color:#e5e8f0;border-color:#3a3f4b}.floating-capture p,.floating-capture small{color:#adb5c5}.floating-capture button,.floating-capture select{background:#242730;color:#e5e8f0;border-color:#3a3f4b}.floating-recording-result{background:#253322;border-color:#708855}.floating-recording-result a{color:#badb78}' : '';
  }, [darkTheme, floatingController]);
  const [floatingSaveStatus, setFloatingSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const armedStart = useRef<(() => void) | null>(null);
  const floatingCameraPreview = useRef<HTMLVideoElement>(null);
  const [floatingCameraStream, setFloatingCameraStream] = useState<MediaStream | null>(null);
  useEffect(() => {
    const preview = floatingCameraPreview.current;
    if (!preview) return;
    preview.srcObject = floatingCameraStream;
    if (floatingCameraStream) void preview.play().catch(() => {});
  }, [floatingCameraStream, floatingController]);
  const liveCapture = useRef<{
    screen?: MediaStream;
    input?: MediaStream;
    context?: AudioContext;
    destination?: MediaStreamAudioDestinationNode;
    micNode?: MediaStreamAudioSourceNode;
    started?: number;
    cameraRecorder?: MediaRecorder;
    cameraJobs: Promise<void>[];
    cameraClips: NonNullable<Settings['cameraTakes']>;
  } | null>(null);
  const deviceChanging = useRef(false);
  function startLiveCamera(session: NonNullable<typeof liveCapture.current>) {
    const tracks = session.input?.getVideoTracks().filter((t) => t.readyState === 'live') || [];
    if (!tracks.length || session.cameraRecorder?.state === 'recording') return;
    const chunks: BlobPart[] = [],
      start = Math.max(0, (performance.now() - (session.started || performance.now())) / 1000),
      id = `capture-camera-${crypto.randomUUID()}`;
    const rec = new MediaRecorder(new MediaStream(tracks));
    session.cameraRecorder = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    let done!: () => void;
    session.cameraJobs.push(
      new Promise<void>((resolve) => {
        done = resolve;
      }),
    );
    rec.onstop = () => {
      const length = Math.max(
          0.01,
          (performance.now() - (session.started || performance.now())) / 1000 - start,
        ),
        blob = new Blob(chunks, { type: rec.mimeType });
      void storeAsset(id, blob)
        .then(() => {
          session.cameraClips.push({
            id,
            assetId: id,
            start,
            end: start + length,
            sourceStart: 0,
            sourceEnd: length,
          });
          setCameraTakeURLs((old) => ({ ...old, [id]: URL.createObjectURL(blob) }));
        })
        .catch(() => announce('Could not save this camera segment.'))
        .finally(done);
    };
    rec.start(1000);
  }
  function toggleLiveScreen() {
    const session = liveCapture.current;
    if (!session) {
      setScreenEnabled(!screenEnabled);
      return;
    }
    if (!session.screen) {
      announce('This recording started camera-only. Start a new recording to choose a screen.');
      return;
    }
    session.screen.getVideoTracks().forEach((t) => {
      t.enabled = !screenEnabled;
    });
    setScreenEnabled(!screenEnabled);
  }
  const floatingDeviceStreams = useRef<{ camera?: MediaStream; mic?: MediaStream }>({});
  async function floatingDeviceToggle(device: 'camera' | 'mic') {
    if (deviceChanging.current) return;
    const session = liveCapture.current;
    if (session) {
      deviceChanging.current = true;
      try {
        const enabled = device === 'camera' ? cameraEnabled : microphone;
        let tracks: MediaStreamTrack[] | undefined =
          device === 'camera' ? session.input?.getVideoTracks() : session.input?.getAudioTracks();
        if (!enabled && !tracks?.some((t) => t.readyState === 'live')) {
          const stream = await navigator.mediaDevices.getUserMedia(
            device === 'camera' ? { video: true, audio: false } : { video: false, audio: true },
          );
          if (liveCapture.current !== session) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streams.current.push(stream);
          session.input ||= new MediaStream();
          stream.getTracks().forEach((t) => session.input!.addTrack(t));
          tracks = stream.getTracks();
          if (device === 'mic' && session.context && session.destination) {
            session.micNode = session.context.createMediaStreamSource(stream);
            session.micNode.connect(session.destination);
          }
        }
        tracks?.forEach((t) => {
          t.enabled = !enabled;
        });
        if (device === 'camera') {
          if (enabled) {
            if (session.cameraRecorder?.state === 'recording') session.cameraRecorder.stop();
            setFloatingCameraStream(null);
            setLiveStream(null);
          } else {
            setFloatingCameraStream(new MediaStream(tracks || []));
            setLiveStream(new MediaStream(tracks || []));
            if (session.started && session.screen) startLiveCamera(session);
          }
          setCameraEnabled(!enabled);
        } else setMicrophone(!enabled);
      } catch (e) {
        announce((e as Error).message);
      } finally {
        deviceChanging.current = false;
      }
      return;
    }
    const enabled = device === 'camera' ? cameraEnabled : microphone;
    if (enabled) {
      floatingDeviceStreams.current[device]?.getTracks().forEach((t) => t.stop());
      delete floatingDeviceStreams.current[device];
      if (device === 'camera') {
        setCameraEnabled(false);
        setFloatingCameraStream(null);
      } else setMicrophone(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        device === 'camera' ? { video: true, audio: false } : { video: false, audio: true },
      );
      floatingDeviceStreams.current[device] = stream;
      if (device === 'camera') {
        setCameraEnabled(true);
        setFloatingCameraStream(stream);
      } else setMicrophone(true);
    } catch (e) {
      announce((e as Error).message);
    }
  }
  async function openRecordingController(forCameraTake = false) {
    if (showNativeRecorder()) return null;
    if (mobileView) {
      announce('Import a video or camera clip on mobile.');
      return null;
    }
    try {
      const api = (
        window as unknown as {
          documentPictureInPicture?: {
            requestWindow: (options: { width: number; height: number }) => Promise<Window>;
          };
        }
      ).documentPictureInPicture;
      const floating = api
        ? await api.requestWindow({ width: 330, height: 290 })
        : window.open('', 'frame-recording-controls', 'popup,width=330,height=320');
      if (!floating) throw new Error('Allow popups to open the recording controller.');
      if (!forCameraTake) {
        setCameraEnabled(false);
        setMicrophone(false);
      }
      floating.document.title = 'DemoTake · Recording controls';
      floating.document.body.style.margin = '0';
      const style = floating.document.createElement('style');
      style.textContent =
        '.floating-studio-nav{display:flex;gap:6px;margin:10px 0}.floating-capture .floating-studio-nav button{width:auto;flex:1;padding:8px 5px;margin:0;background:#edf1e6;color:#405732;font-size:11px}.floating-capture .floating-studio-nav button[aria-current=page]{background:#dce8bd}*{box-sizing:border-box}body{font-family:system-ui;background:#f8faf5;color:#263323}.floating-capture{padding:20px}.floating-capture header{display:flex;justify-content:space-between;font-size:14px;font-weight:650}.floating-capture p{font-size:12px;line-height:1.6;color:#737e6a}.floating-capture button{font:600 13px system-ui;border:0;border-radius:9px;padding:13px 16px;cursor:pointer;background:#657e40;color:white;width:100%;margin-top:6px}.floating-capture button:disabled{opacity:.5}.floating-capture .stop{background:#b7473d}.floating-capture small{display:block;font-size:10px;color:#7a8571;margin-top:10px}.capture-device-row{display:flex;gap:8px;margin:12px 0}.floating-capture .device{margin:0;flex:1;background:white;color:#67735d;border:1px solid #dfe5d7;padding:10px 5px;font-size:12px}.floating-capture .device[aria-pressed=true]{background:#e9f0dd;border-color:#94aa76;color:#354d29}.device span{display:block;font-size:20px;margin-bottom:4px}.floating-capture .capture-device-row{display:inline-flex;gap:4px;padding:4px;border:1px solid #e4e7df;border-radius:10px;background:#f0f2ec}.floating-capture .device{width:34px;height:34px;flex:none;display:grid;place-items:center;padding:0;border:1px solid transparent;border-radius:7px;background:transparent;color:#89917f}.floating-capture .device[aria-pressed=true]{background:white;color:#405732;border-color:#e0e5d8;box-shadow:0 1px 3px #25341b12}.floating-capture .device:hover{background:#fff}.floating-capture .device:focus-visible{outline:2px solid #879d67;outline-offset:2px}.floating-capture .device svg{display:block}.floating-capture{padding:12px}.floating-capture header{font-size:12px}.floating-capture p{font-size:11px;line-height:1.4;margin:8px 0}.floating-action-row{display:flex;align-items:center;gap:8px}.floating-capture .capture-device-row{margin:0;padding:3px;gap:2px;flex-shrink:0}.floating-capture .device{width:29px;height:29px}.floating-action-row>button{width:auto;flex:1;margin:0;padding:10px 9px;white-space:nowrap;font-size:11px;border-radius:8px}.floating-capture small{font-size:9px;line-height:1.35;margin-top:8px}.floating-camera-preview{position:relative;margin:8px 0;border-radius:8px;overflow:hidden;background:#202820}.floating-camera-preview video{display:block;width:100%;height:96px;object-fit:contain;transform:scaleX(-1)}.floating-camera-preview span{position:absolute;bottom:5px;left:6px;font-size:8px;letter-spacing:.8px;color:white;background:#182317aa;padding:3px 5px;border-radius:4px}.floating-capture .device[aria-pressed=true]{background:#e1f4e7;color:#18763b;border-color:#83c89a}.floating-capture .device[aria-pressed=false]{background:#fdeaea;color:#be3030;border-color:#e7a1a1}.floating-recording-result{margin:10px 0;padding:10px;border:1px solid #b7d9bf;border-radius:8px;background:#eff9f1;font-size:11px}.floating-recording-result strong{display:block}.floating-recording-result video{display:block;width:100%;max-height:130px;margin:8px 0;border-radius:6px;background:#182317}.floating-recording-result a{color:#18763b}';
      floating.document.head.append(style);
      floating.addEventListener(
        'pagehide',
        () => {
          if (cameraTakePending.current || cameraTakeRecorder.current) stopCameraTake();
          setFloatingController(null);
          setFloatingCameraStream(null);
          if (!liveCapture.current)
            Object.values(floatingDeviceStreams.current).forEach((s) =>
              s.getTracks().forEach((t) => t.stop()),
            );
          floatingDeviceStreams.current = {};
          if (armedStart.current) {
            const session = liveCapture.current;
            liveCapture.current = null;
            if (session?.context) void session.context.close();
            streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
            streams.current = [];
            armedStart.current = null;
            setCaptureArmed(false);
          }
        },
        { once: true },
      );
      setFloatingController(floating);
      return floating;
    } catch (e) {
      announce((e as Error).message);
    }
  }
  function beginArmedCapture() {
    armedStart.current?.();
    armedStart.current = null;
    setCaptureArmed(false);
  }
  const [source, setSource] = useState('');
  const [screenAssetURLs, setScreenAssetURLs] = useState<Record<string, string>>({});
  const screenURLsRef = useRef(screenAssetURLs);
  screenURLsRef.current = screenAssetURLs;
  useEffect(() => () => { Object.values(screenURLsRef.current).forEach((url) => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    let alive = true;
    for (const asset of settings.screenAssets || []) {
      if (asset.key === 'screen' || screenAssetURLs[asset.id]) continue;
      void loadAsset(asset.key).then((blob) => {
        if (alive && blob?.size) setScreenAssetURLs((old) => old[asset.id] ? old : {...old, [asset.id]: URL.createObjectURL(blob)});
      });
    }
    return () => {alive = false;};
  }, [settings.screenAssets, screenAssetURLs]);
  useEffect(() => {
    const element = video.current;
    if (!element || !source) return;
    const manifest = settings.screenAssets;
    if (!manifest?.length) {
      disconnectScreenMedia(element);
      if (element.getAttribute('src') !== source) {element.src = source; element.load();}
      return;
    }
    const assets = manifest.map((asset) => ({...asset, url: asset.key === 'screen' ? source : screenAssetURLs[asset.id]}));
    if (assets.some((asset) => !asset.url)) return;
    configureScreenMedia(element, assets);
    const total = Math.max(...assets.map((asset) => asset.start + asset.duration));
    setDuration(total);
    localStorage.setItem('frame-duration', String(total));
    if (pendingSourceSeek.current !== null) {
      seekMediaTime(element, pendingSourceSeek.current);
      pendingSourceSeek.current = null;
    }
  }, [source, settings.screenAssets, screenAssetURLs]);

  const undoPending = useRef(false);
  useEffect(() => { resetEditHistory(); }, [source, resetEditHistory]);
  function redoLastEdit() {
    if(!canRedo||recording||exporting||joining)return;
    video.current?.pause();camera.current?.pause();soundPlayer.current.stop();setPlaying(false);setCompletedExport(null);redoSettings();
  }
  function undoLastEdit() {
    if (!canUndo || recording || exporting || joining) return;
    video.current?.pause(); camera.current?.pause(); soundPlayer.current.stop();
    setPlaying(false);
    setCompletedExport(null);
    undoPending.current = true;
    undoSettings();
  }
  useEffect(() => {
    if (!undoPending.current) return;
    undoPending.current = false;
    setSelectedSegment(0);
    setSelectedCameraClip(null);
    seek(0);
    announce('Last edit undone.');
  }, [settings]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,select,[contenteditable="true"]')) return;
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoLastEdit();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const [camSource, setCamSource] = useState('');
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [panel, setPanel] = useState<'edit' | 'animate' | 'website'>('edit');
  const [screenEnabled, setScreenEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphone, setMicrophone] = useState(true);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);
  const captionSource = useRef(source);
  captionSource.current = source;
  const video = useRef<HTMLVideoElement>(null),
    camera = useRef<HTMLVideoElement>(null),
    file = useRef<HTMLInputElement>(null);
  const streams = useRef<MediaStream[]>([]),
    recorders = useRef<MediaRecorder[]>([]);
  const exportAbort = useRef(false);
  const audioGraph = useRef<{
    context: AudioContext;
    source: MediaElementAudioSourceNode;
    destination: MediaStreamAudioDestinationNode;
  } | null>(null);
  useEffect(() => {
    const element = liveCamera.current;
    if (element && liveStream) {
      element.srcObject = liveStream;
      void element.play().catch(() => announce('Click the live preview to start camera playback.'));
    }
    return () => {
      if (element) element.srcObject = null;
    };
  }, [liveStream]);
  const sectionLabels = {
    edit: 'Screen Demo Studio',
    animate: 'Animation',
    website: 'Website Link to Video',
  };
  const [groqKeyDraft, setGroqKeyDraft] = useState(''),
    [hasUserGroqKey, setHasUserGroqKey] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [serverAIConfigured, setAIConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/ai-status')
      .then((r) => r.json())
      .then((d) => setAIConfigured(Boolean(d.configured)))
      .catch(() => setAIConfigured(null));
  }, []);
  const imageInput = useRef<HTMLInputElement>(null),
    importMode = useRef<'edit' | 'animate'>('edit');
  const designInput = useRef<HTMLInputElement>(null);
  const [chosenTemplate, setChosenTemplate] = useState<TemplateId>('cinematic');
  useEffect(()=>{const choose=(event:MouseEvent)=>{const target=event.target;if(target instanceof HTMLInputElement&&target.type==='file')document.documentElement.dataset.fileAccept=target.accept;};document.addEventListener('click',choose,true);return()=>document.removeEventListener('click',choose,true);},[]);
  const musicInput = useRef<HTMLInputElement>(null),
    musicBuffer = useRef<AudioBuffer | undefined>(undefined),
    soundPlayer = useRef(new DemoAudioPlayer()),
    previewSound = useRef<AudioBuffer | undefined>(undefined),
    recordSegment = useRef(0);
  const [musicReady, setMusicReady] = useState(false),
    [cardSelection, setCardSelection] = useState(0),
    [selectedSegment, setSelectedSegment] = useState(0);
  const draggedSegment = useRef<number | null>(null);
  const trimDrag = useRef<{
    index: number;
    edge: 'start' | 'end';
    x: number;
    scale: number;
    list: DemoSegment[];
    value: number;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    loadAsset('music')
      .then(async (blob) => {
        if (blob?.size) {
          const context = new AudioContext();
          try {
            const buffer = await context.decodeAudioData(await blob.arrayBuffer());
            if (alive) {
              musicBuffer.current = buffer;
              setMusicReady(true);
            }
          } finally {
            await context.close();
          }
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      soundPlayer.current.stop();
    };
  }, []);
  function navigateStudio(next: 'edit' | 'animate' | 'website') {
    if (next === 'animate') return;
    if (exporting || websiteExport?.busy || generating || importingWebsite) return;
    setHome(false);
    soundPlayer.current.stop();
    video.current?.pause();
    camera.current?.pause();
    demoPlaying.current = false;
    setPlaying(false);
    setPickingCursor(false);
    setPanel(next);
    let project = settings.websiteDemo;
    if (next === 'website' && project?.sourceType) {
      project = settings.websiteProject;
      setSettings((s) => ({
        ...s,
        mediaProject: s.websiteDemo,
        websiteDemo: project,
        demoBrand: project?.brand,
        demoQuery: project?.title,
        demoFilename: project?.description,
        demoHeadline: project?.cta,
      }));
    }
    const showWebsite = Boolean(project) && next === 'website' && !project?.sourceType;
    setRecreated(showWebsite);
    if (showWebsite) {
      demoTime.current = 0.8;
      setTime(0.8);
    } else {
      recordSegment.current = 0;
      setTime(0);
      if (video.current) seekMediaTime(video.current, recordingSegments[0].start);
      if (camera.current) camera.current.currentTime = recordingSegments[0].start;
    }
  }
  function studioLinks() {
    return (
      <>
        <button
          className="nav"
          title="File Studio"
          aria-label="File Studio"
          disabled={exporting || websiteExport?.busy || recording || generating || importingWebsite}
          onClick={() => {
            video.current?.pause();
            camera.current?.pause();
            soundPlayer.current.stop();
            demoPlaying.current = false;
            setPlaying(false);
            setMediaWorkspace(true);
            setHome(false);
          }}
        >
          <Film size={18} /> File Studio
        </button>
        <button
          className={`nav ${panel === 'edit' ? 'active' : ''}`}
          title="Screen Demo Studio"
          aria-label="Screen Demo Studio"
          aria-current={panel === 'edit' ? 'page' : undefined}
          disabled={exporting || websiteExport?.busy || generating || importingWebsite}
          onClick={() => navigateStudio('edit')}
        >
          <Monitor size={18} /> Screen Demo Studio
        </button>

      </>
    );
  }
  const [animationMode, setAnimationMode] = useState<'video' | 'image' | 'templates'>('video');
  const aiConfigured = hasUserGroqKey || serverAIConfigured;
  function animationLinks() {
    return (
      <nav className="animation-modes" aria-label="Animation options">
        {(['video', 'image', 'templates'] as const).map((mode) => (
          <button
            key={mode}
            className={panel === 'animate' && animationMode === mode ? 'selected' : ''}
            disabled={exporting || recording || generating || importingWebsite}
            onClick={() => {
              setAnimationMode(mode);
              navigateStudio('animate');
            }}
          >
            {mode === 'video' ? (
              <Film size={16} />
            ) : mode === 'image' ? (
              <Upload size={16} />
            ) : (
              <Sparkles size={16} />
            )}{' '}
            {mode === 'video'
              ? 'Upload Video'
              : mode === 'image'
                ? 'Upload Image'
                : 'Create templates'}
          </button>
        ))}
        <button
          className={panel === 'website' ? 'selected' : ''}
          disabled={exporting || recording || generating || importingWebsite}
          onClick={() => navigateStudio('website')}
        >
          <ArrowUpRight size={16} /> Website Link to Video
        </button>
      </nav>
    );
  }

  function selectedClipEffectSettings() { return clipEffectSettings(settings, (timelineSelection === 'zoom' ? zoomEditorClip : null) || activeSegments[selectedSegment]?.id); }
  function setClipSettings(action: (old: Settings) => Settings) {
    const id = (timelineSelection === 'zoom' ? zoomEditorClip : null) || activeSegments[selectedSegment]?.id;
    if (!id || recreated) return setSettings(action);
    setSettings(old => {
      const effective = clipEffectSettings(old, id);
      const next = action(effective);
      return editClipEffects({...next, ...effectsSnapshot(old)}, activeSegments, id, next);
    });
    cameraView.current = null;
  }
  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (clipEffectKeys.includes(key as typeof clipEffectKeys[number]) && !recreated) {
      setClipSettings(old => ({...old, [key]: value}));
      return;
    }
    setSettings((s) => ({
      ...s,
      [key]: value,
      ...(key === 'title' ? { titleAuto: false } : {}),
      ...(key === 'background' ? { backgroundPreset: undefined, backgroundImage: undefined } : {}),
    }));
  }
  function announce(message: string) {
    setNotice(message);
  }
  const captionAudioOptions = [
    {
      id: 'screen',
      label: settings.primaryMedia === 'camera' ? 'Main camera video audio' : 'Screen video audio',
      url: source,
      start: 0,
      end: undefined as number | undefined,
      offset: 0,
    },
    ...allCameraClips().map((clip, index) => ({
      id: `camera:${clip.id}`,
      label: `Camera clip ${index + 1} audio`,
      url:
        (clip.assetId || clip.id) === 'original'
          ? camSource
          : cameraTakeURLs[clip.assetId || clip.id],
      start: clip.sourceStart || 0,
      end: (clip.sourceStart || 0) + clip.end - clip.start,
      offset: clip.start,
    })),
    ...(musicReady && musicBuffer.current
      ? [
          {
            id: 'music',
            label: settings.musicName ? `Imported audio: ${settings.musicName}` : 'Imported audio',
            url: musicBuffer.current,
            start: 0,
            end: duration || undefined,
            offset: 0,
          },
        ]
      : []),
  ];
  const captionAudio = captionAudioOptions.find((option) => option.id === captionAudioSource);
  const captionAudioRevision = useRef('');
  captionAudioRevision.current = JSON.stringify([
    captionAudioSource,
    source,
    camSource,
    cameraTakeURLs,
    settings.cameraTakes,
    settings.musicName,
    musicReady,
  ]);
  async function createCaptions(outputOverride?: 'original'|'english') {
    if (!captionAudio?.url || captionBusy) return;
    const revision = captionAudioRevision.current;
    setCaptionBusy(true);
    setCaptionProgress(0);
    try {
      let detectedLanguage = '';
      let originalCaptions: import('./captions').Caption[] = [];
      const captionOutput = outputOverride || settings.captionOutputLanguage || 'original';
      const captions = await generateCaptions(captionAudio.url, setCaptionProgress, {
        output: captionOutput, language:settings.captionSourceLanguage || 'auto',
        onDetectedLanguage: language => { detectedLanguage = language; },
        onOriginalCaptions: captions => { originalCaptions = captions; },
        start: captionAudio.start,
        end: captionAudio.end,
        offset: captionAudio.offset,
      });
      if (captionAudioRevision.current !== revision)
        throw Error('The audio source changed. Generate captions again.');
      setSettings((s) => ({ ...s, captions, caption: '', captionsEnabled: true, captionOutputLanguage:captionOutput, captionDetectedLanguage: detectedLanguage, captionVariants: {...s.captionVariants, original:captionOutput === 'english' && s.captionVariants?.original?.length ? s.captionVariants.original : originalCaptions, [captionOutput]:captions} }));
      announce('Speech captions ready. Edit any line and choose a style.');
    } catch (error) {
      announce((error as Error).message);
    } finally {
      setCaptionBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    if (!settings.backgroundImage) {
      backgroundImage.current = null;
      return;
    }
    void loadAsset('canvas-background').then(async (blob) => {
      if (!blob?.size) return;
      const url = URL.createObjectURL(blob),
        img = new Image();
      img.onload = () => {
        if (active) backgroundImage.current = img;
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
    return () => {
      active = false;
    };
  }, [settings.backgroundImage]);
  function paintBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    paintCanvasBackground(ctx, w, h, settings.background, settings.backgroundPreset);
    const img = backgroundImage.current;
    if (settings.backgroundImage && img) {
      const scale = Math.max(w / img.width, h / img.height),
        sw = w / scale,
        sh = h / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
    }
  }
  const captionDialog = useRef<HTMLDialogElement>(null),
    captionPreview = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let id = 0;
    const draw = () => {
      const target = captionPreview.current,
        original = previewCanvas.current;
      if (captionDialog.current?.open && target && original && original.width) {
        if (target.width !== original.width) target.width = original.width;
        if (target.height !== original.height) target.height = original.height;
        target.getContext('2d')?.drawImage(original, 0, 0);
      }
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);
  function openCaptions() {
    video.current?.pause();
    setPlaying(false);
    update('captionsEnabled', true);
    setTimelineSelection('caption');
  }
  function captionControls() {
    const hasCaptions = Boolean(settings.captions?.length);
    return (
      <div className="control-section caption-controls">
        {!hasCaptions ? (
          <div className="caption-empty">
            <h3>Generate speech captions</h3>
            <p>
              Choose the audio containing speech. Captions will appear as individual clips on your
              timeline.
            </p>
          </div>
        ) : (
          <div className="caption-section-heading">
            <h3>{settings.captions!.length} caption segments</h3>
            <label className="auto-zoom-switch">
              <input
                aria-label="Show captions"
                type="checkbox"
                checked={settings.captionsEnabled !== false}
                onChange={(e) => update('captionsEnabled', e.target.checked)}
              />{' '}
              Show captions
            </label>
          </div>
        )}
        {!recreated && (
          <>
            <label className="caption-audio-source">
              Audio to transcribe
              <select
                aria-label="Audio to transcribe"
                value={captionAudioSource}
                disabled={captionBusy}
                onChange={(e) => setCaptionAudioSource(e.target.value)}
              >
                {captionAudioOptions.map((option) => (
                  <option key={option.id} value={option.id} disabled={!option.url}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <CaptionLanguageChoice sourceLanguage={settings.captionSourceLanguage || 'auto'} onSourceLanguageChange={value=>setSettings(old=>({...old,captionSourceLanguage:value,captionVariants:{},captionDetectedLanguage:undefined}))} value={settings.captionOutputLanguage || 'original'} language={settings.captionDetectedLanguage} disabled={captionBusy} onChange={value => {
              const current=settings.captionOutputLanguage || 'original';
              const variants={...settings.captionVariants,[current]:settings.captions || []};
              setSettings(old=>({...old,captionVariants:variants}));
              if(value==='english'&&!variants.english?.length&&settings.captions?.length){void createCaptions('english');return;}
              setSettings(old=>({...old,captionOutputLanguage:value,captionVariants:variants,captions:variants[value]||[]}));
            }} />
            <button
              className="button lime caption-generate"
              disabled={
                !captionAudio?.url || captionBusy || exporting || recording || !aiConfigured
              }
              onClick={() => void createCaptions()}
            >
              {captionBusy
                ? `Transcribing ${captionProgress}%`
                : hasCaptions
                  ? 'Regenerate captions'
                  : 'Generate captions'}
            </button>
            {captionBusy && (
              <progress aria-label="Transcription progress" value={captionProgress} max={100} />
            )}
            <p>
              {aiConfigured
                ? hasCaptions
                  ? 'Regenerating replaces existing speech captions.'
                  : 'Only the selected audio is sent to Groq for transcription.'
                : 'Configure Groq to generate speech captions.'}
            </p>
          </>
        )}
        {hasCaptions && (
          <>
            <div className="caption-styles">
              {captionStyles.map((style) => (
                <button
                  key={style.id}
                  className={`caption-style ${style.id} ${(settings.captionStyle || 'classic') === style.id ? 'selected' : ''}`}
                  aria-pressed={(settings.captionStyle || 'classic') === style.id}
                  onClick={() => update('captionStyle', style.id)}
                >
                  <span>Aa</span>
                  {style.name}
                </button>
              ))}
            </div>
            <CaptionDesignControls style={settings.captionStyle || 'classic'} appearance={settings.captionAppearance || {}} showStyles={false} disabled={captionBusy || exporting} onStyle={style=>update('captionStyle',style)} onChange={value=>update('captionAppearance',value)} />
            <div className="caption-segment-list" aria-label="Caption segments">
              {settings.captions!.map((caption, index) => (
                <div
                  className={`caption-segment-editor ${captionSelection === index ? 'selected' : ''}`}
                  key={index}
                >
                  <button
                    className="caption-segment-time"
                    onClick={() => {
                      const segmentIndex = activeSegments.findIndex(
                        (segment) => caption.start >= segment.start && caption.start < segment.end,
                      );
                      if (segmentIndex >= 0)
                        seek(
                          durationOf(activeSegments.slice(0, segmentIndex)) +
                            caption.start -
                            activeSegments[segmentIndex].start,
                        );
                      setCaptionSelection(index);
                    }}
                    aria-label={`Preview caption ${index + 1}`}
                  >
                    {clock(caption.start)} – {clock(caption.end)}
                  </button>
                  <textarea
                    aria-label={`Speech caption ${index + 1}`}
                    value={caption.text}
                    onFocus={() => setCaptionSelection(index)}
                    onChange={(e) =>
                      update(
                        'captions',
                        settings.captions!.map((c, i) =>
                          i === index ? { ...c, text: e.target.value } : c,
                        ),
                      )
                    }
                  />
                  <button
                    className="caption-segment-delete"
                    aria-label={`Delete caption ${index + 1}`}
                    onClick={() => {
                      update(
                        'captions',
                        settings.captions!.filter((_, i) => i !== index),
                      );
                      setCaptionSelection(null);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="button quiet"
              onClick={() => {
                update('captions', []);
      update('captionVariants', undefined);
      update('captionDetectedLanguage', undefined);
      update('captionOutputLanguage', 'original');
                setCaptionSelection(null);
              }}
            >
              Clear speech captions
            </button>
          </>
        )}
      </div>
    );
  }

  useEffect(() => {
    localStorage.setItem('frame-settings', JSON.stringify(settings));
    setSaved(true);
  }, [settings]);
  useEffect(() => {
    let alive = true;
    loadAsset('screen')
      .then((blob) => {
        if (blob?.size && alive) {
          setSource(URL.createObjectURL(blob));
          setDuration(Number(localStorage.getItem('frame-duration')) || 0);
          void loadAsset('primary-media-type').then(async (kind) => {
            if (!kind || !alive) return;
            const type = await kind.text();
            if (type === 'camera') {
              setCamSource(URL.createObjectURL(blob));
              setSettings((old) => ({ ...old, primaryMedia: 'camera', camera: true }));
            } else if (type === 'screen') update('primaryMedia', 'screen');
          });
        }
      })
      .catch(() => {});
    loadAsset('camera')
      .then((blob) => {
        if (blob?.size && alive) setCamSource(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => {
      alive = false;
      streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      recorders.current.forEach((r) => {
        if (r.state !== 'inactive') r.stop();
      });
    };
  }, []);
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );
  useEffect(
    () => () => {
      if (camSource) URL.revokeObjectURL(camSource);
    },
    [camSource],
  );
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);
  async function clearRecording() {
    try {
      await clearRecordingAssets();
      soundPlayer.current.stop();
      video.current?.pause();
      camera.current?.pause();
      Object.values(cameraTakeVideos.current).forEach((v) => v?.pause());
      Object.values(cameraTakeURLs).forEach((url) => URL.revokeObjectURL(url));
      setCameraTakeURLs({});
      setSource('');
      setCamSource('');
      setDuration(0);
      setTime(0);
      setPlaying(false);
      setRecreated(false);
      demoPlaying.current = false;
      recordSegment.current = 0;
      setSelectedSegment(0);
      setSelectedCameraClip(null);
      setArrangeDisplays(false);
      setPointerMode('off');
      setCompletedExport(null);
      cursorReplacer.current = null;
      setDetectedFace(null);
      localStorage.removeItem('frame-duration');
      setSettings((old) => ({
        ...old,
        primaryMedia: undefined,
        screenAssets: undefined,
        libraryRecordingID: undefined,
        cameraTakes: [],
        cameraClipsEdited: false,
        cameraDuration: undefined,
        recordingSegments: undefined,
        trimStart: 0,
        trimEnd: 0,
        cursorTelemetry: undefined,
        cursorSeed: undefined,
        manualPointer: {},
        focusPoints: [],
        scenes: [],
        captions: [],
        caption: '',
        captionLayout: undefined,
        replaceCursor: false,
        autoZoom: false,
        displayLayouts: undefined,
        mobileClipFraming: undefined,
        uploadKind: undefined,
        uploadName: undefined,
        mediaProject: undefined,
        ...(old.websiteDemo?.sourceType ? { websiteDemo: undefined } : {}),
        ...(old.titleAuto ? { title: 'Screen recording' } : {}),
      }));
      announce('Recording cleared. Ready for a new recording.');
      return true;
    } catch {
      announce('Could not clear the saved recording. Please try again.');
      return false;
    }
  }
  async function receive(blob: Blob, key: string) {
    const cameraOnly = key === 'camera-only';
    if (cameraOnly) key = 'screen';
    if (key === 'screen') {
      setSettings((old) => ({
        ...old,
        primaryMedia: cameraOnly ? 'camera' : 'screen',
        screenAssets: undefined,
        libraryRecordingID: undefined,
        displayLayouts: undefined, captionLayout: undefined,
        screenVisible: true,
        zoomTrackEnabled: true,
        clipZooms: undefined,
        cameraTakes: [],
        cameraClipsEdited: false,
        cameraDuration: undefined,
        ...(!old.title || old.title === 'Untitled product demo' || old.titleAuto
          ? {
              title:
                blob instanceof File
                  ? blob.name.replace(/\.[^.]+$/, '')
                  : `Recording · ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Calcutta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date())}`,
              titleAuto: true,
            }
          : {}),
      }));
      setRecreated(false);
      demoPlaying.current = false;
      setSource(URL.createObjectURL(blob));
      setDuration(0);
      setTime(0);
      setPlaying(false);
      update('cursorTelemetry', undefined);
      update('recordingSegments', undefined);
      update('trimStart', 0);
      update('trimEnd', 0);
      update('focusPoints', []);
      update('scenes', []);
      update('captions', []);
      update('captionVariants', undefined);
      update('captionDetectedLanguage', undefined);
      update('captionOutputLanguage', 'original');
      update('cursorSeed', undefined);
      update('replaceCursor', false);
      cursorReplacer.current = null;
      update('autoZoom', false);
    } else setCamSource(URL.createObjectURL(blob));
    try {
      await storeAsset(key, blob);
      if (key === 'screen')
        await storeAsset('primary-media-type', new Blob([cameraOnly ? 'camera' : 'screen']));
      if (cameraOnly) {
        await storeAsset('camera', blob);
        setCamSource(URL.createObjectURL(blob));
        setSettings((old) => ({
          ...old,
          primaryMedia: 'camera',
          camera: true,
          cursorStyle: 'none',
          pointerMotion: 'manual',
          manualPointer: {},
          autoZoom: false,
        }));
      }
      return true;
    } catch {
      announce('Recording loaded, but local storage is full. Download your video before closing.');
      return false;
    }
  }
  useEffect(() => {
    const importNative = async (event: Event) => {
      const detail = (event as CustomEvent<{ url: string; name: string; cameraURL?: string; cameraLead?: number; cameraDuration?: number; cursorURL?: string; append?: boolean; recordingID?: string; title?: string }>).detail;
      if (!isNativeMac() || !detail || !detail.url.startsWith(`${location.origin}/recordings/`)) return;
      try {
        announce('Loading the saved MP4 into the editor…');
        const response = await fetch(detail.url);
        if (!response.ok) throw new Error('Could not read the saved recording.');
        const blob = await response.blob();
        if ((detail.append ?? appendCapture.current) && source) {
          const offset = settings.screenAssets ? Math.max(...settings.screenAssets.map((asset) => asset.start + asset.duration)) : duration;
          const session: NonNullable<typeof liveCapture.current> = { cameraJobs: [], cameraClips: [] };
          if (detail.cameraURL?.startsWith(`${location.origin}/recordings/`)) {
            const cameraResponse = await fetch(detail.cameraURL);
            if (!cameraResponse.ok) throw new Error('Could not read the next clip’s camera track.');
            const cameraBlob = await cameraResponse.blob();
            const id = `native-camera-${crypto.randomUUID()}`;
            await storeAsset(id, cameraBlob);
            setCameraTakeURLs((old) => ({ ...old, [id]: URL.createObjectURL(cameraBlob) }));
            const lead = Math.max(0, detail.cameraLead || 0);
            const end = Math.max(0, (detail.cameraDuration || 0) - lead);
            session.cameraClips.push({ id, assetId: id, start: 0, end, sourceStart: lead, sourceEnd: lead + end });
          }
          const appended = await appendScreenBlob(blob, undefined, session);
          if (appended && detail.cursorURL?.startsWith(`${location.origin}/recordings/`)) {
            try {
              const response = await fetch(detail.cursorURL);
              const data: unknown = response.ok ? await response.json() : [];
              if (Array.isArray(data)) {
                const added = data.filter((p): p is CursorSample => p && Number.isFinite(p.time) && p.time >= 0 &&
                  Number.isFinite(p.x) && p.x >= 0 && p.x <= 1 && Number.isFinite(p.y) && p.y >= 0 && p.y <= 1 && typeof p.click === 'boolean');
                setSettings((old) => ({ ...old,
                  cursorTelemetry: [...(old.cursorTelemetry || []), ...added.map((p) => ({ ...p, time: p.time + offset }))],
                  focusPoints: [...(old.focusPoints || []), ...cursorFocusPoints(added, added.at(-1)?.time || 0).map((p) => ({ ...p, time: p.time + offset }))],
                }));
              }
            } catch { announce('Clip appended; its cursor-follow data could not be loaded.'); }
          }
          navigateStudio('edit');
          return;
        }
        appendCapture.current = false;
        const stored = await receive(new File([blob], detail.name, { type: 'video/mp4' }), 'screen');
        setSettings((old) => ({...old, libraryRecordingID: detail.recordingID, title: detail.title || detail.name.replace(/\.[^.]+$/, ''), titleAuto: false}));
        if (detail.cameraURL?.startsWith(`${location.origin}/recordings/`)) {
          const cameraResponse = await fetch(detail.cameraURL);
          if (!cameraResponse.ok) throw new Error('The screen recording loaded, but its camera track could not be read.');
          await receive(await cameraResponse.blob(), 'camera');
          const lead = Math.max(0, detail.cameraLead || 0);
          const cameraDuration = Math.max(lead, detail.cameraDuration || 0);
          setSettings((old) => ({ ...old, camera: true, cameraDuration, cameraClipsEdited: true,
            cameraTakes: [{ id: 'native-camera', assetId: 'original', start: 0, end: cameraDuration - lead, sourceStart: lead, sourceEnd: cameraDuration }],
          }));
        } else {
          setCamSource('');
          await storeAsset('camera', new Blob());
          setSettings((old) => ({ ...old, camera: false, cameraTakes: [], cameraClipsEdited: false }));
        }
        let cursorSamples: CursorSample[] = [];
        if (detail.cursorURL?.startsWith(`${location.origin}/recordings/`)) {
          try {
            const result = await fetch(detail.cursorURL);
            if (result.ok) {
              const data: unknown = await result.json();
              if (Array.isArray(data)) cursorSamples = data.filter((p): p is CursorSample =>
                p && Number.isFinite(p.time) && p.time >= 0 && Number.isFinite(p.x) && p.x >= 0 && p.x <= 1 &&
                Number.isFinite(p.y) && p.y >= 0 && p.y <= 1 && typeof p.click === 'boolean');
            }
          } catch { /* Original video remains usable without tracking metadata. */ }
        }
        const trackedLength = cursorSamples.at(-1)?.time || 0;
        setSettings((old) => ({ ...old, capturedCursorHidden: true, replaceCursor: false,
          cursorTelemetry: cursorSamples, pointerMotion: cursorSamples.length ? 'recorded' : 'manual',
          cursorStyle: cursorSamples.length ? 'auto' : 'none',
          focusPoints: cursorFocusPoints(cursorSamples, trackedLength),
          zoom: cursorSamples.length ? 1.7 : 1, zoomSource: 'cursor', autoZoom: cursorSamples.length > 0,
        }));
        navigateStudio('edit');
        announce(stored
          ? 'Recording loaded from your app library. Export when you’re ready to save a copy elsewhere.'
          : 'Recording loaded, but the editor cache is full. Your original MP4 is safe in your app library.');
      } catch (error) {
        announce(`Could not load recording: ${(error as Error).message}. Your original file remains in your app library.`);
      }
    };
    window.addEventListener('demotake-native-import', importNative);
    return () => window.removeEventListener('demotake-native-import', importNative);
  });
  function recorder(stream: MediaStream, key: string) {
    const shouldAppend = appendCapture.current && Boolean(source);
    const captureSession = liveCapture.current;
    const started = performance.now();
    const chunks: BlobPart[] = [];
    const mime = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ].find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 20000000,
      audioBitsPerSecond: 192000,
    });
    r.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    r.onstop = () => {
      const length = (performance.now() - started) / 1000;
      if (shouldAppend && (key === 'screen' || key === 'camera-only')) {
        void appendScreenBlob(
          new Blob(chunks, { type: r.mimeType }),
          length,
          captureSession || undefined,
        );
        return;
      }
      void receive(new Blob(chunks, { type: r.mimeType }), key).then((stored) => {
        if (key === 'screen' || key === 'camera-only')
          setFloatingSaveStatus(stored ? 'saved' : 'error');
        if (key === 'camera') update('cameraDuration', length);
        if (key === 'screen' || key === 'camera-only') {
          if (key === 'camera-only') update('cameraDuration', length);
          localStorage.setItem('frame-duration', String(length));
          setDuration(length);
          const samples = telemetry.current?.points || [];
          setSettings((old) => ({
            ...old,
            cursorTelemetry: samples,
            pointerMotion: samples.length ? 'recorded' : 'manual',
            cursorStyle: samples.length ? 'arrow' : old.cursorStyle,
            replaceCursor: false,
            focusPoints: cursorFocusPoints(samples, length),
            zoom: samples.length && old.zoom <= 1 ? 1.7 : old.zoom,
            zoomSource: 'cursor',
            autoZoom: samples.length > 0,
          }));
          telemetry.current = null;
          if (captureSession?.screen) {
            void Promise.all(captureSession.cameraJobs).then(() =>
              setSettings((old) => ({
                ...old,
                camera: captureSession.cameraClips.length > 0,
                cameraClipsEdited: true,
                cameraTakes: captureSession.cameraClips,
              })),
            );
          }
        }
      });
    };
    r.start(1000);
    return r;
  }
  function stopRecording() {
    if (recorders.current.some((r) => r.state !== 'inactive')) setFloatingSaveStatus('saving');
    const session = liveCapture.current;
    if (session?.cameraRecorder?.state === 'recording') session.cameraRecorder.stop();
    liveCapture.current = null;
    if (session?.context) void session.context.close();
    armedStart.current = null;
    setCaptureArmed(false);
    void companionCommand('stop');
    if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => {});
    recorders.current.forEach((r) => {
      if (r.state !== 'inactive') r.stop();
    });
    streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streams.current = [];
    floatingDeviceStreams.current = {};
    setLiveStream(null);
    setFloatingCameraStream(null);
    setRecording(false);
    announce('Recording stopped. Saving your footage…');
  }
  async function startRecording(deferred = false, fresh = false) {
    if (source && !fresh) appendCapture.current = true;
    if (showNativeRecorder()) {
      announce('Use Record screen in the Mac recorder toolbar. Recordings save automatically in your app library.');
      return;
    }
    if (mobileView) return;
    if (source && !fresh) appendCapture.current = true;
    try {
      setFloatingSaveStatus('idle');
      if (!floatingController || floatingController.closed) {
        const controller = await openRecordingController(true);
        if (!controller) return;
        deferred = true;
      }
      if (!screenEnabled) {
        if (!cameraEnabled) throw new Error('Enable Screen or Camera before recording.');
        const devices = floatingDeviceStreams.current,
          cam = devices.camera?.getVideoTracks().filter((t) => t.readyState === 'live') || [],
          mic = devices.mic?.getAudioTracks().filter((t) => t.readyState === 'live') || [];
        const input =
          deferred && cam.length && (!microphone || mic.length)
            ? new MediaStream([...cam, ...(microphone ? mic : [])])
            : await navigator.mediaDevices.getUserMedia({ video: true, audio: microphone });
        streams.current = [input];
        const context = new AudioContext(),
          destination = context.createMediaStreamDestination();
        await context.resume();
        const session = {
          input,
          context,
          destination,
          cameraJobs: [],
          cameraClips: [],
        } as NonNullable<typeof liveCapture.current>;
        if (input.getAudioTracks().length) {
          session.micNode = context.createMediaStreamSource(
            new MediaStream(input.getAudioTracks()),
          );
          session.micNode.connect(destination);
        }
        liveCapture.current = session;
        const cameraCapture = new MediaStream([
          ...input.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
        setFloatingCameraStream(new MediaStream(input.getVideoTracks()));
        const begin = () => {
          telemetry.current = null;
          if (!appendCapture.current) {
            setCamSource('');
            void storeAsset('camera', new Blob());
          }
          update('camera', true);
          update('capturedCursorHidden', true);
          session.started = performance.now();
          recorders.current = [recorder(cameraCapture, 'camera-only')];
          setRecordSeconds(0);
          setRecording(true);
          input.getVideoTracks()[0].onended = stopRecording;
          announce('Camera-only recording started. Screen capture is off.');
        };
        if (deferred) {
          armedStart.current = begin;
          setCaptureArmed(true);
          return;
        }
        begin();
        return;
      }
      if (companionEnabled) {
        const connection = await companionCommand('hello');
        if (!connection.available) throw Error(connection.error || 'Cursor companion unavailable.');
      }
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error(
          'Screen capture is unavailable. Open this app in desktop Chrome on localhost or HTTPS.',
        );
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 }, cursor: 'never' } as MediaTrackConstraints,
        audio: true,
        ...(companionEnabled
          ? {
              video: { frameRate: { ideal: 30 }, cursor: 'never', displaySurface: 'browser' },
              surfaceSwitching: 'exclude',
            }
          : {}),
        preferCurrentTab: false,
        selfBrowserSurface: 'exclude',
      } as DisplayMediaStreamOptions);
      streams.current = [screen];
      const screenTrack = screen.getVideoTracks()[0];
      const status = await configureCaptureCursor(screenTrack);
      const cursorHidden = status === 'hidden';
      setCaptureCursorStatus(status);
      update('capturedCursorHidden', cursorHidden);
      setCaptureSurface(screen.getVideoTracks()[0].getSettings().displaySurface || 'unknown');
      let input: MediaStream | undefined;
      if (cameraEnabled || microphone) {
        const devices = floatingDeviceStreams.current;
        const cameraTracks =
            devices.camera?.getVideoTracks().filter((t) => t.readyState === 'live') || [],
          micTracks = devices.mic?.getAudioTracks().filter((t) => t.readyState === 'live') || [];
        if (
          deferred &&
          (!cameraEnabled || cameraTracks.length) &&
          (!microphone || micTracks.length)
        ) {
          input = new MediaStream([
            ...(cameraEnabled ? cameraTracks : []),
            ...(microphone ? micTracks : []),
          ]);
        } else
          input = await navigator.mediaDevices.getUserMedia({
            video: cameraEnabled,
            audio: microphone,
          });
        streams.current.push(input);
        if (cameraEnabled) {
          const previewStream = new MediaStream(input.getVideoTracks());
          setLiveStream(previewStream);
          setFloatingCameraStream(previewStream);
        }
      }
      const context = new AudioContext(),
        destination = context.createMediaStreamDestination();
      await context.resume();
      const session = {
        screen,
        input,
        context,
        destination,
        cameraJobs: [],
        cameraClips: [],
      } as NonNullable<typeof liveCapture.current>;
      if (input?.getAudioTracks().length) {
        session.micNode = context.createMediaStreamSource(new MediaStream(input.getAudioTracks()));
        session.micNode.connect(destination);
      }
      if (screen.getAudioTracks().length)
        context
          .createMediaStreamSource(new MediaStream(screen.getAudioTracks()))
          .connect(destination);
      liveCapture.current = session;
      const capture = new MediaStream([
        ...screen.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);
      if (companionEnabled) {
        if (screenTrack.getSettings().displaySurface !== 'browser')
          throw Error(
            'Cursor companion needs tab capture. In the sharing dialog choose Chrome Tab and select the website you armed in the extension. The extension button selects the tracking tab; it does not select what Chrome captures.',
          );
        const id = crypto.randomUUID();
        const result = await companionCommand('start', id);
        if (!result.active) throw Error(result.error || 'Could not start cursor companion.');
        telemetry.current = { id, started: Date.now(), points: [] };
      } else telemetry.current = null;
      const begin = () => {
        session.started = performance.now();
        recorders.current = [recorder(capture, 'screen')];
        if (!appendCapture.current) {
          setCamSource('');
          void storeAsset('camera', new Blob());
        }
        if (session.input?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live'))
          startLiveCamera(session);
        screen.getVideoTracks()[0].onended = stopRecording;
        setRecordSeconds(0);
        setRecording(true);
      };
      if (deferred) {
        armedStart.current = begin;
        setCaptureArmed(true);
        announce(
          'Screen selected. Switch to your target screen, then press Start in the floating controller.',
        );
        return;
      }
      begin();
      announce(
        cursorHidden
          ? 'Recording with the original cursor hidden. Activity pointer styling can be applied afterwards.'
          : status === 'visible'
            ? 'Recording started. This browser includes the original cursor; cursor replacement will need calibration.'
            : 'Recording started. This browser has not confirmed cursor hiding; original-cursor replacement may be required.',
      );
    } catch (err) {
      const session = liveCapture.current;
      liveCapture.current = null;
      if (session?.context) void session.context.close();
      void companionCommand('stop');
      telemetry.current = null;
      streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      setLiveStream(null);
      appendCapture.current = false;
      announce(err instanceof Error ? err.message : 'Could not start recording.');
    }
  }
  useEffect(() => {
    const input = file.current;
    if (!input) return;
    const cancel = () => {
      appendImport.current = false;
      screenTrackImport.current = false;
    };
    input.addEventListener('cancel', cancel);
    return () => input.removeEventListener('cancel', cancel);
  }, [home]);
  const telemetry = useRef<{ id: string; started: number; points: CursorSample[] } | null>(null);
  const [companionEnabled, setCompanionEnabled] = useState(false);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      const session = telemetry.current,
        m = e.data;
      if (
        e.source !== window ||
        e.origin !== location.origin ||
        m?.source !== 'frame-companion' ||
        m.type !== 'frame-sample' ||
        !session ||
        m.id !== session.id ||
        ![m.x, m.y, m.at].every(Number.isFinite)
      )
        return;
      const time = (m.at - session.started) / 1000;
      if (time >= 0)
        session.points.push({
          time,
          x: Math.max(0, Math.min(1, m.x)),
          y: Math.max(0, Math.min(1, m.y)),
          click: Boolean(m.click),
        });
    };
    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
      void companionCommand('stop');
    };
  }, []);
  const [creativeBrief, setCreativeBrief] = useState('');
  const [pointerFocusDraft, setPointerFocusDraft] = useState({ x: 50, y: 50 });
  const focusPointerDialog = useRef<HTMLDialogElement>(null);
  const [cursorExpanded, setCursorExpanded] = useState(true);
  const [pointerMode, setPointerMode] = useState<'off' | 'place' | 'record' | 'live'>('off');
  useEffect(() => {
    if (timelineSelection !== 'cursor') setPointerMode('off');
  }, [timelineSelection]);
  const end = settings.trimEnd || duration;
  const websiteRawDuration =
    settings.websiteDemo?.creative && settings.websiteDemo.motion?.template === 'ai'
      ? creativeDuration(settings.websiteDemo.creative)
      : settings.websiteDemo?.motion
        ? MOTION_DURATION
        : settings.websiteDemo?.storyboard
          ? storyDuration(settings.websiteDemo.storyboard)
          : DEMO_DURATION;
  const websiteSegments =
    settings.websiteDemo?.motion?.segments ||
    settings.websiteSegments ||
    (settings.websiteDemo?.creative && settings.websiteDemo.motion?.template === 'ai'
      ? creativeChapters(settings.websiteDemo.creative).map((c, i, list) => ({
          id: `creative-${i}`,
          start: c.time,
          end: list[i + 1]?.time || websiteRawDuration,
        }))
      : settings.websiteDemo?.motion
        ? defaultSegments()
        : [{ id: 'website', start: 0, end: websiteRawDuration }]);
  const recordingSegments = settings.recordingSegments || [
    { id: 'recording', start: settings.trimStart, end: Math.max(settings.trimStart + 0.1, end) },
  ];
  const activeSegments: DemoSegment[] = recreated ? websiteSegments : recordingSegments;
  const websiteDuration = durationOf(websiteSegments),
    displayDuration = recreated ? websiteDuration : durationOf(recordingSegments);
  const timelineDuration = Math.max(displayDuration, 1);
  const baseChapters =
    settings.websiteDemo?.creative && settings.websiteDemo.motion?.template === 'ai'
      ? creativeChapters(settings.websiteDemo.creative)
      : settings.websiteDemo?.motion
        ? templateChapters(settings.websiteDemo.motion.template || 'cinematic')
        : settings.websiteDemo?.storyboard
          ? storyChapters(settings.websiteDemo.storyboard)
          : websiteChapters;
  const activeChapters = websiteSegments.map((s, i) => ({
    time: durationOf(websiteSegments.slice(0, i)),
    label: [...baseChapters].reverse().find((c) => c.time <= s.start)?.label || 'Segment',
  }));
  const [arrangeDisplays, setArrangeDisplays] = useState(false);
  const [arrangeTarget, setArrangeTarget] = useState<'screen' | 'camera'>('screen');
  function adjustDisplay(
    key: 'screenX' | 'screenY' | 'screenScale' | 'cameraX' | 'cameraY' | 'cameraSize',
    value: number,
  ) {
    const l = displayLayout(),
      cam = cameraDisplayRect();
    setSettings((old) => ({
      ...old,
      displayLayouts: {
        ...old.displayLayouts,
        [layoutKey()]: {
          ...l,
          cameraX: l.cameraX ?? ((cam.x + cam.width / 2) / previewWidth) * 100,
          cameraY: l.cameraY ?? ((cam.y + cam.height / 2) / previewHeight) * 100,
          cameraSize: l.cameraSize ?? cam.width,
          [key]: value,
        },
      },
    }));
  }

  function layoutKey() {
    return `${settings.outputFormat || '16:9'}:${activeSegments[selectedSegment]?.id || 'recording'}`;
  }
  function displayLayout() {
    const format = settings.outputFormat || '16:9',
      index = arrangeDisplays
        ? selectedSegment
        : Math.min(recordSegment.current, activeSegments.length - 1);
    const resolve = (i: number) => {
      let id = activeSegments[i]?.id || 'recording';
      while (id) {
        const saved = settings.displayLayouts?.[`${format}:${id}`];
        if (saved) return saved;
        id = id.slice(0, -1);
      }
      return settings.displayLayouts?.[format] || { screenX: 50, screenY: 50, screenScale: 1 };
    };
    const target = resolve(index);
    if (arrangeDisplays || index <= 0) return target;
    const segment = activeSegments[index],
      local = (mediaTime(video.current) ?? segment.start) - segment.start;
    const n = Math.max(0, Math.min(1, local / Math.min(0.7, (segment.end - segment.start) / 2))),
      ease = n * n * (3 - 2 * n),
      previous = resolve(index - 1);
    const result = { ...target };
    for (const key of [
      'screenX',
      'screenY',
      'screenScale',
      'cameraX',
      'cameraY',
      'cameraSize',
    ] as const) {
      const from = previous[key],
        to = target[key];
      if (from !== undefined && to !== undefined) result[key] = from + (to - from) * ease;
    }
    return result;
  }
  function cameraDimensions() {
    const l = displayLayout();
    const ratio = settings.cameraShape === 'circle' ? 1
      : { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16 }[settings.cameraRatio || '1:1'];
    const width = Math.min(l.cameraSize ?? settings.cameraSize ?? 170, portrait ? 660 : 1000, (portrait ? 1100 : 620) * ratio);
    return { width, height: width / ratio };
  }
  function mobileMetrics() {
    const l = displayLayout(), size = cameraDimensions();
    const outside = settings.camera && Boolean(camSource || settings.cameraTakes?.length) && (settings.mobileCameraLayout || 'outside') === 'outside';
    const reserve = outside ? size.height + 48 : 0;
    const scale = Math.min(696 / 1150, (1280 - captionBand() - reserve - 48) / 620) * l.screenScale;
    const top = outside && (settings.mobileCameraPosition || 'bottom-center').startsWith('top') ? reserve : 0;
    const centerY = top + (1280 - captionBand() - reserve) / 2 + (l.screenY - 50) * 12.8;
    return {scale, x: (l.screenX / 100) * 720 - 640 * scale, y: centerY - 360 * scale};
  }
  function cameraDisplayRect() {
    const l = displayLayout(), size = cameraDimensions();
    const outside = (settings.mobileCameraLayout || (portrait ? 'outside' : 'overlay')) === 'outside';
    const position = outside ? settings.mobileCameraPosition || 'bottom-center' : settings.cameraPosition || 'bottom-right';
    const m = portrait ? mobileMetrics() : null;
    const c = portrait ? null : cameraComposition();
    const scale = m?.scale ?? c!.scale;
    const screen = {x: (m?.x ?? c!.tx) + 65 * scale, y: (m?.y ?? c!.ty) + 50 * scale, width: 1150 * scale, height: 620 * scale};
    const rect = placeCamera(screen, {width: previewWidth, height: previewHeight - captionBand()}, size, position, outside, portrait);
    const placed = {...rect,
      x: l.cameraX === undefined ? rect.x : Math.max(0, Math.min(previewWidth - rect.width, l.cameraX / 100 * previewWidth - rect.width / 2)),
      y: l.cameraY === undefined ? rect.y : Math.max(0, Math.min(previewHeight - captionBand() - rect.height, l.cameraY / 100 * previewHeight - rect.height / 2)),
    };
    const solo = settings.primaryMedia === 'camera' ? 0 : cameraSoloMix(
      recordingSegments, mediaTime(video.current), settings.screenVisible !== false, recordSegment.current,
    );
    return soloCameraRect(placed, {width: previewWidth, height: previewHeight - captionBand()}, solo);
  }
  function setCameraPlacement(layout: 'outside' | 'overlay', position?: NonNullable<Settings['cameraPosition']>) {
    setSettings((old) => ({...old, mobileCameraLayout: layout,
      ...(position ? layout === 'outside' ? {mobileCameraPosition: position} : {cameraPosition: position} : {}),
      displayLayouts: {...old.displayLayouts, [layoutKey()]: {...displayLayout(), cameraX: undefined, cameraY: undefined}},
    }));
  }
  function dragCaption(e: React.PointerEvent<HTMLDivElement>, resize = false) {
    e.preventDefault();
    e.stopPropagation();
    video.current?.pause();
    setPlaying(false);
    const bounds = e.currentTarget.closest('.stage')!.getBoundingClientRect(),
      initial = settings.captionLayout || { x: 50, y: 88, scale: 1 },
      origin = { x: e.clientX, y: e.clientY };
    const move = (event: PointerEvent) => {
      const dx = (event.clientX - origin.x) / bounds.width,
        dy = (event.clientY - origin.y) / bounds.height;
      update(
        'captionLayout',
        resize
          ? { ...initial, scale: Math.max(0.4, Math.min(3, initial.scale + dx * 3 + dy)) }
          : {
              ...initial,
              x: Math.max(5, Math.min(95, initial.x + dx * 100)),
              y: Math.max(5, Math.min(95, initial.y + dy * 100)),
            },
      );
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  }
  function arrangeDrag(
    e: React.PointerEvent<HTMLDivElement>,
    target: 'screen' | 'camera',
    resize = false,
  ) {
    e.preventDefault();
    e.stopPropagation();
    setArrangeTarget(target);
    video.current?.pause();
    setPlaying(false);
    const bounds = e.currentTarget.closest('.stage')!.getBoundingClientRect(),
      initial = displayLayout(),
      cam = cameraDisplayRect(),
      origin = { x: e.clientX, y: e.clientY };
    const move = (event: PointerEvent) => {
      const dx = ((event.clientX - origin.x) / bounds.width) * previewWidth,
        dy = ((event.clientY - origin.y) / bounds.height) * previewHeight;
      setSettings((old) => {
        const layout = { ...initial };
        let cameraSize = old.cameraSize;
        if (target === 'screen') {
          if (resize)
            layout.screenScale = Math.max(
              0.3,
              Math.min(
                2,
                initial.screenScale +
                  (Math.abs(dx / (portrait ? 696 : 1150)) > Math.abs(dy / (portrait ? 376 : 620))
                    ? dx / (portrait ? 696 : 1150)
                    : dy / (portrait ? 376 : 620)),
              ),
            );
          else {
            layout.screenX = Math.max(
              0,
              Math.min(100, initial.screenX + (dx / previewWidth) * 100),
            );
            layout.screenY = Math.max(
              0,
              Math.min(100, initial.screenY + (dy / previewHeight) * 100),
            );
          }
        } else if (resize) {
          cameraSize = Math.max(
            100,
            Math.min(
              portrait ? 660 : 1000,
              cam.width + Math.max(dx, dy * (cam.width / cam.height)),
            ),
          );
          layout.cameraSize = cameraSize;
        } else {
          layout.cameraX = Math.max(
            0,
            Math.min(100, ((cam.x + cam.width / 2 + dx) / previewWidth) * 100),
          );
          layout.cameraY = Math.max(
            0,
            Math.min(100, ((cam.y + cam.height / 2 + dy) / previewHeight) * 100),
          );
        }
        return {
          ...old,
          cameraSize,
          displayLayouts: { ...old.displayLayouts, [layoutKey()]: layout },
        };
      });
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  }
  const portrait = settings.outputFormat === '9:16';
  const previewWidth = portrait ? 720 : 1280,
    previewHeight = portrait ? 1280 : 720;
  const {scale: mobileScale, x: mobileX, y: mobileY} = mobileMetrics();
  const outputFrame = useRef<HTMLCanvasElement | null>(null);
  function cameraFocusDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const box = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (event: { clientX: number; clientY: number }) =>
      setSettings((old) => ({
        ...old,
        cameraFocusX: Math.max(0, Math.min(100, ((event.clientX - box.left) / box.width) * 100)),
        cameraFocusY: Math.max(0, Math.min(100, ((event.clientY - box.top) / box.height) * 100)),
      }));
    move(e);
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  }
  function cameraEnd() {
    const length = settings.cameraDuration || camera.current?.duration || 0;
    return Number.isFinite(length) ? length : 0;
  }
  function cameraVisibility(sourceTime: number) {
    const take = activeCameraTake(sourceTime),
      start = take?.start || 0,
      end = take ? take.end : 0;
    return cameraFade(sourceTime, start, end, take?.hidden);
  }

  function animateCameraFrame(
    ctx: CanvasRenderingContext2D,
    t: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const visibility = cameraVisibility(t);
    ctx.globalAlpha *= visibility;
    const scale = 0.94 + 0.06 * visibility;
    ctx.translate(x + width / 2, y + height / 2 + (1 - visibility) * 22);
    ctx.scale(scale, scale);
    ctx.translate(-x - width / 2, -y - height / 2);
  }
  function frameShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    strong = false,
  ) {
    ctx.save();
    ctx.fillStyle = settings.background;
    for (const layer of [{ blur: strong ? 10 : 8, y: 3, alpha: 0.08 }]) {
      ctx.shadowColor = `rgba(20,30,35,${layer.alpha})`;
      ctx.shadowBlur = layer.blur;
      ctx.shadowOffsetY = layer.y;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();
    }
    ctx.restore();
  }
  const [cutoutStatus, setCutoutStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => {
    if (!settings.cameraCutout) { resetCameraCutoutFrames(); return; }
    let cancelled = false;
    setCutoutStatus('loading');
    prepareCameraCutout().then(() => { if (!cancelled) setCutoutStatus('ready'); })
      .catch(() => { if (!cancelled) { setCutoutStatus('error'); announce('Camera cutout could not start. Turn it off and try again.'); } });
    return () => { cancelled = true; };
  }, [settings.cameraCutout]);
  const mobileZoomView = useRef({zoom:1,x:50,y:50});
  function composeOutput(
    ctx: CanvasRenderingContext2D,
    render: (target: CanvasRenderingContext2D) => void,
  ) {
    if (!portrait) {
      render(ctx);
      return;
    }
    const canvas = outputFrame.current ?? (outputFrame.current = document.createElement('canvas'));
    canvas.width = 1280;
    canvas.height = 720;
    mobileZoomView.current = {zoom:1,x:50,y:50};
    render(canvas.getContext('2d')!);
    paintBackground(ctx, 720, 1280);
    const m = mobileZoomPlacement(mobileMetrics(),mobileZoomView.current.zoom,mobileZoomView.current);
    ctx.drawImage(canvas, m.x, m.y, 1280 * m.scale, 720 * m.scale);
  }
  function previewPoint(clientX: number, clientY: number, bounds: DOMRect) {
    const x = ((clientX - bounds.left) / bounds.width) * previewWidth,
      y = ((clientY - bounds.top) / bounds.height) * previewHeight;
    return portrait ? { x: (x - mobileX) / mobileScale, y: (y - mobileY) / mobileScale } : { x, y };
  }
  const demoRenderer = (output: CanvasRenderingContext2D, t: number, c: typeof demoCopy) =>
    composeOutput(output, (ctx) => {
      const mapped = mapSegments(websiteSegments, t);
      if (settings.websiteDemo?.motion)
        renderTemplate(
          ctx,
          mapped.time,
          c,
          settings.websiteDemo,
          settings.websiteDemo.motion.template || 'cinematic',
        );
      else if (settings.websiteDemo?.storyboard)
        renderStoryboard(ctx, mapped.time, c, settings.websiteDemo.storyboard);
      else if (settings.websiteDemo) renderWebsite(ctx, mapped.time, c, settings.websiteDemo);
      renderCaption(
        ctx,
        settings.captionsEnabled === false ? '' : settings.caption,
        settings.captionStyle,
        undefined, undefined, settings.captionAppearance,
      );
    });
  const featureDragClick = useRef(false);
  function splitMusicClip() {
    const list=musicClips();
    setSettings(old=>({...old,musicClips:list.flatMap(c=>{
      const range=featureRange('music:'+c.id,c.start,c.end);
      if((selectedMusicClip&&c.id!==selectedMusicClip)||time<=range.start+.1||time>=range.end-.1)return [c];
      return [{...c,id:crypto.randomUUID(),start:range.start,end:time},{...c,id:crypto.randomUUID(),start:time,end:range.end,offset:c.offset+time-c.start}];
    })}));
  }
  function splitCaptionAtPlayhead() {
    const at=mapSegments(activeSegments,time).time;
    setSettings(old=>({...old,captions:old.captions?.flatMap(c=>at>c.start+.1 && at<c.end-.1 ? [{...c,end:at},{...c,start:at}] : [c])}));
  }
  function featureRange(key: string, start: number, end: number) { return settings.featureRanges?.[key] || (key.startsWith('music:') ? musicClips().find(c=>c.id===key.slice(6)) : undefined) || {start,end}; }
  function featureTimingStyle(key: string, start: number, end: number) {
    const range=featureRange(key,start,end), length=end-start;
    return {position:'absolute' as const,left:`${(range.start-start)/length*100}%`,width:`${(range.end-range.start)/length*100}%`};
  }
  function dragFeatureTiming(event: React.PointerEvent<HTMLElement>, key:string, start:number, end:number, edge?:'start'|'end') {
    if(exporting||recording)return;
    event.preventDefault();event.stopPropagation();
    const track=event.currentTarget.closest('.editor-lane-slots');if(!track)return;
    const width=track.getBoundingClientRect().width, x=event.clientX, original=featureRange(key,start,end);
    const move=(e:PointerEvent)=>{if(Math.abs(e.clientX-x)<3)return;featureDragClick.current=true;
      const delta=(e.clientX-x)/width*timelineDuration;
      let a=original.start,b=original.end;
      if(edge==='start')a=Math.max(start,Math.min(b-.1,a+delta));
      else if(edge==='end')b=Math.min(end,Math.max(a+.1,b+delta));
      else {a=Math.max(start,Math.min(end-(b-a),a+delta));b=a+original.end-original.start;}
      setSettings(old=>({...old,featureRanges:{...old.featureRanges,[key]:{start:a,end:b}}}));
    };
    const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);setTimeout(()=>{featureDragClick.current=false;},0);};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
  }
  function featureEdges(key:string,start:number,end:number) {return <><span className="feature-trim-edge start" onPointerDown={e=>dragFeatureTiming(e,key,start,end,'start')}/><span className="feature-trim-edge end" onPointerDown={e=>dragFeatureTiming(e,key,start,end,'end')}/></>;}
  function dragCaptionTiming(event: React.PointerEvent<HTMLElement>, index: number, edge?: 'start'|'end') {
    if (exporting || recording) return;
    event.preventDefault(); event.stopPropagation();
    const caption = settings.captions?.[index];
    const track = event.currentTarget.closest('.editor-lane-slots');
    if (!caption || !track) return;
    const original = {...caption}, startX = event.clientX;
    const pixels = track.getBoundingClientRect().width;
    let moved = false;
    const move = (e: PointerEvent) => {
      const delta = (e.clientX - startX) / pixels * timelineDuration;
      if (Math.abs(e.clientX-startX)<3 && !moved) return;
      moved = true; featureDragClick.current = true;
      let start = original.start, end = original.end;
      if (edge === 'start') start = Math.max(0, Math.min(end-.1, start+delta));
      else if (edge === 'end') end = Math.min(duration, Math.max(start+.1,end+delta));
      else { start = Math.max(0, Math.min(duration-(end-start), start+delta)); end=start+original.end-original.start; }
      setSettings(old=>({...old,captions:old.captions?.map((c,i)=>i===index?{...c,start,end}:c)}));
    };
    const finish = () => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',finish); window.removeEventListener('pointercancel',finish); setTimeout(()=>{featureDragClick.current=false;},0); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',finish); window.addEventListener('pointercancel',finish);
  }
  function seekLane(e: React.MouseEvent<HTMLElement>, lane: string) {
    if (lane === 'zoom') setTimelineSelection('zoom');
    else if (lane === 'captions') setTimelineSelection('caption');
    else if (lane === 'music') setTimelineSelection('music');
    else if (lane === 'camera') setTimelineSelection('camera');
    else if (lane === 'video') setTimelineSelection('video');
    else if (lane === 'cursor') { setTimelineSelection('cursor'); setCursorExpanded(true); }
    if (exporting || recording || cameraTake || cameraMoveClick.current || featureDragClick.current) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        '.feature-trim-edge,.timeline-track-name,.clip-remove,.track-remove,.clip-edge,.camera-trim-edge,.lane-add-clip,.empty-track-actions button',
      )
    )
      return;
    const track =
      e.currentTarget.querySelector<HTMLElement>(
        '.editor-lane-slots,.segment-track,.camera-linked-track,.empty-track-actions',
      ) || e.currentTarget;
    const rect = track.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right) return;
    const value = Math.max(
      0,
      Math.min(timelineDuration, ((e.clientX - rect.left) / rect.width) * timelineDuration / (lane === 'timeline' ? (parseFloat(getComputedStyle(track.closest('.timeline-zoom-content') || track).getPropertyValue('--timeline-clip-scale')) || 1) : 1)),
    );
    if (lane !== 'video' && lane !== 'timeline' && !target.closest('button,.feature-trim-edge,.camera-linked-clip')) {
      setLaneAddMenu({lane,time:value,x:e.clientX,y:e.clientY});
    }
    setLaneTimes((old) => ({ ...old, [lane]: value }));
    setSelectedSegment(mapSegments(activeSegments, value).index);
    seek(value);
  }
  function laneMarkers(_lane: string) {
    return <span className="lane-shared-marker" aria-hidden="true" style={{left:`${(time / timelineDuration) * 100}%`}} />;
  }
  function seek(value: number) {
    const target = Math.max(0, Math.min(displayDuration, value));
    soundPlayer.current.stop();
    if (recreated) {
      demoTime.current = target;
      setTime(target);
    } else if (video.current) {
      const mapped = mapSegments(recordingSegments, target);
      recordSegment.current = mapped.index;
      seekMediaTime(video.current, mapped.time);
      if (camera.current) camera.current.currentTime = mapped.time;
      setTime(target);
    }
    if (playing && previewSound.current)
      void soundPlayer.current.play(previewSound.current, target).catch(() => {});
  }
  async function soundtrack() {
    const boundaries = activeSegments.map((_, i) => durationOf(activeSegments.slice(0, i)));
    const audio=settings.demoAudio||defaultAudio;
    const buffer = await makeSoundtrack(displayDuration,boundaries,undefined,{...audio,musicTrack:'none'});
    for(const clip of musicClips()) {
      const range=settings.featureRanges?.['music:'+clip.id]||clip;
      let uploaded:AudioBuffer|undefined;
      if(clip.asset) { const blob=await loadAsset(clip.asset);if(blob?.size){const context=new AudioContext();try{uploaded=await context.decodeAudioData(await blob.arrayBuffer());}finally{await context.close();}} }
      const piece=await makeSoundtrack(Math.max(.1,range.end-clip.start+clip.offset),[],uploaded,{...audio,musicTrack:clip.track,musicVolume:clip.volume,effects:false});
      for(let ch=0;ch<buffer.numberOfChannels;ch++) {
        const target=buffer.getChannelData(ch),source=piece.getChannelData(Math.min(ch,piece.numberOfChannels-1));
        const first=Math.floor(range.start*buffer.sampleRate),offset=Math.floor((clip.offset+Math.max(0,range.start-clip.start))*buffer.sampleRate);
        for(let i=0;i<Math.floor((range.end-range.start)*buffer.sampleRate)&&first+i<target.length;i++)target[first+i]+=source[offset+i]||0;
      }
    }
    previewSound.current = buffer;
    return buffer;
  }
  const [musicWaveform,setMusicWaveform]=useState<AudioBuffer>();
  const selectedBuiltInMusic=(settings.demoAudio||defaultAudio).musicTrack;
  useEffect(()=>{let active=true;if(musicReady){setMusicWaveform(musicBuffer.current);return;}setMusicWaveform(undefined);if(selectedBuiltInMusic&&selectedBuiltInMusic!=='none')void makeSoundtrack(12,[],undefined,{...defaultAudio,musicTrack:selectedBuiltInMusic,musicVolume:1,effects:false}).then(buffer=>{if(active)setMusicWaveform(buffer);});return()=>{active=false;};},[selectedBuiltInMusic,musicReady]);
  const currentMusicPlayback=useRef({playing,time});
  currentMusicPlayback.current={playing,time};
  useEffect(()=>{
    previewSound.current=undefined;
    if(!currentMusicPlayback.current.playing)return;
    let cancelled=false;
    const timer=setTimeout(()=>{void soundtrack().then(buffer=>{if(!cancelled&&currentMusicPlayback.current.playing)void soundPlayer.current.play(buffer,currentMusicPlayback.current.time).catch(error=>announce(error.message));}).catch(error=>{if(!cancelled)announce(error.message);});},180);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[settings.demoAudio,musicReady,settings.musicName,settings.featureRanges,settings.musicClips]);
  const playbackStarting = useRef(false);
  async function togglePlay() {
    if (playbackStarting.current) return;
    if (playing) {
      soundPlayer.current.stop();
      if (recreated) demoPlaying.current = false;
      else {
        video.current?.pause();
        camera.current?.pause();
      }
      setPlaying(false);
      return;
    }
    if (time >= displayDuration - 0.01) seek(0);
    playbackStarting.current = true;
    try {
      const buffer = await soundtrack();
      await soundPlayer.current.play(buffer, time >= displayDuration - 0.01 ? 0 : time);
      if (recreated) demoPlaying.current = true;
      else {
        const v = video.current;
        if (!v) return;
        const mapped = mapSegments(recordingSegments, time >= displayDuration - 0.01 ? 0 : time);
        recordSegment.current = mapped.index;
        if (Math.abs(mediaTime(v) - mapped.time) > 0.15) {
          seekMediaTime(v, mapped.time);
          if (camera.current) camera.current.currentTime = mapped.time;
        }
        await v.play();
        if (camera.current) void camera.current.play();
      }
      setPlaying(true);
    } catch (e) {
      soundPlayer.current.stop();
      announce((e as Error).message);
    } finally {
      playbackStarting.current = false;
    }
  }
  function captionBand() {
    if (settings.captionLayout) return 0;
    return settings.captionsEnabled !== false &&
      Boolean(settings.captions?.length || settings.caption)
      ? portrait
        ? 180
        : 150
      : 0;
  }
  function cameraComposition() {
    const l = displayLayout(),
      outside =
        !portrait &&
        settings.camera &&
        Boolean(camSource || settings.cameraTakes?.length) &&
        settings.mobileCameraLayout === 'outside';
    const cam = outside ? cameraDimensions() : null;
    const reserve = cam ? cam.width + 72 : 0;
    const scale = portrait
      ? 1
      : outside
        ? l.screenScale * (1280 - reserve - 48) / 1280
        : l.screenScale;
    const left = (settings.mobileCameraPosition || 'bottom-center').endsWith('left');
    const fittedScale = portrait ? 1 : scale;
    return {
      beside: Boolean(outside),
      width: (620 * 9) / 16,
      scale: fittedScale,
      tx: portrait
        ? 0
        : outside
          ? (left ? reserve : 0) + (1280 - reserve - 1280 * fittedScale) / 2 + (l.screenX - 50) * 12.8
          : (l.screenX / 100) * 1280 - 640 * fittedScale,
      ty: portrait
        ? 0
        : captionBand()
          ? (720 - captionBand()) / 2 - 360 * fittedScale
          : (l.screenY / 100) * 720 - 360 * fittedScale,
      cameraX: 0,
    };
  }
  function screenPoint(x: number, y: number) {
    const c = cameraComposition();
    return { x: (x - c.tx) / c.scale, y: (y - c.ty) / c.scale };
  }
  function dragManualPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (pointerMode === 'off' || pickingCursor || recreated) return;
    e.preventDefault();
    e.stopPropagation();
    const bounds = e.currentTarget.getBoundingClientRect(),
      segment = activeSegments[selectedSegment] || activeSegments[0];
    if (!segment) return;
    video.current?.pause();
    camera.current?.pause();
    soundPlayer.current.stop();
    setPlaying(false);
    const currentTime = mediaTime(video.current) ?? segment.start;
    const startTime =
      pointerMode === 'record' || pointerMode === 'live'
        ? segment.start
        : currentTime >= segment.start && currentTime < segment.end - 0.1
          ? currentTime
          : segment.start;
    const started = performance.now();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointerMode === 'record' || pointerMode === 'live')
      seek(durationOf(activeSegments.slice(0, selectedSegment)) + startTime - segment.start);
    const point = (event: { clientX: number; clientY: number }, time: number): PointerPoint => ({
      time,
      ...screenPoint(
        previewPoint(event.clientX, event.clientY, bounds).x,
        previewPoint(event.clientX, event.clientY, bounds).y,
      ),
    });
    let points = [point(e, pointerMode === 'place' ? segment.start : startTime)];
    const persist = () =>
      setClipSettings((old) => ({
        ...old,
        replaceCursor: false,
        zoomFollowsPath: true,
        zoom: old.zoom <= 1 ? 1.7 : old.zoom,
        cursorStyle: old.cursorStyle === 'none' || !old.cursorStyle ? 'arrow' : old.cursorStyle,
        manualPointer: { ...old.manualPointer, [segment.id]: [...points] },
      }));
    persist();
    const move = (event: PointerEvent) => {
      const timestamp = Math.min(
        segment.end,
        pointerMode === 'live'
          ? (mediaTime(video.current) ?? startTime)
          : startTime + (performance.now() - started) / 1000,
      );
      if (pointerMode === 'place') points = [point(event, segment.start)];
      else if (timestamp > points[points.length - 1].time) points.push(point(event, timestamp));
      persist();
      if (pointerMode === 'record') {
        const offset = durationOf(activeSegments.slice(0, selectedSegment));
        seek(offset + timestamp - segment.start);
      }
    };
    let liveFrame = 0,
      finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(liveFrame);
      if (pointerMode === 'live') {
        video.current?.pause();
        camera.current?.pause();
        setPlaying(false);
      }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (pointerMode === 'record' && points.length > 1) {
        const elapsed = points[points.length - 1].time - startTime;
        points = points.map((p) => ({
          ...p,
          time:
            segment.start +
            ((p.time - startTime) / Math.max(0.001, elapsed)) * (segment.end - segment.start),
        }));
      }
      persist();
      if (pointerMode === 'live') {
        setPointerMode('off');
        announce('Activity pointer saved. Press Play to preview automatic follow zoom.');
      }
      if (pointerMode === 'record') {
        setPointerMode('off');
        announce(
          points.length > 1
            ? 'Pointer path saved across this clip. Press Play to preview.'
            : 'Pointer placed. Drag the green handle to draw a path.',
        );
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
    if (pointerMode === 'live') {
      const v = video.current;
      if (v) {
        let last = { clientX: e.clientX, clientY: e.clientY };
        const remember = (event: PointerEvent) => {
          last = { clientX: event.clientX, clientY: event.clientY };
        };
        window.addEventListener('pointermove', remember);
        const cleanup = () => {
          window.removeEventListener('pointermove', remember);
          v.removeEventListener('seeked', begin);
        };
        const tick = () => {
          move(last as PointerEvent);
          if (mediaTime(v) >= segment.end - 0.04 || v.ended) {
            cleanup();
            finish();
            return;
          }
          liveFrame = requestAnimationFrame(tick);
        };
        const begin = () => {
          if (finished) return;
          v.removeEventListener('seeked', begin);
          void v
            .play()
            .then(() => {
              if (finished) {
                v.pause();
                return;
              }
              setPlaying(true);
              liveFrame = requestAnimationFrame(tick);
            })
            .catch(() => {
              cleanup();
              finish();
              announce('Playback could not start. Try again.');
            });
        };
        window.addEventListener('pointerup', cleanup, { once: true });
        window.addEventListener('pointercancel', cleanup, { once: true });
        if (v.seeking) v.addEventListener('seeked', begin, { once: true });
        else begin();
      }
    }
  }
  function dragPointerHandle(e: React.PointerEvent<SVGCircleElement>, endpoint: number) {
    e.preventDefault();
    e.stopPropagation();
    const bounds = previewCanvas.current?.getBoundingClientRect(),
      segment = activeSegments[selectedSegment];
    if (!bounds || !segment) return;
    video.current?.pause();
    setPlaying(false);
    const saved = settings.manualPointer?.[segment.id] || [];
    if (!saved.length) return;
    const original =
      saved.length === 1
        ? [
            { ...saved[0], time: segment.start },
            { ...saved[0], time: segment.end },
          ]
        : saved.map((p) => ({ ...p }));
    const index = endpoint ? original.length - 1 : 0;
    const move = (event: PointerEvent) => {
      const points = original.map((p) => ({ ...p }));
      points[index] = {
        ...points[index],
        ...screenPoint(
          previewPoint(event.clientX, event.clientY, bounds).x,
          previewPoint(event.clientX, event.clientY, bounds).y,
        ),
      };
      setSettings((old) => ({
        ...old,
        zoomFollowsPath: true,
        zoom: old.zoom <= 1 ? 1.7 : old.zoom,
        manualPointer: { ...old.manualPointer, [segment.id]: points },
      }));
    };
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  }
  function beginTrim(e: React.PointerEvent<HTMLSpanElement>, index: number, edge: 'start' | 'end') {
    if (exporting) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.closest('.segment-track')!.getBoundingClientRect();
    if (!recreated && settings.primaryMedia !== 'camera') {
      const original = activeSegments[index], range = screenRange(original), origin = e.clientX;
      const list = activeSegments.map((segment) => ({...segment}));
      const secondsPerPixel = timelineDuration / Math.max(1, rect.width);
      setSelectedSegment(index);
      video.current?.pause(); camera.current?.pause(); soundPlayer.current.stop(); setPlaying(false);
      const move = (event: PointerEvent) => {
        event.preventDefault();
        const value = range[edge] + (event.clientX - origin) * secondsPerPixel;
        const trimmed = trimScreenEdge(original, edge, value);
        update('recordingSegments', list.map((segment, i) => i === index ? trimmed : segment));
        setCompletedExport(null);
      };
      const finish = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      window.addEventListener('pointermove', move, {passive: false});
      window.addEventListener('pointerup', finish, {once: true});
      window.addEventListener('pointercancel', finish, {once: true});
      return;
    }
    const list = activeSegments.map((segment) => ({ ...segment }));
    const original = list[index][edge],
      scale = timelineDuration / Math.max(1, rect.width),
      origin = e.clientX;
    let latest = list;
    setSelectedSegment(index);
    soundPlayer.current.stop();
    demoPlaying.current = false;
    video.current?.pause();
    camera.current?.pause();
    setPlaying(false);
    const persist = (segments: DemoSegment[]) => {
      if (recreated && settings.websiteDemo?.motion)
        update('websiteDemo', {
          ...settings.websiteDemo,
          motion: { ...settings.websiteDemo.motion, segments },
        });
      else update(recreated ? 'websiteSegments' : 'recordingSegments', segments);
      setCompletedExport(null);
    };
    const move = (event: PointerEvent) => {
      event.preventDefault();
      latest = list.map((segment) => ({ ...segment }));
      const segment = latest[index],
        value = original + (event.clientX - origin) * scale;
      segment[edge] =
        edge === 'start'
          ? Math.max(0, Math.min(segment.end - 0.25, value))
          : Math.max(
              segment.start + 0.25,
              Math.min(recreated ? websiteRawDuration : duration, value),
            );
      persist(latest);
    };
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      persist(latest);
      demoTime.current = 0;
      recordSegment.current = 0;
      setTime(0);
      if (!recreated) {
        if (video.current) seekMediaTime(video.current, latest[0].start);
        if (camera.current) camera.current.currentTime = latest[0].start;
      }
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  }
  function saveSegments(list: DemoSegment[]) {
    if (!recreated) setSettings(old => {
      const next = {...old};
      for (const key of ['clipEffects','clipZooms','manualPointer','clipVolumes','displayLayouts','mobileClipFraming'] as const) {
        const values = {...(old[key] || {})} as Record<string, unknown>;
        for (const clip of list) {
          if (clip.id in values) continue;
          const parent = activeSegments.find(original => (clip.id === original.id + 'a' || clip.id === original.id + 'b') && clip.start >= original.start && clip.end <= original.end);
          if (parent && parent.id in values) values[clip.id] = structuredClone(values[parent.id]);
        }
        Object.assign(next, {[key]: values});
      }
      return next;
    });
    soundPlayer.current.stop();
    demoPlaying.current = false;
    video.current?.pause();
    camera.current?.pause();
    setPlaying(false);
    setTime(0);
    demoTime.current = 0;
    recordSegment.current = 0;
    if (!recreated) {
      if (video.current) seekMediaTime(video.current, list[0].start);
      if (camera.current) camera.current.currentTime = list[0].start;
    }
    setCompletedExport(null);
    if (recreated && settings.websiteDemo?.motion)
      update('websiteDemo', {
        ...settings.websiteDemo,
        motion: { ...settings.websiteDemo.motion, segments: list },
      });
    else update(recreated ? 'websiteSegments' : 'recordingSegments', list);
  }
  function onRecordingTime(v: HTMLVideoElement) {
    syncClipAudio();
    if (cameraTakeRecorder.current?.state === 'recording') {
      setTime(
        durationOf(recordingSegments.slice(0, recordSegment.current)) +
          Math.max(0, mediaTime(v) - recordingSegments[recordSegment.current].start),
      );
      if (v.ended || mediaTime(v) >= takeRange.current.end - 0.05) stopCameraTake();
      return;
    }
    if (exporting || recreated) return;
    if (pointerMode === 'live') {
      const segment = recordingSegments[selectedSegment];
      if (segment) {
        setTime(
          durationOf(recordingSegments.slice(0, selectedSegment)) +
            Math.max(0, mediaTime(v) - segment.start),
        );
        if (mediaTime(v) >= segment.end - 0.02) v.pause();
      }
      return;
    }
    const i = recordSegment.current,
      s = recordingSegments[i];
    if (!s) return;
    setTime(durationOf(recordingSegments.slice(0, i)) + Math.max(0, mediaTime(v) - s.start));
    if (mediaTime(v) >= s.end - 0.02) {
      if (i < recordingSegments.length - 1) {
        recordSegment.current = i + 1;
        seekMediaTime(v, recordingSegments[i + 1].start);
        if (camera.current) camera.current.currentTime = mediaTime(v);
        if (playing) void v.play();
      } else {
        v.pause();
        camera.current?.pause();
        soundPlayer.current.stop();
        setPlaying(false);
      }
    }
  }
  const demoCopy = {
    brand: settings.demoBrand ?? settings.websiteDemo?.brand ?? '',
    query: settings.demoQuery ?? settings.websiteDemo?.title ?? '',
    filename: settings.demoFilename ?? settings.websiteDemo?.description ?? '',
    headline: settings.demoHeadline ?? settings.websiteDemo?.cta ?? '',
    pointer: settings.cursorStyle || ('circle' as const),
    size: settings.cursorSize || 28,
  };
  async function fetchCreative(data: WebsiteDemo) {
    const response = await fetch('/api/creative-animation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...groqHeaders() },
      body: JSON.stringify({
        brand: data.brand,
        title: data.title,
        description: data.description,
        sections: data.sections,
        design: data.design,
        observations: data.analysis?.groups,
        assetCount: data.motion?.assets?.length || 0,
        brief: creativeBrief,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Custom generation failed.');
    return { ...validateCreative(result), model: result.model };
  }
  async function createTemplate() {
    if (!creativeBrief.trim() || generating) return;
    setGenerating(true);
    try {
      const data: WebsiteDemo = {
        url: '',
        brand: 'Your brand',
        title: 'Your headline',
        description: creativeBrief,
        cta: 'Discover more',
        accent: '#657e40',
        sections: [
          { title: 'Your first feature', body: 'Add your message here.' },
          { title: 'Your next feature', body: 'Make this template your own.' },
        ],
        capturedAt: new Date().toISOString(),
      };
      const creative = await fetchCreative(data);
      const template = {
        ...data,
        creative,
        motion: { assets: [], catalog: [], template: 'ai' as const },
      };
      setSettings((old) => ({
        ...old,
        customTemplates: [...(old.customTemplates || []), template],
      }));
      announce('New template created and saved. Select it to preview and edit.');
    } catch (e) {
      announce((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  async function regenerateCreative() {
    const data = settings.websiteDemo;
    if (!data || generating) return;
    setGenerating(true);
    demoPlaying.current = false;
    setPlaying(false);
    try {
      const creative = await fetchCreative(data);
      setSettings((old) => ({
        ...old,
        websiteDemo: {
          ...data,
          creative,
          motion: {
            ...data.motion,
            assets: data.motion?.assets || data.storyboard?.assets || [],
            catalog: data.motion?.catalog || [],
            template: 'ai',
            segments: undefined,
          },
        },
        websiteSegments: undefined,
      }));
      demoTime.current = 0;
      setTime(0);
      announce('New vector components generated. Play to preview; expand scenes to edit text.');
    } catch (error) {
      announce((error as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  async function generateUploadDemo() {
    if (!source || !duration || generating) return;
    setGenerating(true);
    soundPlayer.current.stop();
    video.current?.pause();
    camera.current?.pause();
    demoPlaying.current = false;
    setPlaying(false);
    try {
      const data = await storyboardFromUpload(
        source,
        recordingSegments,
        settings.uploadName || 'Your video',
        settings.uploadKind || 'video',
        setAnalysisProgress,
      );
      data.motion!.template = chosenTemplate;
      if (chosenTemplate === 'ai') {
        data.creative = await fetchCreative(data);
        data.motion!.template = 'ai';
      } else if (useAI && data.analysis) {
        const response = await fetch('/api/storyboard-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...groqHeaders() },
          body: JSON.stringify({
            duration: data.analysis.duration,
            groups: data.analysis.groups,
            samples: data.analysis.samples,
          }),
        });
        const plan = await response.json();
        if (!response.ok) throw Error(plan.error || 'Groq storyboard planning failed.');
        (data as WebsiteDemo & { aiPlan?: UploadStoryboardPlan[] }).aiPlan = plan.scenes;
        data.sections = data.sections.map((section, index) => ({
          ...section,
          title: plan.scenes[index]?.title || section.title,
          body: plan.scenes[index]?.caption || section.body,
        }));
      }
      await prepareMotion(data);
      setSettings((s) => ({
        ...s,
        ...(s.titleAuto ? { title: data.brand || data.title } : {}),
        ...(data.sourceType
          ? {
              websiteProject:
                s.websiteDemo && !s.websiteDemo.sourceType ? s.websiteDemo : s.websiteProject,
            }
          : { mediaProject: s.websiteDemo?.sourceType ? s.websiteDemo : s.mediaProject }),
        websiteDemo: data,
        websiteSegments: undefined,
        demoBrand: data.brand,
        demoQuery: data.title,
        demoFilename: data.description,
        demoHeadline: data.cta,
      }));
      setRecreated(true);
      setPanel('animate');
      demoTime.current = 1;
      setTime(1);
      announce(
        useAI
          ? 'Groq created an AI-directed component animation. Choose a design, edit the timeline, and export.'
          : 'Uploaded media storyboard ready. Choose a design, edit the timeline, add music, and export.',
      );
    } catch (err) {
      announce((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  async function generateWebsiteDemo(useAIOverride = false) {
    const aiMode = useAIOverride || chosenTemplate === 'ai';
    if (importingWebsite || exporting) return;
    setImportingWebsite(true);
    try {
      const url = new URL(websiteURL);
      if (!['http:', 'https:'].includes(url.protocol))
        throw new Error('Enter a full public website URL.');
      const response = await fetch(
        import.meta.env.VITE_WEBSITE_DEMO_ENDPOINT || '/api/website-demo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...groqHeaders() },
          body: JSON.stringify({ url: url.href, ai: aiMode, creative: chosenTemplate === 'ai' }),
        },
      );
      if (!response.headers.get('content-type')?.includes('application/json'))
        throw new Error(
          'Website import endpoint is unavailable. Configure it for this deployment.',
        );
      const data: WebsiteDemo & { error?: string } = await response.json();
      if (!response.ok || data.error)
        throw new Error(data.error || 'The website could not be read.');
      if (data.motion) {
        data.motion.template = chosenTemplate;
        await prepareMotion(data);
      }
      if (data.storyboard) await prepareStoryImages(data.storyboard);
      if (aiMode && !data.storyboard && !data.creative)
        throw new Error('AI generation did not return a storyboard.');
      if (!data.url || !data.title || !Array.isArray(data.sections))
        throw new Error('Website returned an invalid scene description.');
      video.current?.pause();
      camera.current?.pause();
      setCompletedExport(null);
      setSettings((s) => ({
        ...s,
        ...(data.sourceType
          ? {
              websiteProject:
                s.websiteDemo && !s.websiteDemo.sourceType ? s.websiteDemo : s.websiteProject,
            }
          : { mediaProject: s.websiteDemo?.sourceType ? s.websiteDemo : s.mediaProject }),
        websiteDemo: data,
        websiteSegments: undefined,
        demoBrand: data.brand,
        demoQuery: data.title,
        demoFilename: data.description,
        demoHeadline: data.cta,
      }));
      setRecreated(true);
      setPanel('website');
      demoTime.current = 0;
      demoPlaying.current = false;
      setTime(0);
      setPlaying(false);
      announce(
        `Created ${data.motion ? 'cinematic' : data.storyboard ? 'AI' : 'basic'} scenes from ${new URL(data.url).hostname}. Review extracted copy and export.`,
      );
    } catch (e) {
      announce((e as Error).message);
    } finally {
      setImportingWebsite(false);
    }
  }
  async function startRecreated() {
    if (exporting || !settings.websiteDemo) return;
    setCompletedExport(null);
    video.current?.pause();
    camera.current?.pause();
    setPickingCursor(false);
    setRecreated(true);
    setPanel(settings.websiteDemo.sourceType ? 'animate' : 'website');
    demoTime.current = 0;
    await soundPlayer.current.play(await soundtrack(), 0);
    demoPlaying.current = true;
    setTime(0);
    setPlaying(true);
    announce('Website demo playing. Review your scenes and export.');
  }
  useEffect(() => {
    if (home || !recreated) return;
    let raf = 0,
      last = performance.now();
    const tick = (now: number) => {
      if (demoPlaying.current && !exporting) {
        demoTime.current = Math.min(websiteDuration, demoTime.current + (now - last) / 1000);
        setTime(demoTime.current);
        if (demoTime.current >= websiteDuration) {
          demoPlaying.current = false;
          soundPlayer.current.stop();
          setPlaying(false);
        }
      }
      last = now;
      const ctx = previewCanvas.current?.getContext('2d');
      if (ctx) demoRenderer(ctx, demoTime.current, demoCopy);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [home, recreated, settings, exporting]);
  async function exportRecreated() {
    soundPlayer.current.stop();
    setCompletedExport(null);
    setTime(0);
    setExporting(true);
    demoPlaying.current = false;
    setPlaying(false);
    exportAbort.current = false;
    let stream: MediaStream | undefined;
    let rec: MediaRecorder | undefined;
    const previous = demoTime.current;
    let soundNode: AudioBufferSourceNode | undefined;
    try {
      if (settings.websiteDemo?.motion) await prepareMotion(settings.websiteDemo);
      if (settings.websiteDemo?.storyboard)
        await prepareStoryImages(settings.websiteDemo.storyboard);
      const canvas = document.createElement('canvas');
      canvas.width = portrait ? 1080 : 1920;
      canvas.height = portrait ? 1920 : 1080;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(1.5, 1.5);
      demoRenderer(ctx, 0, demoCopy);
      stream = canvas.captureStream(30);
      const buffer = await soundtrack();
      soundPlayer.current.context ??= new AudioContext();
      const audioContext = soundPlayer.current.context;
      await audioContext.resume();
      const audioDestination = audioContext.createMediaStreamDestination();
      soundNode = audioContext.createBufferSource();
      soundNode.buffer = buffer;
      soundNode.connect(audioDestination);
      audioDestination.stream.getAudioTracks().forEach((track) => stream!.addTrack(track));
      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      if (!mime) throw new Error('Video export is unavailable in this browser.');
      const chunks: BlobPart[] = [];
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 18000000 });
      const result = new Promise<Blob>((resolve) => {
        rec!.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        rec!.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });
      rec.start();
      soundNode?.start();
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const elapsed = Math.min(websiteDuration, (now - start) / 1000);
          demoRenderer(ctx, elapsed, demoCopy);
          demoTime.current = elapsed;
          setTime(elapsed);
          if (elapsed >= websiteDuration || exportAbort.current) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      rec.stop();
      const blob = await result;
      if (!exportAbort.current) {
        download(
          blob,
          `${settings.websiteDemo?.sourceType ? 'animation-demo' : 'website-demo'}.${mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`,
        );
        announce('Recreated demo rendered at 1080p. Use Download finished video to save it.');
      }
    } catch (e) {
      announce((e as Error).message);
    } finally {
      try {
        soundNode?.stop();
      } catch {}
      if (rec && rec.state !== 'inactive') rec.stop();
      stream?.getTracks().forEach((t) => t.stop());
      demoTime.current = previous;
      setTime(previous);
      setExporting(false);
    }
  }
  function drawCameraContent(ctx: CanvasRenderingContext2D, c: HTMLVideoElement, cropWidth: number, cropHeight: number, x: number, y: number, width: number, height: number) {
    if (settings.cameraCutout) {
      const fit = Math.min(width / c.videoWidth, height / c.videoHeight);
      const w = c.videoWidth * fit, h = c.videoHeight * fit;
      ctx.drawImage(cameraCutoutFrame(c, () => { setCutoutStatus('error'); announce('Camera cutout stopped. Turn it off and on to retry.'); }), x + (width - w) / 2, y + height - h, w, h);
    } else {
      ctx.drawImage(c, ((c.videoWidth - cropWidth) * (settings.cameraFocusX ?? 50)) / 100,
        ((c.videoHeight - cropHeight) * (settings.cameraFocusY ?? 50)) / 100,
        cropWidth, cropHeight, x, y, width, height);
    }
  }
  function drawFrame(
    output: CanvasRenderingContext2D,
    v: HTMLVideoElement,
    elapsed: number,
    animated: boolean,
    rendering = false,
  ) {
    const activeCamera = cameraForTime(v);
    composeOutput(output, (ctx) => renderLandscape(ctx, v, elapsed, animated, rendering));
    if (
      portrait &&
      settings.camera &&
      activeCamera &&
      activeCamera.readyState >= 2 &&
      cameraVisibility(mediaTime(v)) > 0
    ) {
      const c = activeCamera,
        shape = settings.cameraShape || 'circle',
        ratios = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16 };
      const ratio = shape === 'circle' ? 1 : ratios[settings.cameraRatio || '1:1'];
      const outside = settings.mobileCameraLayout !== 'overlay';
      const { x, y, width, height } = cameraDisplayRect();
      const cropW = Math.min(c.videoWidth, c.videoHeight * ratio) / 1.15,
        cropH = cropW / ratio;
      output.save();
      animateCameraFrame(output, mediaTime(v), x, y, width, height);
      if (!settings.cameraCutout) frameShadow(
        output,
        x,
        y,
        width,
        height,
        shape === 'circle' ? width / 2 : shape === 'rounded' ? Math.min(width, height) * 0.18 : 4,
      );
      output.save();
      output.beginPath();
      output.roundRect(
        x,
        y,
        width,
        height,
        settings.cameraCutout ? 0 : shape === 'circle' ? width / 2 : shape === 'rounded' ? Math.min(width, height) * 0.18 : 4,
      );
      output.clip();
      drawCameraContent(output, c, cropW, cropH, x, y, width, height);
      output.restore();
      output.restore();
    }
    const band = captionBand();
    if (settings.captionsEnabled !== false)
      renderCaption(
        output,
        captionAt(settings.captions || [], mediaTime(v)) || settings.caption,
        settings.captionStyle,
        { width: previewWidth, height: previewHeight, top: previewHeight - band },
        settings.captionLayout,
        settings.captionAppearance,
      );
  }
  function projectEffectSettings() { return settings; }
  function renderLandscape(
    ctx: CanvasRenderingContext2D,
    v: HTMLVideoElement,
    elapsed: number,
    animated: boolean,
    rendering = false,
  ) {
    if (v.seeking || v.readyState < 2) return;
    const effectSegment = recordingSegments.find(segment => mediaTime(v) >= segment.start && mediaTime(v) < segment.end);
    const settings = clipEffectSettings(projectEffectSettings(), effectSegment?.id);
    const w = 1280,
      h = 720;
    ctx.clearRect(0, 0, w, h);
    paintBackground(ctx, w, h);
    const total = Math.max(0.1, displayDuration);
    const progress = Math.max(0, Math.min(1, elapsed / total));
    const pathSegment =
      recordingSegments.find(
        (segment) => mediaTime(v) >= segment.start && mediaTime(v) < segment.end,
      ) || recordingSegments[recordingSegments.length - 1];
    const clipZoom = timelineZoom(pathSegment?.id, settings.clipZooms, settings.zoom);
    const zoomRange=settings.featureRanges?.['zoom:'+pathSegment?.id];
    const zoom = zoomRange && (mediaTime(v)<zoomRange.start || mediaTime(v)>=zoomRange.end) ? 1 : clipZoom.amount;
    const cursorRange=settings.featureRanges?.['cursor:'+pathSegment?.id];
    if(cursorRange && (mediaTime(v)<cursorRange.start || mediaTime(v)>=cursorRange.end)) {settings.showCursor=false;settings.cursorStyle='none';}
    const pathPosition = pathSegment
      ? pointerAt(settings.manualPointer?.[pathSegment.id] || [], mediaTime(v))
      : null;
    const mobileFraming = settings.mobileClipFraming?.[pathSegment?.id] || 'fit';
    const followsDrawnPath = Boolean(
      (!portrait || mobileFraming === 'follow') &&
      pointerMode !== 'live' &&
      !animated &&
      settings.zoomFollowsPath &&
      (!settings.pointerMotion || settings.pointerMotion === 'manual') &&
      pathPosition,
    );
    const follow =
      zoom > 1 && (followsDrawnPath || Boolean(settings.autoZoom && settings.zoomSource === 'cursor'));
    const focus = viewAt(
      settings.focusPoints || [],
      mediaTime(v),
      follow && !followsDrawnPath,
      zoom,
      settings.focusX,
      settings.focusY,
    );
    const baseScale = screenMediaScale({width: v.videoWidth, height: v.videoHeight}, {width:1150, height:620}, portrait || displayLayout().screenFit === 'contain');
    const baseWidth = v.videoWidth * baseScale,
      baseHeight = v.videoHeight * baseScale;
    if (followsDrawnPath && pathPosition) {
      const ease = (n: number) => {
        const t = Math.max(0, Math.min(1, n));
        return t * t * (3 - 2 * t);
      };
      const ramp = Math.min(0.7, (pathSegment.end - pathSegment.start) / 3);
      const strength =
        ease((mediaTime(v) - pathSegment.start) / ramp) *
        ease((pathSegment.end - mediaTime(v)) / ramp);
      focus.x = ((pathPosition.x - 65 - (1150 - baseWidth) / 2) / baseWidth) * 100;
      focus.y = ((pathPosition.y - 50 - (620 - baseHeight) / 2) / baseHeight) * 100;
      focus.zoom = 1 + (zoom - 1) * strength;
    }

    if (pointerMode === 'live') {
      focus.zoom = 1;
      focus.x = 50;
      focus.y = 50;
      cameraView.current = null;
    }
    const replacer = cursorReplacer.current;
    const replace = Boolean(
      settings.pointerMotion !== 'recorded' &&
      settings.pointerMotion !== 'focus' &&
      settings.replaceCursor &&
      replacer?.initialized &&
      !settings.capturedCursorHidden,
    );
    const screenImage = replace
      ? replacer!.render(v, settings.cursorStyle || 'arrow', settings.cursorSize || 28)
      : v;
    if (
      !followsDrawnPath &&
      (settings.autoZoom || Math.abs(zoom - 1) > 0.001) &&
      replace &&
      replacer!.confidence >= 0.94
    ) {
      focus.x = (replacer!.x / replacer!.canvas.width) * 100;
      focus.y = (replacer!.y / replacer!.canvas.height) * 100;
    }
    const clockNow = rendering ? mediaTime(v) : performance.now() / 1000;
    const previousView = cameraView.current;
    const delta = previousView ? clockNow - previousView.clock : 0;
    if (
      previousView &&
      previousView.rendering === rendering &&
      delta >= 0 &&
      delta < 0.5 &&
      Math.abs(mediaTime(v) - previousView.media) < 0.5
    ) {
      const z = 1 - Math.exp(-delta / 0.28),
        pan = 1 - Math.exp(-delta / 0.18);
      focus.zoom = previousView.zoom + (focus.zoom - previousView.zoom) * z;
      focus.x = previousView.x + (focus.x - previousView.x) * pan;
      focus.y = previousView.y + (focus.y - previousView.y) * pan;
    }
    cameraView.current = { ...focus, clock: clockNow, media: mediaTime(v), rendering };
    if (portrait && !animated && settings.primaryMedia !== 'camera') {
      mobileZoomView.current = {...focus};
      focus.zoom = 1;
    }
    function footage(x: number, y: number, width: number, height: number) {
      if (
        !source ||
        v.readyState < 2 ||
        !v.videoWidth ||
        (!animated && settings.screenVisible === false)
      )
        return;
      const contain = portrait || displayLayout().screenFit === 'contain';
      const fit = screenMediaScale({width:v.videoWidth, height:v.videoHeight}, {width,height}, contain);
      ctx.save();
      ctx.beginPath();
      const bounds = !animated && settings.primaryMedia !== 'camera'
        ? zoomedScreenBounds({x,y,width,height},{width:1280,height:720},focus.zoom)
        : {x,y,width,height};
      const padding = Math.max(bounds.x, bounds.y, 1280-bounds.x-bounds.width, 720-bounds.y-bounds.height);
      const radius = Math.min(settings.screenRadius ?? 18, Math.max(0,padding), bounds.width/2, bounds.height/2);
      if ((settings.screenShadow ?? 0) > 0) {
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${(settings.screenShadow ?? 0)/100*.55})`;
        ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
        ctx.fillStyle = settings.background;
        ctx.beginPath(); ctx.roundRect(bounds.x,bounds.y,bounds.width,bounds.height,radius); ctx.fill();
        ctx.restore(); ctx.beginPath();
      }
      ctx.roundRect(bounds.x,bounds.y,bounds.width,bounds.height,radius);
      ctx.clip();
      const scale = fit * focus.zoom;
      const sw = v.videoWidth * scale,
        sh = v.videoHeight * scale;
      ctx.drawImage(
        screenImage,
        expandedMediaOffset(bounds.x,bounds.width,sw,x+frameOffset(width,sw,focus.x,follow)),
        expandedMediaOffset(bounds.y,bounds.height,sh,y+frameOffset(height,sh,focus.y,follow)),
        sw,
        sh,
      );
      ctx.restore();
    }
    const composition = cameraComposition();
    ctx.save();
    if (!animated && settings.primaryMedia !== 'camera') {
      const visibility = screenOpacity(pathSegment, mediaTime(v));
      ctx.globalAlpha *= visibility;
      syncClipAudio();
    }
    if (!animated) {
      ctx.translate(composition.tx, composition.ty);
      ctx.scale(composition.scale, composition.scale);
    }
    if (animated && settings.scenes?.length) {
      const index = Math.max(
          0,
          settings.scenes.reduce((last, s, i) => (s.time <= mediaTime(v) ? i : last), 0),
        ),
        scene = settings.scenes[index],
        next = settings.scenes[index + 1]?.time || duration,
        phase = Math.max(
          0,
          Math.min(1, (mediaTime(v) - scene.time) / Math.max(0.1, next - scene.time)),
        );
      ctx.fillStyle = '#6b7f58';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${scene.label} · ${scene.components.length} components`, 75, 65);
      scene.components.forEach((crop, n) => {
        if (v.readyState < 2) return;
        const cols = scene.components.length === 1 ? 1 : 2;
        const rows = Math.ceil(scene.components.length / cols);
        const cellW = 1100 / cols,
          cellH = 550 / rows;
        const ease =
          !playing && !rendering
            ? 1
            : 1 - Math.pow(1 - Math.max(0, Math.min(1, (phase - n * 0.05) * 5)), 3);
        const width = v.videoWidth * crop.width,
          height = v.videoHeight * crop.height;
        const scale = Math.min((cellW - 40) / width, (cellH - 35) / height);
        const dw = width * scale,
          dh = height * scale;
        const x = 90 + (n % cols) * cellW + (cellW - dw) / 2,
          y = 100 + Math.floor(n / cols) * cellH + (cellH - dh) / 2 + (1 - ease) * 55;
        ctx.save();
        ctx.globalAlpha = ease;
        ctx.shadowColor = '#0003';
        ctx.shadowBlur = 22;
        if (crop.text) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.roundRect(
            90 + (n % cols) * cellW + 15,
            100 + Math.floor(n / cols) * cellH + 15 + (1 - ease) * 55,
            cellW - 30,
            cellH - 30,
            16,
          );
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#263b22';
          ctx.font = `bold ${Math.min(36, cellH / 5)}px sans-serif`;
          wrap(
            ctx,
            crop.text,
            90 + (n % cols) * cellW + 35,
            100 + Math.floor(n / cols) * cellH + cellH / 2 + (1 - ease) * 55,
            cellW - 70,
            40,
          );
        } else
          ctx.drawImage(
            screenImage,
            crop.x * (replace ? replacer!.output.width : v.videoWidth),
            crop.y * (replace ? replacer!.output.height : v.videoHeight),
            crop.width * (replace ? replacer!.output.width : v.videoWidth),
            crop.height * (replace ? replacer!.output.height : v.videoHeight),
            x,
            y,
            dw,
            dh,
          );
        ctx.restore();
      });
    } else if (animated) {
      const intro = progress < 0.28;
      const outro = progress > 0.78;
      const phase = intro
        ? progress / 0.28
        : outro
          ? (progress - 0.78) / 0.22
          : (progress - 0.28) / 0.5;
      const entrance = Math.min(1, phase * 5);
      const ease = !playing && !rendering ? 1 : 1 - Math.pow(1 - entrance, 3);
      ctx.save();
      ctx.globalAlpha = ease;
      ctx.translate(0, (1 - ease) * 65);
      ctx.shadowColor = '#00000020';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.roundRect(90, 65, 1100, 590, 30);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#71815e';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(
        intro
          ? 'MEET YOUR NEXT GREAT IDEA'
          : outro
            ? 'READY FOR THE NEXT STEP?'
            : 'SEE IT IN ACTION',
        145,
        125,
      );
      if (intro || outro) {
        ctx.fillStyle = '#263b22';
        ctx.font = 'bold 48px sans-serif';
        wrap(ctx, settings.sceneTitle, 145, 205, 960, 58);
        ctx.fillStyle = '#78866c';
        ctx.font = '25px sans-serif';
        wrap(ctx, settings.sceneBody, 145, 345, 920, 34);
        if (intro) {
          footage(145, 430, 380, 185);
          ctx.fillStyle = '#e9f1df';
          ctx.beginPath();
          ctx.roundRect(650, 440, 450, 140, 20);
          ctx.fill();
          ctx.fillStyle = '#557242';
          ctx.font = 'bold 28px sans-serif';
          ctx.fillText('From idea to action.', 690, 495);
          ctx.font = '20px sans-serif';
          ctx.fillText('One clear step at a time.', 690, 535);
        } else {
          ctx.fillStyle = '#2b4024';
          ctx.beginPath();
          ctx.roundRect(145, 470, 330 * ease, 85, 42);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 27px sans-serif';
          ctx.fillText('See it in action →', 185, 523);
        }
      } else {
        footage(145, 155, 990, 435);
        ctx.fillStyle = '#dce8cb';
        ctx.fillRect(145, 614, 990 * phase, 5);
      }
      ctx.restore();
    } else if (settings.primaryMedia !== 'camera') footage(65, 50, 1150, 620);
    function paintStyledCursor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, style: import('./cursor').CursorAppearance) {
      if (settings.showCursor === false) return;
      // Keep pointer size independent of the screen layout and portrait zoom.
      // The base portrait fit remains, so the size slider retains its existing meaning.
      const outerZoom = portrait && !animated ? mobileZoomView.current.zoom : 1;
      size /= Math.max(0.001, (animated ? 1 : composition.scale) * outerZoom);
      const paint = (alpha: number, px: number, py: number) => {
        ctx.save(); ctx.globalAlpha *= alpha;
        if (style !== 'auto') paintCursor(ctx,px,py,size,style);
        else paintAutomaticCursor(ctx,px,py,size,pointerLayers(settings.cursorTelemetry || [],mediaTime(v)));
        ctx.restore();
      };
      if (settings.pointerMotion === 'recorded' && settings.cursorTelemetry?.length) {
        const p = recordedPointerAt(settings.cursorTelemetry, mediaTime(v));
        const before = recordedPointerAt(settings.cursorTelemetry, mediaTime(v) - .008);
        if (p && before) {
          let dx = (p.x - before.x) * v.videoWidth * baseScale * focus.zoom;
          let dy = (p.y - before.y) * v.videoHeight * baseScale * focus.zoom;
          const distance = Math.hypot(dx, dy), limit = size * .18;
          if (distance > .8) {
            const clamp = Math.min(1, limit / distance); dx *= clamp; dy *= clamp;
            paint(.045, x - dx, y - dy); paint(.09, x - dx * .5, y - dy * .5);
          }
        }
      }
      paint(1,x,y);
    }
    const manualSegment = recordingSegments.find(
      (segment) => mediaTime(v) >= segment.start && mediaTime(v) <= segment.end,
    );
    const manual =
      settings.pointerMotion !== 'recorded' && settings.pointerMotion !== 'focus' && manualSegment
        ? pointerAt(settings.manualPointer?.[manualSegment.id] || [], mediaTime(v))
        : null;
    if (!pathSegment?.hidden && settings.screenVisible !== false && manual && settings.cursorStyle !== 'none') {
      const x = followsDrawnPath
        ? 65 +
          frameOffset(1150, baseWidth * focus.zoom, focus.x, true) +
          (manual.x - 65 - (1150 - baseWidth) / 2) * focus.zoom
        : manual.x;
      const y = followsDrawnPath
        ? 50 +
          frameOffset(620, baseHeight * focus.zoom, focus.y, true) +
          (manual.y - 50 - (620 - baseHeight) / 2) * focus.zoom
        : manual.y;
      paintStyledCursor(
        ctx,
        x,
        y,
        settings.cursorSize || 28,
        settings.cursorStyle || 'arrow',
      );
    }
    if (
      !pathSegment?.hidden && settings.screenVisible !== false &&
      settings.cursorStyle !== 'none' &&
      !animated &&
      settings.pointerMotion === 'recorded' &&
      settings.cursorTelemetry?.length
    ) {
      const p = recordedPointerAt(settings.cursorTelemetry,mediaTime(v));
      if (p) {
        const scale = baseScale * focus.zoom;
        const pointerBounds = zoomedScreenBounds({x:65,y:50,width:1150,height:620},{width:1280,height:720},focus.zoom);
        const x = expandedMediaOffset(pointerBounds.x,pointerBounds.width,v.videoWidth*scale,65+frameOffset(1150,v.videoWidth*scale,focus.x,follow)) + p.x*v.videoWidth*scale;
        const y = expandedMediaOffset(pointerBounds.y,pointerBounds.height,v.videoHeight*scale,50+frameOffset(620,v.videoHeight*scale,focus.y,follow)) + p.y*v.videoHeight*scale;
        ctx.save();
        ctx.beginPath();
        const cursorBounds = zoomedScreenBounds({x:65,y:50,width:1150,height:620},{width:1280,height:720},focus.zoom);
        ctx.rect(cursorBounds.x,cursorBounds.y,cursorBounds.width,cursorBounds.height);
        ctx.clip();
        paintStyledCursor(
          ctx,
          x,
          y,
          settings.cursorSize || 28,
          settings.cursorStyle || 'arrow',
        );
        ctx.restore();
      }
    }
    if (
      !pathSegment?.hidden && settings.screenVisible !== false &&
      settings.cursorStyle !== 'none' &&
      !animated &&
      settings.pointerMotion === 'focus'
    ) {
      const t = mediaTime(v);
      const x = Math.max(65, Math.min(1215, 65 + (1150 * focus.x) / 100 + Math.sin(t * 1.5) * 7));
      const y = Math.max(50, Math.min(670, 50 + (620 * focus.y) / 100 + Math.cos(t * 1.2) * 5));
      paintStyledCursor(
        ctx,
        x,
        y,
        settings.cursorSize || 28,
        settings.cursorStyle || 'arrow',
      );
    }
    const pointer = settings.cursorStyle || 'none';
    if (
      settings.screenVisible !== false &&
      !manual &&
      settings.pointerMotion !== 'recorded' &&
      settings.pointerMotion !== 'focus' &&
      !animated &&
      pointer !== 'none' &&
      settings.capturedCursorHidden &&
      settings.focusPoints?.length
    ) {
      const size = settings.cursorSize || 28;
      const x = 65 + (1150 * focus.x) / 100,
        y = 50 + (620 * focus.y) / 100;
      paintStyledCursor(ctx, x, y, size, pointer);
    }
    ctx.restore();
    const activeCamera = cameraForTime(v);
    if (
      !portrait &&
      settings.camera &&
      activeCamera &&
      activeCamera.readyState >= 2 &&
      cameraVisibility(mediaTime(v)) > 0
    ) {
      const c = activeCamera,
        shape = settings.cameraShape || 'circle';
      const ratios = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16 };
      const ratio = shape === 'circle' ? 1 : ratios[settings.cameraRatio || '1:1'];
      const { x, y, width, height } = cameraDisplayRect();
      const radius =
        shape === 'circle' ? width / 2 : shape === 'rounded' ? Math.min(width, height) * 0.18 : 4;
      const sourceRatio = c.videoWidth / c.videoHeight;
      const cropWidth = (sourceRatio > ratio ? c.videoHeight * ratio : c.videoWidth) / 1.15,
        cropHeight = cropWidth / ratio;
      ctx.save();
      animateCameraFrame(ctx, mediaTime(v), x, y, width, height);
      if (!settings.cameraCutout) frameShadow(ctx, x, y, width, height, radius);
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, settings.cameraCutout ? 0 : radius);
      ctx.clip();
      drawCameraContent(ctx, c, cropWidth, cropHeight, -width / 2, -height / 2, width, height);
      ctx.restore();
      ctx.restore();
    }
  }
  useEffect(() => {
    if (home || !source || recreated) return;
    let raf = 0;
    const tick = () => {
      const ctx = previewCanvas.current?.getContext('2d');
      const v = video.current;
      if (ctx && v) {
        drawFrame(
          ctx,
          v,
          Math.max(
            0,
            durationOf(recordingSegments.slice(0, recordSegment.current)) +
              mediaTime(v) -
              (recordingSegments[recordSegment.current]?.start || 0),
          ),
          panel === 'animate',
        );
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [home, source, settings, panel, duration, recreated, playing, exporting]);
  function pickCursor(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!pickingCursor || !video.current) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const { x: px, y: py } = screenPoint(
      previewPoint(e.clientX, e.clientY, bounds).x,
      previewPoint(e.clientX, e.clientY, bounds).y,
    );
    const v = video.current;
    const focus = viewAt(
      settings.focusPoints || [],
      mediaTime(v),
      Boolean(settings.autoZoom),
      settings.zoom,
      settings.focusX,
      settings.focusY,
    );
    const scale = Math.max(1150 / v.videoWidth, 620 / v.videoHeight) * focus.zoom;
    const x =
        (px -
          65 -
          frameOffset(
            1150,
            v.videoWidth * scale,
            focus.x,
            Boolean(settings.autoZoom && settings.zoomSource === 'cursor'),
          )) /
        scale /
        v.videoWidth,
      y =
        (py -
          50 -
          frameOffset(
            620,
            v.videoHeight * scale,
            focus.y,
            Boolean(settings.autoZoom && settings.zoomSource === 'cursor'),
          )) /
        scale /
        v.videoHeight;
    if (x < 0 || y < 0 || x > 1 || y > 1) {
      announce('Pick the cursor inside the recording.');
      return;
    }
    const seed = { time: mediaTime(v), x, y, width: originalCursorSize };
    try {
      const processor = new CursorReplacer();
      processor.calibrate(v, seed);
      cursorReplacer.current = processor;
      setSettings((s) => ({
        ...s,
        cursorSeed: seed,
        replaceCursor: true,
        cursorStyle: s.cursorStyle === 'none' || !s.cursorStyle ? 'arrow' : s.cursorStyle,
      }));
      setPickingCursor(false);
      setCursorConfidence(1);
      announce(
        'Cursor calibrated. Play to track and replace it. Uncertain frames retain the original cursor.',
      );
    } catch (err) {
      announce((err as Error).message);
    }
  }
  useEffect(() => {
    const seed = settings.cursorSeed,
      v = video.current;
    if (
      !source ||
      !duration ||
      !seed ||
      !settings.replaceCursor ||
      cursorReplacer.current?.initialized ||
      !v
    )
      return;
    let alive = true;
    const previous = mediaTime(v);
    v.pause();
    setPlaying(false);
    const restore = () => {
      if (!alive) return;
      try {
        const processor = new CursorReplacer();
        processor.calibrate(v, seed);
        cursorReplacer.current = processor;
        setCursorConfidence(1);
        seekMediaTime(v, previous);
      } catch {
        setSettings((s) => ({
          ...s,
          cursorSeed: undefined,
          replaceCursor: false,
          autoZoom: false,
          focusPoints: [],
        }));
        announce('Select the recorded cursor again to enable replacement.');
      }
    };
    if (Math.abs(mediaTime(v) - seed.time) < 0.02 && v.readyState >= 2) restore();
    else {
      v.addEventListener('seeked', restore, { once: true });
      seekMediaTime(v, seed.time);
    }
    return () => {
      alive = false;
      v.removeEventListener('seeked', restore);
    };
  }, [source, duration, settings.replaceCursor]);
  useEffect(() => {
    if (!settings.replaceCursor) return;
    const id = setInterval(() => setCursorConfidence(cursorReplacer.current?.confidence || 0), 500);
    return () => clearInterval(id);
  }, [settings.replaceCursor]);
  async function autoZoom() {
    if (!source) return;
    const targetId = zoomEditorClip || activeSegments[selectedSegment]?.id;
    const applyFollow = (action: (old: Settings) => Settings) => setSettings(old => {
      if (!targetId) return old;
      const next = action(clipEffectSettings(old, targetId));
      return {...editClipEffects(old, activeSegments, targetId, next), clipZooms: {
        ...Object.fromEntries(activeSegments.map(clip => [clip.id, old.clipZooms?.[clip.id] ?? old.zoom])),
        [targetId]: old.clipZooms?.[targetId] && old.clipZooms[targetId] > 1 ? old.clipZooms[targetId] : next.zoom,
      }, zoomTrackEnabled: true};
    });
    if (settings.cursorTelemetry?.length) {
      video.current?.pause();
      setPlaying(false);
      applyFollow((s) => ({
        ...s,
        focusPoints: cursorFocusPoints(s.cursorTelemetry!, duration),
        autoZoom: true,
        zoomSource: 'cursor',
        zoom: s.zoom <= 1 ? 1.7 : s.zoom,
        pointerMotion: 'recorded',
      }));
      cameraView.current = null;
      seek(durationOf(activeSegments.slice(0, Math.max(0, activeSegments.findIndex(clip => clip.id === targetId)))));
      announce('Following recorded cursor with smooth activity zoom.');
      return;
    }
    if (!settings.cursorSeed || settings.capturedCursorHidden) {
      update('autoZoom', false);
      update('focusPoints', []);
      announce(
        'Cursor-follow zoom needs a visible recorded cursor. Pause the video and select its tip once. Cursor-free footage supports manual zoom.',
      );
      return;
    }
    video.current?.pause();
    setPlaying(false);
    setAnalyzing(true);
    setAnalysisProgress(0);
    try {
      const points = await analyzeCursor(
        source,
        settings.cursorSeed,
        duration,
        setAnalysisProgress,
      );
      applyFollow((s) => ({
        ...s,
        focusPoints: points,
        autoZoom: true,
        zoomSource: 'cursor',
        zoom: s.zoom <= 1 ? 1.7 : s.zoom,
      }));
      seek(durationOf(activeSegments.slice(0, Math.max(0, activeSegments.findIndex(clip => clip.id === targetId)))));
      announce(
        'Cursor-follow zoom ready. It returns to normal framing when cursor movement stops.',
      );
    } catch (e) {
      announce((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }
  useEffect(() => {
    if (settings.autoZoom && settings.zoomSource !== 'cursor')
      setSettings((s) => ({ ...s, autoZoom: false, focusPoints: [] }));
  }, []);
  async function generateScenes() {
    setRecreated(false);
    demoPlaying.current = false;
    if (!source || !duration) return;
    video.current?.pause();
    setPlaying(false);
    setGenerating(true);
    setAnalysisProgress(0);
    try {
      const scenes = await generateComponents(
        source,
        duration,
        settings.trimStart,
        end,
        setAnalysisProgress,
      );
      setSettings((s) => ({ ...s, scenes }));
      setPanel('animate');
      seek(0);
      announce(
        `Extracted ${scenes.length} scenes with ${scenes.reduce((n, s) => n + s.components.length, 0)} components. Review recognized text before export. Click Preview animation.`,
      );
    } catch (e) {
      announce((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  async function previewAnimation() {
    if (!source && !recreated) {
      announce('Import or record a video first.');
      return;
    }
    soundPlayer.current.stop();
    video.current?.pause();
    camera.current?.pause();
    demoPlaying.current = false;
    seek(0);
    if (!recreated) setPanel('animate');
    try {
      await soundPlayer.current.play(await soundtrack(), 0);
      if (recreated) demoPlaying.current = true;
      else {
        recordSegment.current = 0;
        if (video.current) {
          seekMediaTime(video.current, recordingSegments[0].start);
          await video.current.play();
        }
        if (camera.current) {
          camera.current.currentTime = recordingSegments[0].start;
          void camera.current.play();
        }
      }
      setPlaying(true);
    } catch (e) {
      announce((e as Error).message);
    }
  }
  function wrap(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    max: number,
    line: number,
  ) {
    let row = '';
    for (const word of text.split(' ')) {
      if (ctx.measureText(row + word).width > max && row) {
        ctx.fillText(row, x, y);
        row = '';
        y += line;
      }
      row += word + ' ';
    }
    ctx.fillText(row, x, y);
  }
  async function exportVideo() {
    if (settings.cameraCutout) {
      try { await prepareCameraCutout(); }
      catch { announce('Camera cutout is unavailable. Turn it off before exporting.'); return; }
    }
    if (recreated) {
      await exportRecreated();
      return;
    }
    if (!video.current || !source) return;
    const v = video.current;
    setCompletedExport(null);
    setTime(0);
    setExporting(true);
    exportAbort.current = false;
    v.pause();
    soundPlayer.current.stop();
    setPlaying(false);
    const previous = mediaTime(v),
      previousIndex = recordSegment.current,
      previousEdited = time;
    let output: MediaStream | undefined,
      rec: MediaRecorder | undefined,
      musicSource: AudioBufferSourceNode | undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = portrait ? 1080 : 1920;
      canvas.height = portrait ? 1920 : 1080;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(1.5, 1.5);
      output = canvas.captureStream(30);
      if (!audioGraph.current) {
        const context = new AudioContext(),
          source = context.createMediaElementSource(v),
          destination = context.createMediaStreamDestination();
        source.connect(destination);
        source.connect(context.destination);
        audioGraph.current = { context, source, destination };
      }
      const graph = audioGraph.current;
      syncClipAudio();
      await graph.context.resume();
      graph.destination.stream.getAudioTracks().forEach((track) => output!.addTrack(track.clone()));
      const mixed = await soundtrack();
      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      if (!mime) throw new Error('Video export is unavailable.');
      const chunks: BlobPart[] = [];
      rec = new MediaRecorder(output, { mimeType: mime, videoBitsPerSecond: 18000000 });
      const result = new Promise<Blob>((resolve) => {
        rec!.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        rec!.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });
      let edited = 0;
      const seekMedia = async (element: HTMLVideoElement, position: number) => {
        if (Math.abs(mediaTime(element) - position) < 0.01 && element.readyState >= 2) return;
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            element.removeEventListener('seeked', done);
            reject(new Error('Video seeking timed out.'));
          }, 8000);
          const done = () => {
            clearTimeout(timeout);
            resolve();
          };
          element.addEventListener('seeked', done, { once: true });
          seekMediaTime(element, position);
        });
      };
      for (let i = 0; i < recordingSegments.length && !exportAbort.current; i++) {
        const segment = recordingSegments[i];
        recordSegment.current = i;
        await seekMedia(v, segment.start);
        if (camera.current && camSource) await seekMedia(camera.current, segment.start);
        const cutoutCamera = cameraForTime(v);
        if (settings.cameraCutout && cutoutCamera?.readyState && cutoutCamera.readyState >= 2) await prepareCameraCutoutFrame(cutoutCamera);
        drawFrame(ctx, v, edited, panel === 'animate', true);
        if (i === 0) rec.start();
        else rec.resume();
        musicSource = graph.context.createBufferSource();
        musicSource.buffer = mixed;
        musicSource.connect(graph.destination);
        musicSource.connect(graph.context.destination);
        musicSource.start(0, Math.min(edited, mixed.duration - 0.001));
        await v.play();
        if (camera.current) void camera.current.play();
        await new Promise<void>((resolve) => {
          const frame = () => {
            const progress = edited + Math.max(0, mediaTime(v) - segment.start);
            drawFrame(ctx, v, progress, panel === 'animate', true);
            setTime(progress);
            if (mediaTime(v) >= segment.end || v.ended || exportAbort.current) {
              resolve();
              return;
            }
            requestAnimationFrame(frame);
          };
          frame();
        });
        v.pause();
        camera.current?.pause();
        musicSource.stop();
        musicSource = undefined;
        edited += segment.end - segment.start;
        if (i < recordingSegments.length - 1 && !exportAbort.current) rec.pause();
      }
      rec.stop();
      const blob = await result;
      if (!exportAbort.current) {
        download(blob, `${settings.title || 'demo'}.${mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`);
        announce('Edited sequence exported with audio. Download finished video to save it.');
      }
    } catch (e) {
      announce((e as Error).message);
    } finally {
      try {
        musicSource?.stop();
      } catch {}
      if (rec && rec.state !== 'inactive') rec.stop();
      v.pause();
      camera.current?.pause();
      output?.getTracks().forEach((track) => track.stop());
      recordSegment.current = previousIndex;
      seekMediaTime(v, previous);
      if (camera.current) camera.current.currentTime = previous;
      setTime(previousEdited);
      setExporting(false);
    }
  }
  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    setCompletedExport({ url, name });
  }
  if (mediaWorkspace) return <Suspense fallback={<LoadingView label="Opening File studio…"/>}><MediaWorkspace initialFile={fileStudioFile} initialCaptions={settings.captions || []} onBack={() => {setMediaWorkspace(false);setHome(true);}} onEdit={async (selected, captions, language) => {
    setFileStudioFile(selected);setCamSource('');
    await receive(selected, 'screen');
    setSettings(old => ({...old, title:selected.name.replace(/\.[^.]+$/,''), titleAuto:false, uploadKind:'video', uploadName:selected.name.replace(/\.[^.]+$/,''), camera:false, captions, captionsEnabled:Boolean(captions.length),captionSourceLanguage:language.source,captionOutputLanguage:language.output,captionDetectedLanguage:language.detected,captionVariants:language.variants,captionStyle:language.style,captionAppearance:language.appearance,captionLayout:language.placement}));
    setFromFileStudio(true);setPanel('edit');setHome(false);setMediaWorkspace(false);
  }} /></Suspense>;
  if (home)
    return (
      <HomePage dark={darkTheme} onThemeChange={()=>setDarkTheme(value=>!value)}
        onOpen={(mode) => {
          window.scrollTo(0, 0);
          if (mode === 'media') {setMediaWorkspace(true);setHome(false);return;}
          if (mode === 'website') navigateStudio('website');
          else {
            if (mode === 'screen') setScreenEnabled(true);
            navigateStudio('edit');
          }
        }}
        hasProject={Boolean(source || settings.websiteDemo)}
      />
    );
  function canvasBackgroundControls() {
    const presets = backgroundPresets.filter(p => backgroundTab === 'wallpaper' ? p.wallpaper : !p.wallpaper);
    return (
      <div className="control-section canvas-background-settings compact-background-picker">
        <h3>Background</h3>
        <div className="background-type-tabs" role="tablist" aria-label="Background type">
          {(['wallpaper','gradient','color','image'] as const).map(tab => <button key={tab} role="tab" aria-selected={backgroundTab === tab} onClick={() => setBackgroundTab(tab)}>{tab[0].toUpperCase()+tab.slice(1)}</button>)}
        </div>
        {(backgroundTab === 'wallpaper' || backgroundTab === 'gradient') && <>
          <div className="background-collection-label">{backgroundTab === 'wallpaper' ? 'Mac-inspired · Abstract' : 'Gradient collection'}</div>
          <button className="random-background-button" onClick={() => {
            const choices=presets.filter(p => p.id !== settings.backgroundPreset);
            const picked=choices[Math.floor(Math.random()*choices.length)];
            if(picked)setSettings(old => ({...old,backgroundPreset:picked.id,backgroundImage:undefined}));
          }}><Sparkles size={14} /> Pick random {backgroundTab === 'wallpaper' ? 'wallpaper' : 'gradient'}</button>
          <div className="wallpaper-thumbnail-grid" role="group" aria-label={backgroundTab === 'wallpaper' ? 'Wallpapers' : 'Gradients'}>
            {presets.map(p => <button key={p.id} title={p.name} aria-label={p.name} aria-pressed={settings.backgroundPreset===p.id} style={{background:backgroundCss(settings.background,p.id)}} onClick={() => setSettings(old => ({...old,backgroundPreset:p.id,backgroundImage:undefined}))}>{settings.backgroundPreset===p.id && <Check size={13} />}</button>)}
          </div>
          <p className="selected-background-name">{backgroundPresets.find(p => p.id===settings.backgroundPreset)?.name || 'Choose a background'}</p>
        </>}
        {backgroundTab === 'color' && <>
          <div className="swatches">{['#e7e9df','#e9dfe9','#dee6f0','#efe0d0','#202b2b','#f5f5f5','#111318','#000000'].map(color => <button key={color} aria-label={`Background ${color}`} style={{background:color}} onClick={() => setSettings(old => ({...old,background:color,backgroundPreset:undefined,backgroundImage:undefined}))}>{!settings.backgroundPreset && settings.background===color && <Check size={13} />}</button>)}</div>
          <label className="color-field">Custom color<input type="color" value={settings.background} onChange={e => setSettings(old => ({...old,background:e.target.value,backgroundPreset:undefined,backgroundImage:undefined}))} /></label>
        </>}
        {backgroundTab === 'image' && <>
        <div className="background-upload">
          <label className="button quiet">
            <Upload size={15} />
            {settings.backgroundImage ? 'Replace background' : 'Upload background image'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  const img = await createImageBitmap(file);
                  img.close();
                  await storeAsset('canvas-background', file);
                  update('backgroundImage', String(Date.now()));
                  announce('Background image added.');
                } catch {
                  announce('Choose a readable PNG, JPEG or WebP image.');
                }
              }}
            />
          </label>
          {settings.backgroundImage && (
            <button
              className="button quiet"
              aria-label="Remove background image"
              onClick={() => update('backgroundImage', undefined)}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        </>}
      </div>
    );
  }

  return (
    <div className={`app studio-glass ${darkTheme ? 'theme-dark' : ''} ${panel !== 'edit' ? 'stitch-studio' : 'stitch-editor'}`}>
      <ExportDialog
        rendering={exporting}
        progress={(time / Math.max(0.1, displayDuration)) * 100}
        result={completedExport}
        onCancel={() => {
          exportAbort.current = true;
        }}
      />
      {!mobileView &&
        floatingController &&
        createPortal(
          <div className="floating-capture">
            <header>
              <span>DemoTake · Capture</span>
              <span>
                {cameraTake
                  ? cameraCountdown !== null
                    ? `Starting in ${cameraCountdown}`
                    : 'Camera PIP'
                  : recording
                    ? clock(recordSeconds)
                    : captureArmed
                      ? 'Ready'
                      : 'Setup'}
              </span>
            </header>
            <p>
              {cameraTake
                ? cameraCountdown !== null
                  ? 'Get ready. Recording begins after the countdown.'
                  : cameraTakePending.current
                    ? 'Preparing your camera…'
                    : 'Recording your camera take.'
                : recording
                  ? 'Recording your selected screen.'
                  : captureArmed
                    ? 'Switch to your target tab or app. Press Start when ready.'
                    : 'Toggle Screen, Camera and Mic. Turn Screen off for camera-only recording.'}
            </p>
            {!recording && !captureArmed && floatingSaveStatus !== 'idle' && (
              <div className="floating-recording-result" role="status">
                {floatingSaveStatus === 'saving' ? (
                  <strong>Saving recording…</strong>
                ) : (
                  <>
                    <strong>
                      {floatingSaveStatus === 'saved'
                        ? '✓ Recording saved on this device'
                        : 'Recording ready · local storage is full'}
                    </strong>
                    <video
                      src={source}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label="Saved recording preview"
                    />
                    <a href={source} download="recording.webm">
                      Download recording
                    </a>
                  </>
                )}
              </div>
            )}
            {floatingCameraStream && (cameraEnabled || cameraTake) && (
              <div className="floating-camera-preview">
                <video
                  ref={floatingCameraPreview}
                  autoPlay
                  muted
                  playsInline
                  aria-label="Live camera preview in floating controls"
                />
                <span role="status" aria-live="polite">
                  {cameraCountdown !== null ? `Starting in ${cameraCountdown}…` : 'LIVE PREVIEW'}
                </span>
              </div>
            )}
            <nav className="floating-studio-nav" aria-label="Switch studio while recording">
              <button
                aria-current={panel === 'edit' ? 'page' : undefined}
                onClick={() => navigateStudio('edit')}
              >
                Screen studio
              </button>
              <button
                aria-current={panel === 'website' ? 'page' : undefined}
                onClick={() => navigateStudio('website')}
              >
                Website to video
              </button>
            </nav>
            <div className="floating-action-row">
              {cameraTake ? (
                <button className="stop" onClick={stopCameraTake}>
                  {cameraCountdown !== null || cameraTakePending.current
                    ? 'Cancel countdown'
                    : 'Stop camera recording'}
                </button>
              ) : (
                <>
                  <div className="capture-device-row" role="group" aria-label="Recording devices">
                    <button
                      className="device screen-device"
                      aria-label="Toggle screen capture"
                      title={screenEnabled ? 'Screen capture on' : 'Screen capture off'}
                      aria-pressed={screenEnabled}
                      onClick={toggleLiveScreen}
                    >
                      {screenEnabled ? <Monitor size={17} /> : <MonitorOff size={17} />}
                    </button>
                    <button
                      className="device"
                      aria-label="Toggle camera"
                      title={cameraEnabled ? 'Camera on' : 'Camera off'}
                      aria-pressed={cameraEnabled}
                      onClick={() => void floatingDeviceToggle('camera')}
                    >
                      {cameraEnabled ? <Camera size={17} /> : <CameraOff size={17} />}
                    </button>
                    <button
                      className="device"
                      aria-label="Toggle microphone"
                      title={microphone ? 'Microphone on' : 'Microphone off'}
                      aria-pressed={microphone}
                      onClick={() => void floatingDeviceToggle('mic')}
                    >
                      {microphone ? <Mic size={17} /> : <MicOff size={17} />}
                    </button>
                  </div>
                  {recording ? (
                    <button className="stop" onClick={stopRecording}>
                      Stop recording
                    </button>
                  ) : captureArmed ? (
                    <button onClick={beginArmedCapture}>Start recording</button>
                  ) : (
                    <button
                      disabled={
                        floatingSaveStatus === 'saving' || (!screenEnabled && !cameraEnabled)
                      }
                      onClick={() => void startRecording(true)}
                    >
                      Start recording
                    </button>
                  )}
                </>
              )}
            </div>
            <small>
              {'documentPictureInPicture' in window
                ? 'Controls float above other windows.'
                : 'Keep this popup visible beside the screen you capture.'}{' '}
              Choose a file-manager window to record Downloads or folders. Entire-screen capture may
              include these controls.
            </small>
          </div>,
          floatingController.document.body,
        )}
      {laneAddMenu && <div className="timeline-add-overlay" onClick={()=>setLaneAddMenu(null)}><div className="timeline-add-menu" role="dialog" aria-label="Add feature at playhead" style={{left:Math.min(laneAddMenu.x,window.innerWidth-252),top:Math.min(laneAddMenu.y,window.innerHeight-145)}} onClick={e=>e.stopPropagation()}>
        <strong>{clock(laneAddMenu.time)} · Add {laneAddMenu.lane === 'captions' ? 'caption' : laneAddMenu.lane}</strong>
        <button onClick={()=>{
          const {lane,time:at}=laneAddMenu;
          const mapped=mapSegments(activeSegments,at), clip=activeSegments[mapped.index];
          seek(at);setSelectedSegment(mapped.index);
          if(lane==='camera'){appendCamera.current=false;setTimelineSelection('camera');setSelectedCameraClip(null);setCameraSetupOpen(true);}
          else if(lane==='captions') {setSettings(old=>({...old,captionsEnabled:true,captions:[...(old.captions||[]),{start:mapped.time,end:Math.min(clip.end,mapped.time+2),text:'New caption'}]}));setCaptionSelection((settings.captions||[]).length);setTimelineSelection('caption');}
          else if(lane==='zoom'){addTimelineZoom(clip.id);setSettings(old=>({...old,featureRanges:{...old.featureRanges,['zoom:'+clip.id]:{start:mapped.time,end:clip.end}}}));}
          else if(lane==='cursor'){setTimelineSelection('cursor');setCursorExpanded(true);setSettings(old=>editClipEffects({...old,featureRanges:{...old.featureRanges,['cursor:'+clip.id]:{start:mapped.time,end:clip.end}}},activeSegments,clip.id,{cursorStyle:'arrow',showCursor:true}));}
          else if(lane==='music'){setSelectedMusicClip(null);pendingMusicTime.current=at;setTimelineSelection('music');setMusicEditorOpen(true);setSettings(old=>({...old,featureRanges:{...old.featureRanges,music:{start:at,end:displayDuration}}}));}
          if(mobileView)setMobileFeatureOpen(true);setLaneAddMenu(null);
        }}>Add here</button><button onClick={()=>setLaneAddMenu(null)}>Cancel</button>
      </div></div>}
      <main>
        <header>
          <div className="studio-location">
            <details className="studio-nav-menu"><summary aria-label="Choose studio"><Film size={17}/> Studios <ChevronRight size={12}/></summary><nav className="header-studio-icons" aria-label="Studio navigation">
              {studioLinks()}
            </nav></details>
            {(recording || captureArmed) && (
              <div className="nav-recording-status" role="status">
                <span className="nav-recording-dot" />
                <span>{recording ? `Recording ${clock(recordSeconds)}` : 'Ready to record'}</span>
                <button
                  type="button"
                  aria-label={recording ? 'Stop active recording' : 'Cancel prepared recording'}
                  onClick={stopRecording}
                >
                  {recording ? 'Stop' : 'Cancel'}
                </button>
              </div>
            )}
            <div className="breadcrumb">
              <span>Demo Studio</span>
              <ChevronRight size={14} />
              <strong>{sectionLabels[panel]}</strong>
            </div>
          </div>
          {panel === 'edit' && <div id="project-header-slot"/>}
          <div className="header-actions">
            {panel === 'edit' && <><details className="header-capture-menu"><summary aria-label="Capture settings" title="Capture settings"><Layers size={15}/><span className="header-action-label">Capture</span></summary><div id="header-capture-slot"/></details><button className="button lime header-record" aria-label={recording ? 'Stop recording' : 'Record screen'} title={recording ? 'Stop recording' : 'Record screen'} disabled={exporting||captureArmed} onClick={()=>recording?stopRecording():void startRecording()}>{recording?<Square size={16}/>:<svg className="header-record-symbol" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="4" fill="currentColor"/></svg>}<span className="header-action-label">{recording?'Stop':'Record'}</span></button></>}
            <span className="saved">
              <Check size={14} />
              {saved ? 'Saved on device' : 'Saving…'}
            </span>
            <button
              className="button quiet header-cloud"
              aria-label={firebaseReady ? 'Cloud save' : 'Connect Firebase'}
              title={firebaseReady ? 'Cloud save' : 'Connect Firebase'}
              onClick={async () => {
                try {
                  await saveCloud(settings);
                  announce('Project settings saved to Firestore. Media remains on this device.');
                } catch (e) {
                  announce((e as Error).message);
                }
              }}
            >
              <Cloud size={16} />
              <span>{firebaseReady ? 'Cloud save' : 'Connect Firebase'}</span>
            </button>
            <button
              className="button dark header-export"
              aria-label="Export video"
              title="Export video"
              disabled={
                panel === 'website'
                  ? !websiteExport || websiteExport.disabled
                  : (!recreated && (!source || !duration)) || exporting || recording
              }
              onClick={() => {
                if (panel === 'website') void websiteExport?.run();
                else void exportVideo();
              }}
            >
              <ArrowDownToLine size={16} />
              <span>
                {(panel === 'website' ? websiteExport?.busy : exporting)
                  ? 'Exporting…'
                  : 'Export video'}
              </span>
            </button>
          </div>
        </header>
        {completedExport && (
          <div className="finished-export">
            <Check size={18} />
            <span>Your video is ready.</span>
            <a href={completedExport.url} download={completedExport.name}>
              Download finished video
            </a>
            <details className="export-preview">
              <summary>Preview exported video</summary>
              <video
                aria-label="Finished export preview"
                src={completedExport.url}
                preload="auto"
                controls
                playsInline
              />
            </details>
          </div>
        )}
        <details className="groq-key-panel">
          <summary>
            <KeyRound size={15} />
            <span>Use your own Groq key</span>
            <small>
              {hasUserGroqKey
                ? 'Your key active'
                : serverAIConfigured
                  ? 'App key active'
                  : 'Key needed'}
            </small>
            <ChevronRight className="groq-key-chevron" size={14} />
          </summary>
          <p className="groq-key-description">
            {serverAIConfigured
              ? 'Optional: use your own key for captions and AI videos instead of the app’s key.'
              : 'Add your Groq key to enable captions and AI videos.'}
          </p>
          <label className="groq-key-label" htmlFor="groq-user-key">
            Your Groq API key
          </label>
          <div className="groq-key-row">
            <input
              id="groq-user-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="gsk_… Your Groq API key"
              value={groqKeyDraft}
              onChange={(e) => setGroqKeyDraft(e.target.value)}
            />
            <button
              className="button lime"
              disabled={!/^gsk_[A-Za-z0-9_-]{10,250}$/.test(groqKeyDraft.trim())}
              onClick={() => {
                setUserGroqKey(groqKeyDraft);
                setHasUserGroqKey(true);
                setGroqKeyDraft('');
                announce('Your Groq key is active for this session.');
              }}
            >
              Use my key
            </button>
            {hasUserGroqKey && (
              <button
                className="button quiet"
                onClick={() => {
                  setUserGroqKey('');
                  setHasUserGroqKey(false);
                  setGroqKeyDraft('');
                  announce('Your Groq key was removed.');
                }}
              >
                {serverAIConfigured ? 'Use app key' : 'Remove key'}
              </button>
            )}
          </div>
          <small className="groq-key-note">
            Sent through our server to Groq. Kept only for this tab session; cleared on refresh.{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
              Get a Groq key
            </a>
          </small>
        </details>
        {panel === 'website' && (
          <Suspense fallback={<LoadingView label="Loading AI director…"/>}>
            <AIDirector
              source={source}
              website={panel === 'website'}
              onExportState={setWebsiteExport}
            />
          </Suspense>
        )}
        {!['website'].includes(panel) && (
          <>
            <section className="intro">
              <div>
                <div className="eyebrow">FRAME / CREATIVE WORKSPACE</div>
                <h1>
                  {panel === 'edit'
                    ? 'Recording studio'
                    : panel === 'animate'
                      ? 'Animation studio'
                      : 'Website storyboard'}
                </h1>
                <p>
                  {panel === 'edit'
                    ? 'Capture your screen and camera, then shape your recording.'
                    : panel === 'animate'
                      ? 'Extract components and animate your recording.'
                      : 'Share a public website URL, review the scenes, and export your demo.'}
                </p>
              </div>
              <div className="intro-icon">
                <MousePointer2 size={29} />
                <Sparkles size={17} />
              </div>
            </section>
            {panel === 'edit' && (
              <StudioSlot targetId="header-capture-slot" active={!isNativeMac()}><section className="capture-bar">
                <div className="capture-label">
                  <span className="capture-icon">
                    <Video size={21} />
                  </span>
                  <div>
                    <strong>Let’s capture your idea</strong>
                    <small>Screen, camera, or a little of both.</small>
                  </div>
                </div>
                <div className="capture-actions">
                  {mobileView ? (
                    <>
                      {recording && (
                        <button className="button recording" onClick={stopRecording}>
                          <Square size={15} />
                          Stop recording
                        </button>
                      )}
                      <button
                        className="button lime"
                        disabled={exporting || recording}
                        onClick={() => {
                          importMode.current = 'edit';
                          file.current?.click();
                        }}
                      >
                        <Upload size={16} />
                        Import video
                      </button>
                      <button
                        className="button quiet"
                        disabled={exporting || recording || importingCameraImage || !source}
                        title={
                          !source ? 'Import a video first, then add your camera clip' : undefined
                        }
                        onClick={() => cameraClipInput.current?.click()}
                      >
                        <Camera size={16} />
                        Import camera clip
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={`toggle ${screenEnabled ? 'selected' : ''}`}
                        aria-pressed={screenEnabled}
                        disabled={recording || captureArmed}
                        onClick={() => setScreenEnabled(!screenEnabled)}
                      >
                        <Monitor size={16} /> Screen
                        <span className="switch" />
                      </button>
                      <button
                        className={`toggle ${cameraEnabled ? 'selected' : ''}`}
                        onClick={() => setCameraEnabled(!cameraEnabled)}
                        disabled={recording}
                      >
                        <Camera size={16} /> Camera
                        <span className="switch" />
                      </button>
                      <button
                        aria-label="Toggle microphone"
                        className={`toggle ${microphone ? 'selected' : ''}`}
                        onClick={() => setMicrophone(!microphone)}
                        disabled={recording}
                      >
                        <Mic size={16} />
                        <span className="switch" />
                      </button>
                      <button
                        className="button quiet"
                        disabled={exporting || recording || Boolean(floatingController)}
                        onClick={() => void openRecordingController()}
                        title="Open floating recording controls"
                      >
                        Recording controller
                      </button>
                      <button
                        className={`button ${recording ? 'recording' : 'lime'}`}
                        onClick={() => (recording ? stopRecording() : void startRecording())}
                        disabled={
                          exporting ||
                          (!recording && !screenEnabled && !cameraEnabled) ||
                          captureArmed
                        }
                      >
                        {recording ? <Square size={15} /> : <span className="record-dot" />}
                        {recording ? `Stop ${clock(recordSeconds)}` : source ? 'Record next clip' : 'Start recording'}
                      </button>
                      {!recording && !captureArmed && source && <button className="button" disabled={exporting} onClick={async () => {if (!window.confirm('Start a new video on a blank canvas? Export or save any edits you want to keep first.')) return; if (!await clearRecording()) return; appendCapture.current = false; await startRecording(true, true);}}>Record new video</button>}
                    </>
                  )}
                </div>
              </section></StudioSlot>
            )}
            {panel === 'edit' && (
              <div className="capture-cursor-note" role="status">
                <MousePointer2 size={16} />
                <span>
                  {recording
                    ? captureCursorStatus === 'hidden'
                      ? 'Original cursor hidden during capture'
                      : captureCursorStatus === 'visible'
                        ? 'Browser includes the original cursor'
                        : 'Cursor hiding is unconfirmed by this browser'
                    : 'Cursor-free capture requested for every new recording'}
                  <small>
                    {recording && captureCursorStatus !== 'hidden'
                      ? 'The browser may embed the cursor. Use recorded-cursor replacement afterwards.'
                      : 'Activity pointer style is applied separately. Cursor-follow zoom uses companion cursor data, or a visible calibrated cursor in imported footage.'}
                  </small>
                </span>
              </div>
            )}
            {recording && liveStream && (
              <section className="live-camera-panel">
                <div className="live-camera-copy">
                  <span className="live-badge">
                    <span /> LIVE CAMERA
                  </span>
                  <h3>You’re in the picture.</h3>
                  <p>
                    Screen and camera are recording together. For a clean recording, share a browser
                    tab or app window. Full-screen capture also records floating camera windows.
                  </p>
                  <button className="button recording" onClick={stopRecording}>
                    <Square size={14} /> Stop recording · {clock(recordSeconds)}
                  </button>
                  <button
                    className="button live-floating"
                    onClick={async () => {
                      try {
                        if (captureSurface === 'monitor' || captureSurface === 'unknown')
                          throw new Error(
                            'Choose a browser tab or app window when starting capture to keep the camera preview out of the recording. Full-screen capture includes floating windows.',
                          );
                        if (
                          !document.pictureInPictureEnabled ||
                          !liveCamera.current?.requestPictureInPicture
                        )
                          throw new Error(
                            'Floating camera preview is unavailable in this browser. The live preview remains visible here.',
                          );
                        await liveCamera.current.requestPictureInPicture();
                      } catch (e) {
                        announce((e as Error).message);
                      }
                    }}
                  >
                    Float camera preview
                  </button>
                </div>
                <video
                  ref={liveCamera}
                  className="live-camera-video"
                  autoPlay
                  muted
                  playsInline
                  aria-label="Live camera preview"
                  onClick={(e) => void e.currentTarget.play()}
                />
              </section>
            )}
            {panel === 'animate' && animationMode === 'templates' && (
              <Suspense fallback={<LoadingView label="Loading motion components…"/>}>
                <RemotionDesignStudio />
              </Suspense>
            )}
            {panel === 'animate' && animationMode === 'templates' && (
              <section className="animation-workspace-card">
                <div>
                  <span className="eyebrow">
                    {animationMode === 'templates'
                      ? 'TEMPLATE STUDIO'
                      : animationMode === 'image'
                        ? 'IMAGE TO ANIMATION'
                        : 'VIDEO TO ANIMATION'}
                  </span>
                  <h2>
                    {animationMode === 'templates'
                      ? 'Create a new design'
                      : animationMode === 'image'
                        ? 'Bring an image to life'
                        : 'Turn a video into a story'}
                  </h2>
                  <p>
                    {animationMode === 'templates'
                      ? 'Describe a visual style. Generate an editable template and reuse it with your content.'
                      : animationMode === 'image'
                        ? 'Upload a photo, illustration or screenshot to create your animation.'
                        : 'Upload your recording to create an animated storyboard.'}
                  </p>
                </div>
                {animationMode === 'templates' ? (
                  <>
                    <textarea
                      aria-label="Template design direction"
                      placeholder="Describe your template: bold typography, pastel cards, playful shapes…"
                      value={creativeBrief}
                      onChange={(e) => setCreativeBrief(e.target.value)}
                    />
                    <button
                      className="button lime"
                      disabled={generating || !creativeBrief.trim()}
                      onClick={() => void createTemplate()}
                    >
                      <Sparkles size={16} />
                      {generating ? 'Creating template…' : 'Generate new template'}
                    </button>
                    <div className="custom-template-grid">
                      {settings.customTemplates?.map((template, i) => (
                        <button
                          className="button quiet"
                          key={i}
                          onClick={() => {
                            soundPlayer.current.stop();
                            setPlaying(false);
                            setSettings((old) => ({
                              ...old,
                              websiteDemo: template,
                              websiteSegments: undefined,
                              demoBrand: template.brand,
                              demoQuery: template.title,
                              demoFilename: template.description,
                              demoHeadline: template.cta,
                            }));
                            setRecreated(true);
                            demoTime.current = 0.8;
                            setTime(0.8);
                          }}
                        >
                          <Layers size={16} />
                          Template {i + 1}
                          <small>{template.description.slice(0, 80)}</small>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <button
                    className="button lime"
                    disabled={generating || exporting}
                    onClick={() => {
                      importMode.current = 'animate';
                      if (animationMode === 'image') imageInput.current?.click();
                      else file.current?.click();
                    }}
                  >
                    <Upload size={16} />
                    {animationMode === 'image' ? 'Choose image' : 'Choose video'}
                  </button>
                )}
              </section>
            )}
            {
              <>
                {panel !== 'edit' && (
                  <div className="studio-source-bar">
                    <div>
                      <Layers size={17} />
                      <strong>Animation Studio</strong>
                      <span>{recreated ? 'Source ready' : 'Choose your source'}</span>
                    </div>
                    {panel === 'website' ? (
                      <div className="studio-source-input">
                        <input
                          aria-label="Public website address"
                          type="url"
                          placeholder="Enter public website address…"
                          value={websiteURL}
                          onChange={(e) => setWebsiteURL(e.target.value)}
                        />
                        <button
                          className="button lime"
                          disabled={
                            !websiteURL ||
                            importingWebsite ||
                            exporting ||
                            recording ||
                            (chosenTemplate === 'ai' && !aiConfigured)
                          }
                          onClick={() => void generateWebsiteDemo()}
                        >
                          <Sparkles size={15} />
                          {importingWebsite ? 'Analyzing…' : 'Analyze Source'}
                        </button>
                      </div>
                    ) : (
                      <div className="studio-source-input">
                        <span>{settings.uploadName || 'Video or image asset'}</span>
                        <button
                          className="button quiet"
                          disabled={exporting || generating}
                          onClick={() => {
                            if (animationMode === 'image') imageInput.current?.click();
                            else {
                              importMode.current = 'animate';
                              file.current?.click();
                            }
                          }}
                        >
                          <Upload size={15} />
                          Import source
                        </button>
                        <button
                          className="button lime"
                          disabled={!source || !duration || generating || exporting}
                          onClick={() => void generateUploadDemo()}
                        >
                          <Sparkles size={15} />
                          {generating ? 'Analyzing…' : 'Analyze Source'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div style={{'--preview-ratio': portrait ? 720/1280 : 1280/720} as React.CSSProperties} className={`editor ${previewFullscreen ? 'preview-fullscreen' : ''}`}>
                  <section className="stage-area" onClickCapture={event=>{
                    if(!window.matchMedia('(max-width:800px)').matches)return;
                    const target=event.target as HTMLElement;
                    if(target.closest('.editor-lane button,.timeline-segment,.camera-linked-clip'))setMobileFeatureOpen(true);
                  }}>
                    <div id="mobile-layout-slot"/>
                    <StudioSlot targetId="project-header-slot" active={panel==='edit'&&!isNativeMac()}><div className="stage-heading">
                      <button type="button" className="theme-toggle" aria-label={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setDarkTheme(value => !value)}>{darkTheme ? '☀' : '☾'}</button>
                      <input
                        aria-label="Project title"
                        value={settings.title}
                        onChange={(e) => update('title', e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveProjectName(); } }}
                        maxLength={120}
                      />
                      <button type="button" className="save-project-name" onClick={() => void saveProjectName()}
                        disabled={savingName || !settings.title.trim() || (isNativeMac() && !source)}>
                        {savingName ? 'Saving…' : 'Save name'}
                      </button>
                      <div className="output-format" role="group" aria-label="Video format">
                        {(['16:9', '9:16'] as const).map((format) => (
                          <button
                            key={format}
                            aria-label={
                              format === '9:16' ? 'Mobile format 9:16' : 'Desktop format 16:9'
                            }
                            title={format === '9:16' ? 'Mobile · 9:16' : 'Desktop · 16:9'}
                            aria-pressed={(settings.outputFormat || '16:9') === format}
                            onClick={(e) => {
                              e.stopPropagation();
                              update('outputFormat', format);
                              cameraView.current = null;
                              setPointerMode('off');
                            }}
                          >
                            {format === '9:16' ? <Smartphone size={17} /> : <Monitor size={17} />}
                          </button>
                        ))}
                        <small>{portrait ? '1080 × 1920' : '1920 × 1080'} export</small>
                      </div>
                    </div></StudioSlot>
                    {panel === 'edit' && !recreated && (
                      <InspectorControls layout><section
                        className={`arrange-panel ${arrangeDisplays ? 'editing' : ''}`}
                        aria-label="Clip layout editor"
                      >
                        <div className="arrange-panel-heading">

                          <div>
                            <strong>
                              Clip layout <span>{selectedSegment + 1}</span>
                            </strong>
                            <small>
                              {settings.primaryMedia === 'camera'
                                ? 'Camera placement and size'
                                : arrangeDisplays
                                  ? 'Position and size your displays'
                                  : 'Screen and camera placement'}
                            </small>
                          </div>
                          <button
                            className={`button ${arrangeDisplays ? 'lime' : 'quiet'}`}
                            aria-pressed={arrangeDisplays}
                            onClick={() => {
                              setArrangeDisplays(!arrangeDisplays);
                              if (settings.primaryMedia === 'camera') setArrangeTarget('camera');
                              setPointerMode('off');
                            }}
                          >
                            {arrangeDisplays ? (
                              <>
                                <Check size={14} />
                                Done
                              </>
                            ) : (
                              <>
                                Arrange
                                <ChevronRight size={14} />
                              </>
                            )}
                          </button>
                        </div>
                        {arrangeDisplays && (
                          <>
                            <div
                              className="arrange-target-tabs"
                              role="group"
                              aria-label="Display to arrange"
                            >
                              {settings.primaryMedia !== 'camera' && (
                                <button
                                  aria-pressed={arrangeTarget === 'screen'}
                                  onClick={() => setArrangeTarget('screen')}
                                >
                                  <Monitor size={15} />
                                  Screen
                                </button>
                              )}
                              <button
                                disabled={!settings.camera}
                                aria-pressed={arrangeTarget === 'camera'}
                                onClick={() => setArrangeTarget('camera')}
                              >
                                <Camera size={15} />
                                Camera
                              </button>
                            </div>
                            {(() => {
                              const l = displayLayout(),
                                c = cameraDisplayRect(),
                                isScreen = arrangeTarget === 'screen';
                              return (
                                <div className="arrange-precision">
                                  <label>
                                    <span>
                                      Horizontal <em>%</em>
                                    </span>
                                    <input
                                      aria-label="Display horizontal position"
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="1"
                                      value={Math.round(
                                        isScreen
                                          ? l.screenX
                                          : (l.cameraX ??
                                              ((c.x + c.width / 2) / previewWidth) * 100),
                                      )}
                                      onChange={(e) =>
                                        adjustDisplay(
                                          isScreen ? 'screenX' : 'cameraX',
                                          Math.max(0, Math.min(100, +e.target.value)),
                                        )
                                      }
                                    />
                                  </label>
                                  <label>
                                    <span>
                                      Vertical <em>%</em>
                                    </span>
                                    <input
                                      aria-label="Display vertical position"
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="1"
                                      value={Math.round(
                                        isScreen
                                          ? l.screenY
                                          : (l.cameraY ??
                                              ((c.y + c.height / 2) / previewHeight) * 100),
                                      )}
                                      onChange={(e) =>
                                        adjustDisplay(
                                          isScreen ? 'screenY' : 'cameraY',
                                          Math.max(0, Math.min(100, +e.target.value)),
                                        )
                                      }
                                    />
                                  </label>
                                  <label>
                                    <span>
                                      {isScreen ? 'Scale' : 'Width'}{' '}
                                      <em>{isScreen ? '%' : 'px'}</em>
                                    </span>
                                    <input
                                      aria-label="Display size"
                                      type="number"
                                      min={isScreen ? 30 : 100}
                                      max={isScreen ? 200 : portrait ? 660 : 1000}
                                      step="1"
                                      value={Math.round(isScreen ? l.screenScale * 100 : c.width)}
                                      onChange={(e) =>
                                        adjustDisplay(
                                          isScreen ? 'screenScale' : 'cameraSize',
                                          isScreen
                                            ? Math.max(0.3, Math.min(2, +e.target.value / 100))
                                            : Math.max(
                                                100,
                                                Math.min(portrait ? 660 : 1000, +e.target.value),
                                              ),
                                        )
                                      }
                                    />
                                  </label>
                                </div>
                              );
                            })()}
                            <div className="arrange-panel-footer">
                              <span>
                                <span className="arrange-status-dot" />
                                Smooth transition between clips
                              </span>
                              <button
                                onClick={() =>
                                  setSettings((old) => ({
                                    ...old,
                                    displayLayouts: {
                                      ...old.displayLayouts,
                                      [layoutKey()]: { screenX: 50, screenY: 50, screenScale: 1 },
                                    },
                                  }))
                                }
                              >
                                Reset layout
                              </button>
                            </div>
                            <div className="layout-size-presets" role="group" aria-label="Screen sizing presets">
                              <button type="button" onClick={() => setSettings((old) => ({...old, displayLayouts: {...old.displayLayouts, [layoutKey()]: {...displayLayout(), screenX: 50, screenY: 50, screenScale: 1, screenFit: 'contain'}}}))}>Fit screen</button>
                              {!portrait && <button type="button" onClick={() => setSettings((old) => ({...old, mobileCameraLayout: 'overlay', displayLayouts: {...old.displayLayouts, [layoutKey()]: {...displayLayout(), screenX: 50, screenY: 50, screenScale: Math.max(1280 / 1150, 720 / 620), screenFit: 'cover'}}}))}>Fill canvas</button>}
                            </div>
                            <p className="arrange-hint">
                              Drag to move · corner handle to resize · settings saved for this clip
                            </p>
                          </>
                        )}
                      </section></InspectorControls>
                    )}
                    <div
                      className={`stage studio-preview-stage ${portrait ? 'stage-portrait' : 'stage-landscape'} ${pickingCursor ? 'picking-cursor' : ''}`}
                      style={{
                        background: backgroundCss(settings.background, settings.backgroundPreset),
                        aspectRatio: portrait ? '9 / 16' : '16 / 9',
                      }}
                    >
                        <button type="button" className="fullscreen-preview-toggle" aria-label={previewFullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'} title={previewFullscreen ? 'Return to editor (Esc)' : 'Fullscreen preview'} onClick={() => setPreviewFullscreen(value => !value)}><Scan size={17} /></button>
                      {panel === 'website' && !settings.websiteDemo && (
                        <div className="website-stage-empty">
                          <ArrowUpRight size={34} />
                          <h2>Your website, in motion.</h2>
                          <p>Enter a website URL to create your demo.</p>
                        </div>
                      )}
                      {pickingCursor && (
                        <div className="cursor-pick-prompt">
                          Click the original cursor’s top-left tip · original width{' '}
                          {originalCursorSize}px
                        </div>
                      )}
                      {((source && panel !== 'website') || recreated) && (
                        <canvas
                          className="composition-preview"
                          ref={previewCanvas}
                          width={previewWidth}
                          height={previewHeight}
                          aria-label="Animated video preview"
                          onClick={pickCursor}
                          onPointerDown={dragManualPointer}
                          style={
                            pickingCursor || pointerMode !== 'off'
                              ? {
                                  pointerEvents: 'auto',
                                  cursor: pointerMode !== 'off' ? 'grab' : 'crosshair',
                                }
                              : undefined
                          }
                        />
                      )}
                      {!source && settings.caption && settings.captionsEnabled !== false && (
                        <div
                          className="manual-caption-placeholder"
                          style={{
                            left: `${settings.captionLayout?.x ?? 50}%`,
                            top: `${settings.captionLayout?.y ?? 88}%`,
                            fontSize:
                              (30 / previewWidth) * 100 * (settings.captionLayout?.scale ?? 1) +
                              'cqw',
                          }}
                        >
                          {settings.caption}
                        </div>
                      )}
                      {timelineSelection === 'caption' &&
                        !recreated &&
                        settings.captionsEnabled !== false &&
                        Boolean(settings.caption || settings.captions?.length) && (
                          <div
                            className="caption-arrange-box"
                            aria-label="Drag caption to move"
                            style={{
                              left: `${settings.captionLayout?.x ?? 50}%`,
                              top: `${settings.captionLayout?.y ?? 88}%`,
                              width: `${Math.min(92, 65 * (settings.captionLayout?.scale ?? 1))}%`,
                              height: `${Math.min(25, 10 * (settings.captionLayout?.scale ?? 1))}%`,
                            }}
                            onPointerDown={(e) => dragCaption(e)}
                          >
                            <span>Drag caption</span>
                            <div
                              className="display-resize-handle"
                              role="button"
                              aria-label="Resize caption"
                              onPointerDown={(e) => dragCaption(e, true)}
                            />
                          </div>
                        )}
                      {arrangeDisplays && !recreated && (
                        <div className="display-arrange-layer">
                          {(() => {
                            const l = displayLayout(),
                              c = cameraComposition(),
                              screen = {
                                x: portrait ? mobileX + 65 * mobileScale : c.tx + 65 * c.scale,
                                y: portrait ? mobileY + 50 * mobileScale : c.ty + 50 * c.scale,
                                width: 1150 * (portrait ? mobileScale : c.scale),
                                height: 620 * (portrait ? mobileScale : c.scale),
                              };
                            const cam = cameraDisplayRect();
                            return [
                              ...(settings.primaryMedia === 'camera'
                                ? []
                                : [{ id: 'screen' as const, label: 'Screen', rect: screen }]),
                              ...(settings.camera
                                ? [{ id: 'camera' as const, label: 'Camera', rect: cam }]
                                : []),
                            ].map((item) => (
                              <div
                                key={item.id}
                                className={`display-arrange-box ${arrangeTarget === item.id ? 'active' : ''}`}
                                style={{
                                  left: `${(item.rect.x / previewWidth) * 100}%`,
                                  top: `${(item.rect.y / previewHeight) * 100}%`,
                                  width: `${(item.rect.width / previewWidth) * 100}%`,
                                  height: `${(item.rect.height / previewHeight) * 100}%`,
                                }}
                                onPointerDown={(e) => arrangeDrag(e, item.id)}
                              >
                                <span>{item.label}</span>
                                <div
                                  role="button"
                                  aria-label={`Resize ${item.label.toLowerCase()} display`}
                                  className="display-resize-handle"
                                  onPointerDown={(e) => arrangeDrag(e, item.id, true)}
                                />
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                      {!recreated &&
                        pointerMode !== 'off' &&
                        settings.pointerMotion !== 'recorded' &&
                        settings.pointerMotion !== 'focus' && (
                          <svg
                            className="pointer-path-guide"
                            viewBox={`0 0 ${previewWidth} ${previewHeight}`}
                            aria-label="Pointer path guide"
                          >
                            {(() => {
                              const points =
                                settings.manualPointer?.[activeSegments[selectedSegment]?.id] || [];
                              if (!points.length) return null;
                              const c = cameraComposition();
                              const scale = portrait ? mobileScale : 1;
                              return (
                                <g
                                  transform={`translate(${c.tx * scale + (portrait ? mobileX : 0)} ${c.ty * scale + (portrait ? mobileY : 0)}) scale(${c.scale * scale})`}
                                >
                                  <polyline
                                    points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth="7"
                                  />
                                  <polyline
                                    points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke="#667e42"
                                    strokeWidth="4"
                                    strokeDasharray="3 10"
                                    strokeLinecap="round"
                                  />
                                  {[points[0], points[points.length - 1]].map((p, i) => (
                                    <g key={i}>
                                      <circle
                                        aria-label={i ? 'Drag pointer end' : 'Drag pointer start'}
                                        onPointerDown={(e) => dragPointerHandle(e, i)}
                                        style={{
                                          pointerEvents: 'all',
                                          cursor: 'grab',
                                          touchAction: 'none',
                                        }}
                                        cx={p.x}
                                        cy={p.y}
                                        r="14"
                                        fill={i ? '#667e42' : '#ffffff'}
                                        stroke="#334b28"
                                        strokeWidth="3"
                                      />
                                      <text
                                        x={Math.min(1180, p.x + 18)}
                                        y={Math.max(24, p.y - 16)}
                                        fill="#263b22"
                                        stroke="#ffffff"
                                        strokeWidth="4"
                                        paintOrder="stroke"
                                        fontSize="20"
                                      >
                                        {i ? 'End' : 'Start'}
                                      </text>
                                    </g>
                                  ))}
                                </g>
                              );
                            })()}
                          </svg>
                        )}
                      <div
                        style={
                          panel === 'website'
                            ? { visibility: 'hidden' }
                            : !source
                              ? {
                                  transform: `translate(${displayLayout().screenX - 50}%,${displayLayout().screenY - 50}%) scale(${displayLayout().screenScale})`,
                                  transformOrigin: 'center',
                                }
                              : undefined
                        }
                        className={`video-frame ${panel === 'animate' ? 'scene-mode' : ''}`}
                        onClick={(e) => {
                          if (panel === 'edit' && source) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            update('focusX', ((e.clientX - rect.left) / rect.width) * 100);
                            update('focusY', ((e.clientY - rect.top) / rect.height) * 100);
                          }
                        }}
                      >
                        {panel === 'animate' && !recreated && (
                          <div className="generated-scene">
                            <span className="eyebrow">PRODUCT SPOTLIGHT</span>
                            <h2>{settings.sceneTitle}</h2>
                            <p>{settings.sceneBody}</p>
                            <span className="scene-pill">
                              See it in action <ArrowUpRight size={16} />
                            </span>
                          </div>
                        )}
                        <video
                          ref={video}
                          src={source || undefined}
                          playsInline
                          onError={() =>
                            announce(
                              'This video format could not be decoded. Try an MP4 or WebM recording.',
                            )
                          }
                          style={{
                            transform: panel === 'edit' ? `scale(${settings.zoom})` : undefined,
                            transformOrigin: `${settings.focusX}% ${settings.focusY}%`,
                          }}
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget;
                            if (Number.isFinite(mediaDuration(v))) {
                              setDuration(mediaDuration(v));
                              localStorage.setItem('frame-duration', String(mediaDuration(v)));
                              if (pendingSourceSeek.current !== null) {
                                seekMediaTime(v, pendingSourceSeek.current);
                                pendingSourceSeek.current = null;
                              }
                            } else if (!duration) {
                              seekMediaTime(v, 1e10);
                              v.addEventListener(
                                'timeupdate',
                                () => {
                                  if (Number.isFinite(mediaDuration(v))) {
                                    setDuration(mediaDuration(v));
                                    seekMediaTime(v, pendingSourceSeek.current ?? 0);
                                    pendingSourceSeek.current = null;
                                  }
                                },
                                { once: true },
                              );
                            }
                          }}
                          onSeeked={() => {
                            if (cursorReplacer.current) cursorReplacer.current.lastTime = -1;
                          }}
                          onDurationChange={(e) => {
                            if (Number.isFinite(e.currentTarget.duration)) {
                              setDuration(mediaDuration(e.currentTarget));
                            }
                          }}
                          onTimeUpdate={(e) => onRecordingTime(e.currentTarget)}
                          onEnded={() => {
                            if (cameraTakeRecorder.current?.state === 'recording') {
                              stopCameraTake();
                              return;
                            }
                            if (recordSegment.current < recordingSegments.length - 1)
                              onRecordingTime(video.current!);
                            else {
                              setPlaying(false);
                              soundPlayer.current.stop();
                              camera.current?.pause();
                            }
                          }}
                        />
                        {!source && panel === 'edit' && (
                          <EmptyStudioCanvas onStart={() => file.current?.click()} />
                        )}
                      </div>
                      {Object.entries(cameraTakeURLs).map(([id, url]) => (
                        <video
                          key={id}
                          ref={(el) => {
                            cameraTakeVideos.current[id] = el;
                          }}
                          src={url}
                          muted
                          playsInline
                          preload="auto"
                          style={{ display: 'none' }}
                        />
                      ))}
                      {camSource && settings.camera && !recreated && (
                        <video
                          className="facecam"
                          ref={camera}
                          src={camSource}
                          muted
                          playsInline
                          onLoadedMetadata={(e) => {
                            if (
                              Number.isFinite(e.currentTarget.duration) &&
                              e.currentTarget.duration > 0 &&
                              !settings.cameraDuration
                            )
                              update('cameraDuration', e.currentTarget.duration);
                          }}
                        />
                      )}
                    </div>
                    <StudioSlot targetId="timeline-playback-slot" active={panel==='edit'&&!!source&&!recreated&&!previewFullscreen}><div className="transport" role="group" aria-label="Preview playback">
                      <div className="transport-playback"><div id="playback-edit-tools-slot"/><div className="transport-history"><button aria-label="Undo last edit" title="Undo" disabled={!canUndo||recording||exporting} onClick={undoLastEdit}><Undo2 size={16}/></button><button aria-label="Redo last edit" title="Redo" disabled={!canRedo||recording||exporting} onClick={redoLastEdit}><Redo2 size={16}/></button></div>
                            <button
                              className="timeline-icon"
                              aria-label="Selected clip volume"
                              title="Selected clip volume"
                              disabled={!source || !['video', 'camera'].includes(timelineSelection)}
                              onClick={() => setClipVolumeOpen(!clipVolumeOpen)}
                            >
                              <Volume2 size={17} />
                            </button>
                        <button
                          className="transport-play"
                          aria-label={playing ? 'Pause' : 'Play'}
                          disabled={(panel === 'website' && !recreated) || (!source && !recreated) || exporting}
                          onClick={() => void togglePlay()}
                        >
                          {playing ? <Pause size={17} /> : <Play size={17} />}
                        </button>
                        <span className="transport-time" aria-label="Playback time">
                          {clock(time)} <em>/ {clock(displayDuration)}</em>
                        </span>
                      </div>
                      <div className="transport-actions">
                        {panel !== 'website' && (
                          <button className="transport-import" onClick={() => file.current?.click()} disabled={recording || exporting}>
                            <Upload size={15} /> <span>Import video</span>
                          </button>
                        )}
                        {source && panel === 'edit' && (
                          <button
                            className="transport-clear"
                            aria-label="Clear recording"
                            title="Clear recording and camera takes"
                            disabled={recording || exporting || cameraTake || captionBusy || generating}
                            onClick={() => void clearRecording()}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <span className="transport-divider" aria-hidden="true" />

                      </div>
                    </div></StudioSlot>
                    {(panel !== 'website' || recreated) &&
                      (!source && !recreated ? (
                        <EmptyStudioTimeline
                          onStart={() => file.current?.click()}
                          onMusic={() => musicInput.current?.click()}
                          onCaption={() => {
                            setTimelineSelection('caption');
                            captionDialog.current?.showModal();
                          }}
                          tools={
                            <button
                              type="button"
                              className="timeline-icon mobile-canvas-background"
                              aria-label="Choose canvas background"
                              onClick={() => backgroundDialog.current?.showModal()}
                            >
                              <span
                                className="canvas-color-icon"
                                style={{
                                  background: backgroundCss(
                                    settings.background,
                                    settings.backgroundPreset,
                                  ),
                                }}
                              />
                            </button>
                          }
                        />
                      ) : (
                        <Timeline className={mobileToolsOpen ? 'mobile-tools-open' : ''}>
                          <TimelineToolbar
                            playback={<div id="timeline-playback-slot"/>}
                            hint={
                              source
                                ? 'Drag to scrub your recording'
                                : 'Your story will unfold here'
                            }
                          >
                            <StudioSlot targetId="playback-edit-tools-slot" active={true}><div className="playback-edit-tools">
                            <button
                              className="timeline-icon"
                              aria-label="Split at playhead"
                              title="Split at playhead"
                              disabled={exporting || cameraTake || (!source && !recreated)}
                              onClick={() =>
                                timelineSelection === 'music'
                                  ? splitMusicClip()
                                  : timelineSelection === 'caption'
                                  ? splitCaptionAtPlayhead()
                                  : timelineSelection === 'camera' && selectedCameraClip
                                  ? splitCameraClip()
                                  : saveSegments(splitSegments(activeSegments, time))
                              }
                            >
                              <Scissors size={17} />
                              {panel === 'edit' && <span>Split</span>}
                            </button>
                            <button
                              className="timeline-icon timeline-delete"
                              aria-label={`Delete selected ${timelineSelection}`}
                              title={`Delete selected ${timelineSelection}`}
                              disabled={
                                exporting ||
                                recording ||
                                cameraTake ||
                                (timelineSelection === 'video' && !source) ||
                                (timelineSelection === 'camera' && !selectedCameraClip) ||
                                (timelineSelection === 'zoom' && !zoomEditorClip)
                              }
                              onClick={deleteTimelineSelection}
                            >
                              <Trash2 size={17} />
                            </button>
                            {panel === 'edit' && (
                              <button
                                type="button"
                                className="timeline-icon mobile-canvas-background"
                                aria-label="Choose canvas background"
                                title="Canvas background"
                                disabled={exporting}
                                onClick={() => backgroundDialog.current?.showModal()}
                              >
                                <span
                                  className="canvas-color-icon"
                                  style={{
                                    background: backgroundCss(
                                      settings.background,
                                      settings.backgroundPreset,
                                    ),
                                    backgroundImage: settings.backgroundImage
                                      ? 'linear-gradient(135deg,transparent 45%,#ffffff88 46%,#ffffff88 54%,transparent 55%)'
                                      : undefined,
                                  }}
                                />
                              </button>
                            )}
                            </div></StudioSlot>
                          </TimelineToolbar>
                          {clipVolumeOpen && ['video', 'camera'].includes(timelineSelection) && (
                            <InspectorControls><div
                              className="clip-volume-strip"
                              role="group"
                              aria-label="Selected clip audio"
                            >
                              <span className="clip-volume-name">
                                {timelineSelection === 'camera' ? 'Camera PIP' : 'Screen video'}
                              </span>
                              <button
                                className="clip-mute"
                                aria-label={
                                  clipVolume(selectedVolumeKey())
                                    ? 'Mute selected clip'
                                    : 'Unmute selected clip'
                                }
                                aria-pressed={clipVolume(selectedVolumeKey()) === 0}
                                title={clipVolume(selectedVolumeKey()) ? 'Mute' : 'Unmute'}
                                onClick={() =>
                                  update('clipVolumes', {
                                    ...settings.clipVolumes,
                                    [selectedVolumeKey()]: clipVolume(selectedVolumeKey()) ? 0 : 1,
                                  })
                                }
                              >
                                {clipVolume(selectedVolumeKey()) ? (
                                  <Volume2 size={18} />
                                ) : (
                                  <VolumeX size={18} />
                                )}
                              </button>
                              <input
                                aria-label="Selected clip volume level"
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(clipVolume(selectedVolumeKey()) * 100)}
                                onChange={(e) =>
                                  update('clipVolumes', {
                                    ...settings.clipVolumes,
                                    [selectedVolumeKey()]: +e.target.value / 100,
                                  })
                                }
                              />
                              <output>{Math.round(clipVolume(selectedVolumeKey()) * 100)}%</output>
                              <button
                                className="clip-volume-close"
                                aria-label="Close volume controls"
                                onClick={() => setClipVolumeOpen(false)}
                              >
                                ×
                              </button>
                            </div></InspectorControls>
                          )}
                          <TimelineViewport>
                          <div
                            className="ruler"
                            onClick={(e) => seekLane(e, 'timeline')}
                            role="slider"
                            tabIndex={0}
                            aria-label="Timeline playhead"
                            aria-valuemin={0}
                            aria-valuemax={timelineDuration}
                            aria-valuenow={time}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                e.preventDefault();
                                seek(time + (e.key === 'ArrowRight' ? 0.1 : -0.1));
                              }
                            }}
                          >
                            <span
                              className="ruler-playhead"
                              style={{ left: `calc(${(time / timelineDuration) * 100}% * var(--timeline-clip-scale, 1))` }}
                            />
                            <TimelineTicks duration={timelineDuration} />
                          </div>
                          {panel !== 'edit' ||
                          settings.primaryMedia === 'camera' ||
                          (source && settings.screenVisible !== false) ? (
                            <div className="track primary-screen-track" onDragOver={(e) => e.preventDefault()} onDrop={dropScreenClip} onClickCapture={(e) => seekLane(e, 'video')}>
                              <TimelineTrackLabel>
                                {settings.primaryMedia === 'camera' ? (
                                  <Camera size={14} />
                                ) : (
                                  <Monitor size={14} />
                                )}
                                <strong>
                                  {settings.primaryMedia === 'camera'
                                    ? 'Camera Video'
                                    : 'Screen'}
                                </strong>
                                {panel === 'edit' &&
                                  settings.primaryMedia !== 'camera' &&
                                  source && (
                                    <button
                                      className="track-remove"
                                      aria-label="Remove screen track"
                                      title="Remove screen track"
                                      disabled={recording || exporting}
                                      onClick={removeScreenTrack}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                              </TimelineTrackLabel>
                              <div className="segment-track">
                                {laneMarkers('video')}
                                {activeSegments.map((segment, i) => (
                                  <div className={`screen-clip-slot ${segment.gap ? 'timeline-gap-slot' : ''}`} key={segment.id}
                                    style={{flex: `${Math.max(0.25, segment.end - segment.start)} 1 0`}}
                                    aria-label={`Clip ${i + 1} time slot`}
                                  >
                                  {!segment.gap && <button type="button" className="clip-volume-shortcut" aria-label={`Volume for video clip ${i+1}`} title={`Volume for video clip ${i+1}`} onClick={e=>{e.stopPropagation();setSelectedSegment(i);setTimelineSelection('video');setClipVolumeOpen(true);if(mobileView)setMobileFeatureOpen(true);}}><Volume2 size={13}/></button>}
                                  <button
                                    className={`timeline-segment ${segment.hidden ? 'clip-picture-hidden' : ''} ${timelineSelection === 'video' && selectedSegment === i ? 'selected' : ''}`}
                                    style={{
                                      left: `${!recreated && settings.primaryMedia !== 'camera' ? (screenRange(segment).start - segment.start) / (segment.end - segment.start) * 100 : 0}%`,
                                      width: `${!recreated && settings.primaryMedia !== 'camera' ? (screenRange(segment).end - screenRange(segment).start) / (segment.end - segment.start) * 100 : 100}%`,
                                      minWidth: 0,
                                    }}
                                    draggable={!exporting && !segment.gap}
                                    aria-label={`Select timeline segment ${i + 1}`}
                                    onDragStart={(e) => {
                                      if ((e.target as HTMLElement).closest('.clip-edge')) {
                                        e.preventDefault();
                                        return;
                                      }
                                      const box = e.currentTarget.getBoundingClientRect();
                                      const range = screenRange(segment);
                                      draggedClipOffset.current = range.start - segment.start + (e.clientX - box.left) / Math.max(1, box.width) * (range.end - range.start);
                                      draggedSegment.current = i;
                                      e.dataTransfer.setData('text/plain', String(i));
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                      if ((e.target as HTMLElement).closest('.clip-edge')) return;
                                      setTimelineSelection('video');
                                      setSelectedCameraClip(null);
                                      setSelectedSegment(i);
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const fraction = Math.max(
                                        0,
                                        Math.min(1, (e.clientX - rect.left) / rect.width),
                                      );
                                      seek(
                                        durationOf(activeSegments.slice(0, i)) +
                                          (!recreated && settings.primaryMedia !== 'camera'
                                            ? screenRange(segment).start - segment.start + fraction * (screenRange(segment).end - screenRange(segment).start)
                                            : fraction * (segment.end - segment.start)),
                                      );
                                    }}
                                  >
                                    <span
                                      className="clip-edge left"
                                      role="slider"
                                      tabIndex={0}
                                      aria-label={`Trim start of clip ${i + 1}`}
                                      aria-valuemin={0}
                                      aria-valuemax={segment.end - 0.25}
                                      aria-valuenow={!recreated && settings.primaryMedia !== 'camera' ? screenRange(segment).start : segment.start}
                                      onPointerDown={(e) => beginTrim(e, i, 'start')}
                                      onKeyDown={(e) => {
                                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                          e.preventDefault();
                                          if (!recreated && settings.primaryMedia !== 'camera') {
                                            update('recordingSegments', activeSegments.map((s, j) => j === i
                                              ? trimScreenEdge(s, 'start', screenRange(s).start + (e.key === 'ArrowRight' ? 0.1 : -0.1)) : s));
                                            setCompletedExport(null);
                                            return;
                                          }
                                          saveSegments(
                                            activeSegments.map((s, j) =>
                                              j === i
                                                ? {
                                                    ...s,
                                                    start: Math.max(
                                                      0,
                                                      Math.min(
                                                        s.end - 0.25,
                                                        s.start +
                                                          (e.key === 'ArrowRight' ? 0.1 : -0.1),
                                                      ),
                                                    ),
                                                  }
                                                : s,
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <ClipWaveform url={(() => {const asset=settings.screenAssets?.find(a => segment.start >= a.start && segment.start < a.start+a.duration);return asset && asset.key !== 'screen' ? screenAssetURLs[asset.id] : source || undefined;})()} from={screenRange(segment).start-(settings.screenAssets?.find(a=>segment.start>=a.start&&segment.start<a.start+a.duration)?.start||0)} to={screenRange(segment).end-(settings.screenAssets?.find(a=>segment.start>=a.start&&segment.start<a.start+a.duration)?.start||0)}/>
                                    <Film size={14} />
                                    <span className="clip-label">
                                      {recreated
                                        ? activeChapters[i]?.label || 'Scene'
                                        : `${settings.primaryMedia === 'camera' ? 'Camera clip' : 'Video clip'} ${String(i + 1).padStart(2, '0')}`}
                                    </span>
                                    <small className="clip-duration">{clock(screenRange(segment).end-screenRange(segment).start)}</small>
                                    <span
                                      className="clip-edge right"
                                      role="slider"
                                      tabIndex={0}
                                      aria-label={`Trim end of clip ${i + 1}`}
                                      aria-valuemin={segment.start + 0.25}
                                      aria-valuemax={recreated ? websiteRawDuration : duration}
                                      aria-valuenow={!recreated && settings.primaryMedia !== 'camera' ? screenRange(segment).end : segment.end}
                                      onPointerDown={(e) => beginTrim(e, i, 'end')}
                                      onKeyDown={(e) => {
                                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                          e.preventDefault();
                                          if (!recreated && settings.primaryMedia !== 'camera') {
                                            update('recordingSegments', activeSegments.map((s, j) => j === i
                                              ? trimScreenEdge(s, 'end', screenRange(s).end + (e.key === 'ArrowRight' ? 0.1 : -0.1)) : s));
                                            setCompletedExport(null);
                                            return;
                                          }
                                          saveSegments(
                                            activeSegments.map((s, j) =>
                                              j === i
                                                ? {
                                                    ...s,
                                                    end: Math.max(
                                                      s.start + 0.25,
                                                      Math.min(
                                                        recreated ? websiteRawDuration : duration,
                                                        s.end +
                                                          (e.key === 'ArrowRight' ? 0.1 : -0.1),
                                                      ),
                                                    ),
                                                  }
                                                : s,
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                  </button>
                                  </div>
                                ))}
                                <div
                                  className="timeline-playhead"
                                  style={{
                                    left: `${(time / timelineDuration) * 100}%`,
                                    ...(panel === 'edit'
                                      ? {
                                          height:
                                            44 *
                                            (1 +
                                              (settings.primaryMedia !== 'camera' &&
                                              Boolean(camSource || settings.cameraTakes?.length)
                                                ? 1
                                                : 0) +
                                              (source && settings.primaryMedia !== 'camera'
                                                ? 1
                                                : 0) +
                                              (source &&
                                              settings.captionsEnabled !== false &&
                                              Boolean(settings.caption || settings.captions?.length)
                                                ? 1
                                                : 0) +
                                              (source &&
                                              Boolean(
                                                settings.musicName ||
                                                ((settings.demoAudio || defaultAudio).musicTrack ||
                                                  'none') !== 'none',
                                              )
                                                ? 1
                                                : 0)),
                                        }
                                      : {}),
                                  }}
                                />
                              </div>
                              {!recreated && (
                                <button
                                  type="button"
                                  className="lane-append-button"
                                  aria-label="Append screen clip"
                                  title="Append another recording or video"
                                  disabled={recording || exporting || joining}
                                  onClick={openAppendScreen}
                                >
                                  <Plus size={17} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="editor-lane">
                              <TimelineTrackLabel>
                                <Monitor size={14} />
                                <strong>Screen</strong>
                              </TimelineTrackLabel>
                              <div className="empty-track-actions">
                                <button aria-label="Add screen" title="Add screen"
                                  disabled={recording || exporting || joining}
                                  onClick={() => void startRecording(true)}
                                >
                                  {<Plus size={16} aria-hidden="true" />} </button>
                                <button
                                  disabled={recording || exporting}
                                  onClick={importScreenTrack}
                                >
                                  {source ? 'Import screen video' : 'Import video'}
                                </button>
                              </div>
                            </div>
                          )}
                          {!recreated &&
                            settings.primaryMedia !== 'camera' &&
                            settings.camera &&
                            Boolean(camSource || settings.cameraTakes?.length) && (
                              <div
                                className="camera-timeline-row"
                                aria-label="Camera track linked to screen clips"
                              >
                                <TimelineTrackLabel>
                                  <Camera size={15} />
                                  <strong>Camera</strong>
                                  <button
                                    className="track-add"
                                    aria-label="Add camera clip"
                                    onClick={openAppendCamera}
                                  >
                                    +
                                  </button>
                                  <button
                                    className="track-remove"
                                    aria-label="Remove camera track"
                                    disabled={cameraTake || exporting}
                                    onClick={() => {
                                      update('camera', false);
                                      setSelectedCameraClip(null);
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </TimelineTrackLabel>
                                <div
                                  className="camera-linked-track"
                                  onClickCapture={(e) => seekLane(e, 'camera')}
                                >
                                  {laneMarkers('camera')}
                                  {activeSegments.map((segment, i) => {
                                    const span = segment.end - segment.start;
                                    return (
                                      <div
                                        className="camera-linked-slot"
                                        key={segment.id}
                                        onClick={(e) => {
                                          if (cameraTake || cameraMoveClick.current) return;
                                          const box = e.currentTarget.getBoundingClientRect();
                                          setSelectedSegment(i);
                                          seek(
                                            durationOf(activeSegments.slice(0, i)) +
                                              ((e.clientX - box.left) / box.width) * span,
                                          );
                                        }}
                                        style={{
                                          position: 'relative',
                                          cursor: 'pointer',
                                          flex: `${Math.max(0.25, span)} 1 0`,
                                        }}
                                      >
                                        {allCameraClips()
                                          .filter(
                                            (take) =>
                                              take.end > segment.start && take.start < segment.end,
                                          )
                                          .map((take, n) => (
                                            <div
                                              key={take.id}
                                              className={`camera-linked-clip ${take.hidden ? 'clip-picture-hidden' : ''} ${timelineSelection === 'camera' && selectedCameraClip === take.id ? 'selected' : ''}`}
                                              onPointerDown={(e) => dragCameraClip(e, take.id)}
                                              onClick={(e) => {
                                                if (cameraMoveClick.current) {
                                                  e.stopPropagation();
                                                  cameraMoveClick.current = false;
                                                  return;
                                                }
                                                setTimelineSelection('camera');
                                                setSelectedCameraClip(take.id);
                                              }}
                                              style={{
                                                position: 'absolute',
                                                left: `${(Math.max(0, take.start - segment.start) / span) * 100}%`,
                                                width: `${(Math.max(0, Math.min(segment.end, take.end) - Math.max(segment.start, take.start)) / span) * 100}%`,
                                                background: n ? '#c4d8e9' : undefined,
                                              }}
                                              title={`Camera take · ${clock(take.start)}–${clock(take.end)}`}
                                            >
                                              <span
                                                className="camera-trim-edge left"
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) =>
                                                  dragCameraTrim(e, take.id, 'start', span)
                                                }
                                                aria-label="Trim camera start"
                                              >
                                                │
                                              </span>
                                              Camera
                                              <span
                                                className="camera-trim-edge right"
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) =>
                                                  dragCameraTrim(e, take.id, 'end', span)
                                                }
                                                aria-label="Trim camera end"
                                              >
                                                │
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                    );
                                  })}
                                  <div
                                    className="camera-track-playhead"
                                    aria-label="Camera playhead"
                                    style={{ left: `${(time / timelineDuration) * 100}%` }}
                                  >
                                    <span />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="lane-append-button camera-append-button"
                                  aria-label="Append camera PIP clip"
                                  disabled={recording || exporting || cameraTake || joining}
                                  onClick={openAppendCamera}
                                >
                                  <Plus size={17} />
                                </button>
                                <small>
                                  Drag camera clips to move · drag edges to trim · select to split
                                  or delete
                                </small>
                              </div>
                            )}
                          {panel === 'edit' &&
                            settings.primaryMedia !== 'camera' &&
                            (!settings.camera ||
                              !Boolean(camSource || settings.cameraTakes?.length)) && (
                              <div className="editor-lane">
                                <TimelineTrackLabel>
                                  <Camera size={14} />
                                  <strong>Camera</strong>
                                </TimelineTrackLabel>
                                <div className="empty-track-actions">
                                  <button aria-label="Add camera" title="Add camera"
                                    disabled={
                                      !source || cameraTake || exporting || recording || joining
                                    }
                                    onClick={openAppendCamera}
                                  >
                                    {<Plus size={16} aria-hidden="true" />} </button>
                                  <small>{!source ? 'Add screen footage first' : ''}</small>
                                </div>
                              </div>
                            )}
                          {panel === 'edit' && timelineSelection === 'camera' && cameraSetupOpen && (
                            <InspectorControls><div className="lane-inline-editor camera-lane-setup">
                              <div>
                                <strong>Add camera clip</strong>
                                <button
                                  aria-label="Close camera setup"
                                  onClick={() => setCameraSetupOpen(false)}
                                >
                                  ×
                                </button>
                              </div>
                              <p>Add a camera clip: import a video or image, or record a new camera take. Nothing records until you choose Record.</p>
                              <div className="lane-editor-actions">
                                <button
                                  disabled={
                                    exporting ||
                                    recording ||
                                    cameraTake ||
                                    !source ||
                                    importingCameraImage
                                  }
                                  onClick={() => cameraClipInput.current?.click()}
                                >
                                  <Upload size={13} />
                                  {importingCameraImage
                                    ? 'Preparing image…'
                                    : 'Import video or image'}
                                </button>
                                {Boolean(camSource || settings.cameraTakes?.length) && (
                                  <button
                                    onClick={() => {
                                      update('camera', true);
                                      setCameraSetupOpen(false);
                                    }}
                                  >
                                    Restore camera footage
                                  </button>
                                )}
                                <button
                                  disabled={
                                    mobileView || exporting || recording || cameraTake || !source
                                  }
                                  title={mobileView ? 'Import a camera clip on mobile' : undefined}
                                  onClick={() => {
                                    setCameraSetupOpen(false);
                                    void startCameraTake();
                                  }}
                                >
                                  <Camera size={13} />
                                  Record new camera take
                                </button>
                              </div>
                            </div></InspectorControls>
                          )}
                          {panel === 'edit' && (
                            <div className="editor-detail-tracks">
                              <div
                                className="editor-lane"
                                onClickCapture={(e) => seekLane(e, 'zoom')}
                              >
                                <TimelineTrackLabel>
                                  <ZoomIn size={14} />
                                  <button
                                    type="button"
                                    className="timeline-lane-select"
                                    aria-pressed={timelineSelection === 'zoom'}
                                    onClick={() => {setTimelineSelection('zoom');setZoomEditorClip(activeSegments[selectedSegment]?.id || null);}}
                                  >
                                    Zoom
                                  </button>
                                  {source &&
                                    settings.primaryMedia !== 'camera' &&
                                    settings.zoomTrackEnabled !== false && (
                                      <button
                                        className="track-remove"
                                        aria-label="Remove all zoom"
                                        disabled={exporting}
                                        onClick={() => {
                                          removeZoomTrack();
                                          setZoomEditorClip(null);
                                        }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                </TimelineTrackLabel>
                                {source &&
                                settings.primaryMedia !== 'camera' &&
                                settings.screenVisible !== false ? (
                                  <div className="editor-lane-slots">
                                    {laneMarkers('zoom')}
                                    {activeSegments.map((segment) => {
                                      const amount =
                                        settings.zoomTrackEnabled === false
                                          ? 1
                                          : timelineZoom(
                                              segment.id,
                                              settings.clipZooms,
                                              settings.zoom,
                                            ).amount;
                                      return (
                                        <div
                                          className="editable-lane-clip"
                                          style={{
                                            flex: Math.max(0.25, segment.end - segment.start),
                                          }}
                                          key={segment.id}
                                        >
                                          {amount > 1 ? (
                                            <>
                                              <button
                                                className={`editor-zoom-clip ${timelineSelection === 'zoom' && zoomEditorClip === segment.id ? 'active' : ''}`}
                                                disabled={exporting}
                                                style={featureTimingStyle('zoom:'+segment.id,segment.start,segment.end)}
                                                onPointerDown={e=>dragFeatureTiming(e,'zoom:'+segment.id,segment.start,segment.end)}
                                                onClick={() => {if(!featureDragClick.current)editTimelineZoom(segment.id);}}
                                              >
                                                {featureEdges('zoom:'+segment.id,segment.start,segment.end)}<span className="zoom-keyframe-label">◇ {amount.toFixed(2)}×</span>
                                              </button>
                                            </>
                                          ) : (
                                            <button aria-label="Add zoom" title="Add zoom"
                                              className="lane-add-clip"
                                              disabled={exporting}
                                              onClick={() => addTimelineZoom(segment.id)}
                                            >
                                              {<Plus size={16} aria-hidden="true" />} </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="empty-track-actions">
                                    <button aria-label="Add zoom" title="Add zoom" disabled onClick={addZoomTrack}>
                                      {<Plus size={16} aria-hidden="true" />} </button>
                                    <small>Add screen footage first</small>
                                  </div>
                                )}
                              </div>
                              {timelineSelection === 'zoom' && zoomEditorClip &&
                                source &&
                                settings.screenVisible !== false &&
                                settings.primaryMedia !== 'camera' && (
                                  <InspectorControls><div className="lane-inline-editor zoom-lane-editor">
                                    <div>
                                      <strong>
                                        Zoom · Clip{' '}
                                        {recordingSegments.findIndex(
                                          (segment) => segment.id === zoomEditorClip,
                                        ) + 1}
                                      </strong>
                                      <button
                                        aria-label="Close zoom editor"
                                        onClick={() => setZoomEditorClip(null)}
                                      >
                                        ×
                                      </button>
                                    </div>
                                    <label>
                                      Amount
                                      <input
                                        aria-label="Timeline zoom amount"
                                        type="range"
                                        min="1"
                                        max="4"
                                        step=".05"
                                        disabled={exporting}
                                        value={
                                          timelineZoom(
                                            zoomEditorClip,
                                            settings.clipZooms,
                                            settings.zoom,
                                          ).amount
                                        }
                                        onChange={(e) =>
                                          setTimelineZoom(zoomEditorClip, +e.target.value)
                                        }
                                      />
                                      <input
                                        aria-label="Timeline zoom multiplier"
                                        type="number"
                                        min="1"
                                        max="4"
                                        step=".05"
                                        disabled={exporting}
                                        value={Number(
                                          timelineZoom(
                                            zoomEditorClip,
                                            settings.clipZooms,
                                            settings.zoom,
                                          ).amount.toFixed(2),
                                        )}
                                        onChange={(e) => {
                                          if (Number.isFinite(e.target.valueAsNumber))
                                            setTimelineZoom(zoomEditorClip, e.target.valueAsNumber);
                                        }}
                                      />
                                      <span>×</span>
                                    </label>
                                    <div className="lane-editor-actions">
                                      <button
                                        disabled={exporting}
                                        onClick={() => {
                                          setTimelineZoom(zoomEditorClip, 1);
                                          setClipSettings((old) => ({
                                            ...old,
                                            autoZoom: false,
                                            zoomFollowsPath: false,
                                            focusX: 50,
                                            focusY: 50,
                                          }));
                                        }}
                                      >
                                        Fit
                                      </button>
                                      {[1.25, 1.5, 2, 3].map((amount) => (
                                        <button
                                          key={amount}
                                          disabled={exporting}
                                          onClick={() => setTimelineZoom(zoomEditorClip, amount)}
                                        >
                                          {amount}×
                                        </button>
                                      ))}
                                      <button
                                        disabled={exporting}
                                        onClick={() => {
                                          setTimelineZoom(zoomEditorClip, 1);
                                          setZoomEditorClip(null);
                                        }}
                                      >
                                        <Trash2 size={12} />
                                        Remove zoom
                                      </button>
                                    </div>
                                    <div className="zoom-follow-controls">
                                      <label className="auto-zoom-switch"><input type="checkbox" aria-label="Show cursor while following recorded path" checked={selectedClipEffectSettings().showCursor !== false} onChange={e => update('showCursor', e.target.checked)} /> Show cursor</label>
                                      <p className="pointer-help">Follow the recorded movement with the cursor visible or hidden.</p>
                                      <div className="pointer-zoom-heading">
                                        <strong>Follow & focus</strong>
                                        <button
                                          className="button quiet"
                                          disabled={!source || analyzing || exporting}
                                          onClick={() => void autoZoom()}
                                        >
                                          {analyzing
                                            ? `Analyzing ${analysisProgress}%`
                                            : 'Follow recorded path'}
                                        </button>
                                      </div>
                                      {selectedClipEffectSettings().focusPoints?.length ? (
                                        <label className="auto-zoom-switch">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(selectedClipEffectSettings().autoZoom)}
                                            onChange={(e) => update('autoZoom', e.target.checked)}
                                          />{' '}
                                          Auto zoom enabled
                                        </label>
                                      ) : null}
                                      {(!selectedClipEffectSettings().pointerMotion ||
                                        selectedClipEffectSettings().pointerMotion === 'manual') && (
                                        <>
                                          <label className="auto-zoom-switch">
                                            <input
                                              type="checkbox"
                                              checked={Boolean(selectedClipEffectSettings().zoomFollowsPath)}
                                              onChange={(e) =>
                                                setSettings((old) => ({
                                                  ...old,
                                                  zoomFollowsPath: e.target.checked,
                                                  zoom:
                                                    e.target.checked && old.zoom <= 1
                                                      ? 1.7
                                                      : old.zoom,
                                                }))
                                              }
                                            />{' '}
                                            Activity pointer auto zoom
                                          </label>
                                          {selectedClipEffectSettings().zoomFollowsPath && (
                                            <p className="pointer-help">
                                              Follow pointer movement with a smooth zoom.
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div></InspectorControls>
                                )}
                              <div
                                className="editor-lane"
                                onClickCapture={(e) => seekLane(e, 'captions')}
                              >
                                <TimelineTrackLabel>
                                  <Film size={14} />
                                  <strong>Captions</strong>
                                  {settings.captionsEnabled !== false &&
                                    Boolean(settings.caption || settings.captions?.length) && (
                                      <button
                                        className="track-remove"
                                        aria-label="Remove captions from composition"
                                        onClick={() => update('captionsEnabled', false)}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                </TimelineTrackLabel>
                                {source &&
                                settings.captionsEnabled !== false &&
                                (settings.caption || settings.captions?.length) ? (
                                  <div className="editor-lane-slots">
                                    {laneMarkers('captions')}
                                    {activeSegments.map((segment) => (
                                      <div
                                        className="editor-caption-slot"
                                        key={segment.id}
                                        style={{
                                          flex: Math.max(0.25, segment.end - segment.start),
                                        }}
                                      >
                                        {settings.caption && !settings.captions?.length ? (
                                          <button
                                            className="editor-caption-clip"
                                            aria-pressed={
                                              timelineSelection === 'caption' &&
                                              captionSelection === null
                                            }
                                            onClick={() => {
                                              setTimelineSelection('caption');
                                              setCaptionSelection(null);
                                              openCaptions();
                                            }}
                                          >
                                            {settings.caption}
                                          </button>
                                        ) : (
                                          (settings.captions || [])
                                            .filter(
                                              (c) => c.end > segment.start && c.start < segment.end,
                                            )
                                            .map((c, i) => (
                                              <button
                                                className="editor-caption-clip timed"
                                                onPointerDown={e => dragCaptionTiming(e, (settings.captions || []).indexOf(c))}
                                                aria-pressed={
                                                  timelineSelection === 'caption' &&
                                                  captionSelection ===
                                                    (settings.captions || []).indexOf(c)
                                                }
                                                key={i}
                                                title={`${clock(c.start)} – ${clock(c.end)} · ${c.text}`}
                                                style={{
                                                  left: `${(Math.max(0, c.start - segment.start) / (segment.end - segment.start)) * 100}%`,
                                                  width: `${((Math.min(c.end, segment.end) - Math.max(c.start, segment.start)) / (segment.end - segment.start)) * 100}%`,
                                                }}
                                                onClick={() => {
                                                  setTimelineSelection('caption');
                                                  setCaptionSelection(
                                                    (settings.captions || []).indexOf(c),
                                                  );
                                                  openCaptions();
                                                }}
                                              >
                                                <span className="feature-trim-edge start" onPointerDown={e=>dragCaptionTiming(e,(settings.captions || []).indexOf(c),'start')} />
                                                {c.text}
                                                <span className="feature-trim-edge end" onPointerDown={e=>dragCaptionTiming(e,(settings.captions || []).indexOf(c),'end')} />
                                              </button>
                                            ))
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-track-actions">
                                    {laneMarkers('captions')}
                                    <button aria-label="Add caption" title="Add caption"
                                      onClick={() => {
                                        openCaptions();
                                      }}
                                    >
                                      {<Plus size={16} aria-hidden="true" />} </button>
                                  </div>
                                )}
                              </div>
                              <div
                                className="editor-lane editor-music-lane"
                                onClickCapture={(e) => seekLane(e, 'music')}
                              >
                                <TimelineTrackLabel>
                                  <Music2 size={14} />
                                  <strong>Music</strong>
                                  <button
                                    className="track-add"
                                    aria-label="Add music"
                                    disabled={exporting}
                                    onClick={() => setMusicEditorOpen(true)}
                                  >
                                    +
                                  </button>
                                </TimelineTrackLabel>
                                <div className="editor-lane-slots">{laneMarkers('music')}
                                  {musicClips().map(clip=><div key={clip.id} className="editable-lane-clip music-independent-slot" style={featureTimingStyle('music:'+clip.id,0,displayDuration)}>
                                    <button className="editor-music-clip" aria-label={`Edit music clip ${clip.name||clip.track}`} onPointerDown={e=>dragFeatureTiming(e,'music:'+clip.id,0,displayDuration)} onClick={()=>{if(featureDragClick.current)return;setSelectedMusicClip(clip.id);setTimelineSelection('music');setMusicEditorOpen(true);update('musicName',clip.name);update('demoAudio',{...(settings.demoAudio||defaultAudio),musicTrack:clip.track,musicVolume:clip.volume});}}>
                                      {featureEdges('music:'+clip.id,0,displayDuration)}<Music2 size={13}/><span>{clip.name||clip.track}</span><small>{Math.round(clip.volume*100)}%</small>
                                    </button>
                                  </div>)}
                                </div>
                              </div>
                              {timelineSelection === 'music' && musicEditorOpen && (
                                <InspectorControls><div className="lane-inline-editor music-lane-editor">
                                  <div>
                                    <strong>Music</strong>
                                    <button
                                      aria-label="Close music editor"
                                      onClick={() => setMusicEditorOpen(false)}
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <div className="music-track-editor">
                                    <button
                                      disabled={exporting}
                                      onClick={() => musicInput.current?.click()}
                                    >
                                      <Upload size={13} />
                                      {settings.musicName
                                        ? 'Replace audio file'
                                        : 'Upload audio file'}
                                    </button>
                                    <select
                                      aria-label="Timeline music track"
                                      disabled={exporting}
                                      value={
                                        (settings.demoAudio || defaultAudio).musicTrack || 'none'
                                      }
                                      onChange={(e) => {
                                        soundPlayer.current.stop();
                                        if (e.target.value !== 'none') {
                                          musicBuffer.current = undefined;
                                          setMusicReady(false);
                                          update('musicName', undefined);

                                        }
                                        update('demoAudio', {
                                          ...(settings.demoAudio || defaultAudio),
                                          musicTrack: e.target.value as
                                            'none' | 'warm' | 'pulse' | 'ambient',
                                          musicVolume: 0.16,
                                        });
                                      }}
                                    >
                                      <option value="none">No built-in music</option>
                                      <option value="warm">Warm keys</option>
                                      <option value="pulse">Studio pulse</option>
                                      <option value="ambient">Soft atmosphere</option>
                                    </select>
                                    <label>
                                      Volume
                                      <input
                                        aria-label="Timeline music volume"
                                        type="range"
                                        min="0"
                                        max="1"
                                        step=".01"
                                        disabled={exporting}
                                        value={(settings.demoAudio || defaultAudio).musicVolume}
                                        onChange={(e) => {
                                          soundPlayer.current.stop();
                                          update('demoAudio', {
                                            ...(settings.demoAudio || defaultAudio),
                                            musicVolume: +e.target.value,
                                          });
                                        }}
                                      />
                                      <small>
                                        {Math.round(
                                          (settings.demoAudio || defaultAudio).musicVolume * 100,
                                        )}
                                        %
                                      </small>
                                    </label>
                                  </div>
                                  <label className="auto-zoom-switch"><input type="checkbox" checked={(settings.demoAudio||defaultAudio).effects} onChange={e=>update('demoAudio',{...(settings.demoAudio||defaultAudio),effects:e.target.checked})}/> Transition sound effects</label>
                                  <label>Effects volume <input aria-label="Transition effects volume" type="range" min="0" max=".6" step=".01" value={(settings.demoAudio||defaultAudio).effectVolume} onChange={e=>update('demoAudio',{...(settings.demoAudio||defaultAudio),effectVolume:+e.target.value})}/></label>
                                  <p>Apply to save this independent music clip. Drag either edge in the timeline to trim it.</p>
                                  <div className="lane-editor-actions">
                                    <button className="button lime" disabled={exporting} onClick={()=>{applyMusicClip();}}>Apply music</button>
                                    <button
                                      disabled={exporting}
                                      onClick={() => {
                                        setSettings(old=>({...old,musicClips:musicClips().filter(c=>c.id!==selectedMusicClip)}));
                                        setSelectedMusicClip(null);setMusicEditorOpen(false);
                                      }}
                                    >
                                      <Trash2 size={12} />
                                      Remove music
                                    </button>
                                  </div>
                                </div></InspectorControls>
                              )}
                            </div>
                          )}
                          {panel === 'edit' && !recreated && settings.primaryMedia !== 'camera' && (
                            <div className="editor-lane timeline-cursor-lane" onClickCapture={e=>seekLane(e,'cursor')}>
                              <TimelineTrackLabel>
                                <MousePointer2 size={14} />
                                <button
                                  type="button"
                                  className="timeline-lane-select"
                                  aria-expanded={timelineSelection === 'cursor' && cursorExpanded}
                                  onClick={() => {
                                    setTimelineSelection('cursor');
                                    setCursorExpanded(true);
                                  }}
                                >
                                  Cursor
                                </button>
                              </TimelineTrackLabel>
                              {activeSegments.some(segment => clipEffectSettings(settings, segment.id).cursorStyle && clipEffectSettings(settings, segment.id).cursorStyle !== 'none') ? (
                                <div className="editor-lane-slots cursor-timeline-slots">
                                  {activeSegments.map((segment, index) => (
                                    <div key={segment.id} className="cursor-timeline-slot" style={{flex: `${Math.max(.25, segment.end-segment.start)} 1 0`}}>
                                      {!segment.gap && screenRange(segment).end > screenRange(segment).start && (
                                        <button type="button" className="cursor-timeline-clip"
                                          onPointerDown={e=>dragFeatureTiming(e,'cursor:'+segment.id,segment.start,segment.end)}
                                          aria-label={`Edit ${clipEffectSettings(settings, segment.id).cursorStyle === 'auto' ? 'automatic' : clipEffectSettings(settings, segment.id).cursorStyle} cursor for clip ${index+1}`}
                                          onClick={() => {setSelectedSegment(index);setTimelineSelection('cursor');setCursorExpanded(true);}}
                                          style={featureTimingStyle('cursor:'+segment.id,segment.start,segment.end)}>
                                          {featureEdges('cursor:'+segment.id,segment.start,segment.end)}
                                          <MousePointer2 size={13} />
                                          <span>{clipEffectSettings(settings, segment.id).cursorStyle === 'auto' ? 'Automatic · Arrow / Hand / Text' : ({arrow:'Arrow',hand:'Hand',circle:'Circle',crosshair:'Crosshair',glow:'Soft glow',ring:'Ring',target:'Target',ibeam:'Text',none:'Hidden',auto:'Automatic'}[clipEffectSettings(settings, segment.id).cursorStyle || 'arrow'])}</span>
                                          <Check size={11} className="cursor-track-saved" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="empty-track-actions">
                                  <button type="button" aria-label="Add cursor" title="Add cursor" onClick={() => {setTimelineSelection('cursor');setCursorExpanded(true);}}><Plus size={16} /></button>
                                  <small>Select a cursor style to add it to the timeline</small>
                                </div>
                              )}
                            </div>
                          )}
                          {!recreated &&
                            settings.primaryMedia !== 'camera' &&
                            timelineSelection === 'cursor' && (
                              <InspectorControls><details
                                className="timeline-pointer-tools timeline-cursor-expandable pointer-inspector-enter"
                                open={cursorExpanded}
                                onToggle={(e) => setCursorExpanded(e.currentTarget.open)}
                              >
                                <summary>
                                  <MousePointer2 size={16} /> Pointer controls
                                  <span className="pointer-clip-label">
                                    Clip {selectedSegment + 1}
                                  </span>
                                </summary>
                                {portrait && (
                                  <div className="cursor-mobile-framing">
                                    <span>Mobile framing</span>
                                    <div role="group" aria-label="Mobile screen framing">
                                      {(
                                        [
                                          {
                                            id: 'fit',
                                            label: 'Fit entire screen',
                                            icon: Scan,
                                            help: 'Show the full recording without cropping.',
                                          },
                                          {
                                            id: 'follow',
                                            label: 'Follow pointer',
                                            icon: MousePointer2,
                                            help: 'Follow your pointer with gentle zoom up to 1.25×. Enable pointer-follow zoom below.',
                                          },
                                        ] as const
                                      ).map((mode) => (
                                        <button
                                          type="button"
                                          key={mode.id}
                                          title={mode.help}
                                          aria-label={mode.label}
                                          disabled={exporting}
                                          aria-pressed={
                                            (settings.mobileClipFraming?.[
                                              activeSegments[selectedSegment]?.id
                                            ] || 'fit') === mode.id
                                          }
                                          onClick={() => {
                                            const id = activeSegments[selectedSegment]?.id;
                                            if (id) {
                                              setClipSettings((old) => ({
                                                ...old,
                                                mobileClipFraming: {
                                                  ...old.mobileClipFraming,
                                                  [id]: mode.id,
                                                },
                                              }));
                                              cameraView.current = null;
                                            }
                                          }}
                                        >
                                          <mode.icon size={17} />
                                          <span>{mode.id === 'fit' ? 'Fit' : 'Follow'}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="manual-pointer-controls">
                                  <div
                                    className="pointer-mode-tabs"
                                    role="group"
                                    aria-label="Pointer movement"
                                  >
                                    {(
                                      [
                                        { id: 'manual', name: 'Draw path', icon: Route },
                                        { id: 'focus', name: 'Float at focus', icon: Sparkles },
                                        ...(settings.cursorTelemetry?.length
                                          ? [
                                              {
                                                id: 'recorded',
                                                name: 'Recorded cursor',
                                                icon: MousePointer2,
                                              },
                                            ]
                                          : []),
                                      ] as const
                                    ).map((mode) => (
                                      <button
                                        key={mode.id}
                                        aria-pressed={
                                          (selectedClipEffectSettings().pointerMotion || 'manual') === mode.id
                                        }
                                        onClick={() => {
                                          if (mode.id === 'focus') {
                                            setPointerFocusDraft({
                                              x: settings.focusX,
                                              y: settings.focusY,
                                            });
                                            focusPointerDialog.current?.showModal();
                                            setPointerMode('off');
                                            return;
                                          }
                                          update(
                                            'pointerMotion',
                                            mode.id as Settings['pointerMotion'],
                                          );
                                          setPointerMode('off');
                                        }}
                                      >
                                        <mode.icon size={16} />
                                        {mode.name}
                                      </button>
                                    ))}
                                  </div>
                                  {(!selectedClipEffectSettings().pointerMotion ||
                                    selectedClipEffectSettings().pointerMotion === 'manual') && (
                                    <div className="pointer-tool-buttons">
                                      <button
                                        className={`button quiet ${pointerMode === 'place' ? 'is-active' : ''}`}
                                        aria-pressed={pointerMode === 'place'}
                                        onClick={() => {
                                          setPointerMode(pointerMode === 'place' ? 'off' : 'place');
                                          previewCanvas.current?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center',
                                          });
                                        }}
                                      >
                                        <MousePointer2 size={15} />
                                        {pointerMode === 'place' ? 'Done' : 'Place'}
                                      </button>
                                      <button
                                        className={`button quiet ${pointerMode === 'record' ? 'is-active' : ''}`}
                                        aria-pressed={pointerMode === 'record'}
                                        onClick={() => {
                                          setPointerMode(
                                            pointerMode === 'record' ? 'off' : 'record',
                                          );
                                          previewCanvas.current?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center',
                                          });
                                        }}
                                      >
                                        <Route size={15} />
                                        {pointerMode === 'record' ? 'Finish path' : 'Draw movement'}
                                      </button>
                                      <button
                                        className={`button quiet ${pointerMode === 'live' ? 'is-active' : ''}`}
                                        aria-pressed={pointerMode === 'live'}
                                        onClick={() => {
                                          setPointerMode(pointerMode === 'live' ? 'off' : 'live');
                                          previewCanvas.current?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center',
                                          });
                                        }}
                                      >
                                        <Play size={15} />
                                        Record with playback
                                      </button>
                                      <button
                                        className="pointer-clear"
                                        disabled={
                                          !settings.manualPointer?.[
                                            activeSegments[selectedSegment]?.id
                                          ]?.length
                                        }
                                        onClick={() => {
                                          const id = activeSegments[selectedSegment]?.id;
                                          if (id)
                                            setClipSettings((old) => ({
                                              ...old,
                                              manualPointer: { ...old.manualPointer, [id]: [] },
                                            }));
                                          setPointerMode('off');
                                        }}
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  )}
                                  <div className="pointer-design-row">
                                    <div
                                      className="pointer-shape-options"
                                      role="group"
                                      aria-label="Pointer shape"
                                    >
                                      {(
                                        [
                                          { id: 'auto', name: 'Automatic', icon: Sparkles },
                                          { id: 'arrow', name: 'Arrow', icon: MousePointer2 },
                                          { id: 'hand', name: 'Hand', icon: Hand },
                                          { id: 'circle', name: 'Circle', icon: Circle },
                                          { id: 'crosshair', name: 'Crosshair', icon: Crosshair },
                                          { id: 'glow', name: 'Soft glow', icon: Sparkles },
                                          { id: 'ring', name: 'Ring', icon: Circle },
                                          { id: 'target', name: 'Target', icon: Target },
                                          { id: 'none', name: 'Hide pointer', icon: Ban },
                                        ] as const
                                      ).map((shape) => (
                                        <button
                                          key={shape.id}
                                          title={shape.name}
                                          aria-label={shape.name}
                                          aria-pressed={
                                            (selectedClipEffectSettings().cursorStyle || 'arrow') === shape.id
                                          }
                                          onClick={() => setClipSettings((old) => ({ ...old, cursorStyle: shape.id, ...(shape.id === 'auto' && old.cursorTelemetry?.length ? {pointerMotion: 'recorded' as const, autoZoom: true, zoomSource: 'cursor' as const} : {}) }))}
                                        >
                                          <PointerPreview style={shape.id} />
                                          <span>{shape.name === 'Hide pointer' ? 'Hidden' : shape.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                    <label className="pointer-size-control">
                                      Size
                                      <input
                                        aria-label="Timeline pointer size"
                                        type="range"
                                        min="12"
                                        max="80"
                                        value={selectedClipEffectSettings().cursorSize || 28}
                                        onChange={(e) => update('cursorSize', +e.target.value)}
                                      />
                                      <span>{selectedClipEffectSettings().cursorSize || 28}px</span>
                                    </label>
                                    <button type="button" className="save-cursor-button" aria-label="Save cursor selection"
                                      onClick={() => {
                                        localStorage.setItem('frame-settings', JSON.stringify(settings));
                                        setPointerMode('off');
                                        setCursorExpanded(false);
                                        announce('Cursor selection saved.');
                                      }}>
                                      <Check size={16} /> Save cursor
                                    </button>
                                  </div>
                                  <label className="auto-zoom-switch"><input type="checkbox" aria-label="Show cursor" checked={selectedClipEffectSettings().showCursor !== false} onChange={e => update('showCursor', e.target.checked)} /> Show cursor</label>
                                  <p className="pointer-help" role="status">
                                    {selectedClipEffectSettings().pointerMotion === 'recorded'
                                      ? selectedClipEffectSettings().cursorStyle === 'auto' ? 'Follows the recorded cursor and switches between arrow, hand, and text when shape data is available.' : 'Uses your recorded cursor movement.'
                                      : selectedClipEffectSettings().pointerMotion === 'focus'
                                        ? 'Floats gently around the zoom focal point.'
                                        : pointerMode === 'live'
                                          ? 'Hold and drag in the preview. The clip plays while your movement is recorded at video time. Release to save.'
                                          : pointerMode === 'place'
                                            ? 'Drag in the preview to position your pointer.'
                                            : pointerMode === 'record'
                                              ? 'Hold and drag in the preview to draw. Drag either endpoint to refine the path.'
                                              : 'Place a pointer or draw its movement for this clip.'}
                                  </p>
                                  <details className="timeline-cursor-calibration">
                                    <summary>Replace a cursor already in the video</summary>
                                    <p className="cursor-repair-description">
                                      For uploaded footage with a visible cursor. Select it in the
                                      preview to attempt replacement; small or fast cursors may lose
                                      tracking. Not needed for extension cursor data.
                                    </p>
                                    {settings.cursorSeed && !settings.replaceCursor && (
                                      <button
                                        className="button quiet repair-action"
                                        onClick={() => update('replaceCursor', true)}
                                      >
                                        Use saved selection
                                      </button>
                                    )}
                                    <div className="cursor-status">
                                      {settings.replaceCursor && cursorReplacer.current?.initialized
                                        ? cursorConfidence >= 0.94
                                          ? 'Cursor detected · replacement active'
                                          : 'Cursor match uncertain · replacement paused'
                                        : settings.capturedCursorHidden
                                          ? 'Cursor-free recording'
                                          : 'Select the recorded cursor to enable replacement'}
                                    </div>
                                    <div className="cursor-repair-tools">
                                      <label className="pointer-size-control">
                                        Recorded cursor width
                                        <input
                                          aria-label="Original cursor width"
                                          type="range"
                                          min="12"
                                          max="64"
                                          value={originalCursorSize}
                                          onChange={(e) => setOriginalCursorSize(+e.target.value)}
                                        />
                                        <span>{originalCursorSize}px</span>
                                      </label>
                                      <button
                                        className="button quiet repair-action"
                                        disabled={!source || exporting || generating}
                                        onClick={() => {
                                          video.current?.pause();
                                          camera.current?.pause();
                                          setPlaying(false);
                                          setPanel('edit');
                                          update('replaceCursor', false);
                                          setPickingCursor(!pickingCursor);
                                          if (!pickingCursor)
                                            requestAnimationFrame(() =>
                                              previewCanvas.current?.scrollIntoView({
                                                block: 'center',
                                                behavior: 'smooth',
                                              }),
                                            );
                                        }}
                                      >
                                        <MousePointer2 size={14} />
                                        {pickingCursor
                                          ? 'Cancel selection'
                                          : 'Pick cursor in preview'}
                                      </button>
                                      {pickingCursor && (
                                        <p>
                                          Click the top-left tip of the original arrow. Choose a
                                          frame with a clear background.
                                        </p>
                                      )}
                                      {cursorReplacer.current?.initialized && (
                                        <label className="auto-zoom-switch">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(settings.replaceCursor)}
                                            onChange={(e) =>
                                              update('replaceCursor', e.target.checked)
                                            }
                                          />{' '}
                                          Replace original cursor
                                        </label>
                                      )}
                                    </div>
                                  </details>
                                </div>
                              </details></InspectorControls>
                            )}
                          </TimelineViewport>

                        </Timeline>
                      ))}
                    {panel !== 'edit' && recreated && (
                      <StudioStoryboard
                        revision={settings}
                        chapters={activeChapters}
                        time={time}
                        duration={websiteDuration}
                        playing={playing}
                        disabled={exporting}
                        draw={(ctx, t) => {
                          if (settings.websiteDemo?.motion)
                            renderTemplate(
                              ctx,
                              mapSegments(websiteSegments, t).time,
                              demoCopy,
                              settings.websiteDemo,
                              settings.websiteDemo.motion.template || 'cinematic',
                            );
                          else demoRenderer(ctx, t, demoCopy);
                        }}
                        seek={(t) => {
                          demoPlaying.current = false;
                          setPlaying(false);
                          soundPlayer.current.stop();
                          seek(t);
                        }}
                        toggle={() => void togglePlay()}
                        headline={demoCopy.query}
                        subcopy={demoCopy.filename}
                        setHeadline={(value) => update('demoQuery', value)}
                        setSubcopy={(value) => update('demoFilename', value)}
                      />
                    )}
                  </section>
                  <aside className={`inspector ${mobileFeatureOpen ? 'mobile-feature-open' : ''}`} role={mobileFeatureOpen&&mobileView?'dialog':undefined} aria-modal={undefined} aria-label="Feature settings">
                    <div className="mobile-feature-heading"><strong>Feature settings</strong><button type="button" onClick={()=>setMobileFeatureOpen(false)}>Done</button></div>
                    <div id="feature-inspector" />{panel === 'edit' && timelineSelection === 'caption' && <section className="control-section"><h3>Captions</h3>{captionControls()}</section>}
                    {panel !== 'edit' && <div className="inspector-section-title">Studio Inspector</div>}
                    {panel === 'edit' ? (
                      <>
                        <div className="desktop-canvas-background" hidden={timelineSelection !== 'video'}>
                          <details className="inspector-accordion" open><summary>Canvas background</summary>{canvasBackgroundControls()}</details>
                          <details className="inspector-accordion" open><summary>Screen appearance</summary><div className="control-section screen-appearance-controls">
                            <h3>Screen appearance</h3>
                            <label>Corner roundness <output>{settings.screenRadius ?? 18}px</output>
                              <input aria-label="Screen corner roundness" type="range" min="0" max="120" value={settings.screenRadius ?? 18} onChange={e => update('screenRadius', Number(e.target.value))}/>
                            </label>
                            <div className="layout-size-presets"><button onClick={() => update('screenRadius', 0)}>Sharp</button><button onClick={() => update('screenRadius', 18)}>Rounded</button><button onClick={() => update('screenRadius', 80)}>Soft</button></div>
                            <label>Shadow intensity <output>{settings.screenShadow ?? 0}%</output>
                              <input aria-label="Screen shadow intensity" type="range" min="0" max="100" value={settings.screenShadow ?? 0} onChange={e => update('screenShadow', Number(e.target.value))}/>
                            </label>
                          </div></details>
                        </div>
                        {timelineSelection === 'camera' && Boolean(camSource || settings.cameraTakes?.length) && (
                          <div className="control-section">
                            <h3>
                              {settings.primaryMedia === 'camera'
                                ? 'Camera recording'
                                : 'Camera overlay'}
                              {settings.primaryMedia !== 'camera' && (
                                <button
                                  className={`tiny-toggle ${settings.camera ? 'on' : ''}`}
                                  aria-label="Toggle camera overlay"
                                  onClick={() => update('camera', !settings.camera)}
                                />
                              )}
                            </h3>
                            <p>
                              {settings.primaryMedia === 'camera'
                                ? 'Adjust your camera framing, shape, size and position.'
                                : camSource
                                  ? portrait
                                    ? 'Fit the full recording in a mobile canvas. Place your camera over the screen or outside it.'
                                    : 'Camera floats over your recording. Choose its shape, size and corner.'
                                  : 'Enable Camera before recording to capture your presenter separately.'}
                            </p>
                            <label className="camera-cutout-toggle">
                              <input type="checkbox" checked={Boolean(settings.cameraCutout)} onChange={e => update('cameraCutout', e.target.checked)} />
                              <span>Camera cutout<small>{settings.cameraCutout && cutoutStatus === 'loading' ? 'Preparing…' : settings.cameraCutout && cutoutStatus === 'error' ? 'Could not start · try again' : 'Remove the background · processed on this device'}</small></span>
                            </label>
                            {settings.camera &&
                              Boolean(camSource || settings.cameraTakes?.length) && (
                                <details className="camera-framing" open>
                                  <summary>Camera framing</summary>
                                  <p>
                                    Detect your face to position the illustrated guide from your
                                    camera footage. Drag the crosshair to refine the crop.
                                  </p>
                                  <div
                                    className="camera-focus-reference"
                                    onPointerDown={cameraFocusDrag}
                                    aria-label="Camera crop focus reference"
                                  >
                                    <svg
                                      className="camera-framing-person"
                                      viewBox="0 0 320 180"
                                      role="img"
                                      aria-label="Illustrated person for framing reference"
                                    >
                                      <rect width="320" height="180" fill="#edf1e7" />
                                      <circle cx="267" cy="36" r="52" fill="#dce5cf" />
                                      <circle cx="43" cy="167" r="68" fill="#e0e8d8" />
                                      <g
                                        transform={
                                          detectedFace
                                            ? `translate(${detectedFace.x * 3.2 - 160} ${detectedFace.y * 1.8 - 76})`
                                            : undefined
                                        }
                                      >
                                        <g className="framing-person-motion">
                                          <path
                                            d="M103 180v-22c0-32 23-49 57-49s57 17 57 49v22"
                                            fill="#75886a"
                                          />
                                          <path
                                            d="M146 105h28v23c-7 10-21 10-28 0"
                                            fill="#d49b7e"
                                          />
                                          <ellipse
                                            cx="160"
                                            cy="76"
                                            rx="35"
                                            ry="43"
                                            fill="#e5b497"
                                          />
                                          <path
                                            d="M125 78c-14-48 18-64 39-61 33 0 46 30 31 66l-8-37c-19 9-35 5-44-4l-13 36"
                                            fill="#38453e"
                                          />
                                          <circle cx="147" cy="77" r="3" fill="#38453e" />
                                          <circle cx="173" cy="77" r="3" fill="#38453e" />
                                          <path
                                            d="M151 96q9 8 18 0"
                                            fill="none"
                                            stroke="#9f6356"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                          />
                                          <path
                                            d="M159 79l-3 10h6"
                                            fill="none"
                                            stroke="#c58f73"
                                            strokeWidth="2"
                                          />
                                        </g>
                                      </g>
                                    </svg>
                                    <span
                                      className="camera-focus-crosshair"
                                      style={{
                                        left: `${settings.cameraFocusX ?? 50}%`,
                                        top: `${settings.cameraFocusY ?? 50}%`,
                                      }}
                                    >
                                      +
                                    </span>
                                  </div>
                                  <button
                                    className="button quiet"
                                    disabled={detectingFace || cameraTake}
                                    onClick={() => void focusCameraFace()}
                                  >
                                    {detectingFace ? 'Detecting face…' : 'Focus on face'}
                                  </button>
                                  <small>
                                    {detectedFace
                                      ? 'Illustration positioned from the detected face.'
                                      : 'Model downloads on first use. Camera frames stay in this browser.'}
                                  </small>
                                  <label>
                                    Horizontal focus
                                    <input
                                      aria-label="Camera horizontal focus"
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={settings.cameraFocusX ?? 50}
                                      onChange={(e) => update('cameraFocusX', +e.target.value)}
                                    />
                                  </label>
                                  <label>
                                    Vertical focus
                                    <input
                                      aria-label="Camera vertical focus"
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={settings.cameraFocusY ?? 50}
                                      onChange={(e) => update('cameraFocusY', +e.target.value)}
                                    />
                                  </label>
                                  <button
                                    className="button quiet"
                                    onClick={() =>
                                      setSettings((old) => ({
                                        ...old,
                                        cameraFocusX: 50,
                                        cameraFocusY: 50,
                                      }))
                                    }
                                  >
                                    Center framing
                                  </button>
                                </details>
                              )}
                            {settings.primaryMedia !== 'camera' &&
                              settings.camera &&
                              Boolean(camSource || settings.cameraTakes?.length) && (
                                <>
                                  <div
                                    className="camera-shapes"
                                    role="group"
                                    aria-label="Camera frame shape"
                                  >
                                    {(
                                      [
                                        { id: 'circle', label: 'Circle' },
                                        { id: 'rounded', label: 'Rounded' },
                                        { id: 'square', label: 'Square' },
                                      ] as const
                                    ).map((shape) => (
                                      <button
                                        aria-pressed={
                                          (settings.cameraShape || 'circle') === shape.id
                                        }
                                        key={shape.id}
                                        onClick={() =>
                                          setSettings((old) => ({
                                            ...old,
                                            cameraShape: shape.id,
                                            ...(shape.id === 'circle'
                                              ? { cameraRatio: '1:1' as const }
                                              : {}),
                                          }))
                                        }
                                      >
                                        <span className={`camera-shape-preview ${shape.id}`} />
                                        {shape.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div
                                    className="camera-ratios"
                                    role="group"
                                    aria-label="Camera aspect ratio"
                                  >
                                    {(['1:1', '4:3', '16:9', '9:16'] as const).map((ratio) => (
                                      <button
                                        key={ratio}
                                        aria-pressed={(settings.cameraRatio || '1:1') === ratio}
                                        onClick={() =>
                                          setSettings((old) => ({
                                            ...old,
                                            cameraRatio: ratio,
                                            cameraSize:
                                              ratio === '9:16'
                                                ? Math.min(old.cameraSize || 170, 300)
                                                : old.cameraSize,
                                            cameraShape:
                                              ratio !== '1:1' && old.cameraShape !== 'rounded'
                                                ? 'square'
                                                : old.cameraShape,
                                          }))
                                        }
                                      >
                                        <span style={{ aspectRatio: ratio.replace(':', ' / ') }} />
                                        {ratio}
                                      </button>
                                    ))}
                                  </div>
                                  {
                                    <div
                                      className="camera-layout"
                                      role="group"
                                      aria-label="Camera placement"
                                    >
                                      {(['outside', 'overlay'] as const).map((layout) => (
                                        <button
                                          className={`button quiet ${(settings.mobileCameraLayout || (portrait ? 'outside' : 'overlay')) === layout ? 'selected' : ''}`}
                                          aria-pressed={
                                            (settings.mobileCameraLayout ||
                                              (portrait ? 'outside' : 'overlay')) === layout
                                          }
                                          key={layout}
                                          onClick={() => setCameraPlacement(layout)}
                                        >
                                          {layout === 'outside' ? 'Outside screen' : 'Overlay'}
                                        </button>
                                      ))}
                                    </div>
                                  }
                                  {settings.camera &&
                                    Boolean(camSource || settings.cameraTakes?.length) && (
                                      <div
                                        className="camera-placement"
                                        role="group"
                                        aria-label="Camera position"
                                      >
                                        {(
                                          [
                                            'top-left',
                                            'top-center',
                                            'top-right',
                                            'bottom-left',
                                            'bottom-center',
                                            'bottom-right',
                                          ] as const
                                        ).map((position) => (
                                          <button
                                            key={position}
                                            title={position.replace('-', ' ')}
                                            aria-label={`Camera ${position.replace('-', ' ')}`}
                                            aria-pressed={
                                              ((settings.mobileCameraLayout ||
                                                (portrait ? 'outside' : 'overlay')) === 'outside'
                                                ? settings.mobileCameraPosition || 'bottom-center'
                                                : settings.cameraPosition || 'bottom-right') ===
                                              position
                                            }
                                            onClick={() => setCameraPlacement(settings.mobileCameraLayout || (portrait ? 'outside' : 'overlay'), position)}
                                          >
                                            <span className={position} />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                </>
                              )}
                          </div>
                        )}
                      </>
                    ) : panel === 'website' || recreated ? (
                      <>
                        <div className="control-section template-picker">
                          <h3>Motion Preset</h3>
                          <p>
                            Keep the source content and switch the visual language of the animation.
                          </p>
                          <div className="template-gallery">
                            {demoTemplates.map((template) => (
                              <button
                                key={template.id}
                                className={`template-choice ${(settings.websiteDemo?.motion?.template || chosenTemplate) === template.id ? 'chosen' : ''}`}
                                disabled={exporting || importingWebsite}
                                onClick={() => {
                                  setChosenTemplate(template.id);
                                  setUseAI(template.id === 'ai');
                                  if (settings.websiteDemo) {
                                    const current = settings.websiteDemo!;
                                    update('websiteDemo', {
                                      ...current,
                                      motion: {
                                        ...current.motion,
                                        assets:
                                          current.motion?.assets ||
                                          current.storyboard?.assets ||
                                          [],
                                        catalog:
                                          current.motion?.catalog || current.assetCatalog || [],
                                        template: template.id,
                                      },
                                    });
                                    setRecreated(true);
                                  }
                                }}
                              >
                                <span
                                  className={`template-art ${template.id}`}
                                  style={{ background: template.color }}
                                >
                                  <i />
                                  <i />
                                  <i />
                                </span>
                                <strong>{template.name}</strong>
                                <small>{template.description}</small>
                              </button>
                            ))}
                          </div>
                          <details className="stitch-tools">
                            <summary>Use a Google Stitch design</summary>
                            <p>Upload design screens to guide the same animation engine.</p>
                            <a
                              href="https://stitch.withgoogle.com/"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Google Stitch ↗
                            </a>
                            <button
                              className="button quiet"
                              disabled={!settings.websiteDemo}
                              onClick={() => designInput.current?.click()}
                            >
                              Upload design screens
                            </button>
                            {settings.websiteDemo?.motion?.designScreens?.length ? (
                              <small>
                                {settings.websiteDemo.motion.designScreens.length} design screens
                                loaded
                              </small>
                            ) : null}
                          </details>
                        </div>
                        <div className="control-section recreated-controls">
                          {panel === 'website' ? (
                            <>
                              <h3>Create website demo</h3>
                              <label className="website-url-field">
                                Website URL
                                <input
                                  aria-label="Website URL"
                                  type="url"
                                  placeholder="https://your-website.com"
                                  value={websiteURL}
                                  onChange={(e) => setWebsiteURL(e.target.value)}
                                />
                              </label>
                              {chosenTemplate === 'ai' && !aiConfigured && (
                                <small>
                                  Add your Groq key in AI settings to use this storyboard.
                                </small>
                              )}
                              <button
                                className="button lime"
                                disabled={
                                  !websiteURL ||
                                  importingWebsite ||
                                  exporting ||
                                  recording ||
                                  (chosenTemplate === 'ai' && !aiConfigured)
                                }
                                onClick={() => void generateWebsiteDemo()}
                              >
                                {importingWebsite ? 'Creating demo…' : 'Generate demo'}
                              </button>
                              {settings.websiteDemo && (
                                <>
                                  <p>
                                    Source:{' '}
                                    <a
                                      href={settings.websiteDemo.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {new URL(settings.websiteDemo.url).hostname}
                                    </a>{' '}
                                    · {settings.websiteDemo.sections.length} sections
                                  </p>
                                  <button
                                    className="button quiet"
                                    disabled={exporting}
                                    onClick={startRecreated}
                                  >
                                    Play saved website demo
                                  </button>
                                </>
                              )}
                              <small className="website-source-note">
                                Uses content from public website pages.
                              </small>
                            </>
                          ) : (
                            <>
                              <h3>Uploaded media → animated demo</h3>
                              <p>
                                {settings.uploadName || 'Your uploaded media'} · real frames and
                                visual crops, styled with the same storyboard engine.
                              </p>
                              <button
                                className="button quiet"
                                disabled={exporting || generating}
                                onClick={() => {
                                  setRecreated(false);
                                  demoPlaying.current = false;
                                  soundPlayer.current.stop();
                                  setPlaying(false);
                                  recordSegment.current = 0;
                                  if (video.current)
                                    seekMediaTime(video.current, recordingSegments[0].start);
                                  if (camera.current)
                                    camera.current.currentTime = recordingSegments[0].start;
                                  setTime(0);
                                }}
                              >
                                Back to uploaded media
                              </button>
                              <button
                                className="button lime"
                                disabled={exporting || generating || !source}
                                onClick={() => void generateUploadDemo()}
                              >
                                Make animation again
                              </button>
                            </>
                          )}
                        </div>
                        <div className="control-section recreated-controls" hidden={!recreated}>
                          <h3>
                            {settings.websiteDemo?.sourceType
                              ? 'Animation settings'
                              : 'Website demo settings'}
                          </h3>
                          {recreated && (
                            <>
                              <label>
                                {settings.websiteDemo?.sourceType ? 'Story name' : 'Website name'}
                                <input
                                  aria-label="Demo website name"
                                  value={demoCopy.brand}
                                  onChange={(e) => update('demoBrand', e.target.value)}
                                />
                              </label>
                              <label>
                                Hero headline
                                <input
                                  aria-label="Demo search text"
                                  value={demoCopy.query}
                                  onChange={(e) => update('demoQuery', e.target.value)}
                                />
                              </label>
                              <label>
                                Supporting line
                                <input
                                  aria-label="Demo filename"
                                  value={demoCopy.filename}
                                  onChange={(e) => update('demoFilename', e.target.value)}
                                />
                              </label>
                              <label>
                                Closing headline
                                <input
                                  aria-label="Demo closing headline"
                                  value={demoCopy.headline}
                                  onChange={(e) => update('demoHeadline', e.target.value)}
                                />
                              </label>
                              <label>
                                Animated pointer
                                <select
                                  aria-label="Demo pointer"
                                  value={demoCopy.pointer}
                                  onChange={(e) =>
                                    update('cursorStyle', e.target.value as Settings['cursorStyle'])
                                  }
                                >
                                  <option value="circle">Circle</option>
                                  <option value="arrow">Arrow</option>
                                  <option value="crosshair">Crosshair</option>
                                  <option value="glow">Soft glow</option>
                                  <option value="ring">Ring</option>
                                  <option value="hand">Hand</option>
                                  <option value="target">Target</option>
                                  <option value="none">None</option>
                                </select>
                              </label>
                              <input
                                aria-label="Demo pointer size"
                                type="range"
                                min="12"
                                max="64"
                                value={demoCopy.size}
                                onChange={(e) => update('cursorSize', +e.target.value)}
                              />
                              {settings.websiteDemo?.storyboard && (
                                <details>
                                  <summary>Edit AI scene components</summary>
                                  {settings.websiteDemo.storyboard.scenes.map((scene, si) => (
                                    <div key={si}>
                                      <h3>{scene.title}</h3>
                                      {scene.components.map((component, ci) =>
                                        component.text && component.binding === 'none' ? (
                                          <label key={ci}>
                                            Component {ci + 1}
                                            <textarea
                                              aria-label={`${scene.title} AI component ${ci + 1}`}
                                              value={component.text}
                                              onChange={(e) =>
                                                update('websiteDemo', {
                                                  ...settings.websiteDemo!,
                                                  storyboard: {
                                                    ...settings.websiteDemo!.storyboard!,
                                                    scenes:
                                                      settings.websiteDemo!.storyboard!.scenes.map(
                                                        (sc, i) =>
                                                          i === si
                                                            ? {
                                                                ...sc,
                                                                components: sc.components.map(
                                                                  (co, j) =>
                                                                    j === ci
                                                                      ? {
                                                                          ...co,
                                                                          text: e.target.value,
                                                                        }
                                                                      : co,
                                                                ),
                                                              }
                                                            : sc,
                                                      ),
                                                  },
                                                })
                                              }
                                            />
                                          </label>
                                        ) : null,
                                      )}
                                    </div>
                                  ))}
                                </details>
                              )}
                              {settings.websiteDemo?.aiPlan?.length ? (
                                <details className="ai-component-editor" open>
                                  <summary>Edit generated stickers and moving features</summary>
                                  {settings.websiteDemo.aiPlan!.map((scene, si) => (
                                    <div className="ai-component-row" key={si}>
                                      <strong>
                                        Scene {si + 1} · {clock(scene.start)}–{clock(scene.end)}
                                      </strong>
                                      <label>
                                        Sticker
                                        <select
                                          value={scene.sticker}
                                          onChange={(e) => {
                                            const current = settings.websiteDemo!;
                                            const aiPlan = current.aiPlan!.map((item, i) =>
                                              i === si
                                                ? { ...item, sticker: e.target.value }
                                                : item,
                                            );
                                            update('websiteDemo', { ...current, aiPlan });
                                          }}
                                        >
                                          <option>none</option>
                                          <option>click-ripple</option>
                                          <option>upload-callout</option>
                                          <option>search-callout</option>
                                          <option>feature-badge</option>
                                          <option>highlight-ring</option>
                                          <option>arrow</option>
                                          <option>close-up</option>
                                          <option>ping-pong-ball</option>
                                          <option>sparkle</option>
                                          <option>ribbon</option>
                                          <option>badge</option>
                                          <option>starburst</option>
                                          <option>orbit</option>
                                          <option>confetti</option>
                                        </select>
                                      </label>
                                      <label>
                                        Moving feature text
                                        <textarea
                                          value={scene.caption}
                                          onChange={(e) => {
                                            const current = settings.websiteDemo!;
                                            const aiPlan = current.aiPlan!.map((item, i) =>
                                              i === si
                                                ? { ...item, caption: e.target.value }
                                                : item,
                                            );
                                            update('websiteDemo', { ...current, aiPlan });
                                          }}
                                        />
                                      </label>
                                      <label>
                                        Scene title
                                        <input
                                          value={scene.title}
                                          onChange={(e) => {
                                            const current = settings.websiteDemo!;
                                            const aiPlan = current.aiPlan!.map((item, i) =>
                                              i === si ? { ...item, title: e.target.value } : item,
                                            );
                                            update('websiteDemo', { ...current, aiPlan });
                                          }}
                                        />
                                      </label>
                                    </div>
                                  ))}
                                </details>
                              ) : null}
                              {settings.websiteDemo?.motion?.template === 'ai' && (
                                <div className="creative-studio-controls">
                                  <label>
                                    Creative direction
                                    <textarea
                                      placeholder="e.g. playful bouncing shapes, bold purple UI, flowing connectors"
                                      value={creativeBrief}
                                      onChange={(e) => setCreativeBrief(e.target.value)}
                                    />
                                  </label>
                                  <button
                                    className="button lime"
                                    disabled={generating || exporting}
                                    onClick={() => void regenerateCreative()}
                                  >
                                    <Sparkles size={15} />
                                    {generating
                                      ? 'Creating vectors…'
                                      : settings.websiteDemo.creative
                                        ? 'Create a new variation'
                                        : 'Generate custom components'}
                                  </button>
                                  {settings.websiteDemo.creative && (
                                    <>
                                      <p>
                                        {settings.websiteDemo.creative.scenes.reduce(
                                          (n, scene) => n + scene.components.length,
                                          0,
                                        )}{' '}
                                        generated component groups · editable vectors ·{' '}
                                        {settings.websiteDemo.creative.model || 'Groq'}
                                      </p>
                                      <button
                                        className="button quiet"
                                        onClick={() => {
                                          const svg = creativeSVG(
                                            settings.websiteDemo!.creative!,
                                            mapSegments(websiteSegments, time).time,
                                            settings.websiteDemo!.motion?.assets,
                                          );
                                          const url = URL.createObjectURL(
                                            new Blob([svg], { type: 'image/svg+xml' }),
                                          );
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = 'creative-scene.svg';
                                          a.click();
                                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                                        }}
                                      >
                                        Download current SVG frame
                                      </button>
                                      <CreativeEditor
                                        plan={settings.websiteDemo.creative}
                                        onChange={(creative) =>
                                          update('websiteDemo', {
                                            ...settings.websiteDemo!,
                                            creative,
                                          })
                                        }
                                      />
                                    </>
                                  )}
                                </div>
                              )}
                              {settings.websiteDemo?.motion?.template !== 'ai' && (
                                <div className="demo-chapters">
                                  {activeChapters.map((chapter, index) => {
                                    const sectionIndex = settings.websiteDemo
                                      ? Math.min(
                                          index,
                                          Math.max(0, settings.websiteDemo.sections.length - 1),
                                        )
                                      : 0;
                                    const section = settings.websiteDemo?.sections[sectionIndex];
                                    return (
                                      <details className="chapter-editor" key={chapter.time}>
                                        <summary
                                          onClick={() => {
                                            demoPlaying.current = false;
                                            setPlaying(false);
                                            seek(chapter.time + 0.8);
                                          }}
                                        >
                                          {clock(chapter.time)} · {chapter.label}
                                        </summary>
                                        {(index === 4
                                          ? settings.websiteDemo?.sections
                                          : section
                                            ? [section]
                                            : []
                                        )?.map((item, localIndex) => {
                                          const realIndex = index === 4 ? localIndex : sectionIndex;
                                          return (
                                            <div className="chapter-component" key={realIndex}>
                                              <strong>Component {localIndex + 1}</strong>
                                              <label>
                                                Component title
                                                <input
                                                  value={item.title}
                                                  onChange={(e) =>
                                                    update('websiteDemo', {
                                                      ...settings.websiteDemo!,
                                                      sections: settings.websiteDemo!.sections.map(
                                                        (value, i) =>
                                                          i === realIndex
                                                            ? { ...value, title: e.target.value }
                                                            : value,
                                                      ),
                                                    })
                                                  }
                                                />
                                              </label>
                                              <label>
                                                Generated text
                                                <textarea
                                                  value={item.body}
                                                  onChange={(e) =>
                                                    update('websiteDemo', {
                                                      ...settings.websiteDemo!,
                                                      sections: settings.websiteDemo!.sections.map(
                                                        (value, i) =>
                                                          i === realIndex
                                                            ? { ...value, body: e.target.value }
                                                            : value,
                                                      ),
                                                    })
                                                  }
                                                />
                                              </label>
                                            </div>
                                          );
                                        })}
                                      </details>
                                    );
                                  })}
                                </div>
                              )}
                              <p>
                                {Math.round(websiteDuration)} seconds ·{' '}
                                {settings.websiteDemo?.motion?.template === 'ai'
                                  ? 'AI-created vector animation'
                                  : settings.websiteDemo?.motion
                                    ? 'AI-free cinematic sequence'
                                    : settings.websiteDemo?.storyboard
                                      ? `Groq · ${settings.websiteDemo.storyboard.model}`
                                      : 'Basic layouts'}{' '}
                                · editable sequence · based on your source content. Your original
                                media remains in Screen Capture.
                              </p>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="animation-banner">
                          <label className="auto-zoom-switch ai-plan-toggle">
                            <input
                              type="checkbox"
                              checked={useAI}
                              onChange={(e) => setUseAI(e.target.checked)}
                            />{' '}
                            Plan with Groq
                          </label>
                          <button
                            className="button lime"
                            disabled={!source || !duration || generating || exporting}
                            onClick={() => void generateUploadDemo()}
                          >
                            {generating
                              ? `Preparing storyboard ${analysisProgress}%`
                              : 'Analyze & create animation'}
                          </button>
                          <button
                            className="button quiet"
                            disabled={exporting || recording || generating}
                            onClick={() => {
                              importMode.current = 'animate';
                              file.current?.click();
                            }}
                          >
                            <Upload size={16} /> Upload video for animation
                          </button>
                          <button
                            className="button quiet"
                            disabled={exporting || recording || generating}
                            onClick={() => imageInput.current?.click()}
                          >
                            <Upload size={16} /> Upload image for animation
                          </button>
                          <Sparkles size={24} />
                          <h3>Give your story a new shape.</h3>
                          <p>
                            Detect text and visual regions, then animate them as separate
                            components. Recognition runs locally; the first run downloads a model.
                          </p>
                          <button
                            className="button lime"
                            disabled={!source || generating || analyzing || exporting}
                            onClick={() => void generateScenes()}
                          >
                            {generating
                              ? `Extracting ${analysisProgress}%`
                              : 'Advanced OCR analysis'}
                          </button>
                          <button
                            className="button dark"
                            disabled={(!source && !recreated) || exporting}
                            onClick={() => void previewAnimation()}
                          >
                            <Play size={14} /> Preview animation
                          </button>
                          <p>
                            {settings.scenes?.length
                              ? `${settings.scenes.length} extracted scenes`
                              : 'Generate components first, or preview the spotlight template.'}
                          </p>
                        </div>
                        {settings.scenes?.length ? (
                          <div className="control-section">
                            <h3>Extracted scenes</h3>
                            {settings.scenes.map((scene, index) => (
                              <button
                                className="extracted-scene"
                                key={index}
                                onClick={() => {
                                  video.current?.pause();
                                  setPlaying(false);
                                  seek(scene.time);
                                }}
                              >
                                <span>{scene.label}</span>
                                <small>
                                  {scene.components.length} components · {clock(scene.time)}
                                </small>
                              </button>
                            ))}
                            {settings.scenes.map((scene, si) =>
                              scene.components.map((component, ci) =>
                                component.text ? (
                                  <label className="component-text" key={`${si}-${ci}`}>
                                    {scene.label} · text {ci + 1}
                                    <textarea
                                      aria-label={`${scene.label} component ${ci + 1}`}
                                      value={component.text}
                                      onChange={(e) =>
                                        update(
                                          'scenes',
                                          settings.scenes!.map((s, index) =>
                                            index === si
                                              ? {
                                                  ...s,
                                                  components: s.components.map((c, j) =>
                                                    j === ci ? { ...c, text: e.target.value } : c,
                                                  ),
                                                }
                                              : s,
                                          ),
                                        )
                                      }
                                    />
                                  </label>
                                ) : null,
                              ),
                            )}
                          </div>
                        ) : null}
                        <div className="control-section">
                          <h3>Scene headline</h3>
                          <textarea
                            aria-label="Scene headline"
                            value={settings.sceneTitle}
                            onChange={(e) => update('sceneTitle', e.target.value)}
                          />
                          <h3>Supporting text</h3>
                          <textarea
                            aria-label="Supporting text"
                            value={settings.sceneBody}
                            onChange={(e) => update('sceneBody', e.target.value)}
                          />
                        </div>
                        <div className="control-section">
                          <h3>Animated spotlight</h3>
                          <p>
                            The preview and export use the same animation engine. Play to see the
                            intro, product showcase, and closing card.
                          </p>
                          <p>
                            Recognized text is editable below. Visual elements are image crops.
                            Complex layouts and recognition errors still need review; this is not a
                            full semantic interface reconstruction.
                          </p>
                        </div>
                      </>
                    )}
                    <div className="inspector-footer">
                      <span className="green-dot" />{' '}
                      {panel === 'website'
                        ? 'Website reading and AI planning use the server.'
                        : 'Video rendering stays on your device.'}
                    </div>
                  </aside>
                </div>
              </>
            }
          </>
        )}
        <footer>
          <span>
            <span className="green-dot" /> A small studio for big ideas.
          </span>
          <span>Made to make things clear.</span>
        </footer>
      </main>
      {joining && (
        <div
          className="append-joining"
          role="dialog"
          aria-modal="true"
          aria-label="Appending your recording"
        >
          <div>
            <strong>Adding your next clip</strong>
            <p>Saving this clip separately. Your existing clips and edits stay in place.</p>
            <progress aria-label="Saving clip" />
          </div>
        </div>
      )}
      <dialog ref={appendDialog} className="append-clip-dialog" aria-label="Append screen clip">
        <header>
          <strong>Continue your recording</strong>
          <button type="button" onClick={() => appendDialog.current?.close()}>
            Done
          </button>
        </header>
        <p>
          Add the next clip after your existing footage. Your current clips and edits stay in place.
        </p>
        <button
          type="button"
          className="button lime"
          disabled={recording || exporting || joining || mobileView}
          onClick={() => {
            appendDialog.current?.close();
            appendCapture.current = true;
            void startRecording(true);
          }}
        >
          <Video size={17} />
          Record next clip
        </button>
        <button
          type="button"
          className="button quiet"
          onClick={() => {
            appendDialog.current?.close();
            appendImport.current = true;
            file.current?.click();
          }}
        >
          <Upload size={17} />
          Append video file
        </button>
        {mobileView && (
          <small>Screen recording needs a desktop browser. You can append a video file here.</small>
        )}
      </dialog>
      <dialog
        ref={backgroundDialog}
        className="canvas-background-dialog"
        aria-label="Canvas background"
      >
        <div className="canvas-background-dialog-heading">
          <strong>Canvas background</strong>
          <button
            type="button"
            aria-label="Close background settings"
            onClick={() => backgroundDialog.current?.close()}
          >
            Done
          </button>
        </div>
        {canvasBackgroundControls()}
      </dialog>
      <dialog
        ref={focusPointerDialog}
        className="cursor-focus-dialog"
        aria-labelledby="cursor-focus-title"
      >
        <header>
          <h2 id="cursor-focus-title">Float at focus</h2>
          <button
            type="button"
            aria-label="Close focus settings"
            onClick={() => focusPointerDialog.current?.close()}
          >
            ×
          </button>
        </header>
        <p>Your pointer floats gently around this point in the video.</p>
        <label>
          Horizontal focus <span>{Math.round(pointerFocusDraft.x)}%</span>
          <input
            aria-label="Pointer horizontal focus"
            type="range"
            min="0"
            max="100"
            value={pointerFocusDraft.x}
            onChange={(e) => setPointerFocusDraft((old) => ({ ...old, x: +e.target.value }))}
          />
        </label>
        <label>
          Vertical focus <span>{Math.round(pointerFocusDraft.y)}%</span>
          <input
            aria-label="Pointer vertical focus"
            type="range"
            min="0"
            max="100"
            value={pointerFocusDraft.y}
            onChange={(e) => setPointerFocusDraft((old) => ({ ...old, y: +e.target.value }))}
          />
        </label>
        <div className="cursor-focus-actions">
          <button
            type="button"
            className="button quiet"
            onClick={() => {
              setPointerFocusDraft({ x: 50, y: 50 });
            }}
          >
            Center
          </button>
          <button
            type="button"
            className="button lime"
            onClick={() => {
              setSettings((old) => ({
                ...old,
                pointerMotion: 'focus',
                focusX: pointerFocusDraft.x,
                focusY: pointerFocusDraft.y,
              }));
              setPointerMode('off');
              focusPointerDialog.current?.close();
            }}
          >
            Use this focus
          </button>
        </div>
      </dialog>
      <dialog ref={captionDialog} className="caption-popup" aria-label="Edit captions">
        <header>
          <strong>Captions</strong>
          <button
            autoFocus
            aria-label="Close caption editor"
            onClick={() => captionDialog.current?.close()}
          >
            Done
          </button>
        </header>
        <label className="manual-caption-field">
          Your caption
          <textarea
            aria-label="Manual caption"
            rows={2}
            value={settings.caption}
            placeholder="Type a caption, then drag it on the canvas"
            onChange={(e) => {
              setTimelineSelection('caption');
              setSettings((old) => ({ ...old, caption: e.target.value, captionsEnabled: true }));
            }}
          />
        </label>
        <div className="caption-transform-controls">
          <label>
            Size
            <input
              aria-label="Caption size"
              type="range"
              min=".4"
              max="3"
              step=".05"
              value={settings.captionLayout?.scale ?? 1}
              onChange={(e) =>
                update('captionLayout', {
                  x: settings.captionLayout?.x ?? 50,
                  y: settings.captionLayout?.y ?? 88,
                  scale: +e.target.value,
                })
              }
            />
          </label>
          <label>
            Horizontal
            <input
              aria-label="Caption horizontal position"
              type="range"
              min="5"
              max="95"
              value={settings.captionLayout?.x ?? 50}
              onChange={(e) =>
                update('captionLayout', {
                  x: +e.target.value,
                  y: settings.captionLayout?.y ?? 88,
                  scale: settings.captionLayout?.scale ?? 1,
                })
              }
            />
          </label>
          <label>
            Vertical
            <input
              aria-label="Caption vertical position"
              type="range"
              min="5"
              max="95"
              value={settings.captionLayout?.y ?? 88}
              onChange={(e) =>
                update('captionLayout', {
                  x: settings.captionLayout?.x ?? 50,
                  y: +e.target.value,
                  scale: settings.captionLayout?.scale ?? 1,
                })
              }
            />
          </label>
          <button type="button" onClick={() => update('captionLayout', undefined)}>
            Reset caption layout
          </button>
        </div>
        {captionControls()}
        {Boolean(settings.captions?.length) && (
          <details className="caption-preview-disclosure">
            <summary>Preview captions</summary>
            <canvas
              ref={captionPreview}
              className="caption-live-preview"
              aria-label="Live video preview with captions"
            />
          </details>
        )}
      </dialog>
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          if (!selected) return;
          setGenerating(true);
          setAnimationMode('image');
          setPanel('animate');
          soundPlayer.current.stop();
          video.current?.pause();
          camera.current?.pause();
          setPlaying(false);
          announce('Preparing your image animation…');
          let stream: MediaStream | undefined;
          try {
            const image = await createImageBitmap(selected),
              canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d')!;
            const draw = (t: number) => {
              ctx.fillStyle = settings.background;
              ctx.fillRect(0, 0, 1920, 1080);
              const scale =
                  Math.min(1740 / image.width, 900 / image.height) * (1 + (0.035 * t) / 6),
                w = image.width * scale,
                h = image.height * scale;
              ctx.drawImage(image, (1920 - w) / 2, (1080 - h) / 2, w, h);
            };
            draw(0);
            stream = canvas.captureStream(30);
            const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(
              (t) => MediaRecorder.isTypeSupported(t),
            );
            if (!mime) throw new Error('Image animation encoding is unavailable in this browser.');
            const chunks: BlobPart[] = [];
            const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16000000 });
            const finished = new Promise<Blob>((resolve) => {
              rec.ondataavailable = (e) => {
                if (e.data.size) chunks.push(e.data);
              };
              rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
            });
            rec.start();
            const start = performance.now();
            await new Promise<void>((resolve) => {
              const frame = (now: number) => {
                const t = Math.min(6, (now - start) / 1000);
                draw(t);
                setAnalysisProgress(Math.round((t / 6) * 100));
                if (t >= 6) {
                  resolve();
                  return;
                }
                requestAnimationFrame(frame);
              };
              requestAnimationFrame(frame);
            });
            rec.stop();
            const blob = await finished;
            image.close();
            setCamSource('');
            await storeAsset('camera', new Blob());
            await receive(blob, 'screen');
            update('capturedCursorHidden', false);
            update('uploadKind', 'image');
            update('uploadName', selected.name.replace(/\.[^.]+$/, ''));
            localStorage.setItem('frame-duration', '6');
            setDuration(6);
            setPanel('animate');
            announce(
              'Image ready as a six-second animated clip. Preview animation or edit its timeline.',
            );
          } catch (err) {
            announce((err as Error).message);
          } finally {
            stream?.getTracks().forEach((track) => track.stop());
            setGenerating(false);
            setAnalysisProgress(0);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={designInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files || [])].slice(0, 6);
          if (!files.length || !settings.websiteDemo) return;
          try {
            const screens = await Promise.all(
              files.map(
                (file) =>
                  new Promise<string>((resolve, reject) => {
                    if (file.size > 2000000) {
                      reject(new Error('Use screens smaller than 2 MB each.'));
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const image = new Image();
                      image.onload = () => {
                        const canvas = document.createElement('canvas'),
                          scale = Math.min(1, 1440 / image.width, 1000 / image.height);
                        canvas.width = Math.round(image.width * scale);
                        canvas.height = Math.round(image.height * scale);
                        const ctx = canvas.getContext('2d')!;
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', 0.82));
                      };
                      image.onerror = () => reject(new Error('This file is not a readable image.'));
                      image.src = String(reader.result);
                    };
                    reader.onerror = () => reject(new Error('Could not read design screen.'));
                    reader.readAsDataURL(file);
                  }),
              ),
            );
            await prepareStoryImages({ assets: screens, model: 'local', scenes: [] });
            const current = settings.websiteDemo!;
            update('websiteDemo', {
              ...current,
              motion: {
                ...current.motion,
                assets: current.motion?.assets || current.storyboard?.assets || [],
                catalog: current.motion?.catalog || current.assetCatalog || [],
                template: current.motion?.template === 'aurora' ? 'aurora' : 'editorial',
                designScreens: screens,
              },
            });
            setRecreated(true);
            demoTime.current = 0;
            setTime(0);
            announce('Design screens loaded. Preview the storyboard, then export video.');
          } catch (err) {
            announce((err as Error).message);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={cameraClipInput}
        type="file"
        accept="video/*,image/*"
        hidden
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) void importCameraMedia(selected);
          e.target.value = '';
        }}
      />
      <input
        ref={musicInput}
        type="file"
        accept="audio/*"
        hidden
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          if (!selected) return;
          try {
            const context = new AudioContext();
            try {
              musicBuffer.current = await context.decodeAudioData(await selected.arrayBuffer());
            } finally {
              await context.close();
            }
            await storeAsset('music', selected);
            const musicAsset='music-'+crypto.randomUUID();await storeAsset(musicAsset,selected);
            const start=pendingMusicTime.current??time;const id=crypto.randomUUID();
            setSettings(old=>({...old,musicClips:[...musicClips(),{id,start,end:displayDuration,offset:0,track:'none',volume:.16,asset:musicAsset,name:selected.name}]}));setSelectedMusicClip(id);pendingMusicTime.current=null;
            setMusicReady(true);
            update('musicName', selected.name);
            update('demoAudio', {
              ...(settings.demoAudio || defaultAudio),
              musicVolume: 0.16,
              musicTrack: 'none',
            });
            setTimelineSelection('music');setMusicEditorOpen(true);
            announce('Music loaded. Press Play to hear the mix.');
          } catch (err) {
            announce((err as Error).message);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={file}
        type="file"
        accept="video/*"
        hidden
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          if (selected) {
            if (appendImport.current) {
              appendImport.current = false;
              await appendScreenBlob(selected);
              e.target.value = '';
              return;
            }
            const keepCamera = screenTrackImport.current;
            screenTrackImport.current = false;
            const previousCamera = {
              cameraTakes: settings.cameraTakes,
              cameraClipsEdited: settings.cameraClipsEdited,
              cameraDuration:
                settings.primaryMedia === 'camera' ? duration : settings.cameraDuration,
              camera: settings.camera,
            };
            localStorage.removeItem('frame-duration');
            update('capturedCursorHidden', false);
            if (!keepCamera) {
              setCamSource('');
              void storeAsset('camera', new Blob());
            }
            await receive(selected, 'screen');
            if (keepCamera) setSettings((old) => ({ ...old, ...previousCamera }));
            update('uploadKind', 'video');
            update('uploadName', selected.name.replace(/\.[^.]+$/, ''));
            if (importMode.current === 'animate') setAnimationMode('video');
            setPanel(importMode.current);
            announce(
              importMode.current === 'animate'
                ? 'Video uploaded for animation. Break down the recording or preview the animation.'
                : 'Video imported. Set your trim and zoom, then export.',
            );
            importMode.current = 'edit';
          }
          e.target.value = '';
        }}
      />
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
      {exporting && (
        <div className="export-status">
          <span className="green-dot" /> Rendering locally · {clock(Math.max(0, time))} /{' '}
          {clock(displayDuration)}
          <button
            onClick={() => {
              exportAbort.current = true;
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
