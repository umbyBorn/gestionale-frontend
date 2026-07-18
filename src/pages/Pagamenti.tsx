import React, { useEffect, useState } from 'react';
import { formatDate } from '../utils/date';
import {
  getPagamenti, creaPagamento, aggiornaPagamento, eliminaPagamento,
  getTariffe, creaTariffa, getTesserati, registraIncasso,
  generaPianoScadenze, creaPagamentoGruppo, getGruppi,
  modificaBatch, eliminaBatch,
  scaricaRicevutaPdf, inviaRicevutaEmail,
  getRicevuteDonazione, creaRicevutaDonazione, scaricaRicevutaDonazionePdf,
} from '../services/api';

interface Pagamento {
  id: number;
  tesserato_id: number;
  tariffa_id: number;
  importo: number;
  data_scadenza: string;
  data_pagamento?: string;
  metodo?: string;
  pagato: boolean;
  descrizione?: string;
  gruppo_generazione_id?: string;
}
interface Tariffa { id: number; nome: string; importo: number; categoria?: string; }
interface Tesserato { id: number; nome: string; cognome: string; }
interface Gruppo { id: number; nome: string; }

const TAB = [
  { id: 'scadenzario', label: '📋 Scadenzario' },
  { id: 'piano', label: '🗓️ Genera piano quote' },
  { id: 'ad-hoc', label: '🎽 Pagamento di gruppo' },
  { id: 'tariffe', label: '🏷️ Tariffe' },
  { id: 'donazioni', label: '❤️ Erogazioni liberali' },
] as const;
type TabId = typeof TAB[number]['id'];

const Pagamenti: React.FC = () => {
  const [tab, setTab] = useState<TabId>('scadenzario');
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([]);
  const [tariffe, setTariffe] = useState<Tariffa[]>([]);
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'tutti' | 'pagati' | 'scaduti'>('tutti');
  const [ricerca, setRicerca] = useState('');

  const [mostraFormPagamento, setMostraFormPagamento] = useState(false);
  const [mostraFormTariffa, setMostraFormTariffa] = useState(false);
  const [pagamentoInModifica, setPagamentoInModifica] = useState<Pagamento | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const [batchInModifica, setBatchInModifica] = useState<{ id: string; nome: string; count: number } | null>(null);
  const [formBatch, setFormBatch] = useState({ importo: '', data_scadenza: '' });

  const [formPagamento, setFormPagamento] = useState({
    tesserato_id: 0, tariffa_id: 0, importo: 0, data_scadenza: '', pagato: false, descrizione: '',
  });
  const [formTariffa, setFormTariffa] = useState({ nome: '', importo: 0, categoria: '' });

  const carica = () => {
    Promise.all([getPagamenti(), getTariffe(), getTesserati(), getGruppi()]).then(([p, t, ts, g]) => {
      setPagamenti(p.data);
      setTariffe(t.data);
      setTesserati(ts.data);
      setGruppi(g.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const flash = (msg: string) => { setMessaggio(msg); setTimeout(() => setMessaggio(''), 4000); };

  const handleCreaPagamento = async () => {
    await creaPagamento(formPagamento);
    setMostraFormPagamento(false);
    setFormPagamento({ tesserato_id: 0, tariffa_id: 0, importo: 0, data_scadenza: '', pagato: false, descrizione: '' });
    carica();
  };

  const handleSalvaModifica = async () => {
    if (!pagamentoInModifica) return;
    await aggiornaPagamento(pagamentoInModifica.id, {
      importo: pagamentoInModifica.importo,
      data_scadenza: pagamentoInModifica.data_scadenza,
      tariffa_id: pagamentoInModifica.tariffa_id,
      descrizione: pagamentoInModifica.descrizione,
    });
    setPagamentoInModifica(null);
    carica();
  };

  const handleElimina = async (id: number) => {
    if (window.confirm('Eliminare questo pagamento?')) {
      await eliminaPagamento(id);
      carica();
    }
  };

  const handleCreaTariffa = async () => {
    await creaTariffa(formTariffa);
    setMostraFormTariffa(false);
    setFormTariffa({ nome: '', importo: 0, categoria: '' });
    carica();
  };

  const handleIncasso = async (id: number) => {
    const metodo = window.prompt('Metodo di pagamento (contanti / bonifico / altro):', 'contanti');
    if (metodo && ['contanti', 'bonifico', 'altro'].includes(metodo)) {
      await registraIncasso(id, metodo);
      carica();
    }
  };

  const handleScaricaRicevuta = async (id: number) => {
    try {
      await scaricaRicevutaPdf(id);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore nella generazione della ricevuta');
    }
  };

  const handleInviaRicevuta = async (id: number) => {
    try {
      const res = await inviaRicevutaEmail(id);
      alert(`Ricevuta inviata a ${res.data.email}`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore nell\'invio della ricevuta via email');
    }
  };

  const nomeTesserato = (id: number) => {
    const t = tesserati.find((t) => t.id === id);
    return t ? `${t.nome} ${t.cognome}` : `ID ${id}`;
  };
  const nomeTariffa = (id: number) => {
    const t = tariffe.find((t) => t.id === id);
    return t ? t.nome : `ID ${id}`;
  };

  const oggi = new Date().toISOString().split('T')[0];

  const filtrati = pagamenti.filter((p) => {
    if (filtro === 'pagati' && !p.pagato) return false;
    if (filtro === 'scaduti' && (p.pagato || p.data_scadenza >= oggi)) return false;
    if (ricerca) {
      const q = ricerca.toLowerCase();
      const testoTesserato = nomeTesserato(p.tesserato_id).toLowerCase();
      const testoVoce = (p.descrizione || nomeTariffa(p.tariffa_id)).toLowerCase();
      if (!testoTesserato.includes(q) && !testoVoce.includes(q)) return false;
    }
    return true;
  });
  const totalePagato = pagamenti.filter(p => p.pagato).reduce((a, p) => a + Number(p.importo), 0);
  const totaleDaIncassare = pagamenti.filter(p => !p.pagato).reduce((a, p) => a + Number(p.importo), 0);
  const totaleScaduto = pagamenti.filter(p => !p.pagato && p.data_scadenza < oggi).reduce((a, p) => a + Number(p.importo), 0);

  // Raggruppa i pagamenti generati in blocco (piano scadenze / pagamento di gruppo) per gestione massiva
  const batches = React.useMemo(() => {
    const mappa = new Map<string, { id: string; nome: string; count: number; countNonPagati: number; totale: number }>();
    pagamenti.forEach(p => {
      if (!p.gruppo_generazione_id) return;
      const esistente = mappa.get(p.gruppo_generazione_id);
      if (esistente) {
        esistente.count += 1;
        if (!p.pagato) esistente.countNonPagati += 1;
        esistente.totale += Number(p.importo);
      } else {
        mappa.set(p.gruppo_generazione_id, {
          id: p.gruppo_generazione_id,
          nome: p.descrizione || nomeTariffa(p.tariffa_id),
          count: 1,
          countNonPagati: p.pagato ? 0 : 1,
          totale: Number(p.importo),
        });
      }
    });
    return Array.from(mappa.values());
  }, [pagamenti]);

  const apriModificaBatch = (b: { id: string; nome: string; count: number }) => {
    setBatchInModifica(b);
    setFormBatch({ importo: '', data_scadenza: '' });
  };

  const handleSalvaModificaBatch = async () => {
    if (!batchInModifica) return;
    const payload: any = { solo_non_pagati: true };
    if (formBatch.importo) payload.importo = parseFloat(formBatch.importo);
    if (formBatch.data_scadenza) payload.data_scadenza = formBatch.data_scadenza;
    if (!payload.importo && !payload.data_scadenza) {
      alert('Inserisci almeno un campo da modificare (importo o data)');
      return;
    }
    const res = await modificaBatch(batchInModifica.id, payload);
    setBatchInModifica(null);
    flash(`Modificati ${res.data.modificati} pagamenti non ancora pagati del gruppo "${batchInModifica.nome}".`);
    carica();
  };

  const handleEliminaBatch = async (b: { id: string; nome: string; countNonPagati: number }) => {
    if (b.countNonPagati === 0) {
      alert('Tutti i pagamenti di questo gruppo sono già stati incassati: non c\'è nulla da eliminare.');
      return;
    }
    if (!window.confirm(
      `Stai per eliminare i ${b.countNonPagati} pagamenti NON ANCORA PAGATI del gruppo "${b.nome}".\n\n` +
      `I pagamenti già incassati non verranno toccati. Questa operazione è irreversibile.\n\nContinuare?`
    )) return;
    const res = await eliminaBatch(b.id, true);
    flash(`Eliminati ${res.data.eliminati} pagamenti non pagati del gruppo "${b.nome}".`);
    carica();
  };

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Contabilità</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestione quote, pagamenti e scadenzario tesserati</p>
        </div>

        {/* RIEPILOGO */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-4 text-white shadow-sm">
            <p className="text-green-100 text-xs uppercase tracking-wide">Incassato</p>
            <p className="text-2xl font-bold mt-1">€ {totalePagato.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-4 text-white shadow-sm">
            <p className="text-orange-100 text-xs uppercase tracking-wide">Da incassare</p>
            <p className="text-2xl font-bold mt-1">€ {totaleDaIncassare.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-4 text-white shadow-sm">
            <p className="text-red-100 text-xs uppercase tracking-wide">Scaduto</p>
            <p className="text-2xl font-bold mt-1">€ {totaleScaduto.toFixed(2)}</p>
          </div>
        </div>

        {/* TAB NAV */}
        <div className="flex gap-1 mb-5 overflow-x-auto bg-white rounded-xl p-1 shadow-sm w-fit">
          {TAB.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                tab === t.id ? 'bg-blue-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {messaggio && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm">
            {messaggio}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <>
            {/* ============ SCADENZARIO ============ */}
            {tab === 'scadenzario' && (
              <div>
                {batches.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Gruppi generati in blocco</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Pagamenti creati insieme (piano scadenze o pagamento di gruppo). Puoi modificarli o eliminarli tutti insieme se creati per errore.
                    </p>
                    <div className="space-y-2">
                      {batches.map(b => (
                        <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-sm">
                            <span className="font-medium text-gray-800">{b.nome}</span>
                            <span className="text-gray-500 ml-2 text-xs">
                              {b.count} pagamenti · {b.countNonPagati} da incassare · totale € {b.totale.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => apriModificaBatch(b)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                              ✏️ Modifica non pagati
                            </button>
                            <button onClick={() => handleEliminaBatch(b)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                              🗑 Elimina non pagati
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                  <div className="flex gap-2">
                    {(['tutti', 'scaduti', 'pagati'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFiltro(f)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                          filtro === f ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text" placeholder="Cerca per tesserato o voce (es. Iscrizione, Gita...)" value={ricerca}
                    onChange={e => setRicerca(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 max-w-xs"
                  />
                  <button
                    onClick={() => setMostraFormPagamento(true)}
                    className="ml-auto bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition"
                  >
                    + Pagamento singolo
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Tesserato</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Voce</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Importo</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Scadenza</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Stato</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrati.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                          <td className="px-4 py-3 font-medium text-gray-700">{nomeTesserato(p.tesserato_id)}</td>
                          <td className="px-4 py-3 text-gray-500">{p.descrizione || nomeTariffa(p.tariffa_id)}</td>
                          <td className="px-4 py-3 font-medium">€ {Number(p.importo).toFixed(2)}</td>
                          <td className="px-4 py-3">{formatDate(p.data_scadenza)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              p.pagato ? 'bg-green-100 text-green-700' :
                              p.data_scadenza < oggi ? 'bg-red-100 text-red-600' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {p.pagato ? 'Pagato' : p.data_scadenza < oggi ? 'Scaduto' : 'In attesa'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-3">
                              {!p.pagato && (
                                <button onClick={() => handleIncasso(p.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">
                                  Incassa
                                </button>
                              )}
                              {p.pagato && (
                                <>
                                  <button onClick={() => handleScaricaRicevuta(p.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                                    📄 Ricevuta
                                  </button>
                                  <button onClick={() => handleInviaRicevuta(p.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                                    ✉️ Invia
                                  </button>
                                </>
                              )}
                              <button onClick={() => setPagamentoInModifica(p)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                Modifica
                              </button>
                              <button onClick={() => handleElimina(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                                Elimina
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtrati.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Nessun pagamento trovato</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============ GENERA PIANO QUOTE ============ */}
            {tab === 'piano' && (
              <GeneraPianoQuote gruppi={gruppi} tesserati={tesserati} onCreato={(msg) => { flash(msg); carica(); setTab('scadenzario'); }} />
            )}

            {/* ============ PAGAMENTO AD HOC DI GRUPPO ============ */}
            {tab === 'ad-hoc' && (
              <PagamentoAdHocGruppo gruppi={gruppi} tesserati={tesserati} onCreato={(msg) => { flash(msg); carica(); setTab('scadenzario'); }} />
            )}

            {/* ============ TARIFFE ============ */}
            {tab === 'tariffe' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setMostraFormTariffa(true)}
                    className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition"
                  >
                    + Nuova tariffa
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tariffe.map(t => (
                    <div key={t.id} className="bg-white rounded-2xl shadow-sm p-4">
                      <p className="font-bold text-gray-800">{t.nome}</p>
                      <p className="text-2xl font-bold text-blue-700 mt-1">€ {Number(t.importo).toFixed(2)}</p>
                      {t.categoria && <p className="text-xs text-gray-400 mt-1">{t.categoria}</p>}
                    </div>
                  ))}
                  {tariffe.length === 0 && <p className="text-gray-400 col-span-3">Nessuna tariffa creata</p>}
                </div>
              </div>
            )}

            {/* ============ EROGAZIONI LIBERALI (donazioni) ============ */}
            {tab === 'donazioni' && <RicevuteDonazione />}
          </>
        )}

        {/* FORM NUOVA TARIFFA */}
        {mostraFormTariffa && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuova Tariffa</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={formTariffa.nome} onChange={(e) => setFormTariffa({ ...formTariffa, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" value={formTariffa.importo} onChange={(e) => setFormTariffa({ ...formTariffa, importo: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input type="text" value={formTariffa.categoria} onChange={(e) => setFormTariffa({ ...formTariffa, categoria: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraFormTariffa(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaTariffa} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* FORM NUOVO PAGAMENTO SINGOLO */}
        {mostraFormPagamento && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo Pagamento</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tesserato</label>
                <select value={formPagamento.tesserato_id} onChange={(e) => setFormPagamento({ ...formPagamento, tesserato_id: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>Seleziona tesserato</option>
                  {tesserati.map((t) => <option key={t.id} value={t.id}>{t.nome} {t.cognome}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tariffa</label>
                <select value={formPagamento.tariffa_id} onChange={(e) => {
                  const tariffa = tariffe.find(t => t.id === parseInt(e.target.value));
                  setFormPagamento({ ...formPagamento, tariffa_id: parseInt(e.target.value), importo: tariffa?.importo || 0, descrizione: tariffa?.nome || '' });
                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>Seleziona tariffa</option>
                  {tariffe.map((t) => <option key={t.id} value={t.id}>{t.nome} — €{t.importo}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" value={formPagamento.importo} onChange={(e) => setFormPagamento({ ...formPagamento, importo: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data scadenza</label>
                <input type="date" value={formPagamento.data_scadenza} onChange={(e) => setFormPagamento({ ...formPagamento, data_scadenza: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraFormPagamento(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaPagamento} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* MODIFICA PAGAMENTO SINGOLO */}
        {pagamentoInModifica && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Modifica pagamento</h2>
              <p className="text-sm text-gray-500 mb-4">{nomeTesserato(pagamentoInModifica.tesserato_id)}</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Voce</label>
                <input type="text" value={pagamentoInModifica.descrizione || ''}
                  onChange={(e) => setPagamentoInModifica({ ...pagamentoInModifica, descrizione: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" value={pagamentoInModifica.importo}
                  onChange={(e) => setPagamentoInModifica({ ...pagamentoInModifica, importo: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data scadenza</label>
                <input type="date" value={pagamentoInModifica.data_scadenza}
                  onChange={(e) => setPagamentoInModifica({ ...pagamentoInModifica, data_scadenza: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setPagamentoInModifica(null)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleSalvaModifica} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* MODIFICA IN BLOCCO BATCH */}
        {batchInModifica && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Modifica in blocco</h2>
              <p className="text-sm text-gray-500 mb-4">
                "{batchInModifica.nome}" · {batchInModifica.count} pagamenti nel gruppo. Le modifiche si applicano solo a quelli <strong>non ancora pagati</strong>. Lascia vuoto un campo per non modificarlo.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuovo importo (€) — opzionale</label>
                <input type="number" value={formBatch.importo} placeholder="Lascia vuoto per non modificare"
                  onChange={(e) => setFormBatch({ ...formBatch, importo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuova data scadenza — opzionale</label>
                <input type="date" value={formBatch.data_scadenza}
                  onChange={(e) => setFormBatch({ ...formBatch, data_scadenza: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setBatchInModifica(null)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleSalvaModificaBatch} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">
                  Applica al gruppo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};


// ============================================================
// GENERA PIANO QUOTE: iscrizione + quote mensili da mese a mese
// ============================================================
interface VoceScadenza { nome: string; importo: number; data_scadenza: string; }

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

const GeneraPianoQuote: React.FC<{
  gruppi: Gruppo[]; tesserati: Tesserato[]; onCreato: (msg: string) => void;
}> = ({ gruppi, tesserati, onCreato }) => {
  const [destinatario, setDestinatario] = useState<'gruppo' | 'tutti'>('gruppo');
  const [gruppoId, setGruppoId] = useState(0);
  const [conIscrizione, setConIscrizione] = useState(true);
  const [importoIscrizione, setImportoIscrizione] = useState(50);
  const [dataIscrizione, setDataIscrizione] = useState('');
  const [importoMensile, setImportoMensile] = useState(40);
  const [meseInizio, setMeseInizio] = useState(8); // Settembre (0-indexed)
  const [meseFine, setMeseFine] = useState(5); // Giugno
  const [annoInizio, setAnnoInizio] = useState(new Date().getFullYear());
  const [giornoScadenza, setGiornoScadenza] = useState(5);
  const [voci, setVoci] = useState<VoceScadenza[] | null>(null);
  const [inviando, setInviando] = useState(false);

  const generaAnteprima = () => {
    const risultato: VoceScadenza[] = [];
    if (conIscrizione && dataIscrizione) {
      risultato.push({ nome: 'Iscrizione', importo: importoIscrizione, data_scadenza: dataIscrizione });
    }
    // Genera le mensilità: da meseInizio (anno inizio) a meseFine (anno inizio+1 se meseFine < meseInizio)
    let mese = meseInizio;
    let anno = annoInizio;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const dataStr = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giornoScadenza).padStart(2, '0')}`;
      risultato.push({ nome: MESI[mese], importo: importoMensile, data_scadenza: dataStr });
      if (mese === meseFine) break;
      mese = (mese + 1) % 12;
      if (mese === 0) anno += 1;
    }
    setVoci(risultato);
  };

  const aggiornaVoce = (i: number, campo: keyof VoceScadenza, valore: string | number) => {
    if (!voci) return;
    const copia = [...voci];
    (copia[i] as any)[campo] = valore;
    setVoci(copia);
  };

  const rimuoviVoce = (i: number) => {
    if (!voci) return;
    setVoci(voci.filter((_, idx) => idx !== i));
  };

  const aggiungiVoce = () => {
    if (!voci) return;
    setVoci([...voci, { nome: 'Voce extra', importo: 0, data_scadenza: '' }]);
  };

  const confermaGenerazione = async () => {
    if (!voci || voci.length === 0) return;
    setInviando(true);
    try {
      const payload: any = { voci };
      if (destinatario === 'gruppo') {
        if (!gruppoId) { alert('Seleziona un gruppo'); setInviando(false); return; }
        payload.gruppo_id = gruppoId;
      } else {
        payload.tesserato_ids = tesserati.map(t => t.id);
      }
      const res = await generaPianoScadenze(payload);
      onCreato(`Creati ${res.data.pagamenti_creati} pagamenti per ${res.data.tesserati_coinvolti} tesserati.`);
      setVoci(null);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Errore nella generazione del piano');
    } finally {
      setInviando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* FORM CONFIGURAZIONE */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-4">Configura il piano di scadenze</h2>

        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Destinatari</label>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setDestinatario('gruppo')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${destinatario === 'gruppo' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Un gruppo
          </button>
          <button onClick={() => setDestinatario('tutti')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${destinatario === 'tutti' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Tutti i tesserati
          </button>
        </div>
        {destinatario === 'gruppo' && (
          <select value={gruppoId} onChange={e => setGruppoId(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4">
            <option value={0}>Seleziona gruppo</option>
            {gruppi.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        )}

        <div className="border-t pt-4 mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <input type="checkbox" checked={conIscrizione} onChange={e => setConIscrizione(e.target.checked)} />
            Includi quota di iscrizione
          </label>
          {conIscrizione && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Importo iscrizione (€)</label>
                <input type="number" value={importoIscrizione} onChange={e => setImportoIscrizione(parseFloat(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Scadenza iscrizione</label>
                <input type="date" value={dataIscrizione} onChange={e => setDataIscrizione(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quota mensile</label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Importo mensile (€)</label>
              <input type="number" value={importoMensile} onChange={e => setImportoMensile(parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Giorno di scadenza</label>
              <input type="number" min={1} max={28} value={giornoScadenza} onChange={e => setGiornoScadenza(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Da mese</label>
              <select value={meseInizio} onChange={e => setMeseInizio(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {MESI.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">A mese</label>
              <select value={meseFine} onChange={e => setMeseFine(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {MESI.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Anno iniziale</label>
              <input type="number" value={annoInizio} onChange={e => setAnnoInizio(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Es. da Settembre a Giugno genera automaticamente 10 rate, passando all'anno successivo dopo Dicembre.
          </p>
        </div>

        <button onClick={generaAnteprima} className="w-full mt-5 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition">
          Genera anteprima →
        </button>
      </div>

      {/* ANTEPRIMA / CONFERMA */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-4">Anteprima scadenzario</h2>
        {!voci ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">🗓️</p>
            <p className="text-sm">Configura il piano e genera l'anteprima per vedere qui le voci</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {voci.map((v, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <input type="text" value={v.nome} onChange={e => aggiornaVoce(i, 'nome', e.target.value)}
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm min-w-0" />
                  <input type="number" value={v.importo} onChange={e => aggiornaVoce(i, 'importo', parseFloat(e.target.value))}
                    className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                  <input type="date" value={v.data_scadenza} onChange={e => aggiornaVoce(i, 'data_scadenza', e.target.value)}
                    className="w-36 border border-gray-200 rounded px-2 py-1 text-sm" />
                  <button onClick={() => rimuoviVoce(i)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                </div>
              ))}
            </div>
            <button onClick={aggiungiVoce} className="text-blue-600 text-sm font-medium mb-4 hover:underline">
              + Aggiungi voce
            </button>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-xs text-gray-500">Totale per tesserato</p>
                <p className="text-xl font-bold text-gray-800">€ {voci.reduce((a, v) => a + Number(v.importo), 0).toFixed(2)}</p>
              </div>
              <button onClick={confermaGenerazione} disabled={inviando}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
                {inviando ? 'Generazione...' : 'Conferma e genera scadenze'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// ============================================================
// PAGAMENTO AD HOC DI GRUPPO (completino, gita, torneo...)
// ============================================================
const PagamentoAdHocGruppo: React.FC<{
  gruppi: Gruppo[]; tesserati: Tesserato[]; onCreato: (msg: string) => void;
}> = ({ gruppi, tesserati, onCreato }) => {
  const [destinatario, setDestinatario] = useState<'gruppo' | 'tutti'>('gruppo');
  const [gruppoId, setGruppoId] = useState(0);
  const [nome, setNome] = useState('');
  const [importo, setImporto] = useState(0);
  const [dataScadenza, setDataScadenza] = useState('');
  const [inviando, setInviando] = useState(false);

  const suggerimenti = ['Completino gara', 'Gita di Natale', 'Torneo di Capodanno', 'Kit allenamento', 'Foto di squadra'];

  const conferma = async () => {
    if (!nome || !importo || !dataScadenza) { alert('Compila tutti i campi'); return; }
    if (destinatario === 'gruppo' && !gruppoId) { alert('Seleziona un gruppo'); return; }
    setInviando(true);
    try {
      const payload: any = { nome, importo, data_scadenza: dataScadenza };
      if (destinatario === 'gruppo') payload.gruppo_id = gruppoId;
      else payload.tesserato_ids = tesserati.map(t => t.id);
      const res = await creaPagamentoGruppo(payload);
      onCreato(`Creato pagamento "${nome}" per ${res.data.tesserati_coinvolti} tesserati.`);
      setNome(''); setImporto(0); setDataScadenza('');
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Errore nella creazione del pagamento di gruppo');
    } finally {
      setInviando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 max-w-xl">
      <h2 className="font-bold text-gray-800 mb-1">Pagamento ad hoc per tutto il gruppo</h2>
      <p className="text-sm text-gray-500 mb-4">
        Per spese occasionali non ricorrenti: completino, gita, torneo, kit, ecc.
      </p>

      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Destinatari</label>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setDestinatario('gruppo')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${destinatario === 'gruppo' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Un gruppo
        </button>
        <button onClick={() => setDestinatario('tutti')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${destinatario === 'tutti' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Tutti i tesserati
        </button>
      </div>
      {destinatario === 'gruppo' && (
        <select value={gruppoId} onChange={e => setGruppoId(parseInt(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4">
          <option value={0}>Seleziona gruppo</option>
          {gruppi.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
      )}

      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione voce</label>
      <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Gita di Natale"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {suggerimenti.map(s => (
          <button key={s} onClick={() => setNome(s)}
            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full hover:bg-blue-100">
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
          <input type="number" value={importo} onChange={e => setImporto(parseFloat(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
          <input type="date" value={dataScadenza} onChange={e => setDataScadenza(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <button onClick={conferma} disabled={inviando}
        className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
        {inviando ? 'Creazione...' : 'Crea pagamento per il gruppo'}
      </button>
    </div>
  );
};

export default Pagamenti;


// ============================================================
// RICEVUTE EROGAZIONE LIBERALE (donazioni)
// ============================================================
interface RicevutaDonazione { id: number; nome_donatore: string; importo: number; data: string; causale?: string; creato_il: string; }

const RicevuteDonazione: React.FC = () => {
  const [ricevute, setRicevute] = useState<RicevutaDonazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome_donatore: '', importo: 0, data: new Date().toISOString().split('T')[0], causale: '' });
  const [inviando, setInviando] = useState(false);

  const carica = () => {
    getRicevuteDonazione().then(res => { setRicevute(res.data); setLoading(false); });
  };
  useEffect(() => { carica(); }, []);

  const handleCrea = async () => {
    if (!form.nome_donatore || !form.importo || !form.data) { alert('Compila nome, importo e data'); return; }
    setInviando(true);
    try {
      const res = await creaRicevutaDonazione(form);
      setForm({ nome_donatore: '', importo: 0, data: new Date().toISOString().split('T')[0], causale: '' });
      carica();
      // scarica subito il PDF appena generato
      await scaricaRicevutaDonazionePdf(res.data.id);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore nella creazione della ricevuta');
    } finally {
      setInviando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-1">Nuova ricevuta per erogazione liberale</h2>
        <p className="text-sm text-gray-500 mb-4">
          Per donazioni volontarie a sostegno dell'associazione (non collegate a una quota o a un tesserato specifico).
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome del sostenitore</label>
            <input type="text" value={form.nome_donatore} onChange={e => setForm({ ...form, nome_donatore: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
              <input type="number" value={form.importo} onChange={e => setForm({ ...form, importo: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Causale aggiuntiva (opzionale)</label>
            <input type="text" value={form.causale} onChange={e => setForm({ ...form, causale: e.target.value })}
              placeholder="Es. a sostegno del torneo di Capodanno" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={handleCrea} disabled={inviando}
          className="w-full mt-5 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
          {inviando ? 'Generazione...' : '❤️ Genera ricevuta e scarica PDF'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-4">Registro ricevute emesse</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Caricamento...</p>
        ) : ricevute.length === 0 ? (
          <p className="text-gray-400 text-sm">Nessuna ricevuta di erogazione liberale emessa</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {ricevute.map(r => (
              <div key={r.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-800">N. {String(r.id).padStart(4, '0')} — {r.nome_donatore}</p>
                  <p className="text-xs text-gray-500">{formatDate(r.data)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-700">€ {Number(r.importo).toFixed(2)}</span>
                  <button onClick={() => scaricaRicevutaDonazionePdf(r.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                    📄 PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
