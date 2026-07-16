import { useEffect, useState } from 'react';
import { getTesserati } from '../services/api';

interface Tesserato {
  id: number; nome: string; cognome: string; codice_fiscale: string;
  data_nascita: string; comune_residenza?: string; provincia_residenza?: string;
  e_socio: boolean; data_emissione_tessera?: string;
}

export default function LibroSoci() {
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [ricerca, setRicerca] = useState('');

  useEffect(() => {
    getTesserati().then(r => setTesserati(r.data)).finally(() => setCaricando(false));
  }, []);

  const soci = tesserati
    .filter(t => t.e_socio)
    .filter(t => !ricerca || `${t.cognome} ${t.nome}`.toLowerCase().includes(ricerca.toLowerCase()))
    .sort((a, b) => a.cognome.localeCompare(b.cognome));

  const esportaCSV = () => {
    const righe = [
      ['Cognome', 'Nome', 'Codice Fiscale', 'Data di nascita', 'Residenza', 'Socio dal'],
      ...soci.map(s => [
        s.cognome, s.nome, s.codice_fiscale, s.data_nascita,
        [s.comune_residenza, s.provincia_residenza].filter(Boolean).join(' ('.concat(s.provincia_residenza ? ')' : '')),
        s.data_emissione_tessera || ''
      ])
    ];
    const csv = righe.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'libro_soci.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Libro Soci</h1>
          <p className="text-sm text-gray-500 mt-0.5">Anagrafica dei tesserati con qualifica di socio ({soci.length} soci)</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text" placeholder="Cerca socio..." value={ricerca}
            onChange={e => setRicerca(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={esportaCSV} className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 transition">
            Esporta CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {caricando ? (
          <p className="text-gray-400 text-center py-8">Caricamento...</p>
        ) : soci.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nessun socio trovato</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Cognome e Nome</th>
                <th className="text-left px-4 py-3">Codice Fiscale</th>
                <th className="text-left px-4 py-3">Data di nascita</th>
                <th className="text-left px-4 py-3">Residenza</th>
              </tr>
            </thead>
            <tbody>
              {soci.map(s => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.cognome} {s.nome}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.codice_fiscale}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(s.data_nascita).toLocaleDateString('it-IT')}</td>
                  <td className="px-4 py-2.5 text-gray-500">{[s.comune_residenza, s.provincia_residenza].filter(Boolean).join(' — ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        La qualifica di socio si assegna/rimuove dalla scheda del singolo tesserato (campo "È socio").
      </p>
    </div>
  );
}
