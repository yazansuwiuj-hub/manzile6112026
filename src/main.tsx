import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent and suppress benign ResizeObserver loop limit / undelivered notification warnings
if (typeof window !== 'undefined') {
  const resizeObserverErrRegex = /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i;

  window.addEventListener('error', (event) => {
    if (event.message && resizeObserverErrRegex.test(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message && resizeObserverErrRegex.test(event.reason.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  if (window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class PatchedResizeObserver extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          window.requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (err: any) {
              if (!err?.message || !resizeObserverErrRegex.test(err.message)) {
                throw err;
              }
            }
          });
        });
      }
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
