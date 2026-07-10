import React, { useState } from 'react';
import { importaTesserati, importaStaff } from '../services/api';

interface RigaErrore { riga: number; errore: string; }
interface ImportResult { creati: number; saltati: number; errori: RigaErrore[]; }

type Tipo = 'tesserati' | 'staff';

const Importazione: React.FC = () => {
  const [tipo, setTipo] = useState<Tipo>('tesserati');
  const [file, setFile] = useState<File | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [risultato, setRisultato] = useState<ImportResult | null>(null);
  const [errore, setErrore] = useState('');

  const templateUrl = tipo === 'tesserati'
    ? '/templates/template_import_tesserati.xlsx'
    : '/templates/template_import_staff.xlsx';

  const handleUpload = async () => {
    if (!file) return;
    setCaricando(true);
    setErrore('');
    setRisultato(null);
    try {
      const fn = tipo === 'tesserati' ? importaTesserati : importaStaff;
      const res = await fn(file);
      setRisultato(res.data);
      setFile(null);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Errore sconosciuto durante l\'importazione';
      setErrore(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setCaricando(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Importazione da Excel/CSV</h1>
        <p className="text-gray-500 text-sm mb-6">
          Scarica il file di esempio, compilalo con i tuoi dati (una riga per persona) e poi caricalo qui sotto.
        </p>

        {/* SELEZIONE TIPO */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Cosa vuoi importare?</label>
          <div className="flex gap-2">
            <button
              onClick={() => { setTipo('tesserati'); setRisultato(null); setErrore(''); setFile(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${tipo === 'tesserati' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              👥 Tesserati
            </button>
            <button
              onClick={() => { setTipo('staff'); setRisultato(null); setErrore(''); setFile(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${tipo === 'staff' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              👨‍💼 Staff
            </button>
          </div>
        </div>

        {/* STEP 1: DOWNLOAD TEMPLATE */}
        <div className="bg-white rounded-lg shadow p-5 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">1️⃣</span>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800 mb-1">Scarica il file di esempio</h2>
              <p className="text-sm text-gray-500 mb-3">
                Il file Excel contiene le intestazioni corrette e una riga di esempio già compilata,
                da usare come guida per il formato dei dati (date, gruppo, sì/no, ecc.).
              </p>
              <a
                href={templateUrl}
                download
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                ⬇ Scarica template {tipo === 'tesserati' ? 'Tesserati' : 'Staff'} (.xlsx)
              </a>
            </div>
          </div>
        </div>

        {/* STEP 2: UPLOAD */}
        <div className="bg-white rounded-lg shadow p-5 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">2️⃣</span>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800 mb-1">Carica il file compilato</h2>
              <p className="text-sm text-gray-500 mb-3">
                Formati accettati: .xlsx, .xls, .csv. Le righe con codice fiscale già presente vengono saltate automaticamente.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="text-sm text-gray-600 flex-1"
                />
                <button
                  onClick={handleUpload}
                  disabled={!file || caricando}
                  className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {caricando ? 'Importazione in corso...' : '⬆ Importa file'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ERRORE GENERALE (es. colonne mancanti) */}
        {errore && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-sm">
            <strong>Impossibile completare l'importazione:</strong> {errore}
          </div>
        )}

        {/* RISULTATO */}
        {risultato && (
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Risultato importazione</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{risultato.creati}</p>
                <p className="text-xs text-green-700">Creati</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">{risultato.saltati}</p>
                <p className="text-xs text-gray-600">Saltati (già esistenti)</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{risultato.errori.length}</p>
                <p className="text-xs text-orange-600">Righe con avvisi/errori</p>
              </div>
            </div>

            {risultato.errori.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Dettaglio righe con problemi</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {risultato.errori.map((e, i) => (
                    <div key={i} className="flex gap-2 text-sm bg-orange-50 rounded px-3 py-2">
                      <span className="font-medium text-orange-700 whitespace-nowrap">Riga {e.riga}</span>
                      <span className="text-gray-600">{e.errore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  );
};

export default Importazione;
