import React, { useEffect, useState } from 'react';
import { getGruppi, creaGruppo, aggiornaGruppo, eliminaGruppo, getTesseratiGruppo } from '../services/api';

interface Gruppo {
  id: number;
  nome: string;
  descrizione?: string;
  attivo: boolean;
}

interface Tesserato {
  id: number;
  nome: string;
  cognome: string;
  data_nascita?: string;
  categoria?: string;
  email?: string;
  telefono?: string;
  cellulare?: string;
  foto_url?: string;
}

const Gruppi: React.FC = () => {
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: '', descrizione: '' });
  const [gruppoSelezionato, setGruppoSelezionato] = useState<Gruppo | null>(null);
  const [tesseratiGruppo, setTesseratiGruppo] = useState<Tesserato[]>([]);
  const [loadingTesserati, setLoadingTesserati] = useState(false);

  const caricaGruppi = () => {
    getGruppi().then((res) => {
      setGruppi(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { caricaGruppi(); }, []);

  const apriDettaglioGruppo = async (g: Gruppo) => {
    setGruppoSelezionato(g);
    setLoadingTesserati(true);
    const res = await getTesseratiGruppo(g.id);
    setTesseratiGruppo(res.data);
    setLoadingTesserati(false);
  };

  const apriModifica = (g: Gruppo) => {
    setEditingId(g.id);
    setForm({ nome: g.nome, descrizione: g.descrizione || '' });
    setMostraForm(true);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await aggiornaGruppo(editingId, form);
    } else {
      await creaGruppo(form);
    }
    setMostraForm(false);
    setEditingId(null);
    setForm({ nome: '', descrizione: '' });
    caricaGruppi();
  };

  const handleElimina = async (id: number) => {
    if (window.confirm('Vuoi disattivare questo gruppo?')) {
      await eliminaGruppo(id);
      caricaGruppi();
    }
  };

  const eta = (dataNascita?: string) => {
    if (!dataNascita) return '-';
    const oggi = new Date();
    const nascita = new Date(dataNascita);
    return oggi.getFullYear() - nascita.getFullYear();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white hover:text-blue-200 text-sm">← Dashboard</a>
          <h1 className="text-xl font-bold">Gruppi</h1>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ nome: '', descrizione: '' }); setMostraForm(true); }}
          className="bg-white text-blue-800 px-4 py-1 rounded font-medium text-sm hover:bg-blue-50">
          + Nuovo gruppo
        </button>
      </header>

      <main className="p-6">
        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gruppi.map((g) => (
              <div key={g.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => apriDettaglioGruppo(g)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{g.nome}</h3>
                    <p className="text-sm text-gray-500 mt-1">{g.descrizione || 'Nessuna descrizione'}</p>
                  </div>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => apriModifica(g)} className="text-blue-600 hover:text-blue-800 text-xs">
                      Modifica
                    </button>
                    <button onClick={() => handleElimina(g.id)} className="text-red-500 hover:text-red-700 text-xs">
                      Disattiva
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-600 font-medium">
                  Clicca per vedere i tesserati del gruppo →
                </div>
              </div>
            ))}
            {gruppi.length === 0 && (
              <p className="text-gray-400 col-span-3">Nessun gruppo creato</p>
            )}
          </div>
        )}

        {/* FORM NUOVO/MODIFICA GRUPPO */}
        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Modifica Gruppo' : 'Nuovo Gruppo'}</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea value={form.descrizione}
                  onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3} />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annulla</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* DETTAGLIO GRUPPO CON LISTA TESSERATI */}
        {gruppoSelezionato && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{gruppoSelezionato.nome}</h2>
                  <p className="text-sm text-gray-500">{tesseratiGruppo.length} tesserati iscritti</p>
                </div>
                <button onClick={() => setGruppoSelezionato(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              <div className="overflow-y-auto flex-1">
                {loadingTesserati ? (
                  <p className="p-6 text-gray-500">Caricamento...</p>
                ) : tesseratiGruppo.length === 0 ? (
                  <p className="p-6 text-gray-400">Nessun tesserato iscritto a questo gruppo</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-600">Foto</th>
                        <th className="px-4 py-3 text-left text-gray-600">Nome</th>
                        <th className="px-4 py-3 text-left text-gray-600">Cognome</th>
                        <th className="px-4 py-3 text-left text-gray-600">Età</th>
                        <th className="px-4 py-3 text-left text-gray-600">Categoria</th>
                        <th className="px-4 py-3 text-left text-gray-600">Contatto</th>
                        <th className="px-4 py-3 text-left text-gray-600">Scheda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tesseratiGruppo.map((t, i) => (
                        <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2">
                            {t.foto_url
                              ? <img src={t.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                              : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{t.nome[0]}{t.cognome[0]}</div>
                            }
                          </td>
                          <td className="px-4 py-2 font-medium">{t.nome}</td>
                          <td className="px-4 py-2 font-medium">{t.cognome}</td>
                          <td className="px-4 py-2">{eta(t.data_nascita)} anni</td>
                          <td className="px-4 py-2">{t.categoria || '-'}</td>
                          <td className="px-4 py-2 text-xs">{t.cellulare || t.telefono || t.email || '-'}</td>
                          <td className="px-4 py-2">
                            <a href={`/tesserati?gruppo=${encodeURIComponent(gruppoSelezionato.nome)}`} className="text-blue-600 hover:text-blue-800 text-xs">
                              Vai alla scheda →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="px-6 py-3 border-t flex justify-between items-center">
                <span className="text-xs text-gray-400">Clicca "Vai alla scheda" per aprire la scheda completa del tesserato</span>
                <button onClick={() => setGruppoSelezionato(null)} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Chiudi</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Gruppi;
