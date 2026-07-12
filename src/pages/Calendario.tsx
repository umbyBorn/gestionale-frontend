import React, { useEffect, useState } from 'react';
import {
  getGruppi, getEventi, creaEventoRicorrente, eliminaOccorrenza,
  modificaEvento, modificaEventoRicorrente, eliminaEventoRicorrente,
} from '../services/api';
import { formatDate } from '../utils/date';
import axios from 'axios';

const API_URL = 'https://gestionale-sport-api.onrender.com';

interface EventoCalendario {
  id: number;
  titolo: string;
  tipo: string;
  gruppo_id: number;
  ora_inizio?: string;
  luogo?: string;
  ricorrente_id?: number;
}

interface EventoCompleto {
  id: number;
  titolo: string;
  tipo: string;
  gruppo_id: number;
  data: string;
  ora_inizio?: string;
  ora_fine?: string;
  luogo?: string;
  note?: string;
  ricorrente_id?: number;
}

interface Gruppo {
  id: number;
  nome: string;
}

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const tipoColore: Record<string, string> = {
  allenamento: 'bg-blue-100 text-blue-700',
  partita: 'bg-green-100 text-green-700',
  raduno: 'bg-purple-100 text-purple-700',
  altro: 'bg-gray-100 text-gray-600',
};

