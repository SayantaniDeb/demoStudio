import { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import './export-dialog.css';
type ExportResult = { url: string; name: string };
export function ExportDialog({
  rendering,
  progress,
  result,
  onCancel,
}: {
  rendering: boolean;
  progress: number;
  result: ExportResult | null;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    preview = useRef<HTMLVideoElement>(null);
  const [dismissed, setDismissed] = useState<string | null>(null),
    [saveRequested, setSaveRequested] = useState(false);
  const visible = rendering || Boolean(result && dismissed !== result.url);
  useEffect(() => {
    setSaveRequested(false);
  }, [result?.url]);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (visible && !element.open) element.showModal();
    else if (!visible && element.open) element.close();
    return () => {
      element.close();
    };
  }, [visible]);
  function close() {
    preview.current?.pause();
    if (result) setDismissed(result.url);
  }
  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <dialog
      ref={dialog}
      className="export-dialog"
      aria-labelledby="export-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (rendering) onCancel();
        else close();
      }}
    >
      <div className="export-dialog-top">
        <span className="export-dialog-eyebrow">MADE HERE. YOURS TO KEEP.</span>
        {!rendering && (
          <button type="button" aria-label="Close video preview" onClick={close}>
            <X size={20} />
          </button>
        )}
      </div>
      {rendering ? (
        <>
          <div className="export-dialog-art">
            <LoaderCircle size={38} className="export-dialog-spinner" />
            <ShieldCheck size={22} />
          </div>
          <h2 id="export-dialog-title">Your video is becoming yours to keep.</h2>
          <p>
            Your video is yours. It’s rendering right here on your device, ready for you to save and
            make it part of your world.
          </p>
          <div className="export-dialog-progress" role="status" aria-live="polite">
            <span>Preparing your video</span>
            <strong>{percent}%</strong>
          </div>
          <progress value={percent} max={100} aria-label="Video export progress" />
          <button type="button" className="export-dialog-cancel" onClick={onCancel}>
            Cancel export
          </button>
        </>
      ) : result ? (
        <>
          <h2 id="export-dialog-title">Your video. Ready to keep.</h2>
          <p>Preview your finished video, then save it to your device.</p>
          <video
            ref={preview}
            src={result.url}
            controls
            playsInline
            preload="metadata"
            aria-label="Finished video preview"
          />
          <a
            className="export-dialog-save"
            href={result.url}
            download={result.name}
            onClick={() => setSaveRequested(true)}
            aria-label="Save video to your device"
          >
            <Download size={20} />
            <span>Save video</span>
          </a>
          {saveRequested && (
            <small role="status">Download requested. Your browser will save the file.</small>
          )}
        </>
      ) : null}
    </dialog>
  );
}
