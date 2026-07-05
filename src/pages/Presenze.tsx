import React, { useEffect, useState } from 'react';
import { getEventi, getGruppi, getTesserati, getPresenzeEvento, registraPresenza, creaEvento } from '../services/api';
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

  const togglePresenza = async (tesseratoId: number, presente: boolean) => {
    if (!eventoSelezionato) return;
    const existing = presenze.find(p => p.tesserato_id === tesseratoId);
    await registraPresenza({ evento_id: eventoSelezionato.id, tesserato_id: tesseratoId, presente });
    const res = await getPresenzeEvento(eventoSelezionato.id);
    setPresenze(res.data);
  };

  const getPresenza = (tesseratoId: number) => {
    const p = presenze.find(p => p.tesserato_id === tesseratoId);
    return p ? p.presente : null;
  };

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
      Presenza: getPresenza(t.id) === true ? 'Presente' : getPresenza(t.id) === false ? 'Assente' : 'Non registrato'
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
      getPresenza(t.id) === true ? '✓ Presente' : getPresenza(t.id) === false ? '✗ Assente' : '-'
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
    <div className="bg-gray-100 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">
        {loading ? <p className="text-gray-500">Caricamento...</p> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* CALENDARIO */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <button onClick={mesePrecedente} className="text-gray-600 hover:text-gray-900 px-2 py-1">◀</button>
                <h2 className="text-lg font-bold text-gray-800">{MESI[mese]} {anno}</h2>
                <button onClick={meseSuccessivo} className="text-gray-600 hover:text-gray-900 px-2 py-1">▶</button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {GIORNI.map(g => (
                  <div key={g} className="text-center text-xs font-semibold text-gray-500 py-1">{g}</div>
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
                  return (
                    <div key={giorno}
                      onClick={() => { setGiornoSelezionato(dataStr); setEventoSelezionato(null); }}
                      className={`min-h-[60px] p-1 rounded cursor-pointer border transition ${
                        isSelezionato ? 'border-blue-500 bg-blue-50' :
                        isOggi ? 'border-blue-300 bg-blue-50' :
                        'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <div className={`text-xs font-medium mb-1 ${isOggi ? 'text-blue-700' : 'text-gray-700'}`}>{giorno}</div>
                      {eventiGiorno.slice(0, 3).map(e => (
                        <div key={e.id} className={`text-white text-xs rounded px-1 mb-0.5 truncate ${tipoColore[e.tipo] || 'bg-gray-500'}`}>
                          {e.ora_inizio ? e.ora_inizio.substring(0,5) : ''} {e.titolo}
                        </div>
                      ))}
                      {eventiGiorno.length > 3 && <div className="text-xs text-gray-400">+{eventiGiorno.length - 3}</div>}
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex gap-4 mt-4 text-xs text-gray-500">
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
                <div className="bg-white rounded-lg shadow p-4">
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
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">{eventoSelezionato.titolo}</h3>
                    <div className="flex gap-2">
                      <button onClick={exportExcel} className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700">Excel</button>
                      <button onClick={exportPDF} className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">PDF</button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {presenze.filter(p => p.presente).length} presenti · {presenze.filter(p => !p.presente).length} assenti · {tesseratiEvento.filter(t => !presenze.some(p => p.tesserato_id === t.id)).length} non registrati
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {[...tesseratiEvento].sort((a, b) => a.cognome.localeCompare(b.cognome)).map(t => {
                      const presenza = getPresenza(t.id);
                      return (
                        <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-sm text-gray-800">{t.cognome} {t.nome}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => togglePresenza(t.id, true)}
                              className={`w-8 h-7 rounded text-xs font-bold ${presenza === true ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-green-100'}`}>
                              ✓
                            </button>
                            <button
                              onClick={() => togglePresenza(t.id, false)}
                              className={`w-8 h-7 rounded text-xs font-bold ${presenza === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-red-100'}`}>
                              ✗
                            </button>
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
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
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
