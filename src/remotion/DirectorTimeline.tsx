import { createDirectorMusic, directorMusicTracks, type BuiltinMusic } from './directorMusic';
import { Timeline, TimelineToolbar, TimelineTrackLabel } from '../components/Timeline';
import {
  Scissors,
  Upload,
  VolumeX,
  Check,
  Volume2,
  Trash2,
  Play,
  Pause,
  MousePointer2,
  Type,
  Music2,
  Layers,
  Monitor,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import type { PlayerRef } from '@remotion/player';
import { componentPose, creativeDuration, type CreativeAnimation } from '../creative';
import { validateCreative } from '../../shared/creative.mjs';
export type DirectorMusic = {
  src: string;
  name: string;
  volume: number;
  builtin?: BuiltinMusic;
  timing?: string;
};
type Props = {
  renderImages: (componentIndex: number) => ReactNode;
  plan: CreativeAnimation;
  change: (p: CreativeAnimation) => void;
  music?: DirectorMusic;
  setMusic: (m: DirectorMusic | undefined) => void;
  player: RefObject<PlayerRef | null>;
  disabled: boolean;
  selected: number;
  select: (i: number) => void;
  mode: 'place' | 'draw' | null;
  setMode: (m: 'place' | 'draw' | null) => void;
  size: number;
  setSize: (n: number) => void;
  remove: () => void;
};
export function DirectorTimeline({
  renderImages,
  plan,
  change,
  music,
  setMusic,
  player,
  disabled,
  selected,
  select,
  mode,
  setMode,
  size,
  setSize,
  remove,
}: Props) {
  const timing = plan.scenes.map((s) => s.duration).join(',');
  const musicInput = useRef<HTMLInputElement>(null),
    musicRequest = useRef(0);
  const [preparingMusic, setPreparingMusic] = useState(false);
  async function chooseMusic(track: BuiltinMusic) {
    const request = ++musicRequest.current;
    setPreparingMusic(true);
    setError('');
    try {
      const src = await createDirectorMusic(
        track,
        plan.scenes.map((s) => s.duration),
      );
      if (request === musicRequest.current)
        setMusic({
          src,
          name: directorMusicTracks.find((t) => t.id === track)!.name,
          volume: music?.volume ?? 0.3,
          builtin: track,
          timing,
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare music.');
    } finally {
      if (request === musicRequest.current) setPreparingMusic(false);
    }
  }
  useEffect(() => {
    if (music?.builtin && music.timing !== timing && !disabled) void chooseMusic(music.builtin);
  }, [timing, music?.builtin, music?.timing, disabled]);
  const [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false),
    [lane, setLane] = useState<'scenes' | 'cursor' | 'captions' | 'music' | 'design'>('scenes'),
    [component, setComponent] = useState(0),
    [error, setError] = useState('');
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const update = ({ detail }: { detail: { frame: number } }) => setFrame(detail.frame),
      play = () => setPlaying(true),
      pause = () => setPlaying(false);
    p.addEventListener('frameupdate', update);
    p.addEventListener('play', play);
    p.addEventListener('pause', pause);
    p.addEventListener('ended', pause);
    return () => {
      p.removeEventListener('frameupdate', update);
      p.removeEventListener('play', play);
      p.removeEventListener('pause', pause);
      p.removeEventListener('ended', pause);
    };
  }, [player]);
  const duration = creativeDuration(plan),
    scene = plan.scenes[selected],
    seek = (f: number) => {
      player.current?.pause();
      player.current?.seekTo(f);
      setFrame(f);
    },
    clock = (s: number) =>
      `${Math.floor(s / 60)
        .toString()
        .padStart(2, '0')}:${Math.floor(s % 60)
        .toString()
        .padStart(2, '0')}`;
  const choose = (i: number, l: typeof lane) => {
    select(i);
    setLane(l);
    setMode(null);
    setComponent(0);
    seek(Math.round(plan.scenes.slice(0, i).reduce((n, s) => n + s.duration, 0) * 30) + 15);
  };
  const editScene = (fn: (s: typeof scene) => typeof scene) =>
    change(
      validateCreative({
        ...plan,
        scenes: plan.scenes.map((s, i) => (i === selected ? fn(s) : s)),
      }),
    );
  const caption = scene.components.find((c) => c.name === 'User caption')?.elements[0]?.text || '';
  function setCaption(text: string) {
    editScene((s) => ({
      ...s,
      components: [
        ...s.components.filter((c) => c.name !== 'User caption'),
        ...(text
          ? [
              {
                id: 'caption',
                name: 'User caption',
                keyframes: [
                  { time: 0, x: 180, y: 570, scale: 1, opacity: 1, rotation: 0 },
                  { time: s.duration, x: 180, y: 570, scale: 1, opacity: 1, rotation: 0 },
                ],
                elements: [
                  {
                    kind: 'text' as const,
                    x: 0,
                    y: 0,
                    width: 920,
                    height: 80,
                    fill: '#ffffff',
                    stroke: '#23352b',
                    strokeWidth: 1,
                    radius: 0,
                    fontSize: 32,
                    text,
                    path: '',
                    asset: 0,
                  },
                ],
              },
            ]
          : []),
      ],
    }));
  }
  const designs = scene.components
    .map((c, index) => ({ c, index }))
    .filter(
      ({ c }) =>
        !['User caption', 'User pointer', 'Timeline', 'Timeline playhead'].includes(c.name),
    );
  const design = designs[Math.min(component, designs.length - 1)];
  const textElements =
    design?.c.elements.flatMap((element, index) =>
      element.kind === 'text' ? [{ element, index }] : [],
    ) || [];
  function editDesignText(elementIndex: number, text: string) {
    if (!design) return;
    editScene((s) => ({
      ...s,
      ...(design.c.name === 'Headline' ? { title: text } : {}),
      components: s.components.map((c, i) =>
        i === design.index
          ? { ...c, elements: c.elements.map((e, j) => (j === elementIndex ? { ...e, text } : e)) }
          : c,
      ),
    }));
  }
  const removeSelected = () => {
    if (lane === 'scenes' && plan.scenes.length > 1) {
      change(validateCreative({ ...plan, scenes: plan.scenes.filter((_, i) => i !== selected) }));
      select(Math.max(0, selected - 1));
      seek(0);
    } else if (lane === 'cursor') remove();
    else if (lane === 'captions') setCaption('');
    else if (lane === 'music') setMusic(undefined);
    else if (lane === 'design' && design)
      editScene((s) => ({ ...s, components: s.components.filter((_, i) => i !== design.index) }));
  };
  const canDelete =
    lane === 'cursor'
      ? scene.components.some((c) => c.name === 'User pointer')
      : lane === 'captions'
        ? !!caption
        : lane === 'music'
          ? !!music
          : lane === 'design'
            ? !!design
            : plan.scenes.length > 1;
  async function upload(file: File) {
    musicRequest.current++;
    setPreparingMusic(false);
    try {
      setError('');
      if (!file.type.startsWith('audio/') || file.size > 15000000)
        throw Error('Choose an audio file under 15 MB.');
      const src = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(Error('Could not read audio.'));
        r.readAsDataURL(file);
      });
      setMusic({ src, name: file.name, volume: 0.3 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load audio.');
    }
  }
  const localTime = frame / 30 - plan.scenes.slice(0, selected).reduce((n, s) => n + s.duration, 0);
  const canSplit =
    lane === 'scenes' &&
    plan.scenes.length < 12 &&
    localTime >= 2 &&
    scene.duration - localTime >= 2;
  function splitScene() {
    if (!canSplit) return;
    const part = (from: number, to: number) => ({
      ...scene,
      duration: to - from,
      components: scene.components.map((c) => ({
        ...c,
        keyframes: [
          { ...componentPose(c, from), time: 0 },
          ...c.keyframes
            .filter((k) => k.time > from && k.time < to)
            .slice(0, 10)
            .map((k) => ({ ...k, time: k.time - from })),
          { ...componentPose(c, to), time: to - from },
        ],
      })),
    });
    change(
      validateCreative({
        ...plan,
        scenes: [
          ...plan.scenes.slice(0, selected),
          part(0, localTime),
          part(localTime, scene.duration),
          ...plan.scenes.slice(selected + 1),
        ],
      }),
    );
  }
  const filled = (s: typeof scene, l: typeof lane) =>
    l === 'scenes' || l === 'design'
      ? s.components.length > 0
      : l === 'cursor'
        ? s.components.some((c) => c.name === 'User pointer')
        : l === 'captions'
          ? s.components.some((c) => c.name === 'User caption' && c.elements.some((e) => e.text))
          : !!music;
  return (
    <Timeline className="director-timeline" label="Animation timeline">
      <div className="director-transport">
        <button
          aria-label={playing ? 'Pause animation' : 'Play animation'}
          disabled={disabled}
          onClick={() => (playing ? player.current?.pause() : player.current?.play())}
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <output>
          {clock(frame / 30)} / {clock(duration)}
        </output>
      </div>
      <TimelineToolbar>
        <button
          className="timeline-icon"
          aria-label="Music volume"
          title="Music volume"
          disabled={disabled || !music}
          onClick={() => setLane('music')}
        >
          <Volume2 size={17} />
        </button>
        <button
          className="timeline-icon"
          aria-label="Music controls"
          title="Music controls"
          disabled={disabled}
          onClick={() => setLane('music')}
        >
          <Music2 size={17} />
        </button>
        <button
          className="timeline-icon"
          aria-label="Upload music"
          title="Upload music"
          disabled={disabled}
          onClick={() => musicInput.current?.click()}
        >
          <Upload size={17} />
        </button>
        <button
          className="timeline-icon timeline-split"
          aria-label="Split at playhead"
          title={
            plan.scenes.length >= 12
              ? 'Maximum of 12 scenes reached'
              : 'Split with at least 2 seconds on each side'
          }
          disabled={disabled || !canSplit}
          onClick={splitScene}
        >
          <Scissors size={17} />
          <span>Split</span>
        </button>
        <button
          className="timeline-icon timeline-delete"
          aria-label={`Delete selected ${lane}`}
          disabled={disabled || !canDelete}
          onClick={removeSelected}
        >
          <Trash2 size={17} />
          <span>Delete</span>
        </button>
        <input
          ref={musicInput}
          hidden
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </TimelineToolbar>
      <div className="director-lanes-scroll">
        <div className="director-lanes">
          <div className="director-ruler-row">
            <div />
            <div className="director-time-ruler">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} style={{ '--tick': i / 5 } as CSSProperties}>
                  {clock((duration * i) / 5)}
                </span>
              ))}
              <input
                aria-label="Animation timeline playhead"
                type="range"
                min={0}
                max={Math.max(0, Math.ceil(duration * 30) - 1)}
                value={frame}
                disabled={disabled}
                onChange={(e) => seek(Number(e.target.value))}
              />
            </div>
          </div>
          <div
            className="director-common-playhead"
            style={{
              left: `calc(var(--director-label) + var(--director-track-inset) + (100% - var(--director-label) - 2 * var(--director-track-inset)) * ${Math.min(1, frame / (duration * 30))})`,
            }}
          />
          {(['scenes', 'cursor', 'captions', 'music', 'design'] as const).map((l) => (
            <div className="director-track" data-lane={l} key={l}>
              <TimelineTrackLabel className="director-track-label">
                {l === 'scenes' ? (
                  <Monitor size={16} />
                ) : l === 'cursor' ? (
                  <MousePointer2 size={16} />
                ) : l === 'captions' ? (
                  <Type size={16} />
                ) : l === 'music' ? (
                  <Music2 size={16} />
                ) : (
                  <Layers size={16} />
                )}
                <span>
                  {
                    {
                      scenes: 'Scenes',
                      cursor: 'Cursor',
                      captions: 'Captions',
                      music: 'Music',
                      design: 'Design',
                    }[l]
                  }
                </span>
              </TimelineTrackLabel>
              <div className="director-track-clips">
                {l === 'music' ? (
                  <button
                    type="button"
                    disabled={disabled}
                    className={`music-track ${music ? 'is-filled' : 'is-empty'}`}
                    aria-pressed={lane === l}
                    onClick={() => {
                      setLane(l);
                      setMode(null);
                    }}
                  >
                    {music ? `${music.name} · ${Math.round(music.volume * 100)}%` : '＋ Add music'}
                  </button>
                ) : (
                  plan.scenes.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className={filled(s, l) ? 'is-filled' : 'is-empty'}
                      aria-label={`Select ${l} scene ${i + 1}`}
                      aria-pressed={selected === i && lane === l}
                      disabled={disabled}
                      style={{ flex: `${s.duration} 1 0%` }}
                      onClick={() => choose(i, l)}
                    >
                      <span className="director-clip-number">{i + 1}</span>
                      {l === 'scenes'
                        ? s.title
                        : l === 'cursor'
                          ? s.components.some((c) => c.name === 'User pointer')
                            ? 'Pointer'
                            : '＋ Add pointer'
                          : l === 'captions'
                            ? s.components.find((c) => c.name === 'User caption')?.elements[0]
                                ?.text || '＋ Add caption'
                            : `${s.components.filter((c) => !['User pointer', 'User caption', 'Timeline', 'Timeline playhead'].includes(c.name)).length} components`}
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {lane !== 'scenes' && (
        <fieldset className="director-inspector" disabled={disabled}>
          <h3 className="director-inspector-title">
            {
              {
                scenes: 'Scene',
                cursor: 'Cursor',
                captions: 'Captions',
                music: 'Music',
                design: 'Design components',
              }[lane]
            }
            {lane !== 'music' ? ` · ${selected + 1}` : ''}
          </h3>
          {lane === 'cursor' && (
            <>
              <div className="director-actions">
                <button
                  type="button"
                  aria-pressed={mode === 'place'}
                  onClick={() => {
                    player.current?.pause();
                    setMode(mode === 'place' ? null : 'place');
                  }}
                >
                  Place pointer
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'draw'}
                  onClick={() => {
                    player.current?.pause();
                    setMode(mode === 'draw' ? null : 'draw');
                  }}
                >
                  Draw movement
                </button>
              </div>
              <label>
                Pointer size
                <input
                  type="range"
                  min={20}
                  max={80}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                />
              </label>
              <small>
                {mode === 'draw'
                  ? 'Drag on the video from the start to the end of the movement.'
                  : mode === 'place'
                    ? 'Click on the video to place the pointer.'
                    : 'Select Place pointer or Draw movement.'}
              </small>
            </>
          )}
          {lane === 'captions' && (
            <label>
              Caption text
              <textarea
                aria-label="Scene caption"
                maxLength={110}
                value={caption}
                placeholder="Add a caption to this scene"
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
          )}
          {lane === 'music' && (
            <>
              <div className="director-music-options" role="group" aria-label="Built-in music">
                <button
                  type="button"
                  aria-pressed={!music}
                  disabled={preparingMusic}
                  onClick={() => {
                    musicRequest.current++;
                    setMusic(undefined);
                  }}
                >
                  <VolumeX size={18} />
                  <strong>No music</strong>
                  <small>No background track</small>
                </button>
                {directorMusicTracks.map((track) => (
                  <button
                    type="button"
                    key={track.id}
                    aria-pressed={music?.builtin === track.id}
                    disabled={preparingMusic}
                    onClick={() => void chooseMusic(track.id)}
                  >
                    <span className="director-music-art">
                      <Music2 size={18} />
                    </span>
                    <strong>{track.name}</strong>
                    {music?.builtin === track.id && (
                      <Check className="director-music-check" size={14} />
                    )}
                    <small>{track.description}</small>
                  </button>
                ))}
              </div>
              {preparingMusic && <small role="status">Preparing music locally…</small>}
              <label className="director-audio-upload">
                <span className="director-upload-icon">
                  <Upload size={20} />
                </span>
                <span className="director-upload-copy">
                  <strong>{music && !music.builtin ? music.name : 'Add your own music'}</strong>
                  <small>Choose an audio file · up to 15 MB</small>
                </span>
                <span className="director-upload-action">Browse files</span>
                <input
                  aria-label="Upload custom music"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {music && (
                <label className="director-volume-control">
                  <span>
                    Volume <output>{Math.round(music.volume * 100)}%</output>
                  </span>
                  <input
                    aria-label="Animation music volume"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={music.volume}
                    onChange={(e) => setMusic({ ...music, volume: Number(e.target.value) })}
                  />
                </label>
              )}
              <small>
                {music?.builtin
                  ? 'Music accents follow scene cuts and update with your timeline.'
                  : 'Uploaded music plays across the video.'}{' '}
                Included in MP4 export.
              </small>
            </>
          )}
          {lane === 'design' && (
            <>
              <div className="director-component-chips">
                {designs.map(({ c }, i) => (
                  <button key={c.id} aria-pressed={component === i} onClick={() => setComponent(i)}>
                    {c.name}
                    {c.name === 'Website icon' && <Upload size={13} aria-hidden="true" />}
                  </button>
                ))}
              </div>
              {textElements.length > 0 && (
                <div className="director-inline-text">
                  {textElements.map(({ element, index }) => (
                    <label key={`${design?.c.id}-${index}`}>
                      <span>
                        {design?.c.name === 'Headline'
                          ? 'Headline'
                          : design?.c.name === 'Caption'
                            ? 'Caption'
                            : `Text ${index + 1}`}
                        <small>
                          {element.text.length}/{design?.c.name === 'Headline' ? 100 : 300}
                        </small>
                      </span>
                      {design?.c.name === 'Headline' ? (
                        <input
                          aria-label="Edit scene headline"
                          type="text"
                          maxLength={100}
                          placeholder="Add a headline"
                          value={element.text}
                          onChange={(e) => editDesignText(index, e.target.value)}
                        />
                      ) : (
                        <textarea
                          aria-label={
                            design?.c.name === 'Caption'
                              ? 'Edit scene caption'
                              : `Edit component text ${index + 1}`
                          }
                          rows={2}
                          maxLength={300}
                          placeholder="Add your text"
                          value={element.text}
                          onChange={(e) => editDesignText(index, e.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}
              {design && renderImages(design.index)}
              {design?.c.name !== 'Website icon' &&
                designs.some(({ c }) => c.name === 'Website icon') && (
                  <button
                    type="button"
                    className="director-icon-shortcut"
                    onClick={() =>
                      setComponent(designs.findIndex(({ c }) => c.name === 'Website icon'))
                    }
                  >
                    <Upload size={13} />
                    Replace website icon
                  </button>
                )}
              {design && (
                <label className="director-visibility">
                  Visibility
                  <input
                    type="checkbox"
                    checked={design.c.keyframes.some((k) => k.opacity > 0)}
                    onChange={(e) =>
                      editScene((s) => ({
                        ...s,
                        components: s.components.map((c, i) =>
                          i === design.index
                            ? {
                                ...c,
                                keyframes: c.keyframes.map((k) => ({
                                  ...k,
                                  opacity: e.target.checked ? 1 : 0,
                                })),
                              }
                            : c,
                        ),
                      }))
                    }
                  />
                </label>
              )}
              <small>Changes apply to this scene and your export.</small>
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </fieldset>
      )}
      {lane === 'scenes' && error && <p role="alert">{error}</p>}
    </Timeline>
  );
}
