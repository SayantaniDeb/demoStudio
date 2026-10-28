import type { CreativeAnimation, CreativeComponent, CreativeElement } from './creative';
export function CreativeEditor({
  plan,
  onChange,
}: {
  plan: CreativeAnimation;
  onChange: (plan: CreativeAnimation) => void;
}) {
  const change = (si: number, ci: number, fn: (c: CreativeComponent) => CreativeComponent) =>
    onChange({
      ...plan,
      scenes: plan.scenes.map((s, i) =>
        i === si ? { ...s, components: s.components.map((c, j) => (j === ci ? fn(c) : c)) } : s,
      ),
    });
  const element = (si: number, ci: number, ei: number, patch: Partial<CreativeElement>) =>
    change(si, ci, (c) => ({
      ...c,
      elements: c.elements.map((e, k) => (k === ei ? { ...e, ...patch } : e)),
    }));
  return (
    <div className="creative-editor">
      {plan.scenes.map((scene, si) => (
        <details className="chapter-editor" key={si}>
          <summary>
            {scene.title} · {scene.components.length} components
          </summary>
          {scene.components.map((component, ci) => (
            <details className="chapter-component" key={component.id}>
              <summary>
                {component.name} · {component.elements.length} elements
              </summary>
              <label>
                Name
                <input
                  value={component.name}
                  onChange={(e) => change(si, ci, (c) => ({ ...c, name: e.target.value }))}
                />
              </label>
              <div className="creative-position">
                {(['x', 'y'] as const).map((axis) => (
                  <label key={axis}>
                    Position {axis.toUpperCase()}
                    <input
                      type="number"
                      value={Math.round(component.keyframes[0][axis])}
                      onChange={(e) => {
                        const value = +e.target.value;
                        if (!Number.isFinite(value)) return;
                        change(si, ci, (c) => {
                          const delta = value - c.keyframes[0][axis];
                          return {
                            ...c,
                            keyframes: c.keyframes.map((k) => ({ ...k, [axis]: k[axis] + delta })),
                          };
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
              {component.elements.map((el, ei) => (
                <div className="creative-element" key={ei}>
                  <strong>
                    {el.kind} {ei + 1}
                  </strong>
                  <label>
                    Color
                    <input
                      type="color"
                      value={el.fill}
                      onChange={(e) => element(si, ci, ei, { fill: e.target.value })}
                    />
                  </label>
                  {el.kind === 'text' && (
                    <label>
                      Text
                      <textarea
                        maxLength={300}
                        value={el.text}
                        onChange={(e) => element(si, ci, ei, { text: e.target.value })}
                      />
                    </label>
                  )}
                  {el.kind === 'path' && (
                    <details>
                      <summary>SVG path geometry</summary>
                      <textarea
                        aria-label={`${component.name} SVG path`}
                        value={el.path}
                        onChange={(e) => {
                          if (
                            /^[MmLlHhVvCcSsQqTtAaZz\d\s.,+\-eE]*$/.test(e.target.value) &&
                            e.target.value.length <= 3000
                          )
                            element(si, ci, ei, { path: e.target.value });
                        }}
                      />
                    </details>
                  )}
                </div>
              ))}
            </details>
          ))}
        </details>
      ))}
    </div>
  );
}