const Calendario: React.FC = () => {
  const oggi = new Date();
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [mese, setMese] = useState(oggi.getMonth() + 1);
  const [calendario, setCalendario] = useState<Record<string, EventoCalendario[]>>({});
  const [eventiTotali, setEventiTotali] = useState<EventoCompleto[]>([]);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [loading, setLoading] = useState(true);
  const [giornoSelezionato, setGiornoSelezionato] = useState<string | null>(null);
  const [ricercaEvento, setRicercaEvento] = useState('');
  const [eventoAzione, setEventoAzione] = useState<EventoCompleto | null>(null);
  const [mostraFormRicorrente, setMostraFormRicorrente] = useState(false);
  const [form, setForm] = useState({
    gruppo_id: 0, tipo: 'allenamento', titolo: '', ora_inizio: '', ora_fine: '',
    luogo: '', giorni_settimana: [] as number[], data_inizio: '', data_fine: ''
  });

  // Modifica di una singola occorrenza (indipendentemente dal fatto che sia ricorrente o meno)
  const [mostraFormModificaSingola, setMostraFormModificaSingola] = useState(false);
  const [formModificaSingola, setFormModificaSingola] = useState({
    titolo: '', tipo: 'allenamento', gruppo_id: 0, data: '', ora_inizio: '', ora_fine: '', luogo: '',
  });

  // Modifica/eliminazione in blocco di una serie di eventi ricorrenti
  const [eventoRicorrenteAzione, setEventoRicorrenteAzione] = useState<EventoCalendario | null>(null);
  const [mostraFormModificaBlocco, setMostraFormModificaBlocco] = useState(false);
  const [formModificaBlocco, setFormModificaBlocco] = useState({ titolo: '', ora_inizio: '', ora_fine: '', luogo: '' });

  const carica = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const [cal, gr, tutti] = await Promise.all([
      axios.get(`${API_URL}/calendario/?anno=${anno}&mese=${mese}`, { headers: { Authorization: `Bearer ${token}` } }),
      getGruppi(),
      getEventi(),
    ]);
    setCalendario(cal.data);
    setGruppi(gr.data);
    setEventiTotali(tutti.data);
    setLoading(false);
  };

  useEffect(() => { carica(); }, [anno, mese]);

  const mesePrecedente = () => {
    if (mese === 1) { setAnno(anno - 1); setMese(12); }
    else setMese(mese - 1);
  };

  const meseSuccessivo = () => {
    if (mese === 12) { setAnno(anno + 1); setMese(1); }
    else setMese(mese + 1);
  };

  const primoGiornoMese = () => {
    const d = new Date(anno, mese - 1, 1).getDay();
    return d === 0 ? 6 : d - 1;
  };

  const giorniNelMese = () => new Date(anno, mese, 0).getDate();

  const handleCreaRicorrente = async () => {
    try {
      await creaEventoRicorrente({ ...form, giorni_settimana: form.giorni_settimana });
      setMostraFormRicorrente(false);
      setForm({ gruppo_id: 0, tipo: 'allenamento', titolo: '', ora_inizio: '', ora_fine: '', luogo: '', giorni_settimana: [], data_inizio: '', data_fine: '' });
      carica();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore durante la creazione dell\'evento ricorrente');
    }
  };

  const handleEliminaOccorrenza = async (eventoId: number, forza = false) => {
    if (!forza && !window.confirm('Eliminare questa singola occorrenza?')) return;
    try {
      const res = await eliminaOccorrenza(eventoId, forza);
      if (res.data?.eliminato === false) {
        if (window.confirm(
          'Questo evento ha già delle presenze registrate.\n\n' +
          'Se lo elimini, verranno eliminate anche le presenze collegate e questa azione non è reversibile.\n\n' +
          'Vuoi eliminarlo comunque?'
        )) {
          await handleEliminaOccorrenza(eventoId, true);
          return;
        }
        return;
      }
      carica();
      setGiornoSelezionato(null);
      setEventoAzione(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore durante l\'eliminazione dell\'evento');
    }
  };

  const apriModificaBlocco = (e: EventoCalendario) => {
    setEventoRicorrenteAzione(e);
    setFormModificaBlocco({ titolo: e.titolo, ora_inizio: e.ora_inizio || '', ora_fine: '', luogo: e.luogo || '' });
    setMostraFormModificaBlocco(true);
  };

  const handleSalvaModificaBlocco = async () => {
    if (!eventoRicorrenteAzione?.ricorrente_id) return;
    try {
      const res = await modificaEventoRicorrente(eventoRicorrenteAzione.ricorrente_id, {
        titolo: formModificaBlocco.titolo,
        ora_inizio: formModificaBlocco.ora_inizio || null,
        ora_fine: formModificaBlocco.ora_fine || null,
        luogo: formModificaBlocco.luogo,
        solo_futuri: true,
      });
      setMostraFormModificaBlocco(false);
      setEventoRicorrenteAzione(null);
      setGiornoSelezionato(null);
      carica();
      alert(res.data?.messaggio || 'Occorrenze future aggiornate');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore durante la modifica in blocco');
    }
  };

  const handleEliminaSerieFutura = async (e: EventoCalendario, forza = false) => {
    if (!e.ricorrente_id) return;
    if (!forza && !window.confirm(
      'Stai per eliminare questa e TUTTE le occorrenze future di questo evento ricorrente.\n\n' +
      'Gli eventi che hanno già presenze registrate NON verranno toccati (te lo chiederò separatamente).\n\n' +
      'Vuoi continuare?'
    )) return;
    try {
      const res = await eliminaEventoRicorrente(e.ricorrente_id, true, forza);
      setGiornoSelezionato(null);
      setEventoAzione(null);
      carica();
      const eliminati = res.data?.occorrenze_eliminate ?? 0;
      const saltati = res.data?.saltate_con_presenze ?? 0;
      if (saltati > 0) {
        if (window.confirm(
          `Eliminate ${eliminati} occorrenze. ${saltati} eventi NON sono stati eliminati perché hanno già presenze registrate.\n\n` +
          `Vuoi eliminare anche questi ${saltati} eventi? Le presenze collegate andranno perse e l'azione non è reversibile.`
        )) {
          await handleEliminaSerieFutura(e, true);
        }
      } else {
        alert(`Eliminate ${eliminati} occorrenze future.`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore durante l\'eliminazione della serie di eventi');
    }
  };

  /** Trova l'oggetto evento completo (con data/ora_fine) a partire dal solo id,
   * necessario perché la vista mensile del calendario non porta tutti i campi. */
  const trovaEventoCompleto = (id: number): EventoCompleto | undefined =>
    eventiTotali.find(ev => ev.id === id);

  const apriModificaSingola = (eventoParziale: { id: number }) => {
    const e = trovaEventoCompleto(eventoParziale.id);
    if (!e) { alert('Evento non trovato, ricarico i dati...'); carica(); return; }
    setEventoAzione(e);
    setFormModificaSingola({
      titolo: e.titolo, tipo: e.tipo, gruppo_id: e.gruppo_id, data: e.data,
      ora_inizio: e.ora_inizio || '', ora_fine: e.ora_fine || '', luogo: e.luogo || '',
    });
    setMostraFormModificaSingola(true);
  };

  const handleSalvaModificaSingola = async () => {
    if (!eventoAzione) return;
    try {
      await modificaEvento(eventoAzione.id, {
        titolo: formModificaSingola.titolo,
        tipo: formModificaSingola.tipo,
        gruppo_id: formModificaSingola.gruppo_id,
        data: formModificaSingola.data,
        ora_inizio: formModificaSingola.ora_inizio || null,
        ora_fine: formModificaSingola.ora_fine || null,
        luogo: formModificaSingola.luogo,
      });
      setMostraFormModificaSingola(false);
      setEventoAzione(null);
      setGiornoSelezionato(null);
      carica();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore durante la modifica dell\'evento');
    }
  };

  const toggleGiorno = (g: number) => {
    setForm(prev => ({
      ...prev,
      giorni_settimana: prev.giorni_settimana.includes(g)
        ? prev.giorni_settimana.filter(x => x !== g)
        : [...prev.giorni_settimana, g]
    }));
  };

  const nomeGruppo = (id: number) => gruppi.find(g => g.id === id)?.nome || `Gruppo ${id}`;

  const oggiStr = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
  const eventiFiltrati = eventiTotali
    .filter(e => {
      if (!ricercaEvento.trim()) return e.data >= oggiStr; // di default mostra solo i prossimi eventi
      const q = ricercaEvento.toLowerCase();
      return e.titolo.toLowerCase().includes(q) || nomeGruppo(e.gruppo_id).toLowerCase().includes(q);
    })
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 30);

  const offset = primoGiornoMese();
  const totGiorni = giorniNelMese();
  const celle = Array(offset).fill(null).concat(Array.from({ length: totGiorni }, (_, i) => i + 1));
  while (celle.length % 7 !== 0) celle.push(null);

  const formatData = (g: number) => `${anno}-${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}`;

  const eventiGiornoSelezionato = giornoSelezionato ? (calendario[giornoSelezionato] || []) : [];

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Attività</h1>
            <p className="text-sm text-gray-500 mt-0.5">Calendario allenamenti, partite e raduni</p>
          </div>
          <button onClick={() => setMostraFormRicorrente(true)} className="bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition w-fit">
            + Nuovo evento ricorrente
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* CALENDARIO */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4">
              <div className="flex justify-between items-center mb-4">
                <button onClick={mesePrecedente} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 text-white">◀</button>
                <h2 className="font-bold text-lg text-white">{MESI[mese - 1]} {anno}</h2>
                <button onClick={meseSuccessivo} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 text-white">▶</button>
              </div>
              {loading ? (
                <p className="text-blue-100 text-center py-8">Caricamento...</p>
              ) : (
                <>
                  <div className="grid grid-cols-7 mb-2">
                    {GIORNI.map(g => <div key={g} className="text-center text-xs text-blue-200 font-medium py-1">{g}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {celle.map((giorno, i) => {
                      if (!giorno) return <div key={`empty-${i}`} />;
                      const dataStr = formatData(giorno);
                      const eventiGiorno = calendario[dataStr] || [];
                      const isOggi = dataStr === `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
                      const isSelezionato = dataStr === giornoSelezionato;
                      const haEventi = eventiGiorno.length > 0;
                      return (
                        <button
                          key={giorno}
                          onClick={() => setGiornoSelezionato(giornoSelezionato === dataStr ? null : dataStr)}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center transition ${
                            isSelezionato ? 'bg-white text-blue-700 shadow-lg scale-110' :
                            isOggi ? 'bg-white/30 text-white font-bold' :
                            haEventi ? 'bg-white/10 text-white hover:bg-white/20' :
                            'text-blue-100 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-sm font-semibold">{giorno}</span>
                          {haEventi && (
                            <span className="flex gap-0.5 mt-0.5">
                              {eventiGiorno.slice(0, 3).map((e, idx) => (
                                <span key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelezionato ? tipoColore[e.tipo]?.split(' ')[0] || 'bg-blue-400' : 'bg-yellow-300'}`} />
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-4 px-4 py-3 text-xs text-gray-500 flex-wrap border-t">
              {Object.entries(tipoColore).map(([tipo, colore]) => (
                <div key={tipo} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${colore.split(' ')[0]}`} />
                  <span className="capitalize">{tipo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PANNELLO LATERALE: ricerca eventi + dettaglio giorno */}
          <div className="space-y-4">

            {/* COMBO: cerca un evento esistente e agisci direttamente, senza dover cliccare sul giorno */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🔍 Trova un evento</h3>
              <input
                type="text"
                value={ricercaEvento}
                onChange={(e) => setRicercaEvento(e.target.value)}
                placeholder="Cerca per titolo o gruppo..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {eventiFiltrati.length === 0 ? (
                  <p className="text-gray-400 text-xs p-2">Nessun evento trovato</p>
                ) : eventiFiltrati.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setEventoAzione(eventoAzione?.id === e.id ? null : e)}
                    className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-blue-50 transition ${eventoAzione?.id === e.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {e.titolo} {e.ricorrente_id && <span className="text-gray-400" title="Serie ricorrente">🔁</span>}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {formatDate(e.data)} {e.ora_inizio ? `· ${e.ora_inizio.slice(0, 5)}` : ''} · {nomeGruppo(e.gruppo_id)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${tipoColore[e.tipo]}`}>{e.tipo}</span>
                  </button>
                ))}
              </div>

              {/* Pannello azioni per l'evento selezionato dalla combo */}
              {eventoAzione && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium text-gray-800 mb-2">
                    "{eventoAzione.titolo}" — {formatDate(eventoAzione.data)}
                  </p>
                  <div className="flex flex-col items-start gap-1">
                    <button onClick={() => apriModificaSingola(eventoAzione)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      ✏️ Modifica questo evento
                    </button>
                    <button onClick={() => handleEliminaOccorrenza(eventoAzione.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                      🗑 Elimina solo questo
                    </button>
                    {eventoAzione.ricorrente_id && (
                      <>
                        <button onClick={() => apriModificaBlocco(eventoAzione)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                          ✏️ Modifica questa e le successive
                        </button>
                        <button onClick={() => handleEliminaSerieFutura(eventoAzione)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                          🗑 Elimina questa e le successive
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {giornoSelezionato ? (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">
                  {new Date(giornoSelezionato + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {eventiGiornoSelezionato.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nessun evento in questo giorno</p>
                ) : (
                  <div className="space-y-2">
                    {eventiGiornoSelezionato.map(e => (
                      <div key={e.id} className="p-3 rounded-lg border-l-4 border-blue-300 bg-gray-50">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium text-sm text-gray-800">
                              {e.titolo} {e.ricorrente_id && <span className="text-gray-400" title="Fa parte di una serie ricorrente">🔁</span>}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {e.ora_inizio ? e.ora_inizio.slice(0, 5) : ''} {e.luogo ? `· ${e.luogo}` : ''}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{nomeGruppo(e.gruppo_id)}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${tipoColore[e.tipo]}`}>{e.tipo}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                          <button onClick={() => apriModificaSingola(e)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                            ✏️ Modifica
                          </button>
                          <button onClick={() => handleEliminaOccorrenza(e.id)} className="text-red-500 hover:text-red-700 text-xs">
                            Elimina solo questa
                          </button>
                          {e.ricorrente_id && (
                            <>
                              <span className="text-gray-300 text-xs">·</span>
                              <button onClick={() => apriModificaBlocco(e)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                ✏️ Modifica questa e le successive
                              </button>
                              <button onClick={() => handleEliminaSerieFutura(e)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                                🗑 Elimina questa e le successive
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <p className="text-gray-300 text-3xl mb-1">📅</p>
                <p className="text-gray-400 text-sm">Seleziona un giorno per vedere gli eventi</p>
              </div>
            )}
          </div>
        </div>

        {/* Form evento ricorrente */}
        {mostraFormRicorrente && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo Evento Ricorrente</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                  <input type="text" value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gruppo</label>
                  <select value={form.gruppo_id} onChange={(e) => setForm({ ...form, gruppo_id: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={0}>Seleziona gruppo</option>
                    {gruppi.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="allenamento">Allenamento</option>
                    <option value="partita">Partita</option>
                    <option value="raduno">Raduno</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giorni della settimana</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((g, i) => (
                      <button key={i} onClick={() => toggleGiorno(i)}
                        className={`px-3 py-1 rounded text-sm font-medium ${form.giorni_settimana.includes(i) ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
                    <input type="time" value={form.ora_inizio} onChange={(e) => setForm({ ...form, ora_inizio: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora fine</label>
                    <input type="time" value={form.ora_fine} onChange={(e) => setForm({ ...form, ora_fine: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
                  <input type="text" value={form.luogo} onChange={(e) => setForm({ ...form, luogo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
                    <input type="date" value={form.data_inizio} onChange={(e) => setForm({ ...form, data_inizio: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data fine</label>
                    <input type="date" value={form.data_fine} onChange={(e) => setForm({ ...form, data_fine: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setMostraFormRicorrente(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaRicorrente} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Genera eventi</button>
              </div>
            </div>
          </div>
        )}
        {/* Modifica in blocco (questa e le successive occorrenze) */}
        {mostraFormModificaBlocco && eventoRicorrenteAzione && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Modifica in blocco</h2>
              <p className="text-sm text-gray-500 mb-4">
                Le modifiche verranno applicate a <strong>questa occorrenza e a tutte quelle future</strong> della stessa serie ricorrente. Gli eventi già passati non vengono toccati.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                  <input type="text" value={formModificaBlocco.titolo} onChange={(e) => setFormModificaBlocco({ ...formModificaBlocco, titolo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
                    <input type="time" value={formModificaBlocco.ora_inizio} onChange={(e) => setFormModificaBlocco({ ...formModificaBlocco, ora_inizio: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora fine</label>
                    <input type="time" value={formModificaBlocco.ora_fine} onChange={(e) => setFormModificaBlocco({ ...formModificaBlocco, ora_fine: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
                  <input type="text" value={formModificaBlocco.luogo} onChange={(e) => setFormModificaBlocco({ ...formModificaBlocco, luogo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setMostraFormModificaBlocco(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleSalvaModificaBlocco} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">
                  Applica a questa e alle successive
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modifica singola occorrenza (funziona sia per eventi singoli che ricorrenti) */}
        {mostraFormModificaSingola && eventoAzione && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Modifica evento</h2>
              <p className="text-sm text-gray-500 mb-4">
                {eventoAzione.ricorrente_id
                  ? 'Modifica solo questa occorrenza; le altre date della serie ricorrente non vengono toccate.'
                  : 'Modifica i dettagli di questo evento.'}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                  <input type="text" value={formModificaSingola.titolo}
                    onChange={(e) => setFormModificaSingola({ ...formModificaSingola, titolo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gruppo</label>
                    <select value={formModificaSingola.gruppo_id}
                      onChange={(e) => setFormModificaSingola({ ...formModificaSingola, gruppo_id: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {gruppi.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={formModificaSingola.tipo}
                      onChange={(e) => setFormModificaSingola({ ...formModificaSingola, tipo: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="allenamento">Allenamento</option>
                      <option value="partita">Partita</option>
                      <option value="raduno">Raduno</option>
                      <option value="altro">Altro</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" value={formModificaSingola.data}
                      onChange={(e) => setFormModificaSingola({ ...formModificaSingola, data: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
                    <input type="time" value={formModificaSingola.ora_inizio}
                      onChange={(e) => setFormModificaSingola({ ...formModificaSingola, ora_inizio: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora fine</label>
                    <input type="time" value={formModificaSingola.ora_fine}
                      onChange={(e) => setFormModificaSingola({ ...formModificaSingola, ora_fine: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
                  <input type="text" value={formModificaSingola.luogo}
                    onChange={(e) => setFormModificaSingola({ ...formModificaSingola, luogo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => { setMostraFormModificaSingola(false); setEventoAzione(null); }} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleSalvaModificaSingola} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva modifiche</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Calendario;