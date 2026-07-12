import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTesserati, getGruppi, getPagamentiScaduti, getStaff, getEventi, getMessaggiInviati } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/date';

interface Stat {
  label: string;
  valore: number | string;
  icona: string;
  colore: string;
  path: string;
  delta?: string;
}

interface Evento {
  id: number;
  titolo: string;
  data: string;
  tipo: string;
  ora_inizio?: string;
  luogo?: string;
}

interface Pagamento {
  id: number;
  importo: number;
  data_scadenza: string;
  pagato: boolean;
  tesserato_id: number;
}

interface Messaggio {
  id: number;
  intestazione: string;
  data_invio: string;
  num_destinatari: number;
}

const TIPO_COLORE: Record<string, string> = {
  allenamento: 'bg-blue-100 text-blue-700',
  partita: 'bg-red-100 text-red-700',
  raduno: 'bg-green-100 text-green-700',
  altro: 'bg-gray-100 text-gray-600',
};

const Dashboard: React.FC = () => {
  const { utente, ruolo } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([]);
  const [prossimiEventi, setProssimiEventi] = useState<Evento[]>([]);
  const [pagamentiScaduti, setPagamentiScaduti] = useState<Pagamento[]>([]);
  const [ultimiMessaggi, setUltimiMessaggi] = useState<Messaggio[]>([]);

  const ora = new Date().getHours();
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const oggi = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      getTesserati(),
      getGruppi(),
      getPagamentiScaduti(),
      getStaff(),
      getEventi(),
      getMessaggiInviati(),
    ]).then(([t, g, p, s, e, m]) => {
      setStats([
        {
          label: 'Tesserati attivi',
          valore: t.data.length,
          icona: '👥',
          colore: 'from-blue-500 to-blue-600',
          path: '/tesserati',
        },
        {
          label: 'Gruppi',
          valore: g.data.length,
          icona: '🏷️',
          colore: 'from-green-500 to-green-600',
          path: '/gruppi',
        },
        {
          label: 'Pagamenti scaduti',
          valore: p.data.length,
          icona: '⚠️',
          colore: p.data.length > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500',
          path: '/pagamenti',
        },
        {
          label: 'Staff',
          valore: s.data.length,
          icona: '👨‍💼',
          colore: 'from-purple-500 to-purple-600',
          path: '/staff',
        },
      ]);

      // Prossimi eventi (da oggi in poi, max 5)
      const futuri = e.data
        .filter((ev: Evento) => ev.data >= oggi)
        .sort((a: Evento, b: Evento) => a.data.localeCompare(b.data))
        .slice(0, 5);
      setProssimiEventi(futuri);

      setPagamentiScaduti(p.data.slice(0, 5));
      setUltimiMessaggi(m.data.slice(0, 3));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const formatData = (dataStr: string) => {
    const d = new Date(dataStr + 'T12:00:00');
    const diffGiorni = Math.ceil((d.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
    if (diffGiorni === 0) return 'Oggi';
    if (diffGiorni === 1) return 'Domani';
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Caricamento dashboard...</div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">

      {/* INTESTAZIONE */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {saluto}, {utente?.email?.split('@')[0]} 👋
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium capitalize">
          {ruolo}
        </span>
      </div>

      {/* STATISTICHE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.path)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.colore} flex items-center justify-center text-lg shadow-sm`}>
                {s.icona}
              </div>
              <span className="text-xs text-gray-400 group-hover:text-blue-500 transition">→</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{s.valore}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* RIGA CENTRALE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PROSSIMI EVENTI */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">📅 Prossimi eventi</h3>
            <button onClick={() => navigate('/calendario')} className="text-xs text-blue-600 hover:text-blue-800">
              Vedi tutti →
            </button>
          </div>
          {prossimiEventi.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300 text-3xl mb-2">📭</p>
              <p className="text-gray-400 text-sm">Nessun evento in programma</p>
              <button onClick={() => navigate('/presenze')} className="mt-3 text-xs text-blue-600 hover:underline">
                + Crea evento
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {prossimiEventi.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-xs text-gray-400 leading-none">
                      {new Date(e.data + 'T12:00:00').toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
                    </p>
                    <p className="text-xl font-bold text-gray-800 leading-none">
                      {new Date(e.data + 'T12:00:00').getDate()}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.titolo}</p>
                    <p className="text-xs text-gray-400">
                      {e.ora_inizio ? e.ora_inizio.substring(0,5) : ''}
                      {e.luogo ? ` · ${e.luogo}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${TIPO_COLORE[e.tipo] || 'bg-gray-100 text-gray-600'}`}>
                    {e.tipo}
                  </span>
                  <span className={`text-xs font-medium flex-shrink-0 ${
                    formatData(e.data) === 'Oggi' ? 'text-green-600' :
                    formatData(e.data) === 'Domani' ? 'text-orange-500' : 'text-gray-400'
                  }`}>
                    {formatData(e.data)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PAGAMENTI SCADUTI */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">💳 Pagamenti scaduti</h3>
            <button onClick={() => navigate('/pagamenti')} className="text-xs text-blue-600 hover:text-blue-800">
              Vedi tutti →
            </button>
          </div>
          {pagamentiScaduti.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300 text-3xl mb-2">✅</p>
              <p className="text-gray-400 text-sm">Nessun pagamento scaduto</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pagamentiScaduti.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                  <div>
                    <p className="text-xs text-gray-500">Scad. {formatDate(p.data_scadenza)}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">€ {p.importo.toFixed(2)}</span>
                </div>
              ))}
              {pagamentiScaduti.length > 0 && (
                <div className="pt-2 border-t border-gray-100 text-center">
                  <p className="text-xs text-red-500 font-medium">
                    Totale: € {pagamentiScaduti.reduce((acc, p) => acc + p.importo, 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ULTIMI MESSAGGI */}
      {ultimiMessaggi.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">📢 Ultimi messaggi inviati</h3>
            <button onClick={() => navigate('/messaggi')} className="text-xs text-blue-600 hover:text-blue-800">
              Vai ai messaggi →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ultimiMessaggi.map(m => (
              <div key={m.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-sm font-medium text-gray-800 truncate">{m.intestazione}</p>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-xs text-gray-400">
                    {new Date(m.data_invio).toLocaleDateString('it-IT')}
                  </span>
                  <span className="text-xs text-blue-600">
                    {m.num_destinatari} dest.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACCESSO RAPIDO */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-5 text-white">
        <h3 className="font-semibold mb-3">⚡ Azioni rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Nuovo tesserato', icona: '➕', path: '/tesserati' },
            { label: 'Registra presenza', icona: '✅', path: '/presenze' },
            { label: 'Invia messaggio', icona: '📢', path: '/messaggi' },
            { label: 'Nuovo pagamento', icona: '💰', path: '/pagamenti' },
          ].map(a => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2.5 text-sm font-medium transition"
            >
              <span>{a.icona}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
