import React, { useEffect, useState } from 'react';
import { getPagamenti, creaPagamento, getTariffe, creaTariffa, getTesserati, registraIncasso } from '../services/api';

interface Pagamento {
  id: number;
  tesserato_id: number;
  tariffa_id: number;
  importo: number;
  data_scadenza: string;
  data_pagamento?: string;
  metodo?: string;
  pagato: boolean;
}

interface Tariffa {
  id: number;
  nome: string;
  importo: number;
  categoria?: string;
}

interface Tesserato {
  id: number;
  nome: string;
  cognome: string;
}

const Pagamenti: React.FC = () => {
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([]);
  const [tariffe, setTariffe] = useState<Tariffa[]>([]);
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraFormPagamento, setMostraFormPagamento] = useState(false);
  const [mostraFormTariffa, setMostraFormTariffa] = useState(false);
  const [filtro, setFiltro] = useState<'tutti' | 'pagati' | 'scaduti'>('tutti');
  const [formPagamento, setFormPagamento] = useState({
    tesserato_id: 0, tariffa_id: 0, importo: 0, data_scadenza: '', pagato: false
  });
  const [formTariffa, setFormTariffa] = useState({ nome: '', importo: 0, categoria: '' });

  const carica = () => {
    Promise.all([getPagamenti(), getTariffe(), getTesserati()]).then(([p, t, ts]) => {
      setPagamenti(p.data);
      setTariffe(t.data);
      setTesserati(ts.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const handleCreaPagamento = async () => {
    await creaPagamento(formPagamento);
    setMostraFormPagamento(false);
    setFormPagamento({ tesserato_id: 0, tariffa_id: 0, importo: 0, data_scadenza: '', pagato: false });
    carica();
  };

  const handleCreaTariffa = async () => {
    await creaTariffa(formTariffa);
    setMostraFormTariffa(false);
    setFormTariffa({ nome: '', importo: 0, categoria: '' });
    carica();
  };

  const handleIncasso = async (id: number) => {
    const metodo = window.prompt('Metodo di pagamento (contanti / bonifico / altro):');
    if (metodo && ['contanti', 'bonifico', 'altro'].includes(metodo)) {
      await registraIncasso(id, metodo);
      carica();
    }
  };

  const nomeTesserato = (id: number) => {
    const t = tesserati.find((t) => t.id === id);
    return t ? `${t.nome} ${t.cognome}` : `ID ${id}`;
  };

  const nomeTariffa = (id: number) => {
    const t = tariffe.find((t) => t.id === id);
    return t ? t.nome : `ID ${id}`;
  };

  const oggi = new Date().toISOString().split('T')[0];

  const filtrati = pagamenti.filter((p) => {
    if (filtro === 'pagati') return p.pagato;
    if (filtro === 'scaduti') return !p.pagato && p.data_scadenza < oggi;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white hover:text-blue-200 text-sm">← Dashboard</a>
          <h1 className="text-xl font-bold">Pagamenti</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMostraFormTariffa(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-500">
            + Tariffa
          </button>
          <button onClick={() => setMostraFormPagamento(true)} className="bg-white text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-50">
            + Pagamento
          </button>
        </div>
      </header>
      <main className="p-6">
        <div className="flex gap-2 mb-6">
          {(['tutti', 'scaduti', 'pagati'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1 rounded text-sm font-medium ${filtro === f ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Tesserato</th>
                  <th className="px-4 py-3 text-left">Tariffa</th>
                  <th className="px-4 py-3 text-left">Importo</th>
                  <th className="px-4 py-3 text-left">Scadenza</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">{nomeTesserato(p.tesserato_id)}</td>
                    <td className="px-4 py-3">{nomeTariffa(p.tariffa_id)}</td>
                    <td className="px-4 py-3">€ {p.importo}</td>
                    <td className="px-4 py-3">{p.data_scadenza}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        p.pagato ? 'bg-green-100 text-green-700' :
                        p.data_scadenza < oggi ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.pagato ? 'Pagato' : p.data_scadenza < oggi ? 'Scaduto' : 'In attesa'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!p.pagato && (
                        <button onClick={() => handleIncasso(p.id)} className="text-green-600 hover:text-green-800 text-xs">
                          Registra incasso
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtrati.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessun pagamento trovato</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {mostraFormTariffa && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuova Tariffa</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={formTariffa.nome} onChange={(e) => setFormTariffa({ ...formTariffa, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" value={formTariffa.importo} onChange={(e) => setFormTariffa({ ...formTariffa, importo: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input type="text" value={formTariffa.categoria} onChange={(e) => setFormTariffa({ ...formTariffa, categoria: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraFormTariffa(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaTariffa} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}

        {mostraFormPagamento && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo Pagamento</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tesserato</label>
                <select value={formPagamento.tesserato_id} onChange={(e) => setFormPagamento({ ...formPagamento, tesserato_id: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>Seleziona tesserato</option>
                  {tesserati.map((t) => <option key={t.id} value={t.id}>{t.nome} {t.cognome}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tariffa</label>
                <select value={formPagamento.tariffa_id} onChange={(e) => {
                  const tariffa = tariffe.find(t => t.id === parseInt(e.target.value));
                  setFormPagamento({ ...formPagamento, tariffa_id: parseInt(e.target.value), importo: tariffa?.importo || 0 });
                }} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>Seleziona tariffa</option>
                  {tariffe.map((t) => <option key={t.id} value={t.id}>{t.nome} — €{t.importo}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" value={formPagamento.importo} onChange={(e) => setFormPagamento({ ...formPagamento, importo: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data scadenza</label>
                <input type="date" value={formPagamento.data_scadenza} onChange={(e) => setFormPagamento({ ...formPagamento, data_scadenza: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraFormPagamento(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaPagamento} className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Pagamenti;