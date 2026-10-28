import { Audio } from '@remotion/media';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { DirectorMusic } from './DirectorTimeline';
import {
  componentPose,
  creativeFrame,
  type CreativeAnimation,
  type CreativeElement,
} from '../creative';
export type DirectorProps = {
  plan: CreativeAnimation;
  assets: string[];
  format?: 'desktop' | 'mobile';
  music?: DirectorMusic;
};
function Text({ element: e, reveal = 1 }: { element: CreativeElement; reveal?: number }) {
  const words = e.text.split(/\s+/),
    lines: string[] = [];
  let line = '';
  const limit = Math.max(1, Math.floor(e.width / (e.fontSize * 0.57)));
  for (const word of words) {
    if ((line + ' ' + word).trim().length > limit && line) {
      lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  let visible = Math.ceil(e.text.length * reveal);
  return (
    <text fontFamily="Arial, sans-serif" fontWeight="600" fontSize={e.fontSize} fill={e.fill}>
      {lines.slice(0, Math.max(1, Math.floor(e.height / (e.fontSize * 1.2)))).map((text, i) => {
        const value = text.slice(0, Math.max(0, visible));
        visible -= text.length;
        return (
          <tspan key={i} x={e.x} y={e.y + e.fontSize + i * e.fontSize * 1.2}>
            {value}
          </tspan>
        );
      })}
    </text>
  );
}
export function DirectorComposition({ plan, assets, format = 'desktop', music }: DirectorProps) {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    { scene, time } = creativeFrame(plan, frame / fps),
    local = time * fps;
  const mobile = format === 'mobile',
    width = mobile ? 720 : 1280,
    height = mobile ? 1280 : 720;
  const camera = interpolate(time, [0, scene.duration], [1, 1.025], { extrapolateRight: 'clamp' });
  return (
    <>
      {music && <Audio src={music.src} volume={music.volume} loop={!music.builtin} />}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: scene.background }}
      >
        <rect width={width} height={height} fill={scene.background} />
        <g
          transform={`translate(${width / 2} ${height / 2}) scale(${camera}) translate(${-width / 2} ${-height / 2})`}
        >
          {scene.components.map((c, index) => {
            let pose = componentPose(c, time);
            let elements =
              c.name === 'Website icon' ? c.elements.filter((e) => e.kind === 'image') : c.elements;
            if (mobile) {
              if (c.name === 'User caption') {
                pose = { ...pose, x: 40, y: 1050 };
                elements = elements.map((e) => ({ ...e, width: 640, height: 130, fontSize: 32 }));
              } else if (c.name === 'User pointer') {
                pose = { ...pose, x: (pose.x / 1280) * 720, y: (pose.y / 720) * 1280 };
              } else if (c.name === 'Headline' || c.name === 'Caption') {
                pose = { ...pose, x: 40, y: c.name === 'Headline' ? 140 : 310 };
                elements = elements.map((e) => ({
                  ...e,
                  width: 640,
                  height: c.name === 'Headline' ? 150 : 125,
                  fontSize: c.name === 'Headline' ? 42 : 27,
                }));
              } else if (c.name === 'Website icon') {
                pose = { ...pose, x: 600, y: 35 };
              } else if (c.name.startsWith('Feature card ')) {
                const n = Number(c.name.slice(-1)) - 1;
                pose = {
                  ...pose,
                  x: 195 + (pose.x - (95 + n * 380)) * 0.8,
                  y: 470 + n * 200 + (pose.y - 340) * 0.8,
                  scale: pose.scale * 0.8,
                };
              } else if (c.name === 'Connecting features') {
                pose = { ...pose, opacity: 0 };
              } else if (c.name === 'Timeline' || c.name === 'Timeline playhead') {
                pose = {
                  ...pose,
                  x: 40 + (pose.x - 100) * 0.59,
                  y: 1190 + (pose.y - 660) * 0.59,
                  scale: pose.scale * 0.59,
                };
              } else {
                pose = {
                  ...pose,
                  x: 40 + (pose.x - 190) * 0.72,
                  y: 540 + (pose.y - 280) * 0.72,
                  scale: pose.scale * 0.72,
                };
              }
            }
            const enter = spring({
              frame: local - index * 2,
              fps,
              config: { damping: 18, stiffness: 140 },
            });
            return (
              <g
                key={c.id}
                opacity={pose.opacity}
                transform={`translate(${pose.x} ${pose.y + (1 - enter) * 12}) rotate(${pose.rotation}) scale(${pose.scale})`}
              >
                {elements.map((e, n) => {
                  const props = { fill: e.fill, stroke: e.stroke, strokeWidth: e.strokeWidth };
                  if (e.kind === 'text')
                    return (
                      <Text
                        key={n}
                        element={e}
                        reveal={
                          c.name === 'Caption'
                            ? interpolate(time, [0.25, 1.2], [0, 1], {
                                extrapolateLeft: 'clamp',
                                extrapolateRight: 'clamp',
                              })
                            : 1
                        }
                      />
                    );
                  if (e.kind === 'rect')
                    return (
                      <rect
                        key={n}
                        x={e.x}
                        y={e.y}
                        width={e.width}
                        height={e.height}
                        rx={e.radius}
                        {...props}
                      />
                    );
                  if (e.kind === 'ellipse')
                    return (
                      <ellipse
                        key={n}
                        cx={e.x + e.width / 2}
                        cy={e.y + e.height / 2}
                        rx={e.width / 2}
                        ry={e.height / 2}
                        {...props}
                      />
                    );
                  if (e.kind === 'path')
                    return (
                      <path key={n} d={e.path} transform={`translate(${e.x} ${e.y})`} {...props} />
                    );
                  const src = assets[e.asset] || '';
                  return /^data:image\/(png|jpeg|webp);base64,/.test(src) ? (
                    <image key={n} x={e.x} y={e.y} width={e.width} height={e.height} href={src} />
                  ) : null;
                })}
              </g>
            );
          })}
        </g>
      </svg>
    </>
  );
}
