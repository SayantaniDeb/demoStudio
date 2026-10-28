import { useEffect, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { renderToStaticMarkup } from 'react-dom/server';
import { Download, Layers } from 'lucide-react';
import {
  DesignArtwork,
  DesignComposition,
  DESIGN_FPS,
  DESIGN_FRAMES,
  type DesignProps,
} from './DesignComposition';
import './remotion-design.css';
const initial: DesignProps = {
  variant: 'headline',
  brand: 'Frame',
  headline: 'Make your next idea clear.',
  description: 'Capture the moment. Shape the story. Share something worth watching.',
  accent: '#bfd879',
};
function restore(): DesignProps {
  try {
    const p = JSON.parse(localStorage.getItem('frame-remotion-design') || 'null');
    if (!p) return initial;
    return {
      variant: ['headline', 'cards', 'spotlight'].includes(p.variant) ? p.variant : 'headline',
      brand: typeof p.brand === 'string' ? p.brand.slice(0, 28) : initial.brand,
      headline: typeof p.headline === 'string' ? p.headline.slice(0, 70) : initial.headline,
      description:
        typeof p.description === 'string' ? p.description.slice(0, 110) : initial.description,
      accent: /^#[0-9a-f]{6}$/i.test(p.accent) ? p.accent : initial.accent,
    };
  } catch {
    return initial;
  }
}
export default function RemotionDesignStudio() {
  const [design, setDesign] = useState<DesignProps>(restore),
    [status, setStatus] = useState('');
  const player = useRef<PlayerRef>(null);
  const [progress, setProgress] = useState<number | null>(null),
    [video, setVideo] = useState<{ url: string; name: string } | null>(null);
  const abort = useRef<AbortController | null>(null),
    videoUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
      if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
    },
    [],
  );
  async function exportDesign() {
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    setProgress(0);
    setStatus('Preparing video export…');
    player.current?.pause();
    try {
      const { renderMediaOnWeb, canRenderMediaOnWeb } = await import('@remotion/web-renderer');
      const options = {
        container: 'mp4' as const,
        videoCodec: 'h264' as const,
        width: 1280,
        height: 720,
        muted: true,
        outputTarget: 'arraybuffer' as const,
      };
      const support = await canRenderMediaOnWeb(options);
      if (!support.canRender)
        throw new Error(
          support.issues
            .filter((i) => i.severity === 'error')
            .map((i) => i.message)
            .join(' '),
        );
      controller.signal.throwIfAborted();
      const result = await renderMediaOnWeb({
        ...options,
        composition: {
          id: 'frame-design',
          component: DesignComposition,
          defaultProps: design,
          width: 1280,
          height: 720,
          fps: DESIGN_FPS,
          durationInFrames: DESIGN_FRAMES,
        },
        inputProps: { ...design },
        signal: controller.signal,
        videoBitrate: 'high',
        onProgress: ({ progress }) => {
          setProgress(Math.round(progress * 100));
          setStatus('Rendering your animation…');
        },
      });
      const blob = await result.getBlob();
      controller.signal.throwIfAborted();
      if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
      const url = URL.createObjectURL(blob);
      videoUrl.current = url;
      setVideo({ url, name: `frame-${design.variant}.mp4` });
      setStatus('Your MP4 is ready. Download or preview it below.');
    } catch (error) {
      setStatus(
        controller.signal.aborted
          ? 'Video export cancelled.'
          : `Video export failed: ${error instanceof Error ? error.message : 'Please try again.'}`,
      );
    } finally {
      abort.current = null;
      setProgress(null);
    }
  }
  useEffect(() => {
    try {
      localStorage.setItem('frame-remotion-design', JSON.stringify(design));
    } catch {
      setStatus('Browser storage is full. This design could not be saved.');
    }
  }, [design]);
  function download() {
    const frame = player.current?.getCurrentFrame() ?? 60;
    const markup = renderToStaticMarkup(<DesignArtwork {...design} frame={frame} />);
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `frame-${design.variant}-${frame}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Current frame downloaded as an SVG.');
  }
  return (
    <section className="remotion-design-studio" aria-label="Remotion design studio">
      <header>
        <div>
          <span>REMOTION / MOTION COMPONENTS</span>
          <h2>Design in motion.</h2>
          <p>Choose a composition, edit the copy, and preview its animation.</p>
        </div>
        <Layers size={25} />
      </header>
      <div className="remotion-design-grid">
        <div className="remotion-design-preview">
          <Player
            ref={player}
            component={DesignComposition}
            inputProps={design}
            durationInFrames={DESIGN_FRAMES}
            compositionWidth={1280}
            compositionHeight={720}
            fps={DESIGN_FPS}
            controls
            loop
            style={{ width: '100%', aspectRatio: '16 / 9' }}
          />
          <p>8 seconds · 1280 × 720 · Remotion preview</p>
        </div>
        <div className="remotion-design-fields">
          <fieldset>
            <legend>Composition</legend>
            {(['headline', 'cards', 'spotlight'] as const).map((variant) => (
              <button
                key={variant}
                aria-pressed={design.variant === variant}
                onClick={() => {
                  setDesign((d) => ({ ...d, variant }));
                  player.current?.seekTo(0);
                }}
              >
                {variant === 'headline'
                  ? 'Headline reveal'
                  : variant === 'cards'
                    ? 'Feature cards'
                    : 'Product spotlight'}
              </button>
            ))}
          </fieldset>
          <label>
            Brand
            <input
              maxLength={28}
              value={design.brand}
              onChange={(e) => setDesign((d) => ({ ...d, brand: e.target.value }))}
            />
          </label>
          <label>
            Headline
            <input
              maxLength={70}
              value={design.headline}
              onChange={(e) => setDesign((d) => ({ ...d, headline: e.target.value }))}
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={110}
              value={design.description}
              onChange={(e) => setDesign((d) => ({ ...d, description: e.target.value }))}
            />
          </label>
          <label className="remotion-color">
            Accent
            <input
              type="color"
              value={design.accent}
              onChange={(e) => setDesign((d) => ({ ...d, accent: e.target.value }))}
            />
          </label>
          <button
            className="button dark"
            disabled={progress !== null}
            onClick={() => void exportDesign()}
          >
            <Download size={15} />
            {progress === null ? 'Export design video (MP4)' : `Exporting ${progress}%`}
          </button>
          {progress !== null && (
            <div>
              <progress aria-label="Video export progress" value={progress} max={100} />
              <button onClick={() => abort.current?.abort()}>Cancel export</button>
            </div>
          )}
          <button className="button quiet" onClick={download}>
            <Download size={15} /> Download current frame (SVG)
          </button>
          <small>
            Exports the complete 8-second animation at 720p, 30 fps. Design edits are saved on this
            device.
          </small>
          {status && <p role="status">{status}</p>}
          {video && (
            <div>
              <a className="button dark" href={video.url} download={video.name}>
                Download MP4
              </a>
              <video
                aria-label="Remotion exported video"
                src={video.url}
                controls
                playsInline
                preload="metadata"
                style={{ width: '100%', marginTop: 12 }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
