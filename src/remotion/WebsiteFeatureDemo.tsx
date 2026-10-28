import { interpolate, useCurrentFrame } from 'remotion';
const steps = [
  ['Start with a website', 'Paste a public URL and describe your creative direction.'],
  [
    'Build a scene-by-scene story',
    'Choose a duration. Generate distinct headlines and supporting copy.',
  ],
  ['Make the video yours', 'Edit scene text, add pointers, captions, and music.'],
  [
    'Choose your format. Share your story.',
    'Preview in desktop or mobile, then export your video.',
  ],
];
export function WebsiteTour() {
  const frame = useCurrentFrame(),
    step = Math.min(3, Math.floor(frame / 120)),
    local = frame % 120;
  const progress = interpolate(local, [12, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(local, [0, 12, 108, 119], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <svg
      viewBox="0 0 960 640"
      style={{ width: '100%', height: '100%', fontFamily: 'Arial,sans-serif' }}
    >
      <rect width="960" height="640" rx="24" fill="#edf1e7" />
      <text x="44" y="49" fill="#647352" fontSize="15" letterSpacing="3">
        WEBSITE LINK TO VIDEO · QUICK TOUR
      </text>
      <g opacity={opacity}>
        <text x="44" y="108" fontSize="32" fontWeight="700" fill="#23352b">
          {steps[step][0]}
        </text>
        <text x="44" y="145" fontSize="19" fill="#66725d">
          {steps[step][1]}
        </text>
        <rect x="44" y="180" width="872" height="374" rx="20" fill="#20302c" />
        {step === 0 ? (
          <>
            <rect x="110" y="230" width="740" height="64" rx="12" fill="white" />
            <text x="135" y="270" fill="#536643" fontSize="24">
              {'https://your-website.com'.slice(0, Math.ceil(progress * 24))}
            </text>
            <text x="115" y="345" fill="#dce5cf" fontSize="20">
              Creative direction
            </text>
            <text x="115" y="385" fill="white" fontSize="24">
              Introduce the product. Show what makes it useful.
            </text>
            <rect x="115" y="437" width="290" height="65" rx="12" fill="#bfd879" />
            <text x="145" y="477" fontSize="22" fill="#23352b">
              Create animation →
            </text>
          </>
        ) : step === 3 ? (
          <>
            <rect x="135" y="225" width="450" height="245" rx="15" fill="#f6f7f1" />
            <rect x="640" y="217" width="145" height="260" rx="18" fill="#bfd879" />
            <text x="360" y="350" textAnchor="middle" fill="#23352b" fontSize="27">
              Your finished story
            </text>
            <text x="360" y="430" textAnchor="middle" fill="#647352" fontSize="19">
              Desktop · 16:9
            </text>
            <text x="712" y="350" textAnchor="middle" fill="#23352b" fontSize="17">
              Mobile · 9:16
            </text>
            <rect x="135" y="500" width="650" height="10" rx="5" fill="#536643" />
            <rect x="135" y="500" width={650 * progress} height="10" rx="5" fill="#bfd879" />
          </>
        ) : (
          <>
            {['Meet the product', 'Explore its purpose', 'Take the next step'].map((title, n) => (
              <g key={title} opacity={Math.max(0, Math.min(1, progress * 4 - n * 0.6))}>
                <rect
                  x={90 + n * 265}
                  y="225"
                  width="248"
                  height="235"
                  rx="14"
                  fill={n === 1 ? '#bfd879' : '#f6f7f1'}
                />
                <text x={108 + n * 265} y="265" fontSize="14" fill="#647352">
                  SCENE {n + 1}
                </text>
                <text x={108 + n * 265} y="308" fontSize="19" fontWeight="700" fill="#23352b">
                  {title}
                </text>
                <rect x={108 + n * 265} y="337" width="190" height="10" rx="5" fill="#93a782" />
                <rect x={108 + n * 265} y="360" width="145" height="10" rx="5" fill="#93a782" />
                <text x={108 + n * 265} y="423" fontSize="16" fill="#536643">
                  {step === 2
                    ? ['Edit copy', 'Add pointer', 'Style captions'][n]
                    : ['Introduce', 'Demonstrate', 'Finish'][n]}
                </text>
              </g>
            ))}
            <text x="95" y="510" fill="#dce5cf" fontSize="20">
              {step === 2
                ? 'Captions  ·  Cursor  ·  Music  ·  Design'
                : 'A distinct idea for every scene'}
            </text>
            {step === 2 && (
              <path
                d="M 0 0 L 10 42 L 19 29 L 31 42 L 39 35 L 26 22 L 43 18 Z"
                fill="white"
                stroke="#536643"
                strokeWidth="2"
                transform={`translate(${240 + progress * 430},390)`}
              />
            )}
          </>
        )}
      </g>
      {steps.map((_, n) => (
        <rect
          key={n}
          x={44 + n * 220}
          y="588"
          width="200"
          height="5"
          rx="2"
          fill={n === step ? '#789348' : '#cdd7c1'}
        />
      ))}
      <text x="44" y="622" fill="#6b795f" fontSize="14">
        {step + 1} / 4 · Example workflow
      </text>
    </svg>
  );
}
