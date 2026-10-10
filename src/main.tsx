import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { setLocale } from './i18n';
import { useGameStore } from './store/gameStore';
import './index.css';

setLocale(navigator.language);

// Debug handle for the browser console during development
if (import.meta.env.DEV) (window as unknown as { petpal: typeof useGameStore }).petpal = useGameStore;
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
