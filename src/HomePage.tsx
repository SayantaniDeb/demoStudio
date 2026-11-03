import { LoadingView } from './components/LoadingView';
import { lazy, Suspense } from 'react';
const HomeFeatureDemo = lazy(() => import('./remotion/HomeFeatureDemo'));
import {
  ArrowUpRight,
  ArrowRight,
  Monitor,
  Camera,
  Layers,
  Scissors,
  MousePointer2,
  Type,
  Image,
  Film,
  Sparkles,
  Download,
  Upload,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import './home.css';
import { isNativeMac } from './nativeMac';
type Mode = 'media' | 'screen' | 'camera' | 'edit' | 'animate' | 'website' | 'image' | 'templates';
export function HomePage({
  onOpen,
  hasProject,
  dark = true,
  onThemeChange,
}: {
  onOpen: (mode: Mode) => void;
  hasProject: boolean;
  dark?: boolean;
  onThemeChange?: () => void;
}) {
  const native = typeof window !== 'undefined' && isNativeMac();
  const tools = [
    {
      icon: Monitor,
      title: 'Screen Demo Studio',
      text: 'Record, edit and export screen demos right in your web browser. Prefer a dedicated window? Install DemoTake as a web app and keep the same studio close at hand. A notarized Mac release is coming soon; the unnotarized developer preview is available now.',
      features: ['Screen, camera & microphone', 'Timeline, zooms & captions', 'Landscape & vertical video'],
      action: 'Try here',
      mode: 'screen' as Mode,
      tag: 'RECORD & EDIT',
    },

  ];
  return (
    <div className={`frame-home home-glass ${dark ? 'home-dark' : 'home-light'}`}>
      <header className="home-nav">
        <a href="/" className="home-brand">
          <Film size={25} />
          <span>
            DemoTake<span className="home-beta">BETA</span>
          </span>
        </a>
        <nav aria-label="Home navigation" className="home-reference-pill"><Film size={19}/><a href="#studio-tour">The studio</a><a href="#screen-studio" onClick={(event) => { event.preventDefault(); onOpen('screen'); }}>Web version</a><a href="#download-mac">Mac app</a></nav>
        <button className="home-theme-toggle" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={onThemeChange}>{dark?<Sun size={16}/>:<Moon size={16}/>}</button>
      </header>
      <main>
        {!native&&<section className="home-intro"><h1>Make more of every take.</h1></section>}

        <section id="studio-tour" className="home-hero">
          <div className="home-hero-copy">
            {!native && <div className="home-studio-note">
              <span className="home-eyebrow">FROM FILE TO FINISHED</span>
              <h2>A little polish. A lot of possibility.</h2>
              <p>Bring your footage. Shape the edit, add captions and make it yours.</p>
              <span className="home-tour-hint">Explore the demo below →</span>
            </div>}
            {native && <>
            <span className="home-eyebrow">
              <span /> SCREEN RECORDER & VIDEO EDITOR
            </span>
            <h1>
              Capture it.
              <br />
              Shape it.
              <br />
              <span>Make it clear.</span>
            </h1>
            <p>
              Record a product walkthrough, edit your footage and export a demo.
              Your screen, camera and editing tools, together in one studio.
            </p>
            </>}
            {native && <div className="home-cta">
              <button onClick={() => onOpen('screen')}>
                {native ? 'Start recording' : 'Open Screen Demo Studio'}
                <ArrowRight size={18} />
              </button>

            </div>}
            <div className="home-local">
              <ShieldCheck size={15} /> Media editing and rendering stay on your device.
            </div>
          </div>
          <div className="home-preview-glass"><div className="home-preview-chrome"><span><i/><i/><i/></span><small>DemoTake / a little look inside</small><Film size={13}/></div><Suspense fallback={<LoadingView label="Loading feature tour…"/>}>
            <HomeFeatureDemo dark={dark} mode={native ? "screen" : "file"} />
          </Suspense></div>
        </section>
        <section id="features" className="home-features">
          <div className="home-section-heading">
            <div>
              <span className="home-eyebrow">YOUR STUDIO. RIGHT IN YOUR BROWSER.</span>
              <h2>See what you can make on the web.</h2>
            </div>
            <p>
              Use Screen Demo Studio on the web, or install it as a web app.
              Start creating now—no Mac download required.
            </p>
          </div>
          <div className="home-feature-grid home-feature-grid-single">
            {tools.map((tool) => (
              <button className="home-feature" key={tool.title} onClick={() => onOpen(tool.mode)}>
                <div className="home-feature-top">
                  <tool.icon size={23} />
                  <span>{tool.tag}</span>
                  <ArrowUpRight size={18} />
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.text}</p>
                <ul className="home-web-capabilities">{tool.features.map(feature => <li key={feature}><ShieldCheck size={13} />{feature}</li>)}</ul>
                <span className="home-feature-link">
                  {native ? 'Open workspace' : tool.action}
                  <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>

        {!native && <section id="download-mac" className="home-mac-download" aria-labelledby="download-mac-title">
          <div className="home-mac-copy">
            <span className="home-eyebrow">DEMOTAKE FOR MAC</span>
            <h2 id="download-mac-title">Your studio. Right on your Mac.</h2>
            <ul className="home-mac-features" aria-label="Mac app features">
              <li><Monitor size={17} /><span><strong>Native screen capture</strong><span>Record product walkthroughs directly on your Mac.</span></span></li>
              <li><Film size={17} /><span><strong>Local recording library</strong><span>Keep your recordings organized and saved on your device.</span></span></li>
              <li><Layers size={17} /><span><strong>A dedicated desktop studio</strong><span>Capture, edit and export in one Mac app.</span></span></li>
            </ul>
            <div className="home-mac-download-action">
              <a className="home-mac-primary" href="/downloads/DemoTake-Mac-AppleSilicon.dmg" download><Download size={18} /> Download developer preview</a>
              <span className="home-mac-status">Notarized release coming soon</span>
            </div>
            <small>Version 0.1.0 · Apple silicon · macOS 15 or later</small>
            <p className="home-mac-preview-note">This developer preview is not notarized by Apple. macOS may block its first launch and require approval in Privacy &amp; Security. You can also keep using DemoTake in your browser or as a web app.</p>
          </div>
          <ol className="home-mac-steps">
            <li><span>01</span><div><h3>Download the developer preview</h3><p>Open the downloaded disk image.</p></div></li>
            <li><span>02</span><div><h3>Drag into Applications</h3><p>Move DemoTake to Applications, then open it from there.</p></div></li>
            <li><span>03</span><div><h3>Approve the first launch</h3><p>If macOS blocks DemoTake, click Done. Open System Settings → Privacy &amp; Security and choose Open Anyway for DemoTake. Only approve a build you trust. <a href="https://support.apple.com/en-gb/102445" target="_blank" rel="noreferrer">Apple’s opening instructions</a></p></div></li>
          </ol>
        </section>}
        <section className="home-finishing">
          <div>
            <span className="home-eyebrow">THE FINISHING TOUCHES</span>
            <h2>
              Your footage.
              <br />
              Your way.
            </h2>
            <p>Keep the details that matter and give every clip a place.</p>
          </div>
          <ul>
            {[
              {
                icon: Scissors,
                title: 'Edit the timeline',
                text: 'Split, trim, reorder, and remove clips.',
              },
              {
                icon: Layers,
                title: 'Arrange your displays',
                text: 'Move and resize screen and camera footage on the canvas.',
              },
              {
                icon: MousePointer2,
                title: 'Guide the eye',
                text: 'Add pointer movement, focus, and zoom to screen footage.',
              },
              {
                icon: Type,
                title: 'Add captions',
                text: 'Style custom captions or transcribe speech with Groq.',
              },
              {
                icon: Image,
                title: 'Set the scene',
                text: 'Choose a canvas color or upload a background image.',
              },
              {
                icon: Download,
                title: 'Export your story',
                text: 'Create desktop or mobile video, rendered locally.',
              },
            ].map((item) => (
              <li key={item.title}>
                <item.icon size={20} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="home-faq" aria-labelledby="home-faq-title">
          <h2 id="home-faq-title">Create product demos in your browser</h2>
          <details>
            <summary>Do I need the Mac app to use DemoTake?</summary>
            <p>No. Screen Demo Studio works in a supported desktop browser. You can also install DemoTake as a web app for a dedicated window. A notarized Mac release is coming soon; the unnotarized developer preview is available now.</p>
          </details>
          <details>
            <summary>How do I record a screen demo?</summary>
            <p>
              Open Screen Demo Studio in a desktop browser, choose your screen, camera and
              microphone, then start recording. Trim clips, add captions and export your demo.
            </p>
          </details>
          <details>
            <summary>Can I install DemoTake as a web app?</summary>
            <p>Yes. In a supported browser, choose Install DemoTake from the address bar or browser menu. In Safari on Mac, choose File → Add to Dock. You can keep using Screen Demo Studio in a regular browser tab too.</p>
          </details>
          <details>
            <summary>Does my footage stay on my device?</summary>
            <p>
              Media editing and video rendering happen on your device. AI features use Groq: speech
              captions send selected audio for transcription and translation.
            </p>
          </details>
          <details>
            <summary>Can I create vertical videos?</summary>
            <p>
              Yes. Choose desktop 16:9 or mobile 9:16 format, adjust your layout, preview the result
              and export your video.
            </p>
          </details>
        </section>
        <section className="home-bottom-cta">
          <div>
            <h2>One idea is all you need.</h2>
            <p>Open File Studio and start creating. No download required.</p>
          </div>
          <button onClick={() => onOpen(native ? 'edit' : 'media')}>
            Let’s make something
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
        {!native&&<div className="home-glass-dock home-curved-dock"><button onClick={()=>onOpen('media')}>Open file studio <ArrowUpRight size={15}/></button></div>}


      <footer>
        <span className="home-brand">
          <Film size={19} />
          DemoTake
        </span>
        <p>AI captions use Groq. Editing and rendering stay on your device.</p>
        {!native && <a href="#download-mac">Download Mac developer preview</a>}
        <span>A small studio for big ideas.</span>
      </footer>
    </div>
  );
}
