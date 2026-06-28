import React, { useEffect, useState } from 'react';
import { getTesserati, creaTesserato, aggiornaTesserato, eliminaTesserato } from '../services/api';

interface Tesserato {
  id: number;
  nome: string;
  cognome: string;
  data_nascita: string;
  codice_fiscale: string;
  telefono?: string;
  indirizzo?: string;
  e_socio: boolean;
  attivo: boolean;
}

const formVuoto = {
  nome: '', cognome: '', data_nascita: '', codice_fiscale: '',
  telefono: '', indirizzo: '', e_socio: true
};

const Tesserati: React.FC = () => {
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ricerca, setRicerca] = useState('');
  const [form, setForm] = useState(formVuoto);

  const caricaTesserati = () => {
    getTesserati().then((res) => {
      setTesserati(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { caricaTesserati(); }, []);

  const apriNuovo = () => {
    setEditingId(null);
    setForm(formVuoto);
    setMostraForm(true);
  };

  const apriModifica = (t: Tesserato) => {
    setEditingId(t.id);
    setForm({
      nome: t.nome,
      cognome: t.cognome,
      data_nascita: t.data_nascita,
      codice_fiscale: t.codice_fiscale,
      telefono: t.telefono || '',
      indirizzo: t.indirizzo || '',
      e_socio: t.e_socio,
    });
    setMostraForm(true);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await aggiornaTesserato(editingId, form);
    } else {
      await creaTesserato(form);
    }
    setMostraForm(false);
    setEditingId(null);
    setForm(formVuoto);
    caricaTesserati();
  };

  const handleElimina = async (id: number) => {
    if (window.confirm('Vuoi disattivare questo tesserato?')) {
      await eliminaTesserato(id);
      caricaTesserati();
    }
  };

  const filtrati = tesserati.filter((t) =>
    `${t.nome} ${t.cognome}`.toLowerCase().includes(ricerca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white hover:text-blue-200 text-sm">← Dashboard</a>
          <h1 className="text-xl font-bold">Tesserati</h1>
        </div>
        <button onClick={apriNuovo} className="bg-white text-blue-800 px-4 py-1 rounded font-medium text-sm hover:bg-blue-50">
          + Nuovo tesserato
        </button>
      </header>

      <main className="p-6">
        <input
          type="text"
          placeholder="Cerca per nome o cognome..."
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Cognome</th>
                  <th className="px-4 py-3 text-left">Codice Fiscale</th>
                  <th className="px-4 py-3 text-left">Telefono</th>
                  <th className="px-4 py-3 text-left">Socio</th>
                  <th className="px-4 py-3 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">{t.nome}</td>
                    <td className="px-4 py-3">{t.cognome}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.codice_fiscale}</td>
                    <td className="px-4 py-3">{t.telefono || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${t.e_socio ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {t.e_socio ? 'Sì' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => apriModifica(t)} className="text-blue-600 hover:text-blue-800 text-xs">
                        Modifica
                      </button>
                      <button onClick={() => handleElimina(t.id)} className="text-red-500 hover:text-red-700 text-xs">
                        Disattiva
                      </button>
                    </td>
                  </tr>
                ))}
                {filtrati.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessun tesserato trovato</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Modifica Tesserato' : 'Nuovo Tesserato'}</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nome', key: 'nome', type: 'text' },
                  { label: 'Cognome', key: 'cognome', type: 'text' },
                  { label: 'Data di nascita', key: 'data_nascita', type: 'date' },
                  { label: 'Codice Fiscale', key: 'codice_fiscale', type: 'text' },
                  { label: 'Telefono', key: 'telefono', type: 'text' },
                  { label: 'Indirizzo', key: 'indirizzo', type: 'text' },
                ].map((campo) => (
                  <div key={campo.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{campo.label}</label>
                    <input
                      type={campo.type}
                      value={(form as any)[campo.key]}
                      onChange={(e) => setForm({ ...form, [campo.key]: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" checked={form.e_socio} onChange={(e) => setForm({ ...form, e_socio: e.target.checked })} id="socio" />
                  <label htmlFor="socio" className="text-sm text-gray-700">È socio dell'associazione</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => { setMostraForm(false); setEditingId(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annulla</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tesserati;
