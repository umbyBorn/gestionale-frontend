import React, { useEffect, useState } from 'react';
import { getUtenti, creaUtente, aggiornaPermesso, toggleUtente, cambiaPassword, getTesserati } from '../services/api';

interface Utente {
  id: number;
  email: string;
  ruolo: string;
  attivo: boolean;
  tesserato_id?: number;
  tesserato_nome?: string;
  permessi: Record<string, boolean>;
}

interface Tesserato { id: number; nome: string; cognome: string; }

const SEZIONI = [
  { key: 'tesserati', label: 'Tesserati' },
  { key: 'gruppi', label: 'Gruppi' },
  { key: 'pagamenti', label: 'Pagamenti' },
  { key: 'staff', label: 'Staff' },
  { key: 'presenze', label: 'Presenze' },
  { key: 'assemblee', label: 'Assemblee' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'messaggi', label: 'Messaggi' },
  { key: 'importazione', label: 'Importazione' },
];

const RUOLI = ['operatore', 'tesserato'];

const Admin: React.FC = () => {
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [loading, setLoading] = useState(true);
  const [utenteSelezionato, setUtenteSelezionato] = useState<Utente | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [nuovaPassword, setNuovaPassword] = useState('');
  const [mostraPassword, setMostraPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', ruolo: 'operatore', tesserato_id: '' });

  const carica = () => {
    Promise.all([getUtenti(), getTesserati()]).then(([u, t]) => {
      setUtenti(u.data);
      setTesserati(t.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const handleCreaUtente = async () => {
    if (!form.email || !form.password) { alert('Email e password obbligatorie'); return; }
    try {
      await creaUtente({
        email: form.email,
        password: form.password,
        ruolo: form.ruolo,
        tesserato_id: form.tesserato_id ? parseInt(form.tesserato_id) : null
      });
      setMostraForm(false);
      setForm({ email: '', password: '', ruolo: 'operatore', tesserato_id: '' });
      carica();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Errore creazione utente');
    }
  };

  const handleTogglePermesso = async (utenteId: number, sezione: string, abilitato: boolean) => {
    await aggiornaPermesso(utenteId, sezione, abilitato);
    setUtenti(prev => prev.map(u => u.id === utenteId
      ? { ...u, permessi: { ...u.permessi, [sezione]: abilitato } }
      : u
    ));
    if (utenteSelezionato?.id === utenteId) {
      setUtenteSelezionato(prev => prev ? { ...prev, permessi: { ...prev.permessi, [sezione]: abilitato } } : prev);
    }
  };

  const handleToggleAttivo = async (utente: Utente) => {
    await toggleUtente(utente.id, !utente.attivo);
    carica();
  };

  const handleCambiaPassword = async () => {
    if (!nuovaPassword || nuovaPassword.length < 6) { alert('Password minimo 6 caratteri'); return; }
    if (!utenteSelezionato) return;
    await cambiaPassword(utenteSelezionato.id, nuovaPassword);
    setNuovaPassword('');
    setMostraPassword(false);
    alert('Password aggiornata');
  };

  const coloreRuolo: Record<string, string> = {
    amministratore: 'bg-red-100 text-red-700',
    operatore: 'bg-blue-100 text-blue-700',
    tesserato: 'bg-green-100 text-green-700',
  };

  return (
    <div className="bg-gray-100 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">
        {loading ? <p className="text-gray-500">Caricamento...</p> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LISTA UTENTI */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-gray-800 text-sm">Utenti registrati ({utenti.length})</h2>
                <button onClick={() => setMostraForm(true)}
                  className="bg-blue-700 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-800">
                  + Nuovo
                </button>
              </div>
              <div className="space-y-2">
                {utenti.map(u => (
                  <div key={u.id}
                    onClick={() => setUtenteSelezionato(u)}
                    className={`p-3 rounded cursor-pointer border transition ${
                      utenteSelezionato?.id === u.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                    } ${!u.attivo ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.email}</p>
                        {u.tesserato_nome && <p className="text-xs text-gray-500">{u.tesserato_nome}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloreRuolo[u.ruolo] || 'bg-gray-100'}`}>
                        {u.ruolo}
                      </span>
                    </div>
                    {!u.attivo && <p className="text-xs text-red-500 mt-1">Account disabilitato</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* DETTAGLIO UTENTE */}
            {utenteSelezionato && (
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="font-bold text-gray-800">{utenteSelezionato.email}</h2>
                      <p className="text-sm text-gray-500">
                        Ruolo: <span className="font-medium capitalize">{utenteSelezionato.ruolo}</span>
                        {utenteSelezionato.tesserato_nome && ` · ${utenteSelezionato.tesserato_nome}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleAttivo(utenteSelezionato)}
                        className={`px-3 py-1.5 rounded text-xs font-medium ${
                          utenteSelezionato.attivo
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}>
                        {utenteSelezionato.attivo ? 'Disabilita account' : 'Abilita account'}
                      </button>
                      <button
                        onClick={() => setMostraPassword(!mostraPassword)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">
                        Cambia password
                      </button>
                    </div>
                  </div>

                  {mostraPassword && (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="password"
                        placeholder="Nuova password (min 6 caratteri)"
                        value={nuovaPassword}
                        onChange={e => setNuovaPassword(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                      />
                      <button onClick={handleCambiaPassword}
                        className="bg-blue-700 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-800">
                        Salva
                      </button>
                    </div>
                  )}
                </div>

                {/* PERMESSI OPERATORE */}
                {utenteSelezionato.ruolo === 'operatore' && (
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-bold text-gray-800 mb-1 text-sm">Permessi sezioni</h3>
                    <p className="text-xs text-gray-500 mb-4">Attiva o disattiva l'accesso alle singole sezioni per questo operatore</p>
                    <div className="grid grid-cols-1 gap-2">
                      {SEZIONI.map(s => {
                        const abilitato = utenteSelezionato.permessi[s.key] !== false;
                        return (
                          <div key={s.key} className="flex justify-between items-center py-2 border-b border-gray-50">
                            <span className="text-sm text-gray-700">{s.label}</span>
                            <button
                              onClick={() => handleTogglePermesso(utenteSelezionato.id, s.key, !abilitato)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                abilitato ? 'bg-blue-600' : 'bg-gray-300'
                              }`}>
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                abilitato ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {utenteSelezionato.ruolo === 'tesserato' && (
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-bold text-gray-800 mb-2 text-sm">Portale tesserato</h3>
                    <p className="text-sm text-gray-500">
                      Questo utente può accedere solo alla propria scheda personale: dati anagrafici, gruppi, pagamenti e messaggi ricevuti.
                    </p>
                    {utenteSelezionato.tesserato_nome && (
                      <p className="text-sm text-blue-700 mt-2 font-medium">
                        Collegato a: {utenteSelezionato.tesserato_nome}
                      </p>
                    )}
                    {!utenteSelezionato.tesserato_id && (
                      <p className="text-sm text-orange-600 mt-2">
                        ⚠️ Nessun tesserato collegato — l'utente non potrà vedere i propri dati
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FORM NUOVO UTENTE */}
      {mostraForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo Utente</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ruolo</label>
                <select value={form.ruolo} onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  {RUOLI.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
              {form.ruolo === 'tesserato' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Collega a tesserato</label>
                  <select value={form.tesserato_id} onChange={e => setForm(f => ({ ...f, tesserato_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">-- Seleziona tesserato --</option>
                    {[...tesserati].sort((a, b) => a.cognome.localeCompare(b.cognome)).map(t => (
                      <option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annulla</button>
              <button onClick={handleCreaUtente} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Crea utente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
