import {Play, Pause} from 'lucide-react';
import { WebsiteTour } from './WebsiteFeatureDemo';
import { Player, type PlayerRef } from '@remotion/player';
import { useEffect, useRef, useState } from 'react';
import { interpolate, useCurrentFrame, Sequence } from 'remotion';
const chapters = [
  ['Record your screen', 'Add your camera and microphone.'],
  ['Make every clip count', 'Trim, split, zoom, and adjust volume.'],
  ['Give your story a voice', 'Add captions and choose your style.'],
  ['Turn a link into a demo', 'Import a public website. Shape its storyboard.'],
  ['Ready to share', 'Export your video in desktop or mobile format.'],
];
export function FeatureComposition({ mode, dark=false, frameless=false }: { mode?: 'screen' | 'website' | 'file';dark?:boolean;frameless?:boolean } = {}) {
  const fileChapters=[['Start with a file','Bring a video or audio file into your studio.'],['Draw the viewer’s attention','Trim your clips and draw a smooth zoom path.'],['Make every word count','Generate captions, translate, and choose your style.'],chapters[3],['Ready to share','Export your video or download just the audio.']];
  const copy=mode === 'file'?fileChapters:chapters;
  const tone=(color:string)=>dark?({'#edf1e7':'#121b21','#647352':'#9db3ad','#23352b':'#ecf4ef','#66725d':'#9caaa5','#20302c':'#090f13','#f6f7f1':'#24322f','#263c30':'#dce9df','#80936a':'#70968a','#aebc99':'#3b514a','white':'#e6eee6'}[color]||color):color;
  const frame = useCurrentFrame(),
    websiteStart = 360,
    websiteEnd = 840,
    sequence = (mode === 'screen' || mode === 'file') ? [0, 1, 2, 4] : [0, 1, 2, 3, 4],
    step =
      (mode === 'screen' || mode === 'file')
        ? Math.min(3, Math.floor(frame / 120))
        : frame < websiteStart
          ? Math.floor(frame / 120)
          : frame < websiteEnd
            ? 3
            : 4,
    index = sequence[step],
    local = frame % 120;
  if ((mode !== 'screen' && mode !== 'file') && frame >= websiteStart && frame < websiteEnd)
    return (
      <Sequence from={websiteStart} durationInFrames={480}>
        <WebsiteTour />
      </Sequence>
    );
  const opacity = interpolate(local, [0, 12, 108, 119], [0.35, 1, 1, 0.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const progress = interpolate(local, [10, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <svg
      width="960"
      height="640"
      viewBox="0 0 960 640"
      style={{ width: '100%', height: '100%', fontFamily: 'Arial, sans-serif' }}
    >
      {!frameless && <rect width="960" height="640" rx="24" fill={tone('#edf1e7')} />}
      <text x="44" y="49" fill={tone('#647352')} fontSize="15" letterSpacing="3">
        A QUICK TOUR
      </text>
      <g opacity={opacity}>
        <text x="44" y="108" fontSize="36" fontWeight="700" fill={tone('#23352b')}>
          {copy[index][0]}
        </text>
        <text x="44" y="145" fontSize="20" fill={tone('#66725d')}>
          {copy[index][1]}
        </text>
        <rect x="44" y="180" width="872" height="374" rx="20" fill={tone('#20302c')} />
        {index === 3 ? (
          <>
            <rect x="115" y="222" width="730" height="54" rx="12" fill={tone('white')} />
            <text x="140" y="256" fontSize="22" fill={tone('#536643')}>
              https://your-website.com
            </text>
            {[0, 1, 2].map((n) => (
              <g key={n} opacity={Math.max(0, Math.min(1, progress * 3 - n))}>
                <rect
                  x={115 + n * 247}
                  y="307"
                  width="224"
                  height="188"
                  rx="12"
                  fill={n === 1 ? '#bfd879' : '#f6f7f1'}
                />
                <text x={138 + n * 247} y="350" fill={tone('#263c30')} fontSize="17">
                  SCENE {n + 1}
                </text>
                <rect x={138 + n * 247} y="375" width="150" height="10" rx="5" fill={tone('#80936a')} />
                <rect x={138 + n * 247} y="400" width="110" height="10" rx="5" fill={tone('#aebc99')} />
                <text x={138 + n * 247} y="466" fontSize="22" fill={tone('#263c30')}>
                  {['Introduce', 'Explore', 'Take action'][n]}
                </text>
              </g>
            ))}
          </>
        ) : index === 4 ? (
          <>
            <rect x="240" y="218" width="480" height="256" rx="16" fill={tone('#f6f7f1')} />
            <text x="480" y="300" textAnchor="middle" fill={tone('#293d30')} fontSize="28">
              Your next great demo.
            </text>
            <rect x="315" y="345" width="330" height="16" rx="8" fill={tone('#e2e8d8')} />
            <rect x="315" y="345" width={330 * progress} height="16" rx="8" fill={tone('#abc85c')} />
            <text x="480" y="410" textAnchor="middle" fill={tone('#4a623d')} fontSize="22">
              {progress === 1 ? 'Ready to share' : `Exporting ${Math.round(progress * 100)}%`}
            </text>
            <text x="480" y="516" textAnchor="middle" fill={tone('#d9e9c8')} fontSize="18">
              16:9 desktop / 9:16 mobile
            </text>
          </>
        ) : (
          <>
            <rect x="83" y="209" width="794" height="253" rx="12" fill={tone('#fafbf6')} />
            <circle cx="106" cy="227" r="4" fill={tone('#bac7a9')} />
            <circle cx="121" cy="227" r="4" fill={tone('#bac7a9')} />
            <text x="119" y="290" fontSize="27" fill={tone('#2b4131')} fontWeight="700">
              A little idea. A clear story.
            </text>
            {[0, 1, 2].map((n) => (
              <rect
                key={n}
                x={120 + n * 176}
                y="323"
                width="155"
                height={60 + n * 10}
                rx="9"
                fill={n === 1 ? '#bed779' : '#dce5cf'}
              />
            ))}
            {index === 0 && (
              <>
                <rect x="716" y="316" width="138" height="124" rx="22" fill={tone('#bfd879')} />
                <circle cx="785" cy="356" r="20" fill={tone('#65834b')} />
                <path d="M749 419 Q749 380 785 380 Q821 380 821 419" fill={tone('#65834b')} />
                <circle cx="804" cy="241" r="6" fill={tone('#ce5852')} />
                <text x="818" y="247" fontSize="15" fill={tone('#59644e')}>
                  {mode === 'file' ? 'LOCAL' : 'REC'}
                </text>
              </>
            )}
            {index === 2 && (
              <>
                <rect x="196" y="407" width="540" height="38" rx="9" fill={tone('#25362c')} />
                <text x="466" y="433" textAnchor="middle" fill={tone('white')} fontSize="22">
                  {local < 55 ? 'Make your next idea' : 'easy to understand.'}
                </text>
              </>
            )}
            {[0, 1, 2].map((n) => (
              <rect
                key={n}
                x={83 + n * 267}
                y="485"
                width="251"
                height="34"
                rx="6"
                fill={n === 1 ? '#bed779' : '#93a782'}
              />
            ))}
            <line
              x1={83 + 794 * progress}
              x2={83 + 794 * progress}
              y1="476"
              y2="528"
              stroke="#f4ffcd"
              strokeWidth="3"
            />
            {index === 1 && (
              <text x="480" y="446" textAnchor="middle" fill={tone('#526747')} fontSize="18">
                Split · Zoom · Volume
              </text>
            )}
          </>
        )}
      </g>
      {sequence.map((_, n) => (
        <rect
          key={n}
          x={44 + n * 176}
          y="588"
          width="160"
          height="5"
          rx="2"
          fill={n === step ? '#789348' : '#cdd7c1'}
        />
      ))}
      <text x="44" y="622" fill={tone('#6b795f')} fontSize="14">
        {step + 1} / {sequence.length}
      </text>
    </svg>
  );
}
export default function HomeFeatureDemo({ mode, dark=false,frameless=false,seekChapter,onChapterChange }: { mode?: 'screen' | 'website' | 'file';dark?:boolean;frameless?:boolean;seekChapter?:{index:number;token:number};onChapterChange?:(index:number)=>void } = {}) {
  const player = useRef<PlayerRef>(null);
  const [paused, setPaused] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [active, setActive] = useState(0);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const update = ({ detail }: { detail: { frame: number } }) =>
      setActive(
        (mode === 'screen' || mode === 'file')
          ? Math.min(3, Math.floor(detail.frame / 120))
          : detail.frame < 360
            ? Math.floor(detail.frame / 120)
            : detail.frame < 840
              ? 3
              : 4,
      );
    p.addEventListener('frameupdate', update);
    return () => p.removeEventListener('frameupdate', update);
  }, [mode]);
  useEffect(()=>{onChapterChange?.(active);},[active]);
  useEffect(()=>{if(seekChapter!==undefined){player.current?.seekTo(seekChapter.index*120+20);setActive(seekChapter.index);}},[seekChapter]);
  useEffect(() => {
    if (paused) player.current?.pause();
    else player.current?.play();
  }, [paused]);
  return (
    <div className="home-feature-demo" aria-label="Interactive feature tour">
      <Player
        ref={player}
        component={FeatureComposition}
        inputProps={{ mode,dark,frameless }}
        durationInFrames={(mode === 'screen' || mode === 'file') ? 480 : 960}
        fps={30}
        compositionWidth={960}
        compositionHeight={640}
        controls={false}
        autoPlay={!paused}
        loop
        initiallyMuted
        clickToPlay={false}
        doubleClickToFullscreen={false}
        initialFrame={20}
        style={{ width: '100%', aspectRatio: '3 / 2', borderRadius: 20, overflow: 'hidden' }}
      />
      <div className="feature-tour-controls">
        <div role="group" aria-label="Explore features">
          {((mode === 'screen' || mode === 'file')
            ? [mode === 'file' ? 'Import' : 'Record', 'Edit', 'Captions', 'Export']
            : ['Record', 'Edit', 'Captions', 'Website', 'Export']
          ).map((label, i) => (
            <button
              key={label}
              aria-pressed={active === i}
              onClick={() => {
                player.current?.seekTo(((mode !== 'screen' && mode !== 'file') && i === 4 ? 840 : i * 120) + 20);
                setActive(i);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="feature-tour-playback"
          aria-label={paused ? 'Play feature animation' : 'Pause feature animation'}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={15}/> : <Pause size={15}/>}<span>{paused ? 'Play' : 'Pause'}</span>
        </button>
      </div>
    </div>
  );
}
