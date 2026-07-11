import { useEffect, useState } from 'react';
import axios from 'axios';

// Questa pagina parla SEMPRE con il server locale stesso (stessa origine),
// mai con Render: l'app locale espone /locale/* solo quando gira offline.
const apiLocale = axios.create({ baseURL: '' });

interface Stato {
  clonato: boolean;
  ultimo_pull: string | null;
  base_url_online: string | null;
  configurato: boolean;
}

export default function Sincronizza() {
  const [stato, setStato] = useState<Stato | null>(null);
  const [baseUrl, setBaseUrl] = useState('https://gestionale-sport-api.onrender.com');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [caricando, setCaricando] = useState(false);
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null);

  const caricaStato = async () => {
    try {
      const r = await apiLocale.get('/locale/stato');
      setStato(r.data);
      if (r.data.base_url_online) setBaseUrl(r.data.base_url_online);
    } catch {
      setMessaggio({ tipo: 'errore', testo: 'Impossibile leggere lo stato locale' });
    }
  };

  useEffect(() => { caricaStato(); }, []);

  const configura = async () => {
    setCaricando(true); setMessaggio(null);
    try {
      await apiLocale.post('/locale/configura', { base_url_online: baseUrl, email, password });
      setMessaggio({ tipo: 'ok', testo: 'Connessione configurata correttamente' });
      await caricaStato();
    } catch (e: any) {
      setMessaggio({ tipo: 'errore', testo: e.response?.data?.detail || 'Errore di configurazione' });
    } finally {
      setCaricando(false);
    }
  };

  const clona = async () => {
    setCaricando(true); setMessaggio(null);
    try {
      const r = await apiLocale.post('/locale/clona');
      setMessaggio({ tipo: 'ok', testo: `Clonazione completata: ${r.data.tabelle_popolate} tabelle scaricate` });
      await caricaStato();
    } catch (e: any) {
      setMessaggio({ tipo: 'errore', testo: e.response?.data?.detail || 'Errore durante la clonazione' });
    } finally {
      setCaricando(false);
    }
  };

  const sincronizza = async () => {
    setCaricando(true); setMessaggio(null);
    try {
      const r = await apiLocale.post('/locale/sincronizza');
      setMessaggio({
        tipo: 'ok',
        testo: `Sincronizzato: ${r.data.inviate} modifiche inviate, ${r.data.ricevute} ricevute` +
          (r.data.errori?.length ? ` — attenzione: ${r.data.errori.length} errori` : '')
      });
      await caricaStato();
    } catch (e: any) {
      setMessaggio({ tipo: 'errore', testo: e.response?.data?.detail || 'Nessuna connessione di rete disponibile' });
    } finally {
      setCaricando(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Sincronizzazione</h1>
      <p className="text-sm text-gray-500 mb-6">Modalità locale/offline — collega questo PC al gestionale online</p>

      {messaggio && (
        <div className={`mb-4 p-3 rounded-xl text-sm ${messaggio.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {messaggio.testo}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <h2 className="font-bold text-gray-800 mb-3 text-sm">Stato</h2>
        {stato ? (
          <div className="text-sm text-gray-600 space-y-1">
            <p>Connessione configurata: <strong>{stato.configurato ? 'Sì' : 'No'}</strong></p>
            <p>Database locale inizializzato: <strong>{stato.clonato ? 'Sì' : 'No'}</strong></p>
            <p>Ultima sincronizzazione: <strong>{stato.ultimo_pull ? new Date(stato.ultimo_pull).toLocaleString('it-IT') : 'mai'}</strong></p>
          </div>
        ) : <p className="text-gray-400 text-sm">Caricamento...</p>}
      </div>

      {!stato?.configurato && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-3 text-sm">1. Collega il gestionale online</h2>
          <div className="space-y-3">
            <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="URL del gestionale online"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email amministratore"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <button onClick={configura} disabled={caricando} className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
              Collega
            </button>
          </div>
        </div>
      )}

      {stato?.configurato && !stato?.clonato && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className="font-bold text-gray-800 mb-2 text-sm">2. Scarica i dati iniziali</h2>
          <p className="text-xs text-gray-500 mb-3">Da fare una sola volta: scarica tutto lo storico esistente nel database locale.</p>
          <button onClick={clona} disabled={caricando} className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
            {caricando ? 'Scaricamento in corso...' : 'Scarica dati iniziali'}
          </button>
        </div>
      )}

      {stato?.clonato && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-2 text-sm">Sincronizza ora</h2>
          <p className="text-xs text-gray-500 mb-3">Invia le modifiche fatte offline e scarica gli aggiornamenti fatti online. Richiede connessione a internet.</p>
          <button onClick={sincronizza} disabled={caricando} className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
            {caricando ? 'Sincronizzazione in corso...' : '🔄 Sincronizza ora'}
          </button>
        </div>
      )}
    </div>
  );
}
