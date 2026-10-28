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
  Globe,
  Download,
  ShieldCheck,
} from 'lucide-react';
import './home.css';
type Mode = 'screen' | 'camera' | 'edit' | 'animate' | 'website' | 'image' | 'templates';
export function HomePage({
  onOpen,
  hasProject,
}: {
  onOpen: (mode: Mode) => void;
  hasProject: boolean;
}) {
  const tools = [
    {
      icon: Monitor,
      title: 'Screen Demo Studio',
      text: 'Record your screen with camera and microphone, edit the timeline, and export a polished demo.',
      mode: 'screen' as Mode,
      tag: 'RECORD & EDIT',
    },
    {
      icon: Globe,
      title: 'Website Link to Video',
      text: 'Turn a public website link into an animated storyboard, review its scenes, and export your video.',
      mode: 'website' as Mode,
      tag: 'LINK TO VIDEO',
    },
  ];
  return (
    <div className="frame-home">
      <header className="home-nav">
        <a href="/" className="home-brand">
          <Film size={25} />
          <span>
            DemoTake<span className="home-beta">BETA</span>
          </span>
        </a>
        <nav aria-label="Home navigation">
          <a href="#features">Explore features</a>
          <button onClick={() => onOpen('edit')}>
            {hasProject ? 'Open your workspace' : 'Open studio'}
            <ArrowUpRight size={16} />
          </button>
        </nav>
      </header>
      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-eyebrow">
              <span /> SCREEN RECORDER & WEBSITE DEMO MAKER
            </span>
            <h1>
              Capture it.
              <br />
              Shape it.
              <br />
              <span>Make it clear.</span>
            </h1>
            <p>
              From a quick recording to a polished product demo. Record and edit your screen, or
              turn a website link into a video.
            </p>
            <div className="home-cta">
              <button onClick={() => onOpen('screen')}>
                Start recording
                <ArrowRight size={18} />
              </button>
              <button onClick={() => onOpen('website')}>
                Website Link to Video
                <ArrowUpRight size={17} />
              </button>
            </div>
            <div className="home-local">
              <ShieldCheck size={15} /> Media editing and rendering stay on your device.
            </div>
          </div>
          <Suspense fallback={<div className="home-feature-demo">Loading feature tour…</div>}>
            <HomeFeatureDemo />
          </Suspense>
        </section>
        <section id="features" className="home-features">
          <div className="home-section-heading">
            <div>
              <span className="home-eyebrow">ONE WORKSPACE. MANY POSSIBILITIES.</span>
              <h2>Record your screen or turn a website into video</h2>
            </div>
            <p>
              Pick a starting point.
              <br />
              Make it your own.
            </p>
          </div>
          <div className="home-feature-grid">
            {tools.map((tool) => (
              <button className="home-feature" key={tool.title} onClick={() => onOpen(tool.mode)}>
                <div className="home-feature-top">
                  <tool.icon size={23} />
                  <span>{tool.tag}</span>
                  <ArrowUpRight size={18} />
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.text}</p>
                <span className="home-feature-link">
                  Open workspace
                  <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>
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
            <summary>How do I record a screen demo?</summary>
            <p>
              Open Screen Demo Studio in a desktop browser, choose your screen, camera and
              microphone, then start recording. Trim clips, add captions and export your demo.
            </p>
          </details>
          <details>
            <summary>Can I turn a website link into a video?</summary>
            <p>
              Open Website Link to Video, paste a public URL, choose a duration and describe your
              creative direction. Review and edit the generated scenes before exporting.
            </p>
          </details>
          <details>
            <summary>Does my footage stay on my device?</summary>
            <p>
              Media editing and video rendering happen on your device. AI features use Groq: speech
              captions send selected audio for transcription, and website animation sends a text
              brief through the app’s server.
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
            <p>Open the studio and start putting it together.</p>
          </div>
          <button onClick={() => onOpen('edit')}>
            Let’s make something
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
      <footer>
        <span className="home-brand">
          <Film size={19} />
          DemoTake
        </span>
        <p>AI features use Groq. Website demos use public page content.</p>
        <span>A small studio for big ideas.</span>
      </footer>
    </div>
  );
}
