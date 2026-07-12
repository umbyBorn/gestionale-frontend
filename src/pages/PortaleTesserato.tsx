import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import {
  getTesserato, aggiornaTesserato, getEventi, getMessaggiTesserato,
  getPagamenti, getDocumenti, getCompagniGruppo, getStatisticheTesserato,
  getPresenzeTesserato, registraPresenza
} from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '../utils/date';

interface Tesserato {
  id: number; nome: string; cognome: string; data_nascita: string;
  codice_fiscale: string; email?: string; telefono?: string; cellulare?: string;
  indirizzo?: string; comune_residenza?: string; provincia_residenza?: string;
  cap_residenza?: string; foto_url?: string; categoria?: string;
  cod_tessera?: string; tipo_tessera?: string; qualifica?: string; sport?: string;
  matricola?: string; data_emissione_tessera?: string; data_scadenza_tessera?: string;
  data_scadenza_certificato_medico?: string;
}
interface Evento { id: number; titolo: string; data: string; tipo: string; ora_inizio?: string; ora_fine?: string; luogo?: string; gruppo_id: number; }
interface Messaggio { id: number; intestazione: string; corpo: string; data_invio: string; }
interface Pagamento { id: number; importo: number; data_scadenza: string; pagato: boolean; }
interface Documento { id: number; tipo: string; nome_file: string; url: string; data_scadenza?: string; }
interface Compagno { id: number; nome: string; cognome: string; foto_url?: string; categoria?: string; }
interface Statistiche { totale_eventi: number; presenze: number; assenze: number; percentuale: number; streak: number; }
interface Presenza { id: number; evento_id: number; presente: boolean; }

const SEZIONI = [
  { id: 'home', label: '🏠', titolo: 'Home' },
  { id: 'profilo', label: '👤', titolo: 'Profilo' },
  { id: 'tessera', label: '🎫', titolo: 'Tessera' },
  { id: 'allenamenti', label: '📅', titolo: 'Allenamenti' },
  { id: 'statistiche', label: '📊', titolo: 'Statistiche' },
  { id: 'compagni', label: '👥', titolo: 'Compagni' },
  { id: 'documenti', label: '📁', titolo: 'Documenti' },
  { id: 'messaggi', label: '📢', titolo: 'Messaggi' },
  { id: 'pagamenti', label: '💳', titolo: 'Pagamenti' },
];

const TIPO_COLORE: Record<string, string> = {
  allenamento: 'bg-blue-100 text-blue-700',
  partita: 'bg-red-100 text-red-700',
  raduno: 'bg-green-100 text-green-700',
  altro: 'bg-gray-100 text-gray-600',
};

