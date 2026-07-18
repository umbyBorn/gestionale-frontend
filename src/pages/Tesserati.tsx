import React, { useEffect, useState } from 'react';
import { formatDate } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import {
  getTesserati, creaTesserato, aggiornaTesserato, eliminaTesserato, eliminaTesseratoDefinitivo, eliminaTesseratiInBlocco, getTuttiTesserati, riattivaTesserato,
  getGruppi, getGruppiTesserato, aggiornaGruppiTesserato,
  getGenitori, creaGenitore, aggiornaGenitore,
  caricaFoto, getDocumenti, caricaDocumento, eliminaDocumento,
  getPagamentiTesserato, registraIncasso, eliminaPagamento, eliminaPagamentiNonPagatiTesserato,
  esportaLibroSoci, scaricaModuloAdesione, scaricaModuloTesseramento
} from '../services/api';

interface Tesserato {
  id: number; nome: string; cognome: string; data_nascita: string;
  codice_fiscale: string; sesso?: string; email?: string; telefono?: string;
  cellulare?: string; comune_nascita?: string; provincia_nascita?: string;
  stato_nascita?: string; indirizzo?: string; comune_residenza?: string;
  provincia_residenza?: string; regione_residenza?: string; cap_residenza?: string;
  cod_tessera?: string; tipo_tessera?: string; categoria?: string;
  qualifica?: string; sport?: string; data_emissione_tessera?: string;
  data_scadenza_tessera?: string; matricola?: string;
  data_scadenza_certificato_medico?: string; disabile: boolean;
  straniero: boolean; titolo_studio?: string; e_socio: boolean;
  attivo: boolean; foto_url?: string; genitore_id?: number;
}
interface Gruppo { id: number; nome: string; }
interface Genitore { id: number; nome: string; cognome: string; email?: string; telefono?: string; documento_tipo?: string; documento_numero?: string; }
interface Documento { id: number; tipo: string; nome_file: string; url: string; data_scadenza?: string; note?: string; }

const formVuoto = {
  nome: '', cognome: '', data_nascita: '', codice_fiscale: '', sesso: '',
  email: '', telefono: '', cellulare: '', comune_nascita: '', provincia_nascita: '',
  stato_nascita: 'Italia', indirizzo: '', comune_residenza: '', provincia_residenza: '',
  regione_residenza: '', cap_residenza: '', cod_tessera: '', tipo_tessera: '',
  categoria: '', qualifica: '', sport: '', data_emissione_tessera: '',
  data_scadenza_tessera: '', matricola: '', data_scadenza_certificato_medico: '',
  disabile: false, straniero: false,
  titolo_studio: '', e_socio: false, genitore_id: null as number | null,
};

const formGenitoreVuoto = { nome: '', cognome: '', email: '', telefono: '', documento_tipo: '', documento_numero: '' };

