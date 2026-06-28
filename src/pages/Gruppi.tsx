import React, { useEffect, useState } from 'react';
import { getGruppi, creaGruppo, eliminaGruppo } from '../services/api';

interface Gruppo {
  id: number;
  nome: string;
  descrizione?: string;
  attivo: boolean;
}

const Gruppi: React.FC = () => {
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState({ nome: '', descrizione: '' });

  const caricaGruppi = () => {
    getGruppi().then((res) => {
      setGruppi(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { caricaGruppi(); }, []);

  const handleSubmit = async () => {
    await creaGruppo(form);
    setMostraForm(false);
    setForm({ nome: '', descrizione: '' });
    caricaGruppi();
  };

  const handleElimina = async (id: number) => {
    if (window.confirm('Vuoi disattivare questo gruppo?')) {
      await eliminaGruppo(id);
      caricaGruppi();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white hover:text-blue-200 text-sm">← Dashboard</a>
          <h1 className="text-xl font-bold">Gruppi</h1>
        </div>
        <button onClick={() => setMostraForm(true)} className="bg-white text-blue-800 px-4 py-1 rounded font-medium text-sm hover:bg-blue-50">
          + Nuovo gruppo
        </button>
      </header>
      <main className="p-6">
        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gruppi.map((g) => (
              <div key={g.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800">{g.nome}</h3>
                    <p className="text-sm text-gray-500 mt-1">{g.descrizione || 'Nessuna descrizione'}</p>
                  </div>
                  <button onClick={() => handleElimina(g.id)} className="text-red-500 hover:text-red-700 text-xs">
                    Disattiva
                  </button>
                </div>
              </div>
            ))}
            {gruppi.length === 0 && (
              <p className="text-gray-400 col-span-3">Nessun gruppo creato</p>
            )}
          </div>
        )}
        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo Gruppo</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea
                  value={form.descrizione}
                  onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annulla</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Gruppi;