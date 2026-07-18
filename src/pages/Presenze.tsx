import React, { useEffect, useState } from 'react';
import { getEventi, getGruppi, getTesserati, getPresenzeEvento, registraPresenza, annullaAssenza, creaEvento } from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Evento {
  id: number;
  gruppo_id: number;
  tipo: string;
  titolo: string;
  data: string;
  ora_inizio?: string;
  ora_fine?: string;
  luogo?: string;
  note?: string;
  ricorrente_id?: number;
}
interface Gruppo { id: number; nome: string; }
interface Tesserato { id: number; nome: string; cognome: string; }
interface Presenza { id: number; tesserato_id: number; presente: boolean; }

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const GIORNI = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

const Presenze: React.FC = () => {
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [loading, setLoading] = useState(true);
  const [oggi] = useState(new Date());
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [mese, setMese] = useState(oggi.getMonth());
  const [giornoSelezionato, setGiornoSelezionato] = useState<string | null>(null);
  const [eventoSelezionato, setEventoSelezionato] = useState<Evento | null>(null);
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [tesseratiEvento, setTesseratiEvento] = useState<Tesserato[]>([]);
  const [mostraFormEvento, setMostraFormEvento] = useState(false);
  const [form, setForm] = useState({ gruppo_id: 0, tipo: 'allenamento', titolo: '', data: '', ora_inizio: '', ora_fine: '', luogo: '' });

  const carica = () => {
    Promise.all([getEventi(), getGruppi(), getTesserati()]).then(([e, g, t]) => {
      setEventi(e.data);
      setGruppi(g.data);
      setTesserati(t.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const apriEvento = async (evento: Evento) => {
    setEventoSelezionato(evento);
    const res = await getPresenzeEvento(evento.id);
    setPresenze(res.data);
    const gruppo = gruppi.find(g => g.id === evento.gruppo_id);
    if (gruppo) {
      const tGruppo = tesserati.filter(t =>
        res.data.some((p: Presenza) => p.tesserato_id === t.id) ||
        true
      );
      const resGruppo = await fetch(`https://gestionale-sport-api.onrender.com/messaggi/gruppi/${evento.gruppo_id}/tesserati`);
      const datiGruppo = await resGruppo.json();
      setTesseratiEvento(datiGruppo.length > 0 ? datiGruppo : tesserati);
    } else {
      setTesseratiEvento(tesserati);
    }
  };

  // Regola: ogni tesserato è considerato presente di default all'evento.
  // Si registra esplicitamente solo l'assenza; l'assenza resta modificabile
  // (può essere annullata per tornare allo stato presente di default).
  const segnaAssente = async (tesseratoId: number) => {
    if (!eventoSelezionato) return;
    await registraPresenza({ evento_id: eventoSelezionato.id, tesserato_id: tesseratoId, presente: false });
    const res = await getPresenzeEvento(eventoSelezionato.id);
    setPresenze(res.data);
  };

  const rimuoviAssenza = async (tesseratoId: number) => {
    if (!eventoSelezionato) return;
    try {
      await annullaAssenza(eventoSelezionato.id, tesseratoId);
    } catch { /* già assente di default, nessuna riga da rimuovere */ }
    const res = await getPresenzeEvento(eventoSelezionato.id);
    setPresenze(res.data);
  };

  const isAssente = (tesseratoId: number) => presenze.some(p => p.tesserato_id === tesseratoId && p.presente === false);

  // Calendario
  const primoGiorno = new Date(anno, mese, 1);
  const ultimoGiorno = new Date(anno, mese + 1, 0);
  const offsetInizio = primoGiorno.getDay();

  const eventiDelGiorno = (giorno: number) => {
    const dataStr = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
    return eventi.filter(e => e.data === dataStr);
  };

  const tipoColore: Record<string, string> = {
    allenamento: 'bg-blue-500',
    partita: 'bg-red-500',
    raduno: 'bg-green-500',
    altro: 'bg-gray-500',
  };

  const mesePrecedente = () => {
    if (mese === 0) { setMese(11); setAnno(a => a - 1); }
    else setMese(m => m - 1);
    setGiornoSelezionato(null);
    setEventoSelezionato(null);
  };

  const meseSuccessivo = () => {
    if (mese === 11) { setMese(0); setAnno(a => a + 1); }
    else setMese(m => m + 1);
    setGiornoSelezionato(null);
    setEventoSelezionato(null);
  };

  const handleCreaEvento = async () => {
    await creaEvento(form);
    setMostraFormEvento(false);
    setForm({ gruppo_id: 0, tipo: 'allenamento', titolo: '', data: giornoSelezionato || '', ora_inizio: '', ora_fine: '', luogo: '' });
    carica();
  };

  // Export Excel
  const exportExcel = () => {
    if (!eventoSelezionato) return;
    const righe = tesseratiEvento.map(t => ({
      Cognome: t.cognome,
      Nome: t.nome,
      Presenza: isAssente(t.id) ? 'Assente' : 'Presente'
    }));
    const ws = XLSX.utils.json_to_sheet(righe);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presenze');
    XLSX.writeFile(wb, `presenze_${eventoSelezionato.titolo}_${eventoSelezionato.data}.xlsx`);
  };

  // Export PDF
  const exportPDF = () => {
    if (!eventoSelezionato) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(eventoSelezionato.titolo, 14, 20);
    doc.setFontSize(11);
    doc.text(`Data: ${eventoSelezionato.data} | Luogo: ${eventoSelezionato.luogo || '-'}`, 14, 30);
    doc.text(`Gruppo: ${gruppi.find(g => g.id === eventoSelezionato.gruppo_id)?.nome || '-'}`, 14, 38);
    const righe = tesseratiEvento.map(t => [
      t.cognome,
      t.nome,
      isAssente(t.id) ? '✗ Assente' : '✓ Presente'
    ]);
    autoTable(doc, {
      head: [['Cognome', 'Nome', 'Presenza']],
      body: righe,
      startY: 45,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 58, 95] },
    });
    doc.save(`presenze_${eventoSelezionato.titolo}_${eventoSelezionato.data}.pdf`);
  };

  const eventiGiornoSelezionato = giornoSelezionato ? eventi.filter(e => e.data === giornoSelezionato) : [];

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Calendario presenze</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra le presenze agli allenamenti e agli eventi</p>
        </div>
        {loading ? <p className="text-gray-500">Caricamento...</p> : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* CALENDARIO */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={mesePrecedente} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 text-white">◀</button>
                  <h2 className="font-bold text-lg text-white">{MESI[mese]} {anno}</h2>
                  <button onClick={meseSuccessivo} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 text-white">▶</button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {GIORNI.map(g => (
                    <div key={g} className="text-center text-xs text-blue-200 font-medium py-1">{g}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: offsetInizio }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: ultimoGiorno.getDate() }).map((_, i) => {
                    const giorno = i + 1;
                    const dataStr = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
                    const eventiGiorno = eventiDelGiorno(giorno);
                    const isOggi = dataStr === oggi.toISOString().split('T')[0];
                    const isSelezionato = dataStr === giornoSelezionato;
                    const haEventi = eventiGiorno.length > 0;
                    return (
                      <button key={giorno}
                        onClick={() => { setGiornoSelezionato(dataStr); setEventoSelezionato(null); }}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center transition ${
                          isSelezionato ? 'bg-white text-blue-700 shadow-lg scale-110' :
                          isOggi ? 'bg-white/30 text-white font-bold' :
                          haEventi ? 'bg-white/10 text-white hover:bg-white/20' :
                          'text-blue-100 hover:bg-white/10'
                        }`}>
                        <span className="text-sm font-semibold">{giorno}</span>
                        {haEventi && (
                          <span className="flex gap-0.5 mt-0.5">
                            {eventiGiorno.slice(0, 3).map((e, idx) => (
                              <span key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelezionato ? (tipoColore[e.tipo] || 'bg-blue-400') : 'bg-yellow-300'}`} />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legenda */}
              <div className="flex gap-4 px-4 py-3 text-xs text-gray-500 flex-wrap border-t">
                {Object.entries(tipoColore).map(([tipo, colore]) => (
                  <div key={tipo} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${colore}`} />
                    <span className="capitalize">{tipo}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PANNELLO LATERALE */}
            <div className="space-y-4">
              {/* EVENTI DEL GIORNO */}
              {giornoSelezionato && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm">
                    {new Date(giornoSelezionato + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  {eventiGiornoSelezionato.length === 0 ? (
                    <div>
                      <p className="text-gray-400 text-sm mb-3">Nessun evento in questo giorno</p>
                      <button onClick={() => { setMostraFormEvento(true); setForm(f => ({ ...f, data: giornoSelezionato })); }}
                        className="text-blue-600 text-xs hover:text-blue-800">+ Aggiungi evento</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {eventiGiornoSelezionato.map(e => (
                        <div key={e.id}
                          onClick={() => apriEvento(e)}
                          className={`p-3 rounded cursor-pointer border-l-4 hover:bg-gray-50 transition ${
                            eventoSelezionato?.id === e.id ? 'bg-blue-50 border-blue-500' : 'border-gray-200'
                          }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm text-gray-800">{e.titolo}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {e.ora_inizio && `${e.ora_inizio.substring(0,5)}${e.ora_fine ? ` - ${e.ora_fine.substring(0,5)}` : ''}`}
                                {e.luogo && ` · ${e.luogo}`}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {gruppi.find(g => g.id === e.gruppo_id)?.nome || '-'}
                              </p>
                              {e.ricorrente_id && (
                                <a href="/calendario" onClick={ev => ev.stopPropagation()}
                                  className="text-xs text-blue-500 hover:underline mt-0.5 inline-block">
                                  🔁 Evento ricorrente · gestisci in blocco da Attività
                                </a>
                              )}
                            </div>
                            <span className={`text-white text-xs px-2 py-0.5 rounded ${tipoColore[e.tipo] || 'bg-gray-500'}`}>
                              {e.tipo}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PRESENZE EVENTO */}
              {eventoSelezionato && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">{eventoSelezionato.titolo}</h3>
                    <div className="flex gap-2">
                      <button onClick={exportExcel} className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700">Excel</button>
                      <button onClick={exportPDF} className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">PDF</button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {tesseratiEvento.length - presenze.filter(p => p.presente === false).length} presenti · {presenze.filter(p => p.presente === false).length} assenti
                    <span className="text-gray-400"> · tutti presenti di default, segna solo chi manca</span>
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {[...tesseratiEvento].sort((a, b) => a.cognome.localeCompare(b.cognome)).map(t => {
                      const assente = isAssente(t.id);
                      return (
                        <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className={`text-sm ${assente ? 'text-gray-400' : 'text-gray-800'}`}>{t.cognome} {t.nome}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${assente ? 'text-red-500' : 'text-green-600'}`}>
                              {assente ? '✗ Assente' : '✓ Presente'}
                            </span>
                            {assente ? (
                              <button
                                onClick={() => rimuoviAssenza(t.id)}
                                title="Annulla assenza, torna presente"
                                className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700">
                                Annulla
                              </button>
                            ) : (
                              <button
                                onClick={() => segnaAssente(t.id)}
                                title="Segna assente"
                                className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600">
                                Segna assente
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FORM NUOVO EVENTO */}
      {mostraFormEvento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo Evento</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titolo</label>
                <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="allenamento">Allenamento</option>
                    <option value="partita">Partita</option>
                    <option value="raduno">Raduno</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gruppo</label>
                  <select value={form.gruppo_id} onChange={e => setForm(f => ({ ...f, gruppo_id: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value={0}>Seleziona...</option>
                    {gruppi.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ora inizio</label>
                  <input type="time" value={form.ora_inizio} onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ora fine</label>
                  <input type="time" value={form.ora_fine} onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Luogo</label>
                <input type="text" value={form.luogo} onChange={e => setForm(f => ({ ...f, luogo: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setMostraFormEvento(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annulla</button>
              <button onClick={handleCreaEvento} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Presenze;
