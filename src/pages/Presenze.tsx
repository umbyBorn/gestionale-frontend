import React, { useEffect, useState } from 'react';
import { getEventi, creaEvento, getGruppi, getTesserati, getPresenzeEvento, registraPresenza } from '../services/api';

interface Evento {
  id: number;
  gruppo_id: number;
  tipo: string;
  titolo: string;
  data: string;
  ora_inizio?: string;
  luogo?: string;
}

interface Gruppo {
  id: number;
  nome: string;
}

interface Tesserato {
  id: number;
  nome: string;
  cognome: string;
}

interface Presenza {
  id: number;
  tesserato_id: number;
  presente: boolean;
}

const Presenze: React.FC = () => {
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [eventoSelezionato, setEventoSelezionato] = useState<Evento | null>(null);
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [form, setForm] = useState({
    gruppo_id: 0, tipo: 'allenamento', titolo: '', data: '', ora_inizio: '', luogo: ''
  });

  const carica = () => {
    Promise.all([getEventi(), getGruppi(), getTesserati()]).then(([e, g, t]) => {
      setEventi(e.data);
      setGruppi(g.data);
      setTesserati(t.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const handleCreaEvento = async () => {
    await creaEvento(form);
    setMostraForm(false);
    setForm({ gruppo_id: 0, tipo: 'allenamento', titolo: '', data: '', ora_inizio: '', luogo: '' });
    carica();
  };

  const apriPresenze = async (evento: Evento) => {
    setEventoSelezionato(evento);
    const res = await getPresenzeEvento(evento.id);
    setPresenze(res.data);
  };

  const handlePresenza = async (tesserato_id: number, presente: boolean) => {
    const esistente = presenze.find(p => p.tesserato_id === tesserato_id);
    if (!esistente) {
      await registraPresenza({ evento_id: eventoSelezionato!.id, tesserato_id, presente });
      const res = await getPresenzeEvento(eventoSelezionato!.id);
      setPresenze(res.data);
    }
  };

  const nomeGruppo = (id: number) => gruppi.find(g => g.id === id)?.nome || `Gruppo ${id}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white hover:text-blue-200 text-sm">← Dashboard</a>
          <h1 className="text-xl font-bold">Presenze</h1>
        </div>
        <button onClick={() => setMostraForm(true)} className="bg-white text-blue-800 px-4 py-1 rounded font-medium text-sm hover:bg-blue-50">
          + Nuovo evento
        </button>
      </header>
      <main className="p-6">
        {loading ? <p className="text-gray-500">Caricamento...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-bold text-gray-700 mb-3">Eventi</h2>
              <div className="space-y-2">
                {eventi.map((e) => (
                  <div key={e.id} onClick={() => apriPresenze(e)}
                    className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition ${eventoSelezionato?.id === e.id ? 'border-2 border-blue-500' : ''}`}>
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">{e.titolo}</h3>
                        <p className="text-sm text-gray-500">{e.data} {e.ora_inizio ? `• ${e.ora_inizio}` : ''}</p>
                        <p className="text-xs text-gray-400">{nomeGruppo(e.gruppo_id)} • {e.luogo || 'Luogo non specificato'}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded h-fit">{e.tipo}</span>
                    </div>
                  </div>
                ))}
                {eventi.length === 0 && <p className="text-gray-400">Nessun evento creato</p>}
              </div>
            </div>

            {eventoSelezionato && (
              <div>
                <h2 className="font-bold text-gray-700 mb-3">Presenze — {eventoSelezionato.titolo}</h2>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">Tesserato</th>
                        <th className="px-4 py-3 text-left">Presenza</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tesserati.map((t, i) => {
                        const presenza = presenze.find(p => p.tesserato_id === t.id);
                        return (
                          <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3">{t.nome} {t.cognome}</td>
                            <td className="px-4 py-3">
                              {presenza ? (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${presenza.presente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {presenza.presente ? 'Presente' : 'Assente'}
                                </span>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => handlePresenza(t.id, true)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">Presente</button>
                                  <button onClick={() => handlePresenza(t.id, false)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200">Assente</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo Evento</h2>
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
                    {gruppi.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
                    <input type="time" value={form.ora_inizio} onChange={(e) => setForm({ ...form, ora_inizio: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
                  <input type="text" value={form.luogo} onChange={(e) => setForm({ ...form, luogo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaEvento} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Presenze;