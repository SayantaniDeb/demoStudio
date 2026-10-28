import { ArrowUpRight, Layers, Check, MousePointer2 } from 'lucide-react';
export function EmptyStudioCanvas({ onStart }: { onStart: () => void }) {
  return (
    <div className="empty-demo">
      <div className="demo-top">
        <span className="mini-logo">f</span>
        <span>great ideas, beautifully told.</span>
        <span className="dots">•••</span>
      </div>
      <div className="demo-content">
        <span className="demo-tag">YOUR PRODUCT. CENTER STAGE.</span>
        <h2>
          Show a little.
          <br />
          Say a lot.
        </h2>
        <p>
          Turn everyday recordings into
          <br />
          demos people actually understand.
        </p>
        <button onClick={onStart}>
          Bring your story to life <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="mock-card">
        <span className="mock-icon">
          <Layers size={28} />
        </span>
        <strong>
          Something great
          <br />
          is taking shape.
        </strong>
        <div className="mock-progress">
          <span />
        </div>
        <small>
          <Check size={12} /> Ready for your big idea
        </small>
      </div>
      <div className="fake-cursor">
        <MousePointer2 size={28} />
        <span>You</span>
      </div>
    </div>
  );
}
