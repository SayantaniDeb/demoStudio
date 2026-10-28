import { interpolate, spring, useCurrentFrame } from 'remotion';
export type DesignProps = {
  variant: 'headline' | 'cards' | 'spotlight';
  brand: string;
  headline: string;
  description: string;
  accent: string;
};
export const DESIGN_FPS = 30;
export const DESIGN_FRAMES = 240;
const enter = (frame: number, delay = 0) =>
  spring({ frame: frame - delay, fps: DESIGN_FPS, config: { damping: 22, stiffness: 110 } });
function lines(text: string, size = 27) {
  const result: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = result.length - 1;
    if (last < 0 || result[last].length + word.length > size) result.push(word);
    else result[last] += ' ' + word;
  }
  return result.slice(0, 3);
}
export function DesignArtwork({ frame, ...p }: DesignProps & { frame: number }) {
  const reveal = enter(frame, 8),
    card = enter(frame, 22),
    exit = interpolate(frame, [218, 239], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const title = lines(p.headline, p.variant === 'headline' ? 29 : 22);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1280"
      height="720"
      viewBox="0 0 1280 720"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <rect width="1280" height="720" fill="#f3f4ee" />
      <g fontFamily="Arial, sans-serif" fill="#232b26" opacity={exit}>
        <text x="72" y="70" fontSize="20" fontWeight="700" letterSpacing="3">
          {p.brand.toUpperCase()}
        </text>
        <path d="M72 100H1208" stroke="#d9ded3" />
        <g opacity={reveal} transform={`translate(0,${(1 - reveal) * 35})`}>
          <text x="72" y="185" fontSize="14" letterSpacing="4" fill="#6d795f">
            {p.variant === 'cards'
              ? 'THE DETAILS MAKE THE DIFFERENCE'
              : p.variant === 'spotlight'
                ? 'IN THE SPOTLIGHT'
                : 'AN IDEA WORTH SHARING'}
          </text>
          {title.map((line, i) => (
            <text
              key={i}
              x="72"
              y={255 + i * 66}
              fontSize={p.variant === 'headline' ? 60 : 52}
              fontWeight="700"
              letterSpacing="-2"
            >
              {line}
            </text>
          ))}
          {lines(p.description, p.variant === 'headline' ? 65 : 40).map((line, i) => (
            <text key={i} x="76" y={290 + title.length * 66 + i * 26} fontSize="20" fill="#66715f">
              {line}
            </text>
          ))}
        </g>
        {p.variant === 'headline' ? (
          <g transform={`translate(72,590) scale(${card},1)`}>
            <rect width="1136" height="12" rx="6" fill={p.accent} />
            <text y="55" fontSize="16" fill="#66715f">
              A clear story, one frame at a time.
            </text>
          </g>
        ) : p.variant === 'cards' ? (
          <g>
            {['Capture your idea', 'Shape the details', 'Share your story'].map((label, i) => {
              const progress = enter(frame, 30 + i * 12);
              return (
                <g
                  key={label}
                  opacity={progress}
                  transform={`translate(${790 + i * 16},${170 + i * 148 + (1 - progress) * 40})`}
                >
                  <rect
                    width="350"
                    height="128"
                    rx="16"
                    fill={i === 1 ? p.accent : '#fff'}
                    stroke="#d9ded3"
                  />
                  <text x="24" y="38" fontSize="13" fill="#526044">
                    0{i + 1}
                  </text>
                  <text x="24" y="84" fontSize="24" fontWeight="700">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        ) : (
          <g opacity={card} transform={`translate(${790 + (1 - card) * 70},180)`}>
            <rect width="370" height="360" rx="24" fill="#232b26" />
            <rect x="28" y="30" width="314" height="220" rx="12" fill={p.accent} />
            <circle
              cx="185"
              cy="140"
              r={52 + Math.sin(frame / 24) * 5}
              fill="#ffffff"
              fillOpacity=".55"
            />
            <path d="M172 112L210 140L172 168Z" fill="#232b26" />
            <text x="28" y="296" fill="#fff" fontSize="22" fontWeight="700">
              {p.brand}
            </text>
            <text x="28" y="329" fill="#c6d0c0" fontSize="15">
              Your next great idea
            </text>
          </g>
        )}
        <text x="1208" y="670" textAnchor="end" fontSize="13" fill="#72806a">
          MADE WITH FRAME
        </text>
      </g>
    </svg>
  );
}
export function DesignComposition(props: DesignProps) {
  return <DesignArtwork {...props} frame={useCurrentFrame()} />;
}
