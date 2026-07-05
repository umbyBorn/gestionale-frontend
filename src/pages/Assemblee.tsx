import React, { useEffect, useState } from 'react';
import { getAssemblee, creaAssemblea } from '../services/api';

interface Assemblea {
  id: number;
  titolo: string;
  data: string;
  ora?: string;
  luogo?: string;
  stato: string;
  note?: string;
}

const Assemblee: React.FC = () => {
  const [assemblee, setAssemblee] = useState<Assemblea[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState({
    titolo: '', data: '', ora: '', luogo: '', stato: 'pianificata', note: ''
  });

  const carica = () => {
    getAssemblee().then((res) => {
      setAssemblee(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const handleSubmit = async () => {
    await creaAssemblea(form);
    setMostraForm(false);
    setForm({ titolo: '', data: '', ora: '', luogo: '', stato: 'pianificata', note: '' });
    carica();
  };

  const statoColore: Record<string, string> = {
    pianificata: 'bg-yellow-100 text-yellow-700',
    conclusa: 'bg-green-100 text-green-700',
    annullata: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-gray-100 min-h-full">
      <main className="p-6">
        {loading ? <p className="text-gray-500">Caricamento...</p> : (
          <div className="space-y-4">
            {assemblee.map((a) => (
              <div key={a.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800">{a.titolo}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {a.data} {a.ora ? `• ${a.ora}` : ''} {a.luogo ? `• ${a.luogo}` : ''}
                    </p>
                    {a.note && <p className="text-sm text-gray-400 mt-1">{a.note}</p>}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statoColore[a.stato] || 'bg-gray-100 text-gray-600'}`}>
                    {a.stato.charAt(0).toUpperCase() + a.stato.slice(1)}
                  </span>
                </div>
              </div>
            ))}
            {assemblee.length === 0 && <p className="text-gray-400">Nessuna assemblea creata</p>}
          </div>
        )}

        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuova Assemblea</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                  <input type="text" value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ora</label>
                    <input type="time" value={form.ora} onChange={(e) => setForm({ ...form, ora: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
                  <input type="text" value={form.luogo} onChange={(e) => setForm({ ...form, luogo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                  <select value={form.stato} onChange={(e) => setForm({ ...form, stato: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="pianificata">Pianificata</option>
                    <option value="conclusa">Conclusa</option>
                    <option value="annullata">Annullata</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Assemblee;