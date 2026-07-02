import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTesserato, aggiornaTesserato, getEventi, getMessaggiTesserato, getPagamenti } from '../services/api';

interface Tesserato {
  id: number; nome: string; cognome: string; data_nascita: string;
  codice_fiscale: string; email?: string; telefono?: string; cellulare?: string;
  indirizzo?: string; comune_residenza?: string; provincia_residenza?: string;
  cap_residenza?: string; foto_url?: string; categoria?: string;
  cod_tessera?: string; data_scadenza_tessera?: string;
}

interface Evento {
  id: number; titolo: string; data: string; tipo: string;
  ora_inizio?: string; ora_fine?: string; luogo?: string;
}

interface Messaggio {
  id: number; intestazione: string; corpo: string; data_invio: string;
}

interface Pagamento {
  id: number; importo: number; data_scadenza: string; pagato: boolean;
  data_pagamento?: string;
}

const SEZIONI = ['Profilo', 'Allenamenti', 'Messaggi', 'Pagamenti'];

const PortaleTesserato: React.FC = () => {
  const { utente, logout, tesseratoId } = useAuth();
  const [sezione, setSezione] = useState(0);
  const [tesserato, setTesserato] = useState<Tesserato | null>(null);
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modifica, setModifica] = useState(false);
  const [form, setForm] = useState<Partial<Tesserato>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!tesseratoId) { setLoading(false); return; }
    Promise.all([
      getTesserato(tesseratoId),
      getEventi(),
      getMessaggiTesserato(tesseratoId),
      getPagamenti()
    ]).then(([t, e, m, p]) => {
      setTesserato(t.data);
      setForm({
        email: t.data.email || '',
        telefono: t.data.telefono || '',
        cellulare: t.data.cellulare || '',
        indirizzo: t.data.indirizzo || '',
        comune_residenza: t.data.comune_residenza || '',
        provincia_residenza: t.data.provincia_residenza || '',
        cap_residenza: t.data.cap_residenza || '',
      });
      setEventi(e.data.filter((ev: Evento) => new Date(ev.data) >= new Date(new Date().setMonth(new Date().getMonth() - 1))));
      setMessaggi(m.data);
      setPagamenti(p.data.filter((pag: Pagamento) => {
        // solo i pagamenti di questo tesserato - il backend li filtra già per utente
        return true;
      }));
      setLoading(false);
    });
  }, [tesseratoId]);

  const handleSalva = async () => {
    if (!tesseratoId || !tesserato) return;
    setSalvando(true);
    try {
      const datiAggiornati = { ...tesserato, ...form };
      await aggiornaTesserato(tesseratoId, datiAggiornati);
      setTesserato(prev => prev ? { ...prev, ...form } : prev);
      setModifica(false);
    } catch (e) {
      alert('Errore nel salvataggio');
    } finally { setSalvando(false); }
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  if (loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;

  if (!tesseratoId) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Account non collegato</h2>
        <p className="text-gray-500 text-sm">Il tuo account non è ancora collegato a nessuna scheda tesserato. Contatta l'amministratore.</p>
        <button onClick={logout} className="mt-4 px-4 py-2 bg-blue-700 text-white rounded text-sm">Esci</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {tesserato?.foto_url
            ? <img src={tesserato.foto_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white" />
            : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {tesserato?.nome[0]}{tesserato?.cognome[0]}
              </div>
          }
          <div>
            <h1 className="text-lg font-bold">{tesserato?.nome} {tesserato?.cognome}</h1>
            <p className="text-xs text-blue-200">{utente?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm">Esci</button>
      </header>

      {/* TESSERA INFO */}
      {tesserato?.cod_tessera && (
        <div className="bg-blue-700 text-white px-6 py-2 text-xs flex gap-6">
          <span>Tessera: <strong>{tesserato.cod_tessera}</strong></span>
          {tesserato.categoria && <span>Categoria: <strong>{tesserato.categoria}</strong></span>}
          {tesserato.data_scadenza_tessera && (
            <span className={new Date(tesserato.data_scadenza_tessera) < new Date() ? 'text-red-300' : ''}>
              Scadenza: <strong>{tesserato.data_scadenza_tessera}</strong>
              {new Date(tesserato.data_scadenza_tessera) < new Date() && ' ⚠️ SCADUTA'}
            </span>
          )}
        </div>
      )}

      {/* NAVIGAZIONE */}
      <div className="bg-white border-b flex overflow-x-auto">
        {SEZIONI.map((s, i) => (
          <button key={s} onClick={() => setSezione(i)}
            className={`px-6 py-3 text-sm whitespace-nowrap ${sezione === i ? 'border-b-2 border-blue-700 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {s}
          </button>
        ))}
      </div>

      <main className="p-6 max-w-2xl mx-auto">

        {/* PROFILO */}
        {sezione === 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Dati personali</h2>
              {!modifica
                ? <button onClick={() => setModifica(true)} className="px-3 py-1.5 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Modifica</button>
                : <div className="flex gap-2">
                    <button onClick={() => setModifica(false)} className="px-3 py-1.5 text-gray-600 text-sm">Annulla</button>
                    <button onClick={handleSalva} disabled={salvando} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50">
                      {salvando ? 'Salvo...' : 'Salva'}
                    </button>
                  </div>
              }
            </div>

            {/* DATI NON MODIFICABILI */}
            <div className="bg-gray-50 rounded p-3 mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500 text-xs block">Nome</span><strong>{tesserato?.nome}</strong></div>
              <div><span className="text-gray-500 text-xs block">Cognome</span><strong>{tesserato?.cognome}</strong></div>
              <div><span className="text-gray-500 text-xs block">Data di nascita</span><strong>{tesserato?.data_nascita}</strong></div>
              <div><span className="text-gray-500 text-xs block">Codice Fiscale</span><strong className="font-mono">{tesserato?.codice_fiscale}</strong></div>
            </div>

            {/* DATI MODIFICABILI */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Telefono', key: 'telefono' },
                { label: 'Cellulare', key: 'cellulare' },
                { label: 'Indirizzo', key: 'indirizzo' },
                { label: 'Comune', key: 'comune_residenza' },
                { label: 'Provincia', key: 'provincia_residenza' },
                { label: 'CAP', key: 'cap_residenza' },
              ].map(campo => (
                <div key={campo.key}>
                  <label className="block text-xs text-gray-500 mb-1">{campo.label}</label>
                  {modifica
                    ? <input type={campo.type || 'text'} value={(form as any)[campo.key] || ''}
                        onChange={f(campo.key)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    : <p className="text-sm font-medium text-gray-800">{(tesserato as any)?.[campo.key] || '-'}</p>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALLENAMENTI */}
        {sezione === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-bold text-gray-800 mb-4">Prossimi eventi e allenamenti</h2>
            {eventi.length === 0 ? (
              <p className="text-gray-400 text-sm">Nessun evento programmato</p>
            ) : (
              <div className="space-y-3">
                {[...eventi].sort((a, b) => a.data.localeCompare(b.data)).map(e => (
                  <div key={e.id} className="border border-gray-100 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{e.titolo}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(e.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                          {e.ora_inizio && ` · ${e.ora_inizio.substring(0,5)}`}
                          {e.ora_fine && ` - ${e.ora_fine.substring(0,5)}`}
                          {e.luogo && ` · ${e.luogo}`}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded text-white ${
                        e.tipo === 'allenamento' ? 'bg-blue-500' :
                        e.tipo === 'partita' ? 'bg-red-500' :
                        e.tipo === 'raduno' ? 'bg-green-500' : 'bg-gray-500'
                      }`}>{e.tipo}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MESSAGGI */}
        {sezione === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-bold text-gray-800 mb-4">Messaggi ricevuti</h2>
            {messaggi.length === 0 ? (
              <p className="text-gray-400 text-sm">Nessun messaggio ricevuto</p>
            ) : (
              <div className="space-y-3">
                {messaggi.map(m => (
                  <div key={m.id} className="border border-gray-100 rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{m.intestazione}</h3>
                      <span className="text-xs text-gray-400">{new Date(m.data_invio).toLocaleDateString('it-IT')}</span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{m.corpo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAGAMENTI */}
        {sezione === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-bold text-gray-800 mb-4">I miei pagamenti</h2>
            {pagamenti.length === 0 ? (
              <p className="text-gray-400 text-sm">Nessun pagamento registrato</p>
            ) : (
              <div className="space-y-2">
                {pagamenti.map(p => (
                  <div key={p.id} className={`flex justify-between items-center p-3 rounded border ${
                    p.pagato ? 'border-green-100 bg-green-50' : new Date(p.data_scadenza) < new Date() ? 'border-red-100 bg-red-50' : 'border-gray-100'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-gray-800">€ {p.importo.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Scadenza: {p.data_scadenza}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      p.pagato ? 'bg-green-100 text-green-700' : new Date(p.data_scadenza) < new Date() ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.pagato ? '✓ Pagato' : new Date(p.data_scadenza) < new Date() ? 'Scaduto' : 'Da pagare'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PortaleTesserato;
