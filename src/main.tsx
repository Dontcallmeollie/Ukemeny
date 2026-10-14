import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for 100% offline caching and updates
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Ny versjon av MatApp er tilgjengelig! Vil du oppdatere?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('MatApp er nå 100% klar for offline bruk.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
