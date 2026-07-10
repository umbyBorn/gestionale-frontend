import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getRendiconto } from '../services/api';

interface RigaCategoria { categoria: string; entrate: number; uscite: number; }
interface RigaMensile { mese: string; entrate: number; uscite: number; saldo: number; }
interface Rendiconto {
  periodo_da: string; periodo_a: string;
  totale_entrate: number; totale_uscite: number; saldo: number;
  per_categoria: RigaCategoria[]; per_mese: RigaMensile[];
}

const COLORI_CATEGORIA = ['#2563eb', '#7c3aed', '#059669', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#dc2626'];

const oggi = new Date();
const annoCorrente = oggi.getFullYear();

const Rendiconto: React.FC = () => {
  const [dati, setDati] = useState<Rendiconto | null>(null);
  const [loading, setLoading] = useState(true);
  const [anno, setAnno] = useState(annoCorrente);

  useEffect(() => {
    setLoading(true);
    getRendiconto(`${anno}-01-01`, `${anno}-12-31`).then(res => {
      setDati(res.data);
      setLoading(false);
    });
  }, [anno]);

  const meseLabel = (m: string) => {
    const [, mese] = m.split('-');
    const nomi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return nomi[parseInt(mese) - 1] || m;
  };

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📊 Rendiconto economico</h1>
            <p className="text-sm text-gray-500 mt-0.5">Bilancio entrate/uscite per periodo</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAnno(a => a - 1)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">←</button>
            <span className="font-bold text-gray-700 text-lg w-16 text-center">{anno}</span>
            <button onClick={() => setAnno(a => a + 1)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">→</button>
          </div>
        </div>

        {loading || !dati ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <>
            {/* RIEPILOGO */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-5 text-white shadow-sm">
                <p className="text-green-100 text-xs uppercase tracking-wide">Totale entrate</p>
                <p className="text-3xl font-bold mt-1">€ {dati.totale_entrate.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-5 text-white shadow-sm">
                <p className="text-red-100 text-xs uppercase tracking-wide">Totale uscite</p>
                <p className="text-3xl font-bold mt-1">€ {dati.totale_uscite.toFixed(2)}</p>
              </div>
              <div className={`rounded-2xl p-5 text-white shadow-sm bg-gradient-to-br ${dati.saldo >= 0 ? 'from-blue-600 to-blue-800' : 'from-gray-500 to-gray-700'}`}>
                <p className="text-blue-100 text-xs uppercase tracking-wide">Saldo {anno}</p>
                <p className="text-3xl font-bold mt-1">€ {dati.saldo.toFixed(2)}</p>
              </div>
            </div>

            {dati.per_mese.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-gray-500 font-medium">Nessun movimento registrato per il {anno}</p>
                <p className="text-gray-400 text-sm mt-1">Registra movimenti in Prima Nota per vedere qui l'andamento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* GRAFICO MENSILE */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
                  <h2 className="font-bold text-gray-800 mb-4">Andamento mensile</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dati.per_mese.map(m => ({ ...m, mese: meseLabel(m.mese) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => `€ ${Number(v).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="entrate" name="Entrate" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="uscite" name="Uscite" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* GRAFICO CATEGORIE */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h2 className="font-bold text-gray-800 mb-4">Per categoria</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={dati.per_categoria.map(c => ({ name: c.categoria, value: c.entrate + c.uscite }))}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={(e) => e.name}
                      >
                        {dati.per_categoria.map((_, i) => <Cell key={i} fill={COLORI_CATEGORIA[i % COLORI_CATEGORIA.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `€ ${Number(v).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {dati.per_categoria.map((c, i) => (
                      <div key={c.categoria} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORI_CATEGORIA[i % COLORI_CATEGORIA.length] }} />
                          <span className="text-gray-600">{c.categoria}</span>
                        </div>
                        <span className="font-medium text-gray-700">€ {(c.entrate + c.uscite).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TABELLA DETTAGLIO PER CATEGORIA */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Categoria</th>
                        <th className="px-4 py-3 text-right text-gray-500 font-medium">Entrate</th>
                        <th className="px-4 py-3 text-right text-gray-500 font-medium">Uscite</th>
                        <th className="px-4 py-3 text-right text-gray-500 font-medium">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dati.per_categoria.map((c, i) => (
                        <tr key={c.categoria} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                          <td className="px-4 py-3 font-medium text-gray-700">{c.categoria}</td>
                          <td className="px-4 py-3 text-right text-green-600">€ {c.entrate.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-red-500">€ {c.uscite.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">€ {(c.entrate - c.uscite).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Rendiconto;
