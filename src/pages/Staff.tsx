import React, { useEffect, useState } from 'react';
import { formatDate } from '../utils/date';
import {
  getStaff, creaStaff, aggiornaStaff, eliminaStaff,
  getGruppiStaff, aggiornaGruppiStaff, getGruppi,
  getCompensiStaff, creaCompenso, eliminaCompenso,
  getContrattiStaff, creaContratto, eliminaContratto,
  getTesserati, caricaModuloSocio, scaricaModuloAdesionePdf, scaricaTesseraPdf, getTabulatoTessere,
} from '../services/api';

interface Membro {
  id: number; nome: string; cognome: string; data_nascita: string; codice_fiscale: string;
  indirizzo?: string; comune_residenza?: string;
  telefono?: string; email?: string; ruolo: string; tipo_rapporto: string; data_inizio: string; attivo: boolean;
  numero_tessera?: number; data_emissione_tessera?: string; quota_associativa?: number; quota_pagata?: boolean;
  path_modulo_firmato?: string;
}
interface TesseratoBase { id: number; nome: string; cognome: string; data_nascita: string; codice_fiscale?: string; indirizzo?: string; comune_residenza?: string; }
interface Compenso { id: number; staff_id: number; importo: number; data_erogazione: string; descrizione?: string; totale_progressivo: number; soglia_superata: boolean; }
interface Contratto { id: number; staff_id: number; tipo: string; data_inizio: string; data_fine?: string; importo: number; firmato: boolean; }
interface Gruppo { id: number; nome: string; }

const TIPO_LABEL: Record<string, string> = { volontario: 'Volontario', cococo: 'Co.Co.Co.', altro: 'Altro' };
const TIPO_COLORE: Record<string, string> = {
  volontario: 'bg-blue-100 text-blue-700',
  cococo: 'bg-purple-100 text-purple-700',
  altro: 'bg-gray-100 text-gray-600',
};
const SOGLIA_ANNUA = 5000;

