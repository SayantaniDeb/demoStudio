import './loadingView.css';
export function LoadingView({label='Opening studio…'}:{label?:string}) {
 return <div className="studio-loading" role="status" aria-live="polite"><span className="studio-loading-spinner" aria-hidden="true"/><strong>{label}</strong><small>Preparing your workspace</small></div>;
}