const PortaleTesserato: React.FC = () => {
  const { utente, logout, tesseratoId } = useAuth();
  const { iscritto, attivaPush } = usePushNotifications(utente?.id, tesseratoId || undefined);
  const [sezione, setSezione] = useState('home');
  const [tesserato, setTesserato] = useState<Tesserato | null>(null);
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([]);
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [compagni, setCompagni] = useState<Compagno[]>([]);
  const [statistiche, setStatistiche] = useState<Statistiche | null>(null);
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [loading, setLoading] = useState(true);
  const [modifica, setModifica] = useState(false);
  const [form, setForm] = useState<Partial<Tesserato>>({});
  const [salvando, setSalvando] = useState(false);

  const oggi = new Date().toISOString().split('T')[0];
  const [calAnno, setCalAnno] = useState(new Date().getFullYear());
  const [calMese, setCalMese] = useState(new Date().getMonth());
  const [giornoSelezionato, setGiornoSelezionato] = useState<string | null>(null);
  const [msgSelezionato, setMsgSelezionato] = useState<number | null>(null);
  const [msgAnno, setMsgAnno] = useState(new Date().getFullYear());
  const [msgMese, setMsgMese] = useState(new Date().getMonth());

  useEffect(() => {
    if (!tesseratoId) { setLoading(false); return; }
    Promise.all([
      getTesserato(tesseratoId),
      getEventi(),
      getMessaggiTesserato(tesseratoId),
      getPagamenti(),
      getDocumenti(tesseratoId),
      getCompagniGruppo(tesseratoId),
      getStatisticheTesserato(tesseratoId),
      getPresenzeTesserato(tesseratoId),
    ]).then(([t, e, m, p, d, c, s, pr]) => {
      setTesserato(t.data);
      setForm({
        email: t.data.email || '', telefono: t.data.telefono || '',
        cellulare: t.data.cellulare || '', indirizzo: t.data.indirizzo || '',
        comune_residenza: t.data.comune_residenza || '',
        provincia_residenza: t.data.provincia_residenza || '',
        cap_residenza: t.data.cap_residenza || '',
      });
      setEventi(e.data.sort((a: Evento, b: Evento) => a.data.localeCompare(b.data)));
      setMessaggi(m.data);
      setPagamenti(p.data);
      setDocumenti(d.data);
      setCompagni(c.data);
      setStatistiche(s.data);
      setPresenze(pr.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tesseratoId]);

  const handleSalva = async () => {
    if (!tesseratoId || !tesserato) return;
    setSalvando(true);
    try {
      const aggiornato = { ...tesserato, ...form };
      await aggiornaTesserato(tesseratoId, aggiornato);
      setTesserato(prev => prev ? { ...prev, ...form } : prev);
      setModifica(false);
    } catch { alert('Errore nel salvataggio'); }
    finally { setSalvando(false); }
  };

  const getPresenza = (eventoId: number) => presenze.find(p => p.evento_id === eventoId);

  const togglePresenza = async (eventoId: number, presente: boolean) => {
    if (!tesseratoId) return;
    await registraPresenza({ evento_id: eventoId, tesserato_id: tesseratoId, presente });
    const res = await getPresenzeTesserato(tesseratoId);
    setPresenze(res.data);
  };

  const giorniAllaScadenza = () => {
    if (!tesserato?.data_scadenza_tessera) return null;
    const scadenza = new Date(tesserato.data_scadenza_tessera);
    const diff = Math.ceil((scadenza.getTime() - new Date().getTime()) / 86400000);
    return diff;
  };

  const scadenzaVisitaMedica = () => {
    // Priorità al campo dedicato sulla scheda tesserato; in mancanza, usa il documento caricato
    const dataRiferimento = tesserato?.data_scadenza_certificato_medico
      || documenti.find(d => d.tipo.toLowerCase().includes('idoneit'))?.data_scadenza;
    if (!dataRiferimento) return null;
    const diff = Math.ceil((new Date(dataRiferimento).getTime() - new Date().getTime()) / 86400000);
    return { giorni: diff, data: dataRiferimento };
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Caricamento...</p></div>;

  if (!tesseratoId) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Account non collegato</h2>
        <p className="text-gray-500 text-sm">Contatta l'amministratore per collegare il tuo account alla scheda tesserato.</p>
        <button onClick={logout} className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">Esci</button>
      </div>
    </div>
  );

  const visitaMedica = scadenzaVisitaMedica();
  const giorniTessera = giorniAllaScadenza();
  const prossimiEventi = eventi.filter(e => e.data >= oggi);
  const pagamentiDaPagare = pagamenti.filter(p => !p.pagato);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tesserato?.foto_url
              ? <img src={tesserato.foto_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white/30" />
              : <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  {tesserato?.nome?.[0]}{tesserato?.cognome?.[0]}
                </div>
            }
            <div>
              <p className="font-bold text-white">{tesserato?.nome} {tesserato?.cognome}</p>
              <p className="text-xs text-blue-200">{tesserato?.categoria || 'Tesserato'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!iscritto && (
              <button onClick={attivaPush} className="text-yellow-300 text-lg" title="Attiva notifiche">🔔</button>
            )}
            <button onClick={logout} className="text-blue-200 hover:text-white text-sm px-2 py-1">Esci</button>
          </div>
        </div>

        {/* BANNER AVVISI */}
        <div className="max-w-lg mx-auto mt-3 space-y-2">
          {visitaMedica && visitaMedica.giorni <= 30 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${visitaMedica.giorni <= 7 ? 'bg-red-500' : 'bg-yellow-500'}`}>
              <span>🏥</span>
              <span className="font-medium">
                {visitaMedica.giorni <= 0
                  ? 'Visita medica SCADUTA — rinnova subito!'
                  : `Visita medica scade tra ${visitaMedica.giorni} giorni (${formatDate(visitaMedica.data)})`}
              </span>
            </div>
          )}
          {giorniTessera !== null && giorniTessera <= 30 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${giorniTessera <= 0 ? 'bg-red-500' : 'bg-orange-500'}`}>
              <span>🎫</span>
              <span className="font-medium">
                {giorniTessera <= 0 ? 'Tessera federale SCADUTA!' : `Tessera scade tra ${giorniTessera} giorni`}
              </span>
            </div>
          )}
          {pagamentiDaPagare.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-red-500">
              <span>💳</span>
              <span className="font-medium">{pagamentiDaPagare.length} pagamenti in sospeso — totale € {pagamentiDaPagare.reduce((a, p) => a + p.importo, 0).toFixed(2)}</span>
            </div>
          )}
        </div>
      </header>

      {/* CONTENUTO */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">

          {/* HOME */}
          {sezione === 'home' && (
            <div className="space-y-4">
              {/* CARD BENVENUTO */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-bold text-gray-800 text-lg">Ciao {tesserato?.nome}! 👋</h2>
                <p className="text-gray-500 text-sm mt-1">Ecco il tuo riepilogo di oggi</p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-700">{statistiche?.percentuale ?? 0}%</p>
                    <p className="text-xs text-gray-500">Presenze</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <p className="text-2xl font-bold text-green-700">{statistiche?.streak ?? 0}</p>
                    <p className="text-xs text-gray-500">Streak 🔥</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <p className="text-2xl font-bold text-purple-700">{compagni.length}</p>
                    <p className="text-xs text-gray-500">Compagni</p>
                  </div>
                </div>
              </div>

              {/* PROSSIMO EVENTO */}
              {prossimiEventi.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3">📅 Prossimo allenamento</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                      <p className="text-xs uppercase">{new Date(prossimiEventi[0].data + 'T12:00:00').toLocaleDateString('it-IT', { month: 'short' })}</p>
                      <p className="text-xl font-bold leading-none">{new Date(prossimiEventi[0].data + 'T12:00:00').getDate()}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{prossimiEventi[0].titolo}</p>
                      <p className="text-sm text-gray-500">
                        {prossimiEventi[0].ora_inizio?.substring(0,5)} {prossimiEventi[0].luogo ? `· ${prossimiEventi[0].luogo}` : ''}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => togglePresenza(prossimiEventi[0].id, true)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${getPresenza(prossimiEventi[0].id)?.presente === true ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                          ✓ Ci sarò
                        </button>
                        <button
                          onClick={() => togglePresenza(prossimiEventi[0].id, false)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${getPresenza(prossimiEventi[0].id)?.presente === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                          ✗ Assente
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ULTIMO MESSAGGIO */}
              {messaggi.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-700 text-sm mb-2">📢 Ultimo messaggio</h3>
                  <p className="font-medium text-gray-800">{messaggi[0].intestazione}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{messaggi[0].corpo}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(messaggi[0].data_invio).toLocaleDateString('it-IT')}</p>
                </div>
              )}
            </div>
          )}

          {/* PROFILO */}
          {sezione === 'profilo' && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-800">Dati personali</h2>
                {!modifica
                  ? <button onClick={() => setModifica(true)} className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-sm">Modifica</button>
                  : <div className="flex gap-2">
                      <button onClick={() => setModifica(false)} className="px-3 py-1.5 text-gray-500 text-sm">Annulla</button>
                      <button onClick={handleSalva} disabled={salvando} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">
                        {salvando ? '...' : 'Salva'}
                      </button>
                    </div>
                }
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
                {[['Nome', tesserato?.nome], ['Cognome', tesserato?.cognome], ['Data nascita', tesserato?.data_nascita ? formatDate(tesserato.data_nascita) : undefined], ['Codice Fiscale', tesserato?.codice_fiscale]].map(([l, v]) => (
                  <div key={l as string}><span className="text-gray-400 text-xs block">{l}</span><strong className="text-gray-800">{v || '-'}</strong></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Email', key: 'email', type: 'email' },
                  { label: 'Telefono', key: 'telefono' },
                  { label: 'Cellulare', key: 'cellulare' },
                  { label: 'Indirizzo', key: 'indirizzo' },
                  { label: 'Comune', key: 'comune_residenza' },
                  { label: 'Provincia', key: 'provincia_residenza' },
                  { label: 'CAP', key: 'cap_residenza' },
                ].map(campo => (
                  <div key={campo.key}>
                    <label className="text-xs text-gray-400 block mb-1">{campo.label}</label>
                    {modifica
                      ? <input type={campo.type || 'text'} value={(form as any)[campo.key] || ''}
                          onChange={f(campo.key)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      : <p className="text-sm font-medium text-gray-800">{(tesserato as any)?.[campo.key] || '-'}</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TESSERA DIGITALE */}
          {sezione === 'tessera' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">PGS Juvenilia</p>
                    <p className="text-white font-bold text-xl mt-0.5">{tesserato?.nome} {tesserato?.cognome}</p>
                  </div>
                  {tesserato?.foto_url
                    ? <img src={tesserato.foto_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/30" />
                    : <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">{tesserato?.nome?.[0]}</div>
                  }
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div><p className="text-blue-300 text-xs">Tessera</p><p className="text-white font-mono font-bold">{tesserato?.cod_tessera || '—'}</p></div>
                  <div><p className="text-blue-300 text-xs">Categoria</p><p className="text-white font-bold">{tesserato?.categoria || '—'}</p></div>
                  <div><p className="text-blue-300 text-xs">Sport</p><p className="text-white font-bold">{tesserato?.sport || '—'}</p></div>
                  <div><p className="text-blue-300 text-xs">Scadenza</p>
                    <p className={`font-bold ${giorniAllaScadenza() !== null && giorniAllaScadenza()! <= 30 ? 'text-red-300' : 'text-white'}`}>
                      {tesserato?.data_scadenza_tessera ? formatDate(tesserato.data_scadenza_tessera) : '—'}
                    </p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-2 text-xs text-blue-200 font-mono">{tesserato?.codice_fiscale}</div>
              </div>

              {/* CERTIFICATO MEDICO SPORTIVO */}
              {tesserato?.data_scadenza_certificato_medico && (() => {
                const giorni = Math.ceil((new Date(tesserato.data_scadenza_certificato_medico).getTime() - new Date().getTime()) / 86400000);
                const scaduto = giorni <= 0;
                const inScadenza = !scaduto && giorni <= 30;
                return (
                  <div className={`rounded-2xl p-5 shadow-sm ${scaduto ? 'bg-red-50 border-2 border-red-200' : inScadenza ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏥</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700">Certificato medico sportivo</p>
                        <p className={`text-sm ${scaduto ? 'text-red-600 font-bold' : inScadenza ? 'text-yellow-700 font-bold' : 'text-gray-500'}`}>
                          {scaduto
                            ? `Scaduto il ${formatDate(tesserato.data_scadenza_certificato_medico)}`
                            : `Valido fino al ${formatDate(tesserato.data_scadenza_certificato_medico)}${inScadenza ? ` (${giorni} giorni)` : ''}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* QR CODE */}
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <p className="text-sm font-medium text-gray-700 mb-4">QR Code tessera</p>
                <div className="flex justify-center">
                  <QRCodeSVG
                    value={JSON.stringify({
                      id: tesserato?.id,
                      nome: `${tesserato?.nome} ${tesserato?.cognome}`,
                      cf: tesserato?.codice_fiscale,
                      tessera: tesserato?.cod_tessera,
                      categoria: tesserato?.categoria,
                    })}
                    size={180}
                    level="M"
                    includeMargin
                  />
                </div>
                <p className="text-xs text-gray-400 mt-3">Mostra questo QR code all'ingresso</p>
              </div>
            </div>
          )}

          {/* ALLENAMENTI — CALENDARIO */}
          {sezione === 'allenamenti' && (() => {
            const MESI_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
            const GIORNI_IT = ['D','L','M','M','G','V','S'];
            const primoGiorno = new Date(calAnno, calMese, 1).getDay();
            const giorniNelMese = new Date(calAnno, calMese + 1, 0).getDate();
            const eventiDelGiorno = (g: number) => {
              const dataStr = `${calAnno}-${String(calMese+1).padStart(2,'0')}-${String(g).padStart(2,'0')}`;
              return eventi.filter(e => e.data === dataStr);
            };
            const eventiSelezionati = giornoSelezionato ? eventi.filter(e => e.data === giornoSelezionato) : [];
            return (
              <div className="space-y-4">
                {/* HEADER MESE */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-4 text-white">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => { if(calMese===0){setCalMese(11);setCalAnno(y=>y-1);}else setCalMese(m=>m-1); setGiornoSelezionato(null); }}
                      className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">◀</button>
                    <h3 className="font-bold text-lg">{MESI_IT[calMese]} {calAnno}</h3>
                    <button onClick={() => { if(calMese===11){setCalMese(0);setCalAnno(y=>y+1);}else setCalMese(m=>m+1); setGiornoSelezionato(null); }}
                      className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">▶</button>
                  </div>
                  {/* INTESTAZIONI GIORNI */}
                  <div className="grid grid-cols-7 mb-2">
                    {GIORNI_IT.map((g,i) => <div key={i} className="text-center text-xs text-blue-200 font-medium py-1">{g}</div>)}
                  </div>
                  {/* GRIGLIA GIORNI */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({length: primoGiorno}).map((_,i) => <div key={`e${i}`} />)}
                    {Array.from({length: giorniNelMese}).map((_,i) => {
                      const g = i+1;
                      const dataStr = `${calAnno}-${String(calMese+1).padStart(2,'0')}-${String(g).padStart(2,'0')}`;
                      const evGiorno = eventiDelGiorno(g);
                      const isOggi = dataStr === oggi;
                      const isSel = dataStr === giornoSelezionato;
                      const haEventi = evGiorno.length > 0;
                      return (
                        <button key={g} onClick={() => setGiornoSelezionato(isSel ? null : dataStr)}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center transition ${
                            isSel ? 'bg-white text-blue-700 shadow-lg scale-110' :
                            isOggi ? 'bg-white/30 text-white font-bold' :
                            haEventi ? 'bg-white/10 text-white hover:bg-white/20' :
                            'text-blue-100 hover:bg-white/10'
                          }`}>
                          <span className="text-sm font-semibold">{g}</span>
                          {haEventi && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSel ? 'bg-blue-600' : 'bg-yellow-300'}`} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* EVENTI DEL GIORNO SELEZIONATO */}
                {giornoSelezionato && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 text-sm">
                      {new Date(giornoSelezionato + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    {eventiSelezionati.length === 0 ? (
                      <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                        <p className="text-gray-300 text-3xl mb-1">📭</p>
                        <p className="text-gray-400 text-sm">Nessun evento questo giorno</p>
                      </div>
                    ) : (
                      eventiSelezionati.map(e => {
                        const presenza = getPresenza(e.id);
                        const futuro = e.data >= oggi;
                        return (
                          <div key={e.id} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${
                            presenza?.presente === true ? 'border-green-400' :
                            presenza?.presente === false ? 'border-red-400' : 'border-blue-300'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold text-gray-800">{e.titolo}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {e.ora_inizio?.substring(0,5)}{e.ora_fine ? ` - ${e.ora_fine.substring(0,5)}` : ''}
                                  {e.luogo ? ` · ${e.luogo}` : ''}
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${TIPO_COLORE[e.tipo] || 'bg-gray-100 text-gray-600'}`}>{e.tipo}</span>
                            </div>
                            {futuro && (
                              <div className="flex gap-2 mt-3">
                                <button onClick={() => togglePresenza(e.id, true)}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold ${presenza?.presente === true ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'}`}>
                                  ✓ Ci sarò
                                </button>
                                <button onClick={() => togglePresenza(e.id, false)}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold ${presenza?.presente === false ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'}`}>
                                  ✗ Non ci sarò
                                </button>
                              </div>
                            )}
                            {!futuro && presenza && (
                              <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold inline-block ${presenza.presente ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                {presenza.presente ? '✓ Eri presente' : '✗ Eri assente'}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* PROSSIMI EVENTI (se nessun giorno selezionato) */}
                {!giornoSelezionato && (
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm mb-3">Prossimi eventi</h3>
                    {eventi.filter(e => e.data >= oggi).slice(0,3).length === 0 ? (
                      <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                        <p className="text-gray-300 text-3xl mb-1">📭</p>
                        <p className="text-gray-400 text-sm">Nessun evento in programma</p>
                      </div>
                    ) : (
                      eventi.filter(e => e.data >= oggi).slice(0,3).map(e => {
                        const presenza = getPresenza(e.id);
                        return (
                          <div key={e.id} onClick={() => setGiornoSelezionato(e.data)}
                            className="bg-white rounded-2xl p-4 shadow-sm mb-2 flex items-center gap-3 cursor-pointer hover:shadow-md transition">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                              <p className="text-xs leading-none">{new Date(e.data+'T12:00:00').toLocaleDateString('it-IT',{month:'short'}).toUpperCase()}</p>
                              <p className="text-lg font-bold leading-none">{new Date(e.data+'T12:00:00').getDate()}</p>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 text-sm">{e.titolo}</p>
                              <p className="text-xs text-gray-400">{e.ora_inizio?.substring(0,5)} {e.luogo ? `· ${e.luogo}` : ''}</p>
                            </div>
                            {presenza?.presente === true && <span className="text-green-500 text-lg">✓</span>}
                            {presenza?.presente === false && <span className="text-red-500 text-lg">✗</span>}
                            {!presenza && <span className="text-gray-300 text-lg">○</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* STATISTICHE */}
          {sezione === 'statistiche' && statistiche && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800">📊 Le mie statistiche</h2>
              
              {/* PERCENTUALE CIRCOLARE */}
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="relative w-36 h-36 mx-auto mb-4">
                  <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#3b82f6" strokeWidth="12"
                      strokeDasharray={`${2 * Math.PI * 54 * statistiche.percentuale / 100} ${2 * Math.PI * 54}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-3xl font-bold text-gray-800">{statistiche.percentuale}%</p>
                    <p className="text-xs text-gray-400">presenze</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">Su {statistiche.totale_eventi} eventi totali</p>
              </div>

              {/* CARDS STATS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{statistiche.presenze}</p>
                  <p className="text-xs text-gray-500 mt-1">Presenze</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-500">{statistiche.assenze}</p>
                  <p className="text-xs text-gray-500 mt-1">Assenze</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 text-center col-span-2">
                  <p className="text-3xl font-bold text-orange-500">🔥 {statistiche.streak}</p>
                  <p className="text-xs text-gray-500 mt-1">Allenamenti consecutivi</p>
                </div>
              </div>

              {/* MESSAGGIO MOTIVAZIONALE */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-5 text-white text-center">
                <p className="text-2xl mb-2">
                  {statistiche.percentuale >= 80 ? '🏆' : statistiche.percentuale >= 60 ? '💪' : '📈'}
                </p>
                <p className="font-bold">
                  {statistiche.percentuale >= 80 ? 'Eccellente! Sei un pilastro della squadra!' :
                   statistiche.percentuale >= 60 ? 'Buona continuità! Continua così!' :
                   'Ogni allenamento conta. Vieni più spesso!'}
                </p>
              </div>
            </div>
          )}

          {/* COMPAGNI */}
          {sezione === 'compagni' && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800">👥 I miei compagni ({compagni.length})</h2>
              {compagni.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                  <p className="text-gray-300 text-4xl mb-2">👤</p>
                  <p className="text-gray-400 text-sm">Nessun compagno di gruppo trovato</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {compagni.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm text-center">
                      {c.foto_url
                        ? <img src={c.foto_url} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-gray-100" />
                        : <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">
                            {c.nome[0]}{c.cognome[0]}
                          </div>
                      }
                      <p className="font-semibold text-gray-800 text-sm">{c.nome}</p>
                      <p className="font-semibold text-gray-800 text-sm">{c.cognome}</p>
                      {c.categoria && <p className="text-xs text-gray-400 mt-0.5">{c.categoria}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTI */}
          {sezione === 'documenti' && (
            <div className="space-y-3">
              <h2 className="font-bold text-gray-800">📁 I miei documenti</h2>
              {documenti.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                  <p className="text-gray-300 text-4xl mb-2">📂</p>
                  <p className="text-gray-400 text-sm">Nessun documento caricato</p>
                </div>
              ) : (
                documenti.map(d => {
                  const scad = d.data_scadenza ? Math.ceil((new Date(d.data_scadenza).getTime() - new Date().getTime()) / 86400000) : null;
                  return (
                    <div key={d.id} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${
                      scad !== null && scad <= 0 ? 'border-red-400' :
                      scad !== null && scad <= 30 ? 'border-yellow-400' : 'border-gray-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">{d.tipo}</p>
                          <p className="text-xs text-gray-400">{d.nome_file}</p>
                          {d.data_scadenza && (
                            <p className={`text-xs mt-1 ${scad !== null && scad <= 0 ? 'text-red-500 font-medium' : scad !== null && scad <= 30 ? 'text-yellow-600' : 'text-gray-400'}`}>
                              {scad !== null && scad <= 0 ? '⚠️ Scaduto' : `Scade: ${formatDate(d.data_scadenza)}`}
                            </p>
                          )}
                        </div>
                        <a href={d.url} target="_blank" rel="noopener noreferrer"
                          className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                          {d.nome_file.toLowerCase().endsWith('.pdf') ? '📄 Apri' : '🖼 Apri'}
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* MESSAGGI — CALENDARIO */}
          {sezione === 'messaggi' && (() => {
            const MESI_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
            const GIORNI_IT = ['D','L','M','M','G','V','S'];
            const primoGiorno = new Date(msgAnno, msgMese, 1).getDay();
            const giorniNelMese = new Date(msgAnno, msgMese + 1, 0).getDate();
            const msgDelGiorno = (g: number) => {
              const dataStr = `${msgAnno}-${String(msgMese+1).padStart(2,'0')}-${String(g).padStart(2,'0')}`;
              return messaggi.filter(m => m.data_invio.startsWith(dataStr));
            };
            const msgMeseCorrente = messaggi.filter(m => {
              const d = new Date(m.data_invio);
              return d.getFullYear() === msgAnno && d.getMonth() === msgMese;
            });
            return (
              <div className="space-y-4">
                {/* HEADER MESE */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-4 text-white">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => { if(msgMese===0){setMsgMese(11);setMsgAnno(y=>y-1);}else setMsgMese(m=>m-1); }}
                      className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">◀</button>
                    <div className="text-center">
                      <h3 className="font-bold text-lg">{MESI_IT[msgMese]} {msgAnno}</h3>
                      <p className="text-xs text-purple-200">{msgMeseCorrente.length} messaggi ricevuti</p>
                    </div>
                    <button onClick={() => { if(msgMese===11){setMsgMese(0);setMsgAnno(y=>y+1);}else setMsgMese(m=>m+1); }}
                      className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">▶</button>
                  </div>
                  <div className="grid grid-cols-7 mb-2">
                    {GIORNI_IT.map((g,i) => <div key={i} className="text-center text-xs text-purple-200 font-medium py-1">{g}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({length: primoGiorno}).map((_,i) => <div key={`e${i}`} />)}
                    {Array.from({length: giorniNelMese}).map((_,i) => {
                      const g = i+1;
                      const haMsg = msgDelGiorno(g).length > 0;
                      const dataStr = `${msgAnno}-${String(msgMese+1).padStart(2,'0')}-${String(g).padStart(2,'0')}`;
                      const isOggi = dataStr === oggi;
                      return (
                        <div key={g} className={`aspect-square rounded-xl flex flex-col items-center justify-center transition ${
                          haMsg ? 'bg-white/20 cursor-pointer hover:bg-white/30' :
                          isOggi ? 'bg-white/10' : ''}`}>
                          <span className={`text-sm ${haMsg ? 'font-bold text-white' : isOggi ? 'font-bold text-white' : 'text-purple-200'}`}>{g}</span>
                          {haMsg && <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LISTA MESSAGGI DEL MESE */}
                {msgMeseCorrente.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                    <p className="text-gray-300 text-4xl mb-2">📭</p>
                    <p className="text-gray-400 text-sm">Nessun messaggio in {MESI_IT[msgMese]}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 text-sm">Messaggi di {MESI_IT[msgMese]}</h3>
                    {msgMeseCorrente.map(m => (
                      <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <button
                          onClick={() => setMsgSelezionato(msgSelezionato === m.id ? null : m.id)}
                          className="w-full p-4 text-left">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-purple-600 text-lg">📢</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-sm">{m.intestazione}</p>
                                {msgSelezionato !== m.id && (
                                  <p className="text-xs text-gray-400 mt-0.5 truncate">{m.corpo}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end ml-2 flex-shrink-0">
                              <span className="text-xs text-gray-400">{new Date(m.data_invio).toLocaleDateString('it-IT', {day:'numeric', month:'short'})}</span>
                              <span className="text-gray-300 text-xs mt-1">{msgSelezionato === m.id ? '▲' : '▼'}</span>
                            </div>
                          </div>
                        </button>
                        {msgSelezionato === m.id && (
                          <div className="px-4 pb-4 border-t border-gray-50">
                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed pt-3">{m.corpo}</p>
                            <p className="text-xs text-gray-300 mt-3">
                              {new Date(m.data_invio).toLocaleString('it-IT')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* PAGAMENTI */}
          {sezione === 'pagamenti' && (() => {
            const daPagare = pagamenti.filter(p => !p.pagato);
            const pagati = pagamenti.filter(p => p.pagato);
            const totaleDaPagare = daPagare.reduce((a, p) => a + p.importo, 0);
            const totalePagato = pagati.reduce((a, p) => a + p.importo, 0);
            const totale = totaleDaPagare + totalePagato;
            const percentualePagata = totale > 0 ? Math.round(totalePagato / totale * 100) : 0;
            const scaduti = daPagare.filter(p => p.data_scadenza < oggi);
            return (
              <div className="space-y-4">

                {/* RIEPILOGO */}
                <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-5 text-white">
                  <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-3">Riepilogo pagamenti</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-blue-200 text-xs">Totale pagato</p>
                      <p className="text-2xl font-bold">€ {totalePagato.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Da pagare</p>
                      <p className={`text-2xl font-bold ${totaleDaPagare > 0 ? 'text-red-300' : 'text-green-300'}`}>
                        € {totaleDaPagare.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {/* BARRA PROGRESSO */}
                  <div className="bg-white/20 rounded-full h-2 mb-1">
                    <div className="bg-green-400 h-2 rounded-full transition-all"
                      style={{width: `${percentualePagata}%`}} />
                  </div>
                  <p className="text-xs text-blue-200">{percentualePagata}% pagato</p>
                </div>

                {/* AVVISO SCADUTI */}
                {scaduti.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <p className="font-bold text-red-700">{scaduti.length} pagamenti scaduti</p>
                        <p className="text-xs text-red-500">Contatta la segreteria per regolarizzare</p>
                      </div>
                    </div>
                    {scaduti.map(p => (
                      <div key={p.id} className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-red-700">Scaduto il {formatDate(p.data_scadenza)}</p>
                        </div>
                        <p className="font-bold text-red-600 text-lg">€ {p.importo.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* DA PAGARE (non scaduti) */}
                {daPagare.filter(p => p.data_scadenza >= oggi).length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
                      <p className="font-bold text-orange-700 text-sm">📋 Da pagare</p>
                    </div>
                    {daPagare.filter(p => p.data_scadenza >= oggi).map(p => {
                      const giorniMancanti = Math.ceil((new Date(p.data_scadenza).getTime() - new Date().getTime()) / 86400000);
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            giorniMancanti <= 7 ? 'bg-red-100' : giorniMancanti <= 30 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                            <span className="text-lg">💳</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">Quota associativa</p>
                            <p className={`text-xs mt-0.5 ${
                              giorniMancanti <= 7 ? 'text-red-500 font-medium' :
                              giorniMancanti <= 30 ? 'text-orange-500' : 'text-gray-400'}`}>
                              Scade {giorniMancanti === 0 ? 'oggi' : giorniMancanti === 1 ? 'domani' : `tra ${giorniMancanti} giorni`} · {formatDate(p.data_scadenza)}
                            </p>
                          </div>
                          <p className="font-bold text-gray-800 text-lg">€ {p.importo.toFixed(2)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PAGATI */}
                {pagati.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-green-700 text-sm">✅ Pagamenti effettuati</p>
                        <p className="text-xs text-green-600 font-medium">Totale: € {totalePagato.toFixed(2)}</p>
                      </div>
                    </div>
                    {pagati.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 font-bold">✓</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Quota pagata</p>
                          <p className="text-xs text-gray-400">Scadenza: {formatDate(p.data_scadenza)}</p>
                        </div>
                        <p className="font-bold text-green-600">€ {p.importo.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* TUTTO IN REGOLA */}
                {daPagare.length === 0 && pagamenti.length > 0 && (
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-5 text-white text-center">
                    <p className="text-4xl mb-2">🎉</p>
                    <p className="font-bold text-lg">Sei in regola!</p>
                    <p className="text-green-100 text-sm mt-1">Tutti i pagamenti sono stati effettuati</p>
                  </div>
                )}

                {pagamenti.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                    <p className="text-gray-300 text-4xl mb-2">📭</p>
                    <p className="text-gray-400 text-sm">Nessun pagamento registrato</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="bg-white border-t border-gray-200 px-2 py-2 flex-shrink-0">
        <div className="max-w-lg mx-auto flex justify-around">
          {SEZIONI.map(s => (
            <button key={s.id} onClick={() => setSezione(s.id)}
              className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition ${
                sezione === s.id ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:text-gray-600'
              }`}>
              <span className="text-xl">{s.label}</span>
              <span className="text-[10px] mt-0.5 font-medium">{s.titolo}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default PortaleTesserato;
