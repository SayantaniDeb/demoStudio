import React from 'react';
import { createRoot } from 'react-dom/client';
import { isNativeMac } from './nativeMac';
import './style.css';
import './stitch-theme.css';
import './native-mac.css';
if (isNativeMac()) document.documentElement.classList.add('native-mac');
function startupFailure(error: unknown) {
  const root=document.getElementById('root');
  if(!root)return;
  root.replaceChildren();
  const panel=document.createElement('div');
  panel.style.cssText='padding:40px;max-width:640px;margin:40px auto;font:16px/1.6 system-ui;color:#25352f;background:#f4f7f3;border-radius:16px';
  const title=document.createElement('h1');title.textContent='DemoTake couldn’t finish loading';
  const message=document.createElement('p');message.textContent=error instanceof Error?error.message:String(error);
  const button=document.createElement('button');button.textContent='Reload DemoTake';button.onclick=()=>location.reload();
  panel.append(title,message,button);root.append(panel);
}
class StartupBoundary extends React.Component<React.PropsWithChildren,{error:Error|null}> {
  state={error:null as Error|null};
  static getDerivedStateFromError(error:Error){return {error};}
  componentDidCatch(error:Error){startupFailure(error);}
  render(){return this.state.error?null:this.props.children;}
}
async function start() {
  if(import.meta.env.DEV && 'serviceWorker' in navigator) {
    const registrations=await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration=>registration.unregister()));
    // Retire only DemoTake's old shell cache, preserving project/media storage.
    if('caches' in window) for(const key of await caches.keys()) if(key.startsWith('frame-shell-'))await caches.delete(key);
    if(navigator.serviceWorker.controller && !sessionStorage.getItem('demotake-dev-sw-cleaned')) {
      sessionStorage.setItem('demotake-dev-sw-cleaned','1');location.reload();return;
    }
  }
  const {default:App}=await import('./App');
  createRoot(document.getElementById('root')!).render(<React.StrictMode><StartupBoundary><App/></StartupBoundary></React.StrictMode>);
  if(import.meta.env.PROD&&!isNativeMac()&&'serviceWorker' in navigator)void navigator.serviceWorker.register('/sw.js');
}
void start().catch(startupFailure);