const formVuoto = {
  nome: '', cognome: '', data_nascita: '', codice_fiscale: '', indirizzo: '', comune_residenza: '', telefono: '', email: '',
  ruolo: '', tipo_rapporto: 'volontario', data_inizio: '',
  quota_associativa: 5, quota_pagata: false,
};

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<Membro[]>([]);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formVuoto);
  const [tesserati, setTesserati] = useState<TesseratoBase[]>([]);
  const [tesseratoOrigineId, setTesseratoOrigineId] = useState<string>('');

  // Dettaglio membro selezionato
  const [selezionato, setSelezionato] = useState<Membro | null>(null);
  const [compensi, setCompensi] = useState<Compenso[]>([]);
  const [contratti, setContratti] = useState<Contratto[]>([]);
  const [gruppiAssegnati, setGruppiAssegnati] = useState<number[]>([]);
  const [subTab, setSubTab] = useState<'compensi' | 'contratti' | 'gruppi'>('compensi');
  const [mostraFormCompenso, setMostraFormCompenso] = useState(false);
  const [formCompenso, setFormCompenso] = useState({ importo: 0, data_erogazione: '', descrizione: '' });
  const [mostraFormContratto, setMostraFormContratto] = useState(false);
  const [formContratto, setFormContratto] = useState({ tipo: 'sportivo', data_inizio: '', data_fine: '', importo: 0, firmato: false });

  const carica = () => {
    Promise.all([getStaff(), getGruppi(), getTesserati()]).then(([s, g, t]) => {
      setStaff(s.data);
      setGruppi(g.data);
      setTesserati(t.data);
      setLoading(false);
    });
  };

  useEffect(() => { carica(); }, []);

  const apriDettaglio = async (m: Membro) => {
    setSelezionato(m);
    setSubTab('compensi');
    const [c, ct, gr] = await Promise.all([getCompensiStaff(m.id), getContrattiStaff(m.id), getGruppiStaff(m.id)]);
    setCompensi(c.data);
    setContratti(ct.data);
    setGruppiAssegnati(gr.data.map((g: Gruppo) => g.id));
  };

  const ricaricaDettaglio = async () => {
    if (!selezionato) return;
    const [c, ct] = await Promise.all([getCompensiStaff(selezionato.id), getContrattiStaff(selezionato.id)]);
    setCompensi(c.data);
    setContratti(ct.data);
  };

  const apriNuovo = () => { setEditingId(null); setForm(formVuoto); setTesseratoOrigineId(''); setMostraForm(true); };

  const handleStampaTabulato = async () => {
    const res = await getTabulatoTessere();
    const righe = [
      ['Numero Tessera', 'Cognome', 'Nome', 'Data di nascita', 'Data emissione', 'Quota', 'Pagata'],
      ...res.data.map((s: any) => [
        s.numero_tessera, s.cognome, s.nome,
        s.data_nascita ? new Date(s.data_nascita).toLocaleDateString('it-IT') : '',
        s.data_emissione_tessera ? new Date(s.data_emissione_tessera).toLocaleDateString('it-IT') : '',
        s.quota_associativa ?? '', s.quota_pagata ? 'Sì' : 'No',
      ])
    ];
    const csv = righe.map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tabulato_tessere_soci.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  const apriModifica = (m: Membro) => {
    setEditingId(m.id);
    setForm({
      nome: m.nome, cognome: m.cognome, data_nascita: m.data_nascita, codice_fiscale: m.codice_fiscale,
      telefono: m.telefono || '', email: m.email || '', ruolo: m.ruolo, tipo_rapporto: m.tipo_rapporto, data_inizio: m.data_inizio,
    });
    setMostraForm(true);
  };

  const handleSubmit = async () => {
    if (editingId) await aggiornaStaff(editingId, form);
    else await creaStaff(form);
    setMostraForm(false);
    carica();
  };

  const handleElimina = async (id: number) => {
    if (window.confirm('Disattivare questo membro dello staff?')) {
      await eliminaStaff(id);
      if (selezionato?.id === id) setSelezionato(null);
      carica();
    }
  };

  const handleCreaCompenso = async () => {
    if (!selezionato) return;
    await creaCompenso({ ...formCompenso, staff_id: selezionato.id });
    setMostraFormCompenso(false);
    setFormCompenso({ importo: 0, data_erogazione: '', descrizione: '' });
    ricaricaDettaglio();
  };

  const handleEliminaCompenso = async (id: number) => {
    if (window.confirm('Eliminare questo compenso?')) { await eliminaCompenso(id); ricaricaDettaglio(); }
  };

  const handleCreaContratto = async () => {
    if (!selezionato) return;
    await creaContratto({ ...formContratto, staff_id: selezionato.id, data_fine: formContratto.data_fine || null });
    setMostraFormContratto(false);
    setFormContratto({ tipo: 'sportivo', data_inizio: '', data_fine: '', importo: 0, firmato: false });
    ricaricaDettaglio();
  };

  const handleEliminaContratto = async (id: number) => {
    if (window.confirm('Eliminare questo contratto?')) { await eliminaContratto(id); ricaricaDettaglio(); }
  };

  const toggleGruppo = async (gruppoId: number) => {
    if (!selezionato) return;
    const nuovi = gruppiAssegnati.includes(gruppoId)
      ? gruppiAssegnati.filter(id => id !== gruppoId)
      : [...gruppiAssegnati, gruppoId];
    setGruppiAssegnati(nuovi);
    await aggiornaGruppiStaff(selezionato.id, nuovi);
  };

  const totaleCompensi = compensi.reduce((a, c) => a + Number(c.importo), 0);
  const percentualeSoglia = Math.min(100, (totaleCompensi / SOGLIA_ANNUA) * 100);

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="p-6 max-w-6xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Soci</h1>
            <p className="text-sm text-gray-500 mt-0.5">{staff.length} soci · clicca su un nome per vedere compensi, contratti e tessera</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleStampaTabulato} className="bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition w-fit">
              🖨️ Stampa tabulato tessere
            </button>
            <button onClick={apriNuovo} className="bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition w-fit">
              + Nuovo socio
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ELENCO STAFF */}
          <div className={`${selezionato ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
            {loading ? (
              <p className="text-gray-500">Caricamento...</p>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {staff.map((m, i) => (
                  <div
                    key={m.id}
                    onClick={() => apriDettaglio(m)}
                    className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition border-b last:border-0 ${
                      selezionato?.id === m.id ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/60 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {m.nome[0]}{m.cognome[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{m.nome} {m.cognome}</p>
                        <p className="text-xs text-gray-500">{m.ruolo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${TIPO_COLORE[m.tipo_rapporto] || 'bg-gray-100 text-gray-600'}`}>
                        {TIPO_LABEL[m.tipo_rapporto] || m.tipo_rapporto}
                      </span>
                      <span className="text-gray-300">›</span>
                    </div>
                  </div>
                ))}
                {staff.length === 0 && (
                  <p className="px-4 py-10 text-center text-gray-400">Nessun membro staff. Aggiungi il primo con "+ Nuovo membro".</p>
                )}
              </div>
            )}
          </div>

          {/* DETTAGLIO: COMPENSI / CONTRATTI / GRUPPI (collegati allo staff selezionato) */}
          {selezionato && (
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-5 py-4 flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold text-lg">{selezionato.nome} {selezionato.cognome}</p>
                    <p className="text-blue-200 text-xs">{selezionato.ruolo} · {TIPO_LABEL[selezionato.tipo_rapporto]}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => apriModifica(selezionato)} className="text-blue-100 hover:text-white text-xs font-medium">Modifica</button>
                    <button onClick={() => handleElimina(selezionato.id)} className="text-red-200 hover:text-white text-xs font-medium">Disattiva</button>
                    <button onClick={() => setSelezionato(null)} className="text-blue-200 hover:text-white text-xl leading-none">✕</button>
                  </div>
                </div>

                {/* SUB-TAB: Compensi collegati direttamente all'elenco staff */}
                <div className="flex gap-1 px-4 pt-3 border-b">
                  {([
                    { id: 'compensi', label: `💰 Compensi (${compensi.length})` },
                    { id: 'contratti', label: `📄 Contratti (${contratti.length})` },
                    { id: 'gruppi', label: '👥 Gruppi seguiti' },
                  ] as const).map(t => (
                    <button key={t.id} onClick={() => setSubTab(t.id)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                        subTab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* TESSERA E MODULO ADESIONE */}
                <div className="px-5 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tessera N. {selezionato.numero_tessera ?? '—'}
                    {selezionato.quota_pagata ? ' · quota pagata' : ' · quota da versare'}
                  </span>
                  <button onClick={() => scaricaTesseraPdf(selezionato.id, `tessera_${selezionato.cognome}.pdf`)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium">🪪 Scarica tessera</button>
                  <button onClick={() => scaricaModuloAdesionePdf(selezionato.id, false, `modulo_adesione_${selezionato.cognome}.pdf`)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium">📄 Modulo maggiorenni</button>
                  <button onClick={() => scaricaModuloAdesionePdf(selezionato.id, true, `modulo_adesione_minorenni_${selezionato.cognome}.pdf`)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium">📄 Modulo minorenni</button>
                  {selezionato.path_modulo_firmato ? (
                    <a href={selezionato.path_modulo_firmato} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-800 text-xs font-medium">
                      ✅ Modulo firmato caricato
                    </a>
                  ) : (
                    <label className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer">
                      + Carica modulo firmato
                      <input type="file" accept="application/pdf" className="hidden"
                        onChange={async (e) => {
                          if (e.target.files?.[0]) {
                            const res = await caricaModuloSocio(selezionato.id, e.target.files[0]);
                            setSelezionato(res.data);
                            carica();
                          }
                        }} />
                    </label>
                  )}
                </div>

                <div className="p-5">
                  {/* COMPENSI */}
                  {subTab === 'compensi' && (
                    <div>
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs text-gray-500">Totale anno corrente</p>
                          <p className={`text-sm font-bold ${totaleCompensi >= SOGLIA_ANNUA ? 'text-red-600' : 'text-gray-700'}`}>
                            € {totaleCompensi.toFixed(2)} / € {SOGLIA_ANNUA.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${percentualeSoglia >= 100 ? 'bg-red-500' : percentualeSoglia >= 80 ? 'bg-orange-400' : 'bg-green-500'}`}
                            style={{ width: `${percentualeSoglia}%` }} />
                        </div>
                        {compensi.some(c => c.soglia_superata) && (
                          <p className="text-xs text-red-600 mt-2">⚠️ Soglia esenzione superata: verificare adempimenti fiscali</p>
                        )}
                      </div>

                      <button onClick={() => setMostraFormCompenso(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 mb-3">
                        + Registra compenso
                      </button>

                      <div className="space-y-2">
                        {compensi.map(c => (
                          <div key={c.id} className={`flex justify-between items-center rounded-lg px-3 py-2 text-sm ${c.soglia_superata ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <div>
                              <p className="font-medium">{c.descrizione || 'Compenso'}</p>
                              <p className="text-xs text-gray-500">{formatDate(c.data_erogazione)} · progressivo € {Number(c.totale_progressivo).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">€ {Number(c.importo).toFixed(2)}</span>
                              <button onClick={() => handleEliminaCompenso(c.id)} className="text-red-400 hover:text-red-600 text-xs">Elimina</button>
                            </div>
                          </div>
                        ))}
                        {compensi.length === 0 && <p className="text-gray-400 text-sm">Nessun compenso registrato</p>}
                      </div>
                    </div>
                  )}

                  {/* CONTRATTI */}
                  {subTab === 'contratti' && (
                    <div>
                      <button onClick={() => setMostraFormContratto(true)} className="bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-800 mb-3">
                        + Nuovo contratto
                      </button>
                      <div className="space-y-2">
                        {contratti.map(c => (
                          <div key={c.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium capitalize">{c.tipo}</p>
                              <p className="text-xs text-gray-500">{formatDate(c.data_inizio)} {c.data_fine ? `→ ${formatDate(c.data_fine)}` : '(a tempo indeterminato)'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">€ {Number(c.importo).toFixed(2)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.firmato ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {c.firmato ? 'Firmato' : 'Da firmare'}
                              </span>
                              <button onClick={() => handleEliminaContratto(c.id)} className="text-red-400 hover:text-red-600 text-xs">Elimina</button>
                            </div>
                          </div>
                        ))}
                        {contratti.length === 0 && <p className="text-gray-400 text-sm">Nessun contratto registrato</p>}
                      </div>
                    </div>
                  )}

                  {/* GRUPPI SEGUITI */}
                  {subTab === 'gruppi' && (
                    <div>
                      <p className="text-xs text-gray-500 mb-3">Seleziona i gruppi seguiti da questo membro dello staff</p>
                      <div className="flex flex-wrap gap-2">
                        {gruppi.map(g => (
                          <button key={g.id} onClick={() => toggleGruppo(g.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              gruppiAssegnati.includes(g.id) ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                            {g.nome}
                          </button>
                        ))}
                        {gruppi.length === 0 && <p className="text-gray-400 text-sm">Nessun gruppo disponibile</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FORM NUOVO/MODIFICA MEMBRO STAFF */}
        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Modifica socio' : 'Nuovo socio'}</h2>

              {!editingId && (
                <div className="mb-4 bg-blue-50 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Copia dati da un tesserato (facoltativo)</label>
                  <select
                    value={tesseratoOrigineId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTesseratoOrigineId(id);
                      const t = tesserati.find(x => String(x.id) === id);
                      if (t) {
                        setForm(f => ({
                          ...f,
                          nome: t.nome, cognome: t.cognome, data_nascita: t.data_nascita,
                          codice_fiscale: t.codice_fiscale || f.codice_fiscale,
                          indirizzo: t.indirizzo || f.indirizzo,
                          comune_residenza: t.comune_residenza || f.comune_residenza,
                        }));
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Nessuno (compila manualmente)</option>
                    {[...tesserati].sort((a, b) => a.cognome.localeCompare(b.cognome)).map(t => (
                      <option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">I dati vengono solo copiati, non resta nessun collegamento con il tesserato.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nome', key: 'nome', type: 'text' },
                  { label: 'Cognome', key: 'cognome', type: 'text' },
                  { label: 'Data di nascita', key: 'data_nascita', type: 'date' },
                  { label: 'Codice Fiscale', key: 'codice_fiscale', type: 'text' },
                  { label: 'Indirizzo', key: 'indirizzo', type: 'text' },
                  { label: 'Comune di residenza', key: 'comune_residenza', type: 'text' },
                  { label: 'Telefono', key: 'telefono', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                  { label: 'Ruolo', key: 'ruolo', type: 'text' },
                  { label: 'Data inizio', key: 'data_inizio', type: 'date' },
                  { label: 'Quota associativa (€)', key: 'quota_associativa', type: 'number' },
                ].map((campo) => (
                  <div key={campo.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{campo.label}</label>
                    <input
                      type={campo.type}
                      value={(form as any)[campo.key]}
                      onChange={(e) => setForm({ ...form, [campo.key]: campo.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" checked={form.quota_pagata} onChange={(e) => setForm({ ...form, quota_pagata: e.target.checked })} />
                  <label className="text-sm text-gray-700">Quota associativa già versata</label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo rapporto</label>
                  <select value={form.tipo_rapporto} onChange={(e) => setForm({ ...form, tipo_rapporto: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="volontario">Volontario</option>
                    <option value="cococo">Co.Co.Co.</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setMostraForm(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* FORM COMPENSO */}
        {mostraFormCompenso && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Registra compenso</h2>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <input type="text" value={formCompenso.descrizione} onChange={e => setFormCompenso({ ...formCompenso, descrizione: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                  <input type="number" value={formCompenso.importo} onChange={e => setFormCompenso({ ...formCompenso, importo: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data erogazione</label>
                  <input type="date" value={formCompenso.data_erogazione} onChange={e => setFormCompenso({ ...formCompenso, data_erogazione: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraFormCompenso(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaCompenso} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}

        {/* FORM CONTRATTO */}
        {mostraFormContratto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Nuovo contratto</h2>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={formContratto.tipo} onChange={e => setFormContratto({ ...formContratto, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="sportivo">Sportivo</option>
                  <option value="amministrativo">Amministrativo</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
                  <input type="date" value={formContratto.data_inizio} onChange={e => setFormContratto({ ...formContratto, data_inizio: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data fine (opzionale)</label>
                  <input type="date" value={formContratto.data_fine} onChange={e => setFormContratto({ ...formContratto, data_fine: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" value={formContratto.importo} onChange={e => setFormContratto({ ...formContratto, importo: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                <input type="checkbox" checked={formContratto.firmato} onChange={e => setFormContratto({ ...formContratto, firmato: e.target.checked })} />
                Contratto già firmato
              </label>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setMostraFormContratto(false)} className="px-4 py-2 text-sm text-gray-600">Annulla</button>
                <button onClick={handleCreaContratto} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">Salva</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Staff;
