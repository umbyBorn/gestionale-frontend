import React, { useEffect, useState } from 'react';
import {
  getAssemblee, creaAssemblea, aggiornaAssemblea, eliminaAssemblea,
  getPuntiAssemblea, creaPunto, aggiornaEsitoPunto,
  getPartecipantiAssemblea, registraPartecipazione,
  getTesserati,
} from '../services/api';

interface Assemblea {
  id: number; titolo: string; data: string; ora?: string; luogo?: string; stato: string; note?: string;
}
interface Punto { id: number; assemblea_id: number; numero: number; titolo: string; descrizione?: string; esito?: string; }
interface Partecipazione { id: number; assemblea_id: number; tesserato_id: number; presente: boolean; voto?: string; }
interface Tesserato { id: number; nome: string; cognome: string; }

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const GIORNI = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

const statoColore: Record<string, string> = {
  pianificata: 'bg-yellow-100 text-yellow-700',
  conclusa: 'bg-green-100 text-green-700',
  annullata: 'bg-red-100 text-red-600',
};

const formVuoto = { titolo: '', data: '', ora: '', luogo: '', stato: 'pianificata', note: '' };

const Assemblee: React.FC = () => {
  const [assemblee, setAssemblee] = useState<Assemblea[]>([]);
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [loading, setLoading] = useState(true);
  const [oggi] = useState(new Date());
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [mese, setMese] = useState(oggi.getMonth());
  const [giornoSelezionato, setGiornoSelezionato] = useState<string | null>(null);
  const [assembleaSelezionata, setAssembleaSelezionata] = useState<Assemblea | null>(null);
  const [punti, setPunti] = useState<Punto[]>([]);
  const [partecipazioni, setPartecipazioni] = useState<Partecipazione[]>([]);
  const [subTab, setSubTab] = useState<'odg' | 'partecipanti'>('odg');

  const [mostraForm, setMostraForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formVuoto);

  const [mostraFormPunto, setMostraFormPunto] = useState(false);
  const [formPunto, setFormPunto] = useState({ numero: 1, titolo: '', descrizione: '' });

  const carica = () => {
    Promise.all([getAssemblee(), getTesserati()]).then(([a, t]) => {
      setAssemblee(a.data);
      setTesserati(t.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const apriAssemblea = async (a: Assemblea) => {
    setAssembleaSelezionata(a);
    setSubTab('odg');
    const [p, part] = await Promise.all([getPuntiAssemblea(a.id), getPartecipantiAssemblea(a.id)]);
    setPunti(p.data);
    setPartecipazioni(part.data);
  };

  const ricaricaDettaglio = async () => {
    if (!assembleaSelezionata) return;
    const [p, part] = await Promise.all([getPuntiAssemblea(assembleaSelezionata.id), getPartecipantiAssemblea(assembleaSelezionata.id)]);
    setPunti(p.data);
    setPartecipazioni(part.data);
  };

  const eventiDelGiorno = (giorno: number) => {
    const dataStr = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
    return assemblee.filter(a => a.data === dataStr);
  };

  const mesePrecedente = () => {
    if (mese === 0) { setMese(11); setAnno(a => a - 1); } else setMese(m => m - 1);
    setGiornoSelezionato(null); setAssembleaSelezionata(null);
  };
  const meseSuccessivo = () => {
    if (mese === 11) { setMese(0); setAnno(a => a + 1); } else setMese(m => m + 1);
    setGiornoSelezionato(null); setAssembleaSelezionata(null);
  };

  const apriNuovo = () => {
    setEditingId(null);
    setForm({ ...formVuoto, data: giornoSelezionato || '' });
    setMostraForm(true);
  };
  const apriModifica = (a: Assemblea) => {
    setEditingId(a.id);
    setForm({ titolo: a.titolo, data: a.data, ora: a.ora || '', luogo: a.luogo || '', stato: a.stato, note: a.note || '' });
    setMostraForm(true);
  };

  const handleSubmit = async () => {
    if (editingId) await aggiornaAssemblea(editingId, form);
    else await creaAssemblea(form);
    setMostraForm(false);
    carica();
  };

  const handleElimina = async (id: number) => {
    if (window.confirm('Eliminare questa assemblea?')) {
      await eliminaAssemblea(id);
      if (assembleaSelezionata?.id === id) setAssembleaSelezionata(null);
      carica();
    }
  };

  const handleCreaPunto = async () => {
    if (!assembleaSelezionata) return;
    await creaPunto({ ...formPunto, assemblea_id: assembleaSelezionata.id });
    setMostraFormPunto(false);
    setFormPunto({ numero: punti.length + 2, titolo: '', descrizione: '' });
    ricaricaDettaglio();
  };

  const handleEsito = async (punto: Punto) => {
    const esito = window.prompt('Esito del punto (es. Approvato all\'unanimità):', punto.esito || '');
    if (esito !== null) {
      await aggiornaEsitoPunto(punto.id, esito);
      ricaricaDettaglio();
    }
  };

  const togglePartecipazione = async (tesseratoId: number, presente: boolean) => {
    if (!assembleaSelezionata) return;
    await registraPartecipazione({ assemblea_id: assembleaSelezionata.id, tesserato_id: tesseratoId, presente });
    ricaricaDettaglio();
  };

  const getPartecipazione = (tesseratoId: number) => partecipazioni.find(p => p.tesserato_id === tesseratoId);

  const eventiGiornoSelezionato = giornoSelezionato ? assemblee.filter(a => a.data === giornoSelezionato) : [];
  const primoGiorno = new Date(anno, mese, 1);
  const ultimoGiorno = new Date(anno, mese + 1, 0);
  const offsetInizio = primoGiorno.getDay();

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Assemblee</h1>
            <p className="text-sm text-gray-500 mt-0.5">Calendario assemblee, ordine del giorno e partecipazioni</p>
          </div>
          <button onClick={apriNuovo} className="bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition w-fit">
            + Nuova assemblea
          </button>
        </div>

        {loading ? <p className="text-gray-500">Caricamento...</p> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* CALENDARIO */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900">
                <button onClick={mesePrecedente} className="text-white/80 hover:text-white font-bold text-xl px-2">‹</button>
                <h2 className="text-lg font-bold text-white">{MESI[mese]} {anno}</h2>
                <button onClick={meseSuccessivo} className="text-white/80 hover:text-white font-bold text-xl px-2">›</button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {GIORNI.map(g => <div key={g} className="text-center text-xs font-semibold text-gray-500 py-1">{g}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: offsetInizio }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: ultimoGiorno.getDate() }).map((_, i) => {
                    const giorno = i + 1;
                    const dataStr = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
                    const eventiGiorno = eventiDelGiorno(giorno);
                    const isOggi = dataStr === oggi.toISOString().split('T')[0];
                    const isSelezionato = dataStr === giornoSelezionato;
                    return (
                      <div key={giorno}
                        onClick={() => { setGiornoSelezionato(dataStr); setAssembleaSelezionata(null); }}
                        className={`min-h-[64px] p-1 rounded-lg cursor-pointer border transition ${
                          isSelezionato ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' :
                          isOggi ? 'border-blue-300 bg-blue-50' :
                          'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
                        }`}>
                        <div className={`text-xs font-medium mb-1 ${isOggi ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>{giorno}</div>
                        {eventiGiorno.slice(0, 2).map(a => (
                          <div key={a.id} className={`text-xs rounded px-1 mb-0.5 truncate ${statoColore[a.stato] || 'bg-gray-100'}`}>
                            {a.ora ? a.ora.slice(0, 5) + ' ' : ''}{a.titolo}
                          </div>
                        ))}
                        {eventiGiorno.length > 2 && <div className="text-xs text-gray-400">+{eventiGiorno.length - 2}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-gray-500">
                  {Object.entries(statoColore).map(([stato, colore]) => (
                    <div key={stato} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded ${colore.split(' ')[0]}`} />
                      <span className="capitalize">{stato}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PANNELLO LATERALE */}
            <div className="space-y-4">
              {giornoSelezionato && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm">
                    {new Date(giornoSelezionato + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  {eventiGiornoSelezionato.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nessuna assemblea in questo giorno</p>
                  ) : (
                    <div className="space-y-2">
                      {eventiGiornoSelezionato.map(a => (
                        <div key={a.id} onClick={() => apriAssemblea(a)}
                          className={`p-3 rounded-lg cursor-pointer border-l-4 hover:bg-gray-50 transition ${
                            assembleaSelezionata?.id === a.id ? 'bg-blue-50 border-blue-500' : 'border-gray-200'
                          }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm text-gray-800">{a.titolo}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{a.ora ? a.ora.slice(0, 5) : ''} {a.luogo ? `· ${a.luogo}` : ''}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statoColore[a.stato]}`}>{a.stato}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {assembleaSelezionata && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm">{assembleaSelezionata.titolo}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => apriModifica(assembleaSelezionata)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Modifica</button>
                      <button onClick={() => handleElimina(assembleaSelezionata.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Elimina</button>
                    </div>
                  </div>
                  <div className="flex gap-1 px-3 pt-2 border-b">
                    {(['odg', 'partecipanti'] as const).map(t => (
                      <button key={t} onClick={() => setSubTab(t)}
                        className={`px-3 py-2 text-xs font-medium border-b-2 transition ${subTab === t ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500'}`}>
                        {t === 'odg' ? `📋 Ordine del giorno (${punti.length})` : `👥 Partecipanti (${partecipazioni.filter(p => p.presente).length})`}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {subTab === 'odg' && (
                      <div>
                        <button onClick={() => setMostraFormPunto(true)} className="bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-800 mb-3">
                          + Aggiungi punto
                        </button>
                        <div className="space-y-2">
                          {punti.sort((a, b) => a.numero - b.numero).map(p => (
                            <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-medium text-gray-800">{p.numero}. {p.titolo}</p>
                                <button onClick={() => handleEsito(p)} className="text-blue-600 hover:text-blue-800 text-xs">
                                  {p.esito ? 'Modifica esito' : 'Registra esito'}
                                </button>
                              </div>
                              {p.descrizione && <p className="text-xs text-gray-500 mt-1">{p.descrizione}</p>}
                              {p.esito && <p className="text-xs text-green-700 mt-1 font-medium">✓ {p.esito}</p>}
                            </div>
                          ))}
                          {punti.length === 0 && <p className="text-gray-400 text-sm">Nessun punto all'ordine del giorno</p>}
                        </div>
                      </div>
                    )}
                    {subTab === 'partecipanti' && (
                      <div className="space-y-1 max-h-80 overflow-y-auto">
                        {[...tesserati].sort((a, b) => a.cognome.localeCompare(b.cognome)).map(t => {
                          const part = getPartecipazione(t.id);
                          return (
                            <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                              <span className="text-sm text-gray-800">{t.cognome} {t.nome}</span>
                              <div className="flex gap-1">
                                <button onClick={() => togglePartecipazione(t.id, true)}
                                  className={`w-8 h-7 rounded text-xs font-bold ${part?.presente ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-green-100'}`}>✓</button>
                                <button onClick={() => togglePartecipazione(t.id, false)}
                                  className={`w-8 h-7 rounded text-xs font-bold ${part && !part.presente ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-red-100'}`}>✗</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FORM NUOVA/MODIFICA ASSEMBLEA */}
        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Modifica assemblea' : 'Nuova assemblea'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                  <input type="text" value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora</label>
                    <input type="time" value={form.ora} onChange={(e) => setForm({ ...form, ora: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
                  <input type="text" value={form.luogo} onChange={(e) => setForm({ ...form, luogo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                  <select value={form.stato} onChange={(e) => setForm({ ...form, stato: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="pianificata">Pianificata</option>
                    <option value="conclusa">Conclusa</option>
                    <option value="annullata">Annullata</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* FORM NUOVO PUNTO OdG */}
        {mostraFormPunto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo punto all'ordine del giorno</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero</label>
                  <input type="number" value={formPunto.numero} onChange={(e) => setFormPunto({ ...formPunto, numero: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                  <input type="text" value={formPunto.titolo} onChange={(e) => setFormPunto({ ...formPunto, titolo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea value={formPunto.descrizione} onChange={(e) => setFormPunto({ ...formPunto, descrizione: e.target.value })} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setMostraFormPunto(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaPunto} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Assemblee;
