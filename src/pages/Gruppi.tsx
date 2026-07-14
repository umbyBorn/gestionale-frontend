import React, { useEffect, useState } from 'react';
import {
  getGruppi, creaGruppo, aggiornaGruppo, eliminaGruppo, getTesseratiGruppo,
  getTesserati, getTesseratiIdsGruppo, aggiungiTesseratoAGruppo, rimuoviTesseratoDaGruppo,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Gruppo {
  id: number;
  nome: string;
  descrizione?: string;
  attivo: boolean;
  num_tesserati?: number;
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

// Palette di gradienti che ruota per ogni card, in linea con il tema del portale tesserato
const GRADIENTI = [
  'from-blue-600 to-blue-800',
  'from-purple-600 to-purple-800',
  'from-emerald-600 to-emerald-800',
  'from-orange-500 to-orange-700',
  'from-rose-500 to-rose-700',
  'from-indigo-600 to-indigo-800',
  'from-cyan-600 to-cyan-800',
  'from-fuchsia-600 to-fuchsia-800',
];

const Gruppi: React.FC = () => {
  const { ruolo } = useAuth();
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: '', descrizione: '' });
  const [gruppoSelezionato, setGruppoSelezionato] = useState<Gruppo | null>(null);
  const [tesseratiGruppo, setTesseratiGruppo] = useState<Tesserato[]>([]);
  const [loadingTesserati, setLoadingTesserati] = useState(false);
  const [ordinamento, setOrdinamento] = useState<{ campo: 'nome' | 'cognome' | 'eta'; direzione: 'asc' | 'desc' }>({ campo: 'cognome', direzione: 'asc' });

  // Pannello "Aggiungi tesserati"
  const [mostraAggiungi, setMostraAggiungi] = useState(false);
  const [tuttiTesserati, setTuttiTesserati] = useState<Tesserato[]>([]);
  const [idsNelGruppo, setIdsNelGruppo] = useState<number[]>([]);
  const [ricercaTesserato, setRicercaTesserato] = useState('');
  const [ordinamentoAggiungi, setOrdinamentoAggiungi] = useState<{ campo: 'nome' | 'cognome' | 'eta'; direzione: 'asc' | 'desc' }>({ campo: 'cognome', direzione: 'asc' });
  const [operazioneInCorsoId, setOperazioneInCorsoId] = useState<number | null>(null);

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

  const apriNuovo = () => {
    setEditingId(null);
    setForm({ nome: '', descrizione: '' });
    setMostraForm(true);
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

  const handleEliminaDaModifica = async () => {
    if (!editingId) return;
    const gruppoCorrente = gruppi.find(g => g.id === editingId);
    const nTesserati = gruppoCorrente?.num_tesserati ?? 0;
    if (!window.confirm(
      `Stai per eliminare il gruppo "${gruppoCorrente?.nome}".\n\n` +
      `⚠️ I ${nTesserati} tesserati attualmente in questo gruppo NON verranno eliminati: ` +
      `resteranno regolarmente tesserati, verranno solo scollegati da questo gruppo.\n\n` +
      `Vuoi continuare?`
    )) return;
    await eliminaGruppo(editingId);
    setMostraForm(false);
    setEditingId(null);
    setForm({ nome: '', descrizione: '' });
    caricaGruppi();
  };

  const eta = (dataNascita?: string) => {
    if (!dataNascita) return '-';
    const oggi = new Date();
    const nascita = new Date(dataNascita);
    let anni = oggi.getFullYear() - nascita.getFullYear();
    const nonAncoraCompleanno =
      oggi.getMonth() < nascita.getMonth() ||
      (oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate());
    if (nonAncoraCompleanno) anni -= 1;
    return anni;
  };

  const cambiaOrdinamento = (campo: 'nome' | 'cognome' | 'eta', corrente: typeof ordinamento, setter: (o: any) => void) => {
    if (corrente.campo === campo) setter({ campo, direzione: corrente.direzione === 'asc' ? 'desc' : 'asc' });
    else setter({ campo, direzione: 'asc' });
  };

  const ordina = <T extends Tesserato>(lista: T[], ord: typeof ordinamento): T[] => {
    const copia = [...lista];
    copia.sort((a, b) => {
      let cmp = 0;
      if (ord.campo === 'eta') {
        const ea = typeof eta(a.data_nascita) === 'number' ? (eta(a.data_nascita) as number) : -1;
        const eb = typeof eta(b.data_nascita) === 'number' ? (eta(b.data_nascita) as number) : -1;
        cmp = ea - eb;
      } else {
        cmp = (a[ord.campo] || '').localeCompare(b[ord.campo] || '');
      }
      return ord.direzione === 'asc' ? cmp : -cmp;
    });
    return copia;
  };

  const apriAggiungiTesserati = async () => {
    setMostraAggiungi(true);
    setRicercaTesserato('');
    const [tutti, ids] = await Promise.all([getTesserati(), getTesseratiIdsGruppo(gruppoSelezionato!.id)]);
    setTuttiTesserati(tutti.data);
    setIdsNelGruppo(ids.data);
  };

  const handleToggleTesserato = async (tesseratoId: number, presente: boolean) => {
    if (!gruppoSelezionato) return;
    setOperazioneInCorsoId(tesseratoId);
    try {
      if (presente) {
        await rimuoviTesseratoDaGruppo(gruppoSelezionato.id, tesseratoId);
        setIdsNelGruppo(ids => ids.filter(id => id !== tesseratoId));
      } else {
        await aggiungiTesseratoAGruppo(gruppoSelezionato.id, tesseratoId);
        setIdsNelGruppo(ids => [...ids, tesseratoId]);
      }
      // Ricarica la lista membri e il conteggio nella card, senza chiudere il pannello
      const res = await getTesseratiGruppo(gruppoSelezionato.id);
      setTesseratiGruppo(res.data);
      caricaGruppi();
    } finally {
      setOperazioneInCorsoId(null);
    }
  };

  const tesseratiFiltratiPerAggiunta = ordina(
    tuttiTesserati.filter(t => {
      if (!ricercaTesserato.trim()) return true;
      const q = ricercaTesserato.toLowerCase();
      return t.nome.toLowerCase().includes(q) || t.cognome.toLowerCase().includes(q);
    }),
    ordinamentoAggiungi
  );

  const totaleTesserati = gruppi.reduce((acc, g) => acc + (g.num_tesserati || 0), 0);

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Gruppi</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {gruppi.length} {gruppi.length === 1 ? 'gruppo' : 'gruppi'} · {totaleTesserati} tesserati totali
            </p>
          </div>
          <button
            onClick={apriNuovo}
            className="bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition shadow-sm w-fit"
          >
            + Nuovo gruppo
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gruppi.map((g, i) => {
              const gradiente = GRADIENTI[i % GRADIENTI.length];
              return (
                <div
                  key={g.id}
                  onClick={() => apriDettaglioGruppo(g)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer overflow-hidden group"
                >
                  {/* HEADER GRADIENTE */}
                  <div className={`bg-gradient-to-r ${gradiente} px-4 py-4 flex items-center justify-between`}>
                    <h3 className="font-bold text-white text-lg truncate pr-2">{g.nome}</h3>
                    <div className="bg-white/20 backdrop-blur-sm text-white text-sm font-bold px-3 py-1 rounded-full flex-shrink-0 flex items-center gap-1">
                      <span>👥</span>
                      <span>{g.num_tesserati ?? 0}</span>
                    </div>
                  </div>

                  {/* CORPO */}
                  <div className="p-4">
                    <p className="text-sm text-gray-500 mb-4 min-h-[20px] line-clamp-2">
                      {g.descrizione || 'Nessuna descrizione'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600 font-semibold group-hover:underline">
                        Vedi tesserati →
                      </span>
                      <div className="flex gap-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => apriModifica(g)} className="text-gray-400 hover:text-blue-600 text-xs font-medium transition">
                          Modifica
                        </button>
                        <button onClick={() => handleElimina(g.id)} className="text-gray-400 hover:text-red-500 text-xs font-medium transition">
                          Disattiva
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {gruppi.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-gray-500 font-medium">Nessun gruppo creato</p>
                <p className="text-gray-400 text-sm mt-1">Crea il primo gruppo per iniziare a organizzare i tesserati</p>
              </div>
            )}
          </div>
        )}

        {/* FORM NUOVO/MODIFICA GRUPPO */}
        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Modifica Gruppo' : 'Nuovo Gruppo'}</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea value={form.descrizione}
                  onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3} />
              </div>
              <div className="flex items-center justify-between gap-3">
                {editingId && ruolo === 'amministratore' ? (
                  <button onClick={handleEliminaDaModifica} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium">
                    🗑 Elimina gruppo
                  </button>
                ) : <span />}
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annulla</button>
                  <button onClick={handleSubmit} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition">Salva</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DETTAGLIO GRUPPO CON LISTA TESSERATI */}
        {gruppoSelezionato && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className={`px-6 py-5 bg-gradient-to-r ${GRADIENTI[gruppi.findIndex(g => g.id === gruppoSelezionato.id) % GRADIENTI.length]} flex justify-between items-center`}>
                <div>
                  <h2 className="text-lg font-bold text-white">{gruppoSelezionato.nome}</h2>
                  <p className="text-sm text-white/80">{tesseratiGruppo.length} tesserati iscritti</p>
                </div>
                <button onClick={() => setGruppoSelezionato(null)} className="text-white/80 hover:text-white text-xl">✕</button>
              </div>

              <div className="px-6 py-3 border-b flex justify-end">
                <button onClick={apriAggiungiTesserati} className="bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-800">
                  + Aggiungi tesserati
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {loadingTesserati ? (
                  <p className="p-6 text-gray-500">Caricamento...</p>
                ) : tesseratiGruppo.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-3xl mb-2">🗂️</p>
                    <p className="text-gray-400">Nessun tesserato iscritto a questo gruppo</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-600">Foto</th>
                        <th className="px-4 py-3 text-left text-gray-600 cursor-pointer select-none" onClick={() => cambiaOrdinamento('nome', ordinamento, setOrdinamento)}>
                          Nome {ordinamento.campo === 'nome' && (ordinamento.direzione === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 cursor-pointer select-none" onClick={() => cambiaOrdinamento('cognome', ordinamento, setOrdinamento)}>
                          Cognome {ordinamento.campo === 'cognome' && (ordinamento.direzione === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 cursor-pointer select-none" onClick={() => cambiaOrdinamento('eta', ordinamento, setOrdinamento)}>
                          Età {ordinamento.campo === 'eta' && (ordinamento.direzione === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600">Categoria</th>
                        <th className="px-4 py-3 text-left text-gray-600">Contatto</th>
                        <th className="px-4 py-3 text-left text-gray-600">Scheda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordina(tesseratiGruppo, ordinamento).map((t, i) => (
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
                            <div className="flex items-center gap-3">
                              <a href={`/tesserati?gruppo=${encodeURIComponent(gruppoSelezionato.nome)}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                Vai alla scheda →
                              </a>
                              <button onClick={() => handleToggleTesserato(t.id, true)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                                Rimuovi
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="px-6 py-3 border-t flex justify-between items-center bg-gray-50">
                <span className="text-xs text-gray-400">Clicca "Vai alla scheda" per aprire la scheda completa del tesserato</span>
                <button onClick={() => setGruppoSelezionato(null)} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition">Chiudi</button>
              </div>
            </div>
          </div>
        )}

        {/* PANNELLO AGGIUNGI TESSERATI: lista completa filtrabile e ordinabile */}
        {mostraAggiungi && gruppoSelezionato && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Aggiungi tesserati a "{gruppoSelezionato.nome}"</h3>
                <button onClick={() => setMostraAggiungi(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
              </div>

              <div className="px-6 py-3 border-b flex flex-col sm:flex-row gap-2">
                <input
                  type="text" placeholder="Cerca per nome o cognome..."
                  value={ricercaTesserato} onChange={e => setRicercaTesserato(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={`${ordinamentoAggiungi.campo}-${ordinamentoAggiungi.direzione}`}
                  onChange={e => {
                    const [campo, direzione] = e.target.value.split('-') as ['nome' | 'cognome' | 'eta', 'asc' | 'desc'];
                    setOrdinamentoAggiungi({ campo, direzione });
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="cognome-asc">Cognome A→Z</option>
                  <option value="cognome-desc">Cognome Z→A</option>
                  <option value="nome-asc">Nome A→Z</option>
                  <option value="nome-desc">Nome Z→A</option>
                  <option value="eta-asc">Età crescente</option>
                  <option value="eta-desc">Età decrescente</option>
                </select>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                {tesseratiFiltratiPerAggiunta.length === 0 ? (
                  <p className="p-6 text-gray-400 text-sm text-center">Nessun tesserato trovato</p>
                ) : tesseratiFiltratiPerAggiunta.map(t => {
                  const presente = idsNelGruppo.includes(t.id);
                  return (
                    <div key={t.id} className="flex items-center justify-between px-6 py-2.5">
                      <div className="flex items-center gap-3">
                        {t.foto_url
                          ? <img src={t.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{t.nome[0]}{t.cognome[0]}</div>
                        }
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.cognome} {t.nome}</p>
                          <p className="text-xs text-gray-500">{eta(t.data_nascita)} anni {t.categoria ? `· ${t.categoria}` : ''}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleTesserato(t.id, presente)}
                        disabled={operazioneInCorsoId === t.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                          presente ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-700 text-white hover:bg-blue-800'
                        }`}
                      >
                        {operazioneInCorsoId === t.id ? '...' : presente ? 'Rimuovi' : '+ Aggiungi'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
                <button onClick={() => setMostraAggiungi(false)} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition">
                  Fatto
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Gruppi;