// Badge di stato per una data di scadenza (es. certificato medico, tessera)
const BadgeScadenza: React.FC<{ data: string; giorniAvviso?: number }> = ({ data, giorniAvviso = 30 }) => {
  const oggi = new Date();
  const scadenza = new Date(data);
  const giorni = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
  let stile = 'bg-green-100 text-green-700';
  let testo = 'Valido';
  if (giorni < 0) { stile = 'bg-red-100 text-red-700'; testo = 'Scaduto'; }
  else if (giorni <= giorniAvviso) { stile = 'bg-orange-100 text-orange-700'; testo = `In scadenza (${giorni}gg)`; }
  return (
    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${stile}`}>
      {testo}
    </span>
  );
};

const SEZIONI = ['Anagrafica', 'Residenza', 'Tessera', 'Gruppi', 'Genitore'];

const Tesserati: React.FC = () => {
  const { ruolo } = useAuth();
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [genitori, setGenitori] = useState<Genitore[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mostraEliminaBlocco, setMostraEliminaBlocco] = useState(false);
  const [passoEliminaBlocco, setPassoEliminaBlocco] = useState<1 | 2>(1);
  const [confermaTestoBlocco, setConfermaTestoBlocco] = useState('');
  const [eliminandoBlocco, setEliminandoBlocco] = useState(false);
  const [ricerca, setRicerca] = useState('');
  const gruppoFromUrl = new URLSearchParams(window.location.search).get('gruppo') || '';
  const [filtroGruppo, setFiltroGruppo] = useState(gruppoFromUrl);
  const [filtroSport, setFiltroSport] = useState('');
  const [filtroAnnoNascita, setFiltroAnnoNascita] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroCFTemp, setFiltroCFTemp] = useState(false);
  const [filtroTesseraScaduta, setFiltroTesseraScaduta] = useState(false);
  const [filtroCertificatoScaduto, setFiltroCertificatoScaduto] = useState(false);
  const [mostraDisabilitati, setMostraDisabilitati] = useState(false);
  const [ordinamento, setOrdinamento] = useState<{campo: string, direzione: 'asc'|'desc'}>({campo: 'cognome', direzione: 'asc'});
  const [form, setForm] = useState(formVuoto);
  const [gruppiSelezionati, setGruppiSelezionati] = useState<number[]>([]);
  const [sezioneAttiva, setSezioneAttiva] = useState(0);
  const [mostraDettaglio, setMostraDettaglio] = useState<Tesserato | null>(null);
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [pagamentiTesserato, setPagamentiTesserato] = useState<any[]>([]);
  const [uploadFoto, setUploadFoto] = useState<File | null>(null);
  const [uploadDoc, setUploadDoc] = useState<{ file: File | null; tipo: string; scadenza: string; note: string }>({ file: null, tipo: '', scadenza: '', note: '' });
  const [mostraFormGenitore, setMostraFormGenitore] = useState(false);
  const [formGenitore, setFormGenitore] = useState(formGenitoreVuoto);
  const [salvando, setSalvando] = useState(false);

  const caricaTutti = () => {
    (mostraDisabilitati ? getTuttiTesserati() : getTesserati()).then(r => { setTesserati(r.data); setLoading(false); });
    getGruppi().then(r => setGruppi(r.data));
    getGenitori().then(r => setGenitori(r.data));
  };

  useEffect(() => { caricaTutti(); }, [mostraDisabilitati]);

  const apriNuovo = () => {
    setEditingId(null); setForm(formVuoto); setGruppiSelezionati([]);
    setSezioneAttiva(0); setMostraForm(true);
  };

  const apriModifica = async (t: Tesserato) => {
    setEditingId(t.id);
    setForm({
      nome: t.nome || '', cognome: t.cognome || '', data_nascita: t.data_nascita || '',
      codice_fiscale: t.codice_fiscale || '', sesso: t.sesso || '', email: t.email || '',
      telefono: t.telefono || '', cellulare: t.cellulare || '',
      comune_nascita: t.comune_nascita || '', provincia_nascita: t.provincia_nascita || '',
      stato_nascita: t.stato_nascita || 'Italia', indirizzo: t.indirizzo || '',
      comune_residenza: t.comune_residenza || '', provincia_residenza: t.provincia_residenza || '',
      regione_residenza: t.regione_residenza || '', cap_residenza: t.cap_residenza || '',
      cod_tessera: t.cod_tessera || '', tipo_tessera: t.tipo_tessera || '',
      categoria: t.categoria || '', qualifica: t.qualifica || '', sport: t.sport || '',
      data_emissione_tessera: t.data_emissione_tessera || '',
      data_scadenza_tessera: t.data_scadenza_tessera || '',
      matricola: t.matricola || '',
      data_scadenza_certificato_medico: t.data_scadenza_certificato_medico || '',
      disabile: t.disabile || false,
      straniero: t.straniero || false, titolo_studio: t.titolo_studio || '',
      e_socio: t.e_socio, genitore_id: t.genitore_id || null,
    });
    const res = await getGruppiTesserato(t.id);
    setGruppiSelezionati(res.data);
    setSezioneAttiva(0); setMostraForm(true);
  };

  const apriDettaglio = async (t: Tesserato) => {
    setMostraDettaglio(t);
    const res = await getDocumenti(t.id);
    setDocumenti(res.data);
    const resPag = await getPagamentiTesserato(t.id);
    setPagamentiTesserato(resPag.data);
  };

  const handleIncassoTesserato = async (pagamentoId: number) => {
    const metodo = window.prompt('Metodo di pagamento (contanti / bonifico / altro):', 'contanti');
    if (metodo && ['contanti', 'bonifico', 'altro'].includes(metodo) && mostraDettaglio) {
      await registraIncasso(pagamentoId, metodo);
      const resPag = await getPagamentiTesserato(mostraDettaglio.id);
      setPagamentiTesserato(resPag.data);
    }
  };

  const handleEliminaPagamentoTesserato = async (pagamentoId: number) => {
    if (!mostraDettaglio) return;
    if (!window.confirm('Eliminare questo pagamento? L\'operazione non può essere annullata.')) return;
    await eliminaPagamento(pagamentoId);
    const resPag = await getPagamentiTesserato(mostraDettaglio.id);
    setPagamentiTesserato(resPag.data);
  };

  const handleEliminaTuttiNonPagati = async () => {
    if (!mostraDettaglio) return;
    const nonPagati = pagamentiTesserato.filter(p => !p.pagato);
    if (nonPagati.length === 0) return;
    if (!window.confirm(
      `Stai per eliminare TUTTI i ${nonPagati.length} pagamenti non ancora pagati di ${mostraDettaglio.nome} ${mostraDettaglio.cognome}.\n\n` +
      `Questa operazione è irreversibile e utile ad esempio se sono stati creati per errore. I pagamenti già incassati NON verranno toccati.\n\n` +
      `Vuoi continuare?`
    )) return;
    const res = await eliminaPagamentiNonPagatiTesserato(mostraDettaglio.id);
    const resPag = await getPagamentiTesserato(mostraDettaglio.id);
    setPagamentiTesserato(resPag.data);
    alert(`Eliminati ${res.data.eliminati} pagamenti non pagati.`);
  };

  const handleSubmit = async () => {
    if (!form.codice_fiscale.trim()) {
      const ok = window.confirm('Codice Fiscale non inserito. Vuoi continuare comunque?');
      if (!ok) return;
    }
    setSalvando(true);
    // Pulizia: converti stringhe vuote in null per i campi opzionali
    const formPulito = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
    );
    try {
      let id = editingId;
      if (editingId) {
        await aggiornaTesserato(editingId, formPulito);
      } else {
        const res = await creaTesserato(formPulito);
        id = res.data.id;
      }
      if (id) await aggiornaGruppiTesserato(id, gruppiSelezionati);
      setMostraForm(false); setEditingId(null); setForm(formVuoto);
      setGruppiSelezionati([]); caricaTutti();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Errore sconosciuto';
      alert('Errore nel salvataggio: ' + (typeof msg === 'string' ? msg : JSON.stringify(msg)));
    } finally { setSalvando(false); }
  };

  const handleEliminaDefinitivo = async (id: number, nome: string, cognome: string) => {
    if (window.confirm(`ATTENZIONE: stai per eliminare DEFINITIVAMENTE ${nome} ${cognome}.

Questa operazione è irreversibile e cancellerà anche tutti i documenti associati.

Sei sicuro?`)) {
      if (window.confirm(`Ultima conferma: eliminare definitivamente ${nome} ${cognome}?`)) {
        await eliminaTesseratoDefinitivo(id);
        setMostraForm(false);
        setEditingId(null);
        setForm(formVuoto);
        caricaTutti();
        alert(`${nome} ${cognome} è stato eliminato definitivamente.`);
      }
    }
  };

  const handleRiattiva = async (id: number) => {
    if (window.confirm('Vuoi riabilitare questo tesserato?')) {
      await riattivaTesserato(id);
      caricaTutti();
    }
  };

  const handleElimina = async (id: number) => {
    if (window.confirm('Vuoi disattivare questo tesserato?')) {
      await eliminaTesserato(id); caricaTutti();
    }
  };

  const handleConfermaEliminaBlocco = async () => {
    if (confermaTestoBlocco.trim().toUpperCase() !== 'ELIMINA') return;
    setEliminandoBlocco(true);
    try {
      const ids = filtrati.map(t => t.id);
      const res = await eliminaTesseratiInBlocco(ids);
      setMostraEliminaBlocco(false);
      caricaTutti();
      alert(`Eliminati definitivamente ${res.data.eliminati} tesserati.`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Errore durante l\'eliminazione in blocco');
    } finally {
      setEliminandoBlocco(false);
    }
  };

  const handleCaricaFoto = async () => {
    if (!uploadFoto || !mostraDettaglio) return;
    await caricaFoto(mostraDettaglio.id, uploadFoto);
    setUploadFoto(null);
    const updated = await getTesserati();
    const t = updated.data.find((x: Tesserato) => x.id === mostraDettaglio.id);
    if (t) setMostraDettaglio(t);
    setTesserati(updated.data);
  };

  const handleCaricaDoc = async () => {
    if (!uploadDoc.file || !mostraDettaglio || !uploadDoc.tipo) return;
    await caricaDocumento(mostraDettaglio.id, uploadDoc.tipo, uploadDoc.file, uploadDoc.scadenza, uploadDoc.note);
    setUploadDoc({ file: null, tipo: '', scadenza: '', note: '' });
    const res = await getDocumenti(mostraDettaglio.id);
    setDocumenti(res.data);
  };

  const handleEliminaDoc = async (docId: number) => {
    if (!mostraDettaglio) return;
    await eliminaDocumento(docId);
    const res = await getDocumenti(mostraDettaglio.id);
    setDocumenti(res.data);
  };

  const handleSalvaGenitore = async () => {
    const g = await creaGenitore(formGenitore);
    setGenitori(prev => [...prev, g.data]);
    setForm(f => ({ ...f, genitore_id: g.data.id }));
    setMostraFormGenitore(false);
    setFormGenitore(formGenitoreVuoto);
  };

  const toggleGruppo = (id: number) =>
    setGruppiSelezionati(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const campo = (label: string, key: string, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={(form as any)[key]} onChange={f(key)}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  const oggi = new Date().toISOString().split('T')[0];
  const filtrati = tesserati.filter(t => {
    if (ricerca && !`${t.nome} ${t.cognome} ${t.codice_fiscale}`.toLowerCase().includes(ricerca.toLowerCase())) return false;
    if (filtroGruppo && !(t as any).gruppi_nomi?.includes(filtroGruppo)) return false;
    if (filtroSport && t.sport !== filtroSport) return false;
    if (filtroCategoria && t.categoria !== filtroCategoria) return false;
    if (filtroAnnoNascita && !t.data_nascita?.startsWith(filtroAnnoNascita)) return false;
    if (filtroCFTemp && !t.codice_fiscale?.startsWith('TEMP_')) return false;
    if (filtroTesseraScaduta && (!t.data_scadenza_tessera || t.data_scadenza_tessera >= oggi)) return false;
    if (filtroCertificatoScaduto && (!t.data_scadenza_certificato_medico || t.data_scadenza_certificato_medico >= oggi)) return false;
    return true;
  });

  const ordinati = [...filtrati].sort((a, b) => {
    const campo = ordinamento.campo as keyof Tesserato;
    const va = (a[campo] || '') as string;
    const vb = (b[campo] || '') as string;
    return ordinamento.direzione === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const toggleOrdinamento = (campo: string) => {
    setOrdinamento(prev => prev.campo === campo
      ? { campo, direzione: prev.direzione === 'asc' ? 'desc' : 'asc' }
      : { campo, direzione: 'asc' }
    );
  };

  const icona = (campo: string) => ordinamento.campo === campo
    ? (ordinamento.direzione === 'asc' ? ' ↑' : ' ↓')
    : ' ↕';

  const sportiDisponibili = Array.from(new Set(tesserati.map(t => t.sport).filter((s): s is string => !!s)));
  const categorieDisponibili = Array.from(new Set(tesserati.map(t => t.categoria).filter((c): c is string => !!c)));
  const anniDisponibili = Array.from(new Set(tesserati.map(t => t.data_nascita?.substring(0,4)).filter((a): a is string => !!a))).sort();

  return (
    <div className="bg-gray-100 min-h-full">
      <main className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <input type="text" placeholder="Cerca per nome, cognome o CF..."
            value={ricerca} onChange={e => setRicerca(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button
            onClick={apriNuovo}
            className="bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-800 whitespace-nowrap"
          >
            + Nuovo tesserato
          </button>
          <button
            onClick={() => esportaLibroSoci()}
            className="md:ml-auto bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded text-sm font-medium whitespace-nowrap"
          >
            📑 Esporta Libro Soci
          </button>
          {ruolo === 'amministratore' && (
            <button
              onClick={() => { setPassoEliminaBlocco(1); setConfermaTestoBlocco(''); setMostraEliminaBlocco(true); }}
              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded text-sm font-medium whitespace-nowrap"
            >
              🗑 Elimina tesserati visualizzati ({filtrati.length})
            </button>
          )}
        </div>

        {/* FILTRI */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gruppo</label>
            <select value={filtroGruppo} onChange={e => setFiltroGruppo(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">Tutti i gruppi</option>
              {gruppi.map(g => <option key={g.id} value={g.nome}>{g.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sport</label>
            <select value={filtroSport} onChange={e => setFiltroSport(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">Tutti gli sport</option>
              {sportiDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Categoria</label>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">Tutte le categorie</option>
              {categorieDisponibili.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Anno di nascita</label>
            <select value={filtroAnnoNascita} onChange={e => setFiltroAnnoNascita(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">Tutti gli anni</option>
              {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-4 flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={filtroCFTemp} onChange={e => setFiltroCFTemp(e.target.checked)} />
              Solo CF temporanei da completare
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={filtroTesseraScaduta} onChange={e => setFiltroTesseraScaduta(e.target.checked)} />
              Solo tessere scadute
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={filtroCertificatoScaduto} onChange={e => setFiltroCertificatoScaduto(e.target.checked)} />
              <span className="text-red-600 font-medium">Solo certificati medici scaduti</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={mostraDisabilitati} onChange={e => setMostraDisabilitati(e.target.checked)} />
              <span className="text-orange-600 font-medium">Mostra tesserati disabilitati</span>
            </label>
          </div>

          {(filtroGruppo || filtroSport || filtroCategoria || filtroAnnoNascita || filtroCFTemp || filtroTesseraScaduta || filtroCertificatoScaduto) && (
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button onClick={() => { setFiltroGruppo(''); setFiltroSport(''); setFiltroCategoria(''); setFiltroAnnoNascita(''); setFiltroCFTemp(false); setFiltroTesseraScaduta(false); setFiltroCertificatoScaduto(false); }}
                className="text-xs text-blue-600 hover:text-blue-800">
                ✕ Rimuovi tutti i filtri ({filtrati.length} risultati)
              </button>
            </div>
          )}
        </div>

        {loading ? <p className="text-gray-500">Caricamento...</p> : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Foto</th>
                  <th className="px-4 py-3 text-left cursor-pointer select-none hover:bg-blue-700" onClick={() => toggleOrdinamento('nome')}>Nome{icona('nome')}</th>
                  <th className="px-4 py-3 text-left cursor-pointer select-none hover:bg-blue-700" onClick={() => toggleOrdinamento('cognome')}>Cognome{icona('cognome')}</th>
                  <th className="px-4 py-3 text-left cursor-pointer select-none hover:bg-blue-700" onClick={() => toggleOrdinamento('codice_fiscale')}>Codice Fiscale{icona('codice_fiscale')}</th>
                  <th className="px-4 py-3 text-left cursor-pointer select-none hover:bg-blue-700" onClick={() => toggleOrdinamento('categoria')}>Categoria{icona('categoria')}</th>
                  <th className="px-4 py-3 text-left cursor-pointer select-none hover:bg-blue-700" onClick={() => toggleOrdinamento('data_nascita')}>Nato{icona('data_nascita')}</th>
                  <th className="px-4 py-3 text-left">Telefono</th>
                  <th className="px-4 py-3 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {ordinati.map((t, i) => (
                  <tr key={t.id} className={!t.attivo ? 'bg-red-50 opacity-60' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2">
                      {t.foto_url
                        ? <img src={t.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{t.nome[0]}{t.cognome[0]}</div>
                      }
                    </td>
                    <td className="px-4 py-2">{t.nome}</td>
                    <td className="px-4 py-2">{t.cognome}</td>
                    <td className="px-4 py-2 font-mono text-xs">{t.codice_fiscale.startsWith('TEMP_') ? <span className="text-orange-500">{t.codice_fiscale}</span> : t.codice_fiscale}</td>
                    <td className="px-4 py-2">{t.categoria || '-'}</td>
                    <td className="px-4 py-2 text-xs">{t.data_nascita ? new Date(t.data_nascita).getFullYear() : '-'}</td>
                    <td className="px-4 py-2">{t.telefono || t.cellulare || '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {t.attivo ? (
                        <>
                          <button onClick={() => apriDettaglio(t)} className="text-green-600 hover:text-green-800 text-xs">Scheda</button>
                          <button onClick={() => apriModifica(t)} className="text-blue-600 hover:text-blue-800 text-xs">Modifica</button>
                        </>
                      ) : (
                        <button onClick={() => handleRiattiva(t.id)} className="text-orange-600 hover:text-orange-800 text-xs font-medium">Riabilita</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtrati.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nessun tesserato trovato</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* FORM NUOVO/MODIFICA */}
        {mostraForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Modifica Tesserato' : 'Nuovo Tesserato'}</h2>
                <button onClick={() => setMostraForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              <div className="flex border-b overflow-x-auto">
                {SEZIONI.map((s, i) => (
                  <button key={s} onClick={() => setSezioneAttiva(i)}
                    className={`px-4 py-2 text-sm whitespace-nowrap ${sezioneAttiva === i ? 'border-b-2 border-blue-700 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4">
                {sezioneAttiva === 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {campo('Nome *', 'nome')}
                    {campo('Cognome *', 'cognome')}
                    {campo('Data di nascita *', 'data_nascita', 'date')}
                    {campo('Codice Fiscale', 'codice_fiscale')}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sesso</label>
                      <select value={form.sesso} onChange={f('sesso')} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                        <option value="">-</option>
                        <option value="M">Maschio</option>
                        <option value="F">Femmina</option>
                      </select>
                    </div>
                    {campo('Email', 'email', 'email')}
                    {campo('Telefono', 'telefono')}
                    {campo('Cellulare', 'cellulare')}
                    {campo('Titolo di studio', 'titolo_studio')}
                    <div className="col-span-2 flex gap-6 mt-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.e_socio} onChange={f('e_socio')} /> È socio
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.disabile} onChange={f('disabile')} /> Disabile
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.straniero} onChange={f('straniero')} /> Straniero
                      </label>
                    </div>
                  </div>
                )}

                {sezioneAttiva === 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1 mb-1">Luogo di nascita</div>
                    {campo('Comune di nascita', 'comune_nascita')}
                    {campo('Provincia nascita', 'provincia_nascita')}
                    {campo('Stato di nascita', 'stato_nascita')}
                    <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Residenza</div>
                    {campo('Indirizzo', 'indirizzo')}
                    {campo('Comune', 'comune_residenza')}
                    {campo('Provincia', 'provincia_residenza')}
                    {campo('Regione', 'regione_residenza')}
                    {campo('CAP', 'cap_residenza')}
                  </div>
                )}

                {sezioneAttiva === 2 && (
                  <div className="grid grid-cols-2 gap-3">
                    {campo('Cod. Tessera', 'cod_tessera')}
                    {campo('Tipo tessera', 'tipo_tessera')}
                    {campo('Categoria', 'categoria')}
                    {campo('Qualifica', 'qualifica')}
                    {campo('Sport', 'sport')}
                    {campo('Matricola', 'matricola')}
                    {campo('Data emissione', 'data_emissione_tessera', 'date')}
                    {campo('Data scadenza', 'data_scadenza_tessera', 'date')}
                    <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Certificato medico sportivo</div>
                    <div>
                      {campo('Scadenza certificato medico', 'data_scadenza_certificato_medico', 'date')}
                      {form.data_scadenza_certificato_medico && (
                        <BadgeScadenza data={form.data_scadenza_certificato_medico} />
                      )}
                    </div>
                  </div>
                )}

                {sezioneAttiva === 3 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-3">Seleziona i gruppi/corsi a cui appartiene questo tesserato</p>
                    <div className="flex flex-wrap gap-2">
                      {gruppi.map(g => (
                        <button type="button" key={g.id} onClick={() => toggleGruppo(g.id)}
                          className={`px-3 py-1.5 rounded-full text-sm border ${gruppiSelezionati.includes(g.id) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                          {g.nome}
                        </button>
                      ))}
                      {gruppi.length === 0 && <p className="text-xs text-gray-400">Nessun gruppo creato</p>}
                    </div>
                  </div>
                )}

                {sezioneAttiva === 4 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-3">Collega un genitore a questo tesserato (obbligatorio per i minorenni)</p>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Seleziona genitore esistente</label>
                      <select value={form.genitore_id || ''} onChange={e => setForm(f => ({ ...f, genitore_id: e.target.value ? parseInt(e.target.value) : null }))}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                        <option value="">-- Nessun genitore --</option>
                        {genitori.map(g => (
                          <option key={g.id} value={g.id}>{g.cognome} {g.nome} {g.email ? `(${g.email})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={() => setMostraFormGenitore(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded px-3 py-1.5">
                      + Crea nuovo genitore
                    </button>

                    {mostraFormGenitore && (
                      <div className="mt-4 border border-gray-200 rounded p-4 bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nuovo genitore</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {['nome', 'cognome', 'email', 'telefono', 'documento_tipo', 'documento_numero'].map(k => (
                            <div key={k}>
                              <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{k.replace('_', ' ')}</label>
                              <input type="text" value={(formGenitore as any)[k]}
                                onChange={e => setFormGenitore(f => ({ ...f, [k]: e.target.value }))}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={handleSalvaGenitore} className="bg-blue-700 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-800">Salva genitore</button>
                          <button onClick={() => setMostraFormGenitore(false)} className="text-gray-500 text-sm">Annulla</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t flex justify-between items-center">
                <div className="flex gap-2">
                  {sezioneAttiva > 0 && <button onClick={() => setSezioneAttiva(s => s - 1)} className="text-sm text-gray-600 hover:text-gray-800">← Indietro</button>}
                  {editingId && (
                    <div className="flex gap-2 ml-2">
                      <button onClick={() => { handleElimina(editingId); setMostraForm(false); }}
                        className="px-3 py-2 bg-orange-500 text-white rounded text-xs hover:bg-orange-700">
                        Disattiva
                      </button>
                      <button onClick={() => handleEliminaDefinitivo(editingId, form.nome, form.cognome)}
                        className="px-3 py-2 bg-red-700 text-white rounded text-xs hover:bg-red-900">
                        🗑 Elimina
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  {sezioneAttiva < SEZIONI.length - 1 && (
                    <button onClick={() => setSezioneAttiva(s => s + 1)} className="px-4 py-2 text-blue-700 border border-blue-700 rounded text-sm hover:bg-blue-50">Avanti →</button>
                  )}
                  <button onClick={handleSubmit} disabled={salvando} className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50">
                    {salvando ? 'Salvataggio...' : '✓ Salva'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCHEDA DETTAGLIO */}
        {mostraDettaglio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">{mostraDettaglio.nome} {mostraDettaglio.cognome}</h2>
                <button onClick={() => setMostraDettaglio(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

                {/* FOTO */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Foto</h3>
                  <div className="flex items-center gap-4">
                    {mostraDettaglio.foto_url
                      ? <img src={mostraDettaglio.foto_url} alt="foto" className="w-24 h-24 rounded-full object-cover border-2 border-blue-200" />
                      : <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">{mostraDettaglio.nome[0]}{mostraDettaglio.cognome[0]}</div>
                    }
                    <div>
                      <input type="file" accept="image/*" onChange={e => setUploadFoto(e.target.files?.[0] || null)}
                        className="text-sm text-gray-600 mb-2 block" />
                      {uploadFoto && <button onClick={handleCaricaFoto} className="bg-blue-700 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-800">Carica foto</button>}
                    </div>
                  </div>
                </div>

                {/* DATI PRINCIPALI */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Dati anagrafici</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ['CF', mostraDettaglio.codice_fiscale], ['Data nascita', formatDate(mostraDettaglio.data_nascita)],
                      ['Email', mostraDettaglio.email], ['Telefono', mostraDettaglio.telefono],
                      ['Cellulare', mostraDettaglio.cellulare], ['Categoria', mostraDettaglio.categoria],
                      ['Tessera', mostraDettaglio.cod_tessera], ['Scad. tessera', mostraDettaglio.data_scadenza_tessera ? formatDate(mostraDettaglio.data_scadenza_tessera) : ''],
                    ].map(([label, val]) => val ? (
                      <div key={label as string}>
                        <span className="text-gray-500 text-xs">{label}</span>
                        <p className="font-medium">{val as string}</p>
                      </div>
                    ) : null)}
                    {mostraDettaglio.data_scadenza_certificato_medico && (
                      <div>
                        <span className="text-gray-500 text-xs">Scad. certificato medico</span>
                        <p className="font-medium">{formatDate(mostraDettaglio.data_scadenza_certificato_medico)}</p>
                        <BadgeScadenza data={mostraDettaglio.data_scadenza_certificato_medico} />
                      </div>
                    )}
                  </div>
                </div>

                {/* DOCUMENTI */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Documenti</h3>
                  {documenti.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {documenti.map(d => (
                        <div key={d.id} className="flex justify-between items-center bg-gray-50 rounded px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{d.tipo}</span>
                            <span className="text-gray-500 ml-2 text-xs">{d.nome_file}</span>
                            {d.data_scadenza && <span className="text-orange-500 ml-2 text-xs">scad. {formatDate(d.data_scadenza)}</span>}
                          </div>
                          <div className="flex gap-3">
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs">
                              {d.nome_file.toLowerCase().endsWith('.pdf') ? '📄 Apri' : '🖼 Apri'}
                            </a>
                            <a href={d.url} download={d.nome_file} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 text-xs">⬇ Scarica</a>
                            <button onClick={() => handleEliminaDoc(d.id)} className="text-red-500 hover:text-red-700 text-xs">Elimina</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm mb-4">Nessun documento caricato</p>}

                  <div className="border border-gray-200 rounded p-3 bg-gray-50">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Carica nuovo documento</h4>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Tipo documento</label>
                        <select value={uploadDoc.tipo} onChange={e => setUploadDoc(d => ({ ...d, tipo: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                          <option value="">Seleziona tipo...</option>
                          <option>Certificato idoneità sportiva</option>
                          <option>Documento di identità</option>
                          <option>Modulo iscrizione</option>
                          <option>Consenso trattamento dati</option>
                          <option>Liberatoria foto/video</option>
                          <option>Regolamento sociale firmato</option>
                          <option>Altro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Data scadenza</label>
                        <input type="date" value={uploadDoc.scadenza} onChange={e => setUploadDoc(d => ({ ...d, scadenza: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                    <input type="file" onChange={e => setUploadDoc(d => ({ ...d, file: e.target.files?.[0] || null }))}
                      className="text-sm text-gray-600 mb-2 block" />
                    {uploadDoc.file && uploadDoc.tipo && (
                      <button onClick={handleCaricaDoc} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
                        Carica documento
                      </button>
                    )}
                  </div>
                </div>

                {/* MODULI PRECOMPILATI */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Moduli precompilati</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Generati con i dati anagrafici già presenti (e del genitore, se il tesserato è minorenne). Da stampare e far firmare.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => scaricaModuloAdesione(mostraDettaglio.id, `adesione_${mostraDettaglio.cognome}_${mostraDettaglio.nome}.pdf`)}
                      className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded text-sm font-medium"
                    >
                      📄 Modulo Adesione
                    </button>
                    <button
                      onClick={() => scaricaModuloTesseramento(mostraDettaglio.id, `tesseramento_${mostraDettaglio.cognome}_${mostraDettaglio.nome}.pdf`)}
                      className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded text-sm font-medium"
                    >
                      📄 Lettera di Tesseramento
                    </button>
                  </div>
                </div>

                {/* SCADENZE PAGAMENTI */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">💳 Scadenze pagamenti</h3>
                    {pagamentiTesserato.some(p => !p.pagato) && (
                      <button onClick={handleEliminaTuttiNonPagati} className="text-red-500 hover:text-red-700 text-xs font-medium">
                        🗑 Elimina tutti i non pagati
                      </button>
                    )}
                  </div>
                  {pagamentiTesserato.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nessun pagamento associato a questo tesserato</p>
                  ) : (
                    <div className="space-y-2">
                      {pagamentiTesserato.map((p) => {
                        const scaduto = !p.pagato && p.data_scadenza < new Date().toISOString().split('T')[0];
                        return (
                          <div key={p.id} className={`flex justify-between items-center rounded-lg px-3 py-2 text-sm ${
                            p.pagato ? 'bg-green-50' : scaduto ? 'bg-red-50' : 'bg-yellow-50'
                          }`}>
                            <div>
                              <span className="font-medium">{p.descrizione || `Tariffa #${p.tariffa_id}`}</span>
                              <span className="text-gray-500 ml-2 text-xs">scad. {formatDate(p.data_scadenza)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">€ {Number(p.importo).toFixed(2)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.pagato ? 'bg-green-100 text-green-700' : scaduto ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {p.pagato ? 'Pagato' : scaduto ? 'Scaduto' : 'In attesa'}
                              </span>
                              {!p.pagato && (
                                <>
                                  <button onClick={() => handleIncassoTesserato(p.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">
                                    Incassa
                                  </button>
                                  <button onClick={() => handleEliminaPagamentoTesserato(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                                    Elimina
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <a href="/pagamenti" className="inline-block mt-3 text-xs text-blue-600 hover:underline">
                    Gestisci tutti i pagamenti nella sezione Contabilità →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ELIMINAZIONE IN BLOCCO DEI TESSERATI VISUALIZZATI (solo amministratore) */}
        {mostraEliminaBlocco && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg border-t-4 border-red-600">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">⚠️</span>
                <h2 className="text-lg font-bold text-red-700">Eliminazione in blocco</h2>
              </div>

              {passoEliminaBlocco === 1 ? (
                <>
                  <p className="text-sm text-gray-700 mb-3">
                    Stai per eliminare <strong>DEFINITIVAMENTE</strong> tutti i <strong>{filtrati.length} tesserati attualmente visualizzati</strong> con
                    i filtri correnti (documenti, pagamenti e presenze collegate verranno eliminati insieme a loro).
                  </p>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-4 bg-gray-50">
                    {filtrati.slice(0, 50).map(t => (
                      <p key={t.id} className="text-xs text-gray-600 py-0.5">{t.cognome} {t.nome}</p>
                    ))}
                    {filtrati.length > 50 && <p className="text-xs text-gray-400 pt-1">...e altri {filtrati.length - 50}</p>}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Questa operazione <strong>non può essere annullata</strong>. Se hai applicato un filtro sbagliato, chiudi questa finestra e correggilo prima di procedere.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setMostraEliminaBlocco(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annulla</button>
                    <button onClick={() => setPassoEliminaBlocco(2)} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                      Continua →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    Ultima conferma: stai per eliminare <strong>{filtrati.length} tesserati</strong> in modo permanente.
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    Per confermare, scrivi <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">ELIMINA</span> qui sotto:
                  </p>
                  <input
                    type="text"
                    value={confermaTestoBlocco}
                    onChange={e => setConfermaTestoBlocco(e.target.value)}
                    placeholder="Scrivi ELIMINA per confermare"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
                    autoFocus
                  />
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setPassoEliminaBlocco(1)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">← Indietro</button>
                    <button
                      onClick={handleConfermaEliminaBlocco}
                      disabled={confermaTestoBlocco.trim().toUpperCase() !== 'ELIMINA' || eliminandoBlocco}
                      className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {eliminandoBlocco ? 'Eliminazione in corso...' : `Elimina definitivamente ${filtrati.length} tesserati`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tesserati;
