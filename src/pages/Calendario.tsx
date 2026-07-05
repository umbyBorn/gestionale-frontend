import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getGruppi } from '../services/api';

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
    const token = localStorage.getItem('token');
    await axios.post(`${API_URL}/eventi-ricorrenti/`, {
      ...form,
      giorni_settimana: form.giorni_settimana
    }, { headers: { Authorization: `Bearer ${token}` } });
    setMostraFormRicorrente(false);
    setForm({ gruppo_id: 0, tipo: 'allenamento', titolo: '', ora_inizio: '', ora_fine: '', luogo: '', giorni_settimana: [], data_inizio: '', data_fine: '' });
    carica();
  };

  const handleEliminaOccorrenza = async (eventoId: number) => {
    if (!window.confirm('Eliminare questa singola occorrenza?')) return;
    const token = localStorage.getItem('token');
    await axios.delete(`${API_URL}/eventi/${eventoId}/occorrenza`, { headers: { Authorization: `Bearer ${token}` } });
    carica();
    setGiornoSelezionato(null);
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

  return (
    <div className="bg-gray-100 min-h-full">
      <main className="p-4">
        {/* Navigazione mese */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-lg shadow px-4 py-3">
          <button onClick={mesePrecedente} className="text-blue-700 font-bold text-xl px-2">‹</button>
          <h2 className="text-lg font-bold text-gray-800">{MESI[mese - 1]} {anno}</h2>
          <button onClick={meseSuccessivo} className="text-blue-700 font-bold text-xl px-2">›</button>
        </div>

        {/* Griglia calendario */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-7 bg-blue-800">
            {GIORNI.map(g => (
              <div key={g} className="text-center text-white text-xs font-medium py-2">{g}</div>
            ))}
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Caricamento...</div>
          ) : (
            <div className="grid grid-cols-7">
              {celle.map((giorno, i) => {
                if (!giorno) return <div key={`empty-${i}`} className="border border-gray-100 min-h-16 bg-gray-50" />;
                const dataStr = formatData(giorno);
                const eventiGiorno = calendario[dataStr] || [];
                const isOggi = dataStr === `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
                return (
                  <div
                    key={giorno}
                    onClick={() => setGiornoSelezionato(giornoSelezionato === dataStr ? null : dataStr)}
                    className={`border border-gray-100 min-h-16 p-1 cursor-pointer hover:bg-blue-50 transition ${isOggi ? 'bg-blue-50' : ''} ${giornoSelezionato === dataStr ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${isOggi ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>{giorno}</div>
                    {eventiGiorno.slice(0, 2).map(e => (
                      <div key={e.id} className={`text-xs px-1 rounded mb-0.5 truncate ${tipoColore[e.tipo] || 'bg-gray-100'}`}>
                        {e.ora_inizio ? e.ora_inizio.slice(0, 5) + ' ' : ''}{e.titolo}
                      </div>
                    ))}
                    {eventiGiorno.length > 2 && (
                      <div className="text-xs text-gray-400">+{eventiGiorno.length - 2} altri</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dettaglio giorno selezionato */}
        {giornoSelezionato && calendario[giornoSelezionato] && (
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-800 mb-3">{giornoSelezionato}</h3>
            {(calendario[giornoSelezionato] || []).map(e => (
              <div key={e.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded mr-2 ${tipoColore[e.tipo]}`}>{e.tipo}</span>
                  <span className="font-medium text-gray-800">{e.titolo}</span>
                  {e.ora_inizio && <span className="text-sm text-gray-500 ml-2">{e.ora_inizio.slice(0, 5)}</span>}
                  <div className="text-xs text-gray-400 mt-1">{nomeGruppo(e.gruppo_id)} {e.luogo ? `• ${e.luogo}` : ''}</div>
                </div>
                <button onClick={() => handleEliminaOccorrenza(e.id)} className="text-red-500 hover:text-red-700 text-xs ml-4">
                  Elimina
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form evento ricorrente */}
        {mostraFormRicorrente && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
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
      </main>
    </div>
  );
};

export default Calendario;