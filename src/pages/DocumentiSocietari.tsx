import React, { useEffect, useState } from 'react';
import { getDocumentiSocietari, caricaDocumentoSocietario, eliminaDocumentoSocietario } from '../services/api';
import { formatDate } from '../utils/date';
import { useAuth } from '../context/AuthContext';

interface DocumentoSocietario {
  id: number; nome: string; categoria?: string; nome_file: string; url: string; data_caricamento: string; note?: string;
}

const CATEGORIE_SUGGERITE = ['Atto costitutivo', 'Statuto', 'Codice Fiscale', 'Verbale assemblea', 'Altro'];

const DocumentiSocietari: React.FC = () => {
  const { ruolo } = useAuth();
  const [documenti, setDocumenti] = useState<DocumentoSocietario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState<{ nome: string; categoria: string; note: string; file: File | null }>({ nome: '', categoria: '', note: '', file: null });
  const [caricando, setCaricando] = useState(false);

  const carica = () => {
    getDocumentiSocietari().then(res => { setDocumenti(res.data); setLoading(false); });
  };
  useEffect(() => { carica(); }, []);

  const handleCarica = async () => {
    if (!form.nome || !form.file) { alert('Inserisci un nome e seleziona un file'); return; }
    setCaricando(true);
    try {
      await caricaDocumentoSocietario(form.nome, form.file, form.categoria || undefined, form.note || undefined);
      setForm({ nome: '', categoria: '', note: '', file: null });
      setMostraForm(false);
      carica();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore nel caricamento del documento');
    } finally {
      setCaricando(false);
    }
  };

  const handleElimina = async (id: number, nome: string) => {
    if (!window.confirm(`Eliminare "${nome}"? L'operazione non può essere annullata.`)) return;
    await eliminaDocumentoSocietario(id);
    carica();
  };

  const isAdmin = ruolo === 'amministratore';

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📁 Documenti societari</h1>
            <p className="text-sm text-gray-500 mt-0.5">Atto costitutivo, statuto, codice fiscale e altri documenti dell'associazione</p>
          </div>
          {isAdmin && (
            <button onClick={() => setMostraForm(true)} className="bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition w-fit">
              + Carica documento
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : documenti.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">📁</p>
            <p className="text-gray-500 font-medium">Nessun documento societario caricato</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {documenti.map(d => (
              <div key={d.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-semibold text-gray-800">{d.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.categoria && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full mr-2">{d.categoria}</span>}
                    Caricato il {formatDate(d.data_caricamento)}
                  </p>
                  {d.note && <p className="text-xs text-gray-400 mt-1">{d.note}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <a href={d.url} target="_blank" rel="noreferrer" download={d.nome_file} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    📄 Apri
                  </a>
                  {isAdmin && (
                    <button onClick={() => handleElimina(d.id, d.nome)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                      Elimina
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Carica documento societario</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome documento</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    placeholder="Es. Atto costitutivo 1980" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <input type="text" list="categorie-societarie" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  <datalist id="categorie-societarie">
                    {CATEGORIE_SUGGERITE.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
                    className="w-full text-sm text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                  <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCarica} disabled={caricando} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800 disabled:opacity-50">
                  {caricando ? 'Caricamento...' : 'Carica'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DocumentiSocietari;
