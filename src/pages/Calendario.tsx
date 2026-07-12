import React, { useEffect, useState } from 'react';
import {
  getGruppi, creaEventoRicorrente, eliminaOccorrenza,
  modificaEventoRicorrente, eliminaEventoRicorrente,
} from '../services/api';
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
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [loading, setLoading] = useState(true);
  const [giornoSelezionato, setGiornoSelezionato] = useState<string | null>(null);
  const [mostraFormRicorrente, setMostraFormRicorrente] = useState(false);
  const [form, setForm] = useState({
    gruppo_id: 0, tipo: 'allenamento', titolo: '', ora_inizio: '', ora_fine: '',
    luogo: '', giorni_settimana: [] as number[], data_inizio: '', data_fine: ''
  });

  // Modifica/eliminazione in blocco di una serie di eventi ricorrenti
  const [eventoRicorrenteAzione, setEventoRicorrenteAzione] = useState<EventoCalendario | null>(null);
  const [mostraFormModificaBlocco, setMostraFormModificaBlocco] = useState(false);
  const [formModificaBlocco, setFormModificaBlocco] = useState({ titolo: '', ora_inizio: '', ora_fine: '', luogo: '' });

  const carica = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const [cal, gr] = await Promise.all([
      axios.get(`${API_URL}/calendario/?anno=${anno}&mese=${mese}`, { headers: { Authorization: `Bearer ${token}` } }),
      getGruppi()
    ]);
    setCalendario(cal.data);
    setGruppi(gr.data);
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
    await creaEventoRicorrente({ ...form, giorni_settimana: form.giorni_settimana });
    setMostraFormRicorrente(false);
    setForm({ gruppo_id: 0, tipo: 'allenamento', titolo: '', ora_inizio: '', ora_fine: '', luogo: '', giorni_settimana: [], data_inizio: '', data_fine: '' });
    carica();
  };

  const handleEliminaOccorrenza = async (eventoId: number) => {
    if (!window.confirm('Eliminare questa singola occorrenza?')) return;
    await eliminaOccorrenza(eventoId);
    carica();
    setGiornoSelezionato(null);
  };

  const apriModificaBlocco = (e: EventoCalendario) => {
    setEventoRicorrenteAzione(e);
    setFormModificaBlocco({ titolo: e.titolo, ora_inizio: e.ora_inizio || '', ora_fine: '', luogo: e.luogo || '' });
    setMostraFormModificaBlocco(true);
  };

  const handleSalvaModificaBlocco = async () => {
    if (!eventoRicorrenteAzione?.ricorrente_id) return;
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
  };

  const handleEliminaSerieFutura = async (e: EventoCalendario) => {
    if (!e.ricorrente_id) return;
    if (!window.confirm(
      'Stai per eliminare questa e TUTTE le occorrenze future di questo evento ricorrente.\n\n' +
      'Le occorrenze passate (già svolte, con eventuali presenze registrate) NON verranno toccate.\n\n' +
      'Vuoi continuare?'
    )) return;
    await eliminaEventoRicorrente(e.ricorrente_id, true);
    setGiornoSelezionato(null);
    carica();
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
            <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900">
              <button onClick={mesePrecedente} className="text-white/80 hover:text-white font-bold text-xl px-2">‹</button>
              <h2 className="text-lg font-bold text-white">{MESI[mese - 1]} {anno}</h2>
              <button onClick={meseSuccessivo} className="text-white/80 hover:text-white font-bold text-xl px-2">›</button>
            </div>
            <div className="p-4">
              {loading ? (
                <p className="text-gray-400 text-center py-8">Caricamento...</p>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {GIORNI.map(g => <div key={g} className="text-center text-xs font-semibold text-gray-500 py-1">{g}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {celle.map((giorno, i) => {
                      if (!giorno) return <div key={`empty-${i}`} />;
                      const dataStr = formatData(giorno);
                      const eventiGiorno = calendario[dataStr] || [];
                      const isOggi = dataStr === `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
                      const isSelezionato = dataStr === giornoSelezionato;
                      return (
                        <div
                          key={giorno}
                          onClick={() => setGiornoSelezionato(giornoSelezionato === dataStr ? null : dataStr)}
                          className={`min-h-[110px] sm:min-h-[130px] p-1.5 rounded-lg cursor-pointer border transition flex flex-col ${
                            isSelezionato ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' :
                            isOggi ? 'border-blue-300 bg-blue-50' :
                            'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
                          }`}
                        >
                          <div className={`text-xs font-medium mb-1 flex-shrink-0 ${isOggi ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>{giorno}</div>
                          <div className="space-y-0.5 overflow-hidden">
                            {eventiGiorno.slice(0, 3).map(e => (
                              <div key={e.id} className={`text-[11px] leading-tight px-1 py-0.5 rounded break-words ${tipoColore[e.tipo] || 'bg-gray-100'}`}>
                                {e.ora_inizio ? <span className="font-semibold">{e.ora_inizio.slice(0, 5)} </span> : ''}{e.titolo}
                              </div>
                            ))}
                            {eventiGiorno.length > 3 && (
                              <div className="text-[11px] text-gray-400 px-1">+{eventiGiorno.length - 3} altri</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-4 text-xs text-gray-500 flex-wrap">
                    {Object.entries(tipoColore).map(([tipo, colore]) => (
                      <div key={tipo} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded ${colore.split(' ')[0]}`} />
                        <span className="capitalize">{tipo}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* PANNELLO LATERALE: dettaglio giorno */}
          <div className="space-y-4">
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
      </main>
    </div>
  );
};

export default Calendario;