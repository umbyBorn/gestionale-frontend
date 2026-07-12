import React, { useEffect, useState } from 'react';
import { formatDate } from '../utils/date';

const API = 'https://gestionale-sport-api.onrender.com';

interface Modulo { id: number; nome_modulo: string; token: string; attivo: boolean; link: string; n_richieste: number; n_attesa: number; created_at: string; }
interface Richiesta { id: number; stato: string; nome: string; cognome: string; data_nascita: string; codice_fiscale?: string; email?: string; telefono?: string; cellulare?: string; sesso?: string; sport?: string; comune_nascita?: string; provincia_nascita?: string; stato_nascita?: string; indirizzo?: string; comune_residenza?: string; provincia_residenza?: string; cap_residenza?: string; genitore_nome?: string; genitore_cognome?: string; genitore_email?: string; genitore_telefono?: string; genitore_documento_tipo?: string; genitore_documento_numero?: string; consenso_privacy: boolean; data_invio?: string; note?: string; }

const Iscrizioni: React.FC = () => {
  const [moduli, setModuli] = useState<Modulo[]>([]);
  const [richieste, setRichieste] = useState<Richiesta[]>([]);
  const [nomeModulo, setNomeModulo] = useState('');
  const [mostraForm, setMostraForm] = useState(false);
  const [richiestaDettaglio, setRichiestaDettaglio] = useState<Richiesta | null>(null);
  const [filtroStato, setFiltroStato] = useState('in_attesa');
  const [loading, setLoading] = useState(true);
  const [linkCopiato, setLinkCopiato] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const carica = () => {
    Promise.all([
      fetch(`${API}/iscrizioni/moduli`, { headers }).then(r => r.json()),
      fetch(`${API}/iscrizioni/richieste`, { headers }).then(r => r.json()),
    ]).then(([m, r]) => { setModuli(m); setRichieste(r); setLoading(false); });
  };

  useEffect(() => { carica(); }, []);

  const creaModulo = async () => {
    if (!nomeModulo.trim()) return;
    await fetch(`${API}/iscrizioni/moduli`, { method: 'POST', headers, body: JSON.stringify({ nome_modulo: nomeModulo }) });
    setNomeModulo(''); setMostraForm(false); carica();
  };

  const copiaLink = (link: string) => {
    const url = `${window.location.origin}${link}`;
    navigator.clipboard.writeText(url);
    setLinkCopiato(link);
    setTimeout(() => setLinkCopiato(null), 2000);
  };

  const approva = async (id: number) => {
    await fetch(`${API}/iscrizioni/richieste/${id}/approva`, { method: 'POST', headers });
    setRichiestaDettaglio(null); carica();
  };

  const rifiuta = async (id: number) => {
    if (!window.confirm('Rifiutare questa richiesta?')) return;
    await fetch(`${API}/iscrizioni/richieste/${id}/rifiuta`, { method: 'POST', headers });
    setRichiestaDettaglio(null); carica();
  };

  const eliminaModulo = async (id: number) => {
    if (!window.confirm('Disattivare questo modulo?')) return;
    await fetch(`${API}/iscrizioni/moduli/${id}`, { method: 'DELETE', headers });
    carica();
  };

  const richiesteFiltrate = richieste.filter(r => filtroStato === 'tutte' || r.stato === filtroStato);
  const nAttesa = richieste.filter(r => r.stato === 'in_attesa').length;

  const badgeStato = (stato: string) => {
    const cfg: Record<string, string> = {
      in_attesa: 'bg-yellow-100 text-yellow-700',
      approvata: 'bg-green-100 text-green-700',
      rifiutata: 'bg-red-100 text-red-700',
    };
    const label: Record<string, string> = { in_attesa: 'In attesa', approvata: 'Approvata', rifiutata: 'Rifiutata' };
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg[stato] || 'bg-gray-100 text-gray-600'}`}>{label[stato] || stato}</span>;
  };

  return (
    <div className="p-6 space-y-6">

      {/* MODULI */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-bold text-gray-800">📋 Moduli di iscrizione</h2>
            <p className="text-xs text-gray-500 mt-0.5">Crea link condivisibili per raccogliere le iscrizioni online</p>
          </div>
          <button onClick={() => setMostraForm(true)} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
            + Nuovo modulo
          </button>
        </div>

        {mostraForm && (
          <div className="bg-blue-50 rounded-xl p-4 mb-4 flex gap-3">
            <input type="text" value={nomeModulo} onChange={e => setNomeModulo(e.target.value)}
              placeholder="Nome modulo (es. Iscrizioni 2026/2027)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={creaModulo} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">Crea</button>
            <button onClick={() => setMostraForm(false)} className="text-gray-500 text-sm px-2">✕</button>
          </div>
        )}

        {loading ? <p className="text-gray-400 text-sm">Caricamento...</p> : moduli.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-300 text-4xl mb-2">📋</p>
            <p className="text-gray-400 text-sm">Nessun modulo creato — crea il primo per iniziare a raccogliere iscrizioni</p>
          </div>
        ) : (
          <div className="space-y-3">
            {moduli.map(m => (
              <div key={m.id} className={`border rounded-xl p-4 ${m.attivo ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{m.nome_modulo}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.attivo ? 'Attivo' : 'Disattivato'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>📨 {m.n_richieste} richieste</span>
                      {m.n_attesa > 0 && <span className="text-yellow-600 font-medium">⏳ {m.n_attesa} in attesa</span>}
                      <span>📅 {m.created_at}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex-1 truncate">
                        {window.location.origin}{m.link}
                      </code>
                      <button onClick={() => copiaLink(m.link)}
                        className={`text-xs px-3 py-1 rounded-lg ${linkCopiato === m.link ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                        {linkCopiato === m.link ? '✓ Copiato' : '📋 Copia'}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => eliminaModulo(m.id)} className="text-red-400 hover:text-red-600 text-xs ml-3">Disattiva</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RICHIESTE */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-bold text-gray-800">
              📥 Richieste ricevute
              {nAttesa > 0 && <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{nAttesa}</span>}
            </h2>
          </div>
          <div className="flex gap-2">
            {['in_attesa', 'approvata', 'rifiutata', 'tutte'].map(s => (
              <button key={s} onClick={() => setFiltroStato(s)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize ${filtroStato === s ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === 'in_attesa' ? 'In attesa' : s === 'tutte' ? 'Tutte' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {richiesteFiltrate.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-300 text-4xl mb-2">📭</p>
            <p className="text-gray-400 text-sm">Nessuna richiesta {filtroStato !== 'tutte' ? filtroStato.replace('_', ' ') : ''}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {richiesteFiltrate.map(r => (
              <div key={r.id} onClick={() => setRichiestaDettaglio(r)}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
                  {r.nome[0]}{r.cognome[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{r.nome} {r.cognome}</p>
                  <p className="text-xs text-gray-500">{formatDate(r.data_nascita)} · {r.email || r.telefono || '-'} · {formatDate(r.data_invio)}</p>
                </div>
                {badgeStato(r.stato)}
                <span className="text-gray-300">›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETTAGLIO RICHIESTA */}
      {richiestaDettaglio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">{richiestaDettaglio.nome} {richiestaDettaglio.cognome}</h2>
                <div className="mt-0.5">{badgeStato(richiestaDettaglio.stato)}</div>
              </div>
              <button onClick={() => setRichiestaDettaglio(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Data nascita', richiestaDettaglio.data_nascita],
                  ['Codice Fiscale', richiestaDettaglio.codice_fiscale],
                  ['Email', richiestaDettaglio.email],
                  ['Telefono', richiestaDettaglio.telefono],
                  ['Cellulare', richiestaDettaglio.cellulare],
                  ['Sesso', richiestaDettaglio.sesso],
                  ['Sport', richiestaDettaglio.sport],
                  ['Comune nascita', richiestaDettaglio.comune_nascita],
                  ['Provincia nascita', richiestaDettaglio.provincia_nascita],
                  ['Stato nascita', richiestaDettaglio.stato_nascita],
                  ['Indirizzo', richiestaDettaglio.indirizzo],
                  ['Comune res.', richiestaDettaglio.comune_residenza],
                  ['Provincia res.', richiestaDettaglio.provincia_residenza],
                  ['CAP', richiestaDettaglio.cap_residenza],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l as string} className="bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-400 text-xs block">{l}</span>
                    <span className="font-medium text-gray-800">{v}</span>
                  </div>
                ))}
              </div>

              {richiestaDettaglio.genitore_nome && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="font-semibold text-orange-800 text-sm mb-2">👨‍👩‍👧 Dati genitore</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ['Nome', `${richiestaDettaglio.genitore_nome} ${richiestaDettaglio.genitore_cognome}`],
                      ['Email', richiestaDettaglio.genitore_email],
                      ['Telefono', richiestaDettaglio.genitore_telefono],
                      ['Documento', `${richiestaDettaglio.genitore_documento_tipo} ${richiestaDettaglio.genitore_documento_numero}`],
                    ].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l as string}>
                        <span className="text-orange-500 text-xs block">{l}</span>
                        <span className="font-medium text-orange-900">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {richiestaDettaglio.note && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Note</p>
                  <p className="text-sm text-gray-700">{richiestaDettaglio.note}</p>
                </div>
              )}

              <div className={`flex items-center gap-2 text-sm ${richiestaDettaglio.consenso_privacy ? 'text-green-600' : 'text-red-500'}`}>
                {richiestaDettaglio.consenso_privacy ? '✓ Privacy accettata' : '✗ Privacy NON accettata'}
              </div>
            </div>

            {richiestaDettaglio.stato === 'in_attesa' && (
              <div className="px-6 py-4 border-t flex gap-3">
                <button onClick={() => rifiuta(richiestaDettaglio.id)}
                  className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50">
                  ✗ Rifiuta
                </button>
                <button onClick={() => approva(richiestaDettaglio.id)}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">
                  ✓ Approva e crea tesserato
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Iscrizioni;
