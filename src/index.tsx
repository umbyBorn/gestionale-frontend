import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Il service worker serve per il funzionamento PWA/cache della versione
// ONLINE. Nella build locale (offline) va disattivato: intercetta le
// richieste di rete verso il server locale e va in errore, perché non è
// pensato per questo contesto (e comunque l'app locale è già "offline" di suo).
if ('serviceWorker' in navigator && process.env.REACT_APP_LOCALE !== 'true') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// Se per qualche motivo un service worker fosse già registrato da una build
// precedente (es. hai testato prima con l'app locale senza questa modifica),
// lo rimuovo esplicitamente in modalità locale.
if ('serviceWorker' in navigator && process.env.REACT_APP_LOCALE === 'true') {
  navigator.serviceWorker.getRegistrations().then(registrazioni => {
    registrazioni.forEach(r => r.unregister());
  });
}
