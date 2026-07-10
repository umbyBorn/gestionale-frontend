import React, { useEffect, useState } from 'react';
import { getMovimenti, creaMovimento, aggiornaMovimento, eliminaMovimento } from '../services/api';

interface Movimento {
  id: number;
  tipo: 'entrata' | 'uscita';
  data: string;
  importo: number;
  descrizione: string;
  categoria?: string;
  centro_costo?: string;
  intestatario?: string;
  note?: string;
  pagamento_id?: number;
}

const CATEGORIE_SUGGERITE = [
  'Quote associative', 'Pagamenti vari', 'Compensi staff', 'Attrezzatura',
  'Affitto struttura', 'Assicurazioni', 'Utenze', 'Materiale sportivo', 'Trasporti', 'Altro',
];

const formVuoto = {
  tipo: 'entrata' as 'entrata' | 'uscita',
  data: new Date().toISOString().split('T')[0],
  importo: 0,
  descrizione: '',
  categoria: '',
  centro_costo: '',
  intestatario: '',
  note: '',
};

const PrimaNota: React.FC = () => {
  const [movimenti, setMovimenti] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formVuoto);
  const [filtroTipo, setFiltroTipo] = useState<'tutti' | 'entrata' | 'uscita'>('tutti');
  const [filtroMese, setFiltroMese] = useState('');
  const [errore, setErrore] = useState('');

  const carica = () => {
    setLoading(true);
    getMovimenti().then(res => { setMovimenti(res.data); setLoading(false); });
  };

  useEffect(() => { carica(); }, []);

  const apriNuovo = (tipo: 'entrata' | 'uscita') => {
    setEditingId(null);
    setForm({ ...formVuoto, tipo });
    setMostraForm(true);
    setErrore('');
  };

  const apriModifica = (m: Movimento) => {
    if (m.pagamento_id) {
      alert('Questo movimento è generato automaticamente da un incasso pagamento e non è modificabile qui. Modifica il pagamento collegato dalla sezione Contabilità.');
      return;
    }
    setEditingId(m.id);
    setForm({
      tipo: m.tipo, data: m.data, importo: m.importo, descrizione: m.descrizione,
      categoria: m.categoria || '', centro_costo: m.centro_costo || '',
      intestatario: m.intestatario || '', note: m.note || '',
    });
    setMostraForm(true);
    setErrore('');
  };

  const handleSubmit = async () => {
    try {
      if (editingId) await aggiornaMovimento(editingId, form);
      else await creaMovimento(form);
      setMostraForm(false);
      carica();
    } catch (e: any) {
      setErrore(e?.response?.data?.detail || 'Errore nel salvataggio');
    }
  };

  const handleElimina = async (m: Movimento) => {
    if (m.pagamento_id) {
      alert('Non puoi eliminare da qui un movimento generato automaticamente da un pagamento.');
      return;
    }
    if (window.confirm('Eliminare questo movimento?')) {
      await eliminaMovimento(m.id);
      carica();
    }
  };

  const filtrati = movimenti.filter(m => {
    if (filtroTipo !== 'tutti' && m.tipo !== filtroTipo) return false;
    if (filtroMese && !m.data.startsWith(filtroMese)) return false;
    return true;
  });

  const totaleEntrate = filtrati.filter(m => m.tipo === 'entrata').reduce((a, m) => a + Number(m.importo), 0);
  const totaleUscite = filtrati.filter(m => m.tipo === 'uscita').reduce((a, m) => a + Number(m.importo), 0);

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-5xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📒 Prima Nota</h1>
            <p className="text-sm text-gray-500 mt-0.5">Registro di tutte le entrate e uscite dell'associazione</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => apriNuovo('entrata')} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition">
              + Entrata
            </button>
            <button onClick={() => apriNuovo('uscita')} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition">
              + Uscita
            </button>
          </div>
        </div>

        {/* RIEPILOGO */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-4 text-white shadow-sm">
            <p className="text-green-100 text-xs uppercase tracking-wide">Entrate</p>
            <p className="text-2xl font-bold mt-1">€ {totaleEntrate.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-4 text-white shadow-sm">
            <p className="text-red-100 text-xs uppercase tracking-wide">Uscite</p>
            <p className="text-2xl font-bold mt-1">€ {totaleUscite.toFixed(2)}</p>
          </div>
          <div className={`rounded-2xl p-4 text-white shadow-sm bg-gradient-to-br ${totaleEntrate - totaleUscite >= 0 ? 'from-blue-600 to-blue-800' : 'from-gray-500 to-gray-700'}`}>
            <p className="text-blue-100 text-xs uppercase tracking-wide">Saldo periodo</p>
            <p className="text-2xl font-bold mt-1">€ {(totaleEntrate - totaleUscite).toFixed(2)}</p>
          </div>
        </div>

        {/* FILTRI */}
        <div className="flex flex-wrap gap-3 mb-4">
          {(['tutti', 'entrata', 'uscita'] as const).map(f => (
            <button key={f} onClick={() => setFiltroTipo(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium ${filtroTipo === f ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {f === 'tutti' ? 'Tutti' : f === 'entrata' ? 'Entrate' : 'Uscite'}
            </button>
          ))}
          <input type="month" value={filtroMese} onChange={e => setFiltroMese(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
          {filtroMese && (
            <button onClick={() => setFiltroMese('')} className="text-xs text-gray-400 hover:text-gray-600">✕ rimuovi filtro mese</button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Data</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Descrizione</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Importo</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="px-4 py-3">{m.data}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {m.descrizione}
                      {m.pagamento_id && <span className="ml-2 text-xs text-gray-400">(da incasso)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.categoria || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.tipo === 'entrata' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {m.tipo === 'entrata' ? 'Entrata' : 'Uscita'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${m.tipo === 'entrata' ? 'text-green-600' : 'text-red-500'}`}>
                      {m.tipo === 'entrata' ? '+' : '-'}€ {Number(m.importo).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => apriModifica(m)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Modifica</button>
                        <button onClick={() => handleElimina(m)} className="text-red-500 hover:text-red-700 text-xs font-medium">Elimina</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrati.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Nessun movimento registrato</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* FORM MOVIMENTO */}
        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {editingId ? 'Modifica movimento' : form.tipo === 'entrata' ? 'Nuova entrata' : 'Nuova uscita'}
              </h2>
              {errore && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 mb-3">{errore}</div>}

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <input type="text" value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                  <input type="number" value={form.importo} onChange={e => setForm({ ...form, importo: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input type="text" list="categorie-suggerite" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <datalist id="categorie-suggerite">
                  {CATEGORIE_SUGGERITE.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Centro di costo</label>
                  <input type="text" value={form.centro_costo} onChange={e => setForm({ ...form, centro_costo: e.target.value })}
                    placeholder="Es. Under 14" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intestatario</label>
                  <input type="text" value={form.intestatario} onChange={e => setForm({ ...form, intestatario: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PrimaNota;
