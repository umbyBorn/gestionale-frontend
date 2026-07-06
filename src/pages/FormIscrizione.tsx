import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API = 'https://gestionale-sport-api.onrender.com';

const FormIscrizione: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [modulo, setModulo] = useState<{ nome_modulo: string } | null>(null);
  const [errore, setErrore] = useState('');
  const [inviato, setInviato] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invio, setInvio] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: '', cognome: '', data_nascita: '', codice_fiscale: '',
    sesso: '', email: '', telefono: '', cellulare: '', sport: '',
    comune_nascita: '', provincia_nascita: '', stato_nascita: 'Italia',
    indirizzo: '', comune_residenza: '', provincia_residenza: '', cap_residenza: '',
    genitore_nome: '', genitore_cognome: '', genitore_email: '',
    genitore_telefono: '', genitore_documento_tipo: '', genitore_documento_numero: '',
    consenso_privacy: false, note: '',
  });

  useEffect(() => {
    fetch(`${API}/iscriviti/${token}`)
      .then(r => r.json())
      .then(d => { if (d.id) setModulo(d); else setErrore('Modulo non trovato'); })
      .catch(() => setErrore('Errore nel caricamento del modulo'))
      .finally(() => setLoading(false));
  }, [token]);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const isMinorenne = () => {
    if (!form.data_nascita) return false;
    const eta = new Date().getFullYear() - new Date(form.data_nascita).getFullYear();
    return eta < 18;
  };

  const handleInvia = async () => {
    if (!form.nome || !form.cognome || !form.data_nascita) {
      alert('Compila i campi obbligatori (nome, cognome, data di nascita)');
      return;
    }
    if (!form.consenso_privacy) {
      alert('Devi accettare la privacy policy per procedere');
      return;
    }
    setInvio(true);
    try {
      const res = await fetch(`${API}/iscriviti/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) setInviato(true);
      else alert(data.detail || 'Errore durante l\'invio');
    } catch { alert('Errore di connessione'); }
    finally { setInvio(false); }
  };

  const campo = (label: string, key: string, type = 'text', required = false) => (
    <div key={key}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input type={type} value={(form as any)[key]} onChange={f(key)} required={required}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
      <p className="text-gray-500">Caricamento...</p>
    </div>
  );

  if (errore) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
        <p className="text-4xl mb-4">❌</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Modulo non disponibile</h2>
        <p className="text-gray-500 text-sm">{errore}</p>
      </div>
    </div>
  );

  if (inviato) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
        <p className="text-6xl mb-4">🎉</p>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Iscrizione inviata!</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          La tua richiesta è stata ricevuta. La segreteria la verificherà e ti contatterà presto per confermare l'iscrizione.
        </p>
        <div className="mt-6 bg-green-50 rounded-xl p-4">
          <p className="text-green-700 text-sm font-medium">✓ Dati ricevuti correttamente</p>
          <p className="text-green-600 text-xs mt-1">Conserva questa pagina come conferma</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-8 text-center">
        <p className="text-4xl mb-3">⚽</p>
        <h1 className="text-2xl font-bold">{modulo?.nome_modulo}</h1>
        <p className="text-blue-200 text-sm mt-1">Compila il modulo per iscriverti</p>
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-white px-6 py-3 border-b shadow-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>1. Dati personali</span>
            <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>2. Residenza</span>
            {isMinorenne() && <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>3. Genitore</span>}
            <span className={step >= (isMinorenne() ? 4 : 3) ? 'text-blue-600 font-medium' : ''}>Privacy</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full">
            <div className="h-1.5 bg-blue-600 rounded-full transition-all"
              style={{ width: `${(step / (isMinorenne() ? 4 : 3)) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">

          {/* STEP 1: DATI PERSONALI */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800 text-lg mb-4">👤 Dati personali</h2>
              <div className="grid grid-cols-2 gap-4">
                {campo('Nome', 'nome', 'text', true)}
                {campo('Cognome', 'cognome', 'text', true)}
              </div>
              {campo('Data di nascita', 'data_nascita', 'date', true)}
              {isMinorenne() && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                  ⚠️ Il tesserato è minorenne — sarà richiesto di compilare i dati del genitore nel passo successivo
                </div>
              )}
              {campo('Codice Fiscale', 'codice_fiscale')}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sesso</label>
                <select value={form.sesso} onChange={f('sesso')} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleziona...</option>
                  <option value="M">Maschio</option>
                  <option value="F">Femmina</option>
                </select>
              </div>
              {campo('Email', 'email', 'email')}
              {campo('Telefono', 'telefono')}
              {campo('Cellulare', 'cellulare')}
              {campo('Sport praticato', 'sport')}
              <div className="grid grid-cols-2 gap-4">
                {campo('Comune di nascita', 'comune_nascita')}
                {campo('Provincia nascita', 'provincia_nascita')}
              </div>
              {campo('Stato di nascita', 'stato_nascita')}
            </div>
          )}

          {/* STEP 2: RESIDENZA */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800 text-lg mb-4">🏠 Residenza</h2>
              {campo('Indirizzo', 'indirizzo')}
              {campo('Comune', 'comune_residenza')}
              <div className="grid grid-cols-2 gap-4">
                {campo('Provincia', 'provincia_residenza')}
                {campo('CAP', 'cap_residenza')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note aggiuntive</label>
                <textarea value={form.note} onChange={f('note')} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Eventuali note o informazioni aggiuntive..." />
              </div>
            </div>
          )}

          {/* STEP 3: GENITORE (solo minorenni) */}
          {step === 3 && isMinorenne() && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800 text-lg mb-4">👨‍👩‍👧 Dati genitore/tutore</h2>
              <p className="text-sm text-gray-500">Il tesserato è minorenne — è necessario inserire i dati del genitore o tutore legale.</p>
              <div className="grid grid-cols-2 gap-4">
                {campo('Nome genitore', 'genitore_nome', 'text', true)}
                {campo('Cognome genitore', 'genitore_cognome', 'text', true)}
              </div>
              {campo('Email genitore', 'genitore_email', 'email')}
              {campo('Telefono genitore', 'genitore_telefono')}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
                <select value={form.genitore_documento_tipo} onChange={f('genitore_documento_tipo')}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleziona...</option>
                  <option>Carta d'identità</option>
                  <option>Passaporto</option>
                  <option>Patente</option>
                </select>
              </div>
              {campo('Numero documento', 'genitore_documento_numero')}
            </div>
          )}

          {/* STEP PRIVACY */}
          {step === (isMinorenne() ? 4 : 3) && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800 text-lg mb-4">🔒 Privacy e consenso</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 leading-relaxed max-h-48 overflow-y-auto">
                <p className="font-semibold mb-2">Informativa sul trattamento dei dati personali</p>
                <p>I dati forniti verranno trattati dall'associazione sportiva nel rispetto del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003.</p>
                <p className="mt-2">I dati saranno utilizzati esclusivamente per la gestione dell'iscrizione, la comunicazione con i soci e gli adempimenti federali. I dati non saranno ceduti a terzi senza esplicito consenso.</p>
                <p className="mt-2">Il titolare del trattamento è l'associazione sportiva. L'interessato ha diritto di accesso, rettifica, cancellazione e opposizione al trattamento.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.consenso_privacy}
                  onChange={e => setForm(f => ({ ...f, consenso_privacy: e.target.checked }))}
                  className="mt-1 w-5 h-5 rounded" />
                <span className="text-sm text-gray-700">
                  <strong>Accetto</strong> il trattamento dei miei dati personali come descritto nell'informativa sulla privacy. <span className="text-red-500">*</span>
                </span>
              </label>

              {/* RIEPILOGO */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">📋 Riepilogo iscrizione</p>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Tesserato:</strong> {form.nome} {form.cognome}</p>
                  <p><strong>Data di nascita:</strong> {form.data_nascita}</p>
                  {form.email && <p><strong>Email:</strong> {form.email}</p>}
                  {form.sport && <p><strong>Sport:</strong> {form.sport}</p>}
                  {isMinorenne() && form.genitore_nome && (
                    <p><strong>Genitore:</strong> {form.genitore_nome} {form.genitore_cognome}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NAVIGAZIONE */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                ← Indietro
              </button>
            )}
            {step < (isMinorenne() ? 4 : 3) ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex-1 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800">
                Avanti →
              </button>
            ) : (
              <button onClick={handleInvia} disabled={invio || !form.consenso_privacy}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                {invio ? 'Invio in corso...' : '✓ Invia iscrizione'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormIscrizione;
