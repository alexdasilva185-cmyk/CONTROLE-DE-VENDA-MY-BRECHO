import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary, clearServiceWorkerCachesAndReload } from './components/ErrorBoundary.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

declare global {
  interface Window {
    __APP_MOUNTED__?: boolean;
    __RECOVER_APP__?: (forceManual?: boolean) => void;
  }
}

// Recover cleanly if Vite hits a stale chunk after a new deploy
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  void clearServiceWorkerCachesAndReload();
});

// Ensure dev preview is never hijacked by an old cached dev-sw.js
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const reg of registrations) {
        void reg.unregister();
      }
    })
    .catch(() => {});
}

// Register production PWA service worker safely with automatic update activation
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisterError(err) {
      console.warn('Falha ao registrar Service Worker:', err);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);

window.__APP_MOUNTED__ = true;
