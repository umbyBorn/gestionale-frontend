import React, { useEffect, useState } from 'react';
import { getStaff, creaStaff } from '../services/api';

interface Membro {
  id: number;
  nome: string;
  cognome: string;
  data_nascita: string;
  codice_fiscale: string;
  telefono?: string;
  email?: string;
  ruolo: string;
  tipo_rapporto: string;
  data_inizio: string;
  attivo: boolean;
}

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState({
    nome: '', cognome: '', data_nascita: '', codice_fiscale: '',
    telefono: '', email: '', ruolo: '', tipo_rapporto: 'volontario', data_inizio: ''
  });

  const carica = () => {
    getStaff().then((res) => {
      setStaff(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const handleSubmit = async () => {
    await creaStaff(form);
    setMostraForm(false);
    setForm({ nome: '', cognome: '', data_nascita: '', codice_fiscale: '', telefono: '', email: '', ruolo: '', tipo_rapporto: 'volontario', data_inizio: '' });
    carica();
  };

  const tipoLabel: Record<string, string> = {
    volontario: 'Volontario',
    cococo: 'Co.Co.Co.',
    altro: 'Altro'
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white hover:text-blue-200 text-sm">← Dashboard</a>
          <h1 className="text-xl font-bold">Staff</h1>
        </div>
        <button onClick={() => setMostraForm(true)} className="bg-white text-blue-800 px-4 py-1 rounded font-medium text-sm hover:bg-blue-50">
          + Nuovo membro
        </button>
      </header>
      <main className="p-6">
        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Cognome</th>
                  <th className="px-4 py-3 text-left">Ruolo</th>
                  <th className="px-4 py-3 text-left">Tipo rapporto</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Data inizio</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">{m.nome}</td>
                    <td className="px-4 py-3">{m.cognome}</td>
                    <td className="px-4 py-3">{m.ruolo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        m.tipo_rapporto === 'volontario' ? 'bg-blue-100 text-blue-700' :
                        m.tipo_rapporto === 'cococo' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {tipoLabel[m.tipo_rapporto] || m.tipo_rapporto}
                      </span>
                    </td>
                    <td className="px-4 py-3">{m.email || '-'}</td>
                    <td className="px-4 py-3">{m.data_inizio}</td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessun membro staff</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo Membro Staff</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nome', key: 'nome', type: 'text' },
                  { label: 'Cognome', key: 'cognome', type: 'text' },
                  { label: 'Data di nascita', key: 'data_nascita', type: 'date' },
                  { label: 'Codice Fiscale', key: 'codice_fiscale', type: 'text' },
                  { label: 'Telefono', key: 'telefono', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                  { label: 'Ruolo', key: 'ruolo', type: 'text' },
                  { label: 'Data inizio', key: 'data_inizio', type: 'date' },
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo rapporto</label>
                  <select value={form.tipo_rapporto} onChange={(e) => setForm({ ...form, tipo_rapporto: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="volontario">Volontario</option>
                    <option value="cococo">Co.Co.Co.</option>
                    <option value="altro">Altro</option>
                  </select>
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

export default Staff;