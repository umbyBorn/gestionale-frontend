import React, { useEffect, useState } from 'react';
import { getGruppi, getTesserati, getTesseratiGruppo, inviaMessaggio, getMessaggiInviati } from '../services/api';

interface Gruppo {
  id: number;
  nome: string;
}

interface Tesserato {
  id: number;
  nome: string;
  cognome: string;
}

interface MessaggioInviato {
  id: number;
  intestazione: string;
  corpo: string;
  data_invio: string;
  destinatari: { tesserato_id: number; nome: string; cognome: string; email_inviata: boolean }[];
}

const Messaggi: React.FC = () => {
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [tuttiTesserati, setTuttiTesserati] = useState<Tesserato[]>([]);
  const [gruppiSelezionati, setGruppiSelezionati] = useState<number[]>([]);
  const [destinatari, setDestinatari] = useState<Tesserato[]>([]);
  const [esclusi, setEsclusi] = useState<number[]>([]);
  const [aggiuntivi, setAggiuntivi] = useState<Tesserato[]>([]);
  const [tesseratoDaAggiungere, setTesseratoDaAggiungere] = useState<string>('');
  const [intestazione, setIntestazione] = useState('');
  const [corpo, setCorpo] = useState('');
  const [invio, setInvio] = useState(false);
  const [storico, setStorico] = useState<MessaggioInviato[]>([]);
  const [mostraStorico, setMostraStorico] = useState(false);

  useEffect(() => {
    getGruppi().then((res) => setGruppi(res.data));
    getTesserati().then((res) => setTuttiTesserati(res.data));
  }, []);

  useEffect(() => {
    if (gruppiSelezionati.length === 0) {
      setDestinatari([]);
      return;
    }
    Promise.all(gruppiSelezionati.map((id) => getTesseratiGruppo(id))).then((risposte) => {
      const mappa = new Map<number, Tesserato>();
      risposte.forEach((res) => {
        res.data.forEach((t: Tesserato) => mappa.set(t.id, t));
      });
      setDestinatari(Array.from(mappa.values()));
    });
    setEsclusi([]);
  }, [gruppiSelezionati]);

  const toggleGruppo = (id: number) => {
    setGruppiSelezionati((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const rimuoviDestinatario = (id: number) => {
    setEsclusi((prev) => [...prev, id]);
  };

  const riaggiungiDestinatario = (id: number) => {
    setEsclusi((prev) => prev.filter((e) => e !== id));
  };

  const aggiungiTesseratoExtra = () => {
    const id = parseInt(tesseratoDaAggiungere);
    if (!id) return;
    const t = tuttiTesserati.find((x) => x.id === id);
    if (t && !aggiuntivi.some((a) => a.id === id) && !destinatari.some((d) => d.id === id)) {
      setAggiuntivi((prev) => [...prev, t]);
    }
    setTesseratoDaAggiungere('');
  };

  const rimuoviAggiuntivo = (id: number) => {
    setAggiuntivi((prev) => prev.filter((a) => a.id !== id));
  };

  const elencoFinale = [
    ...destinatari.filter((d) => !esclusi.includes(d.id)),
    ...aggiuntivi,
  ];

  const handleInvia = async () => {
    if (!intestazione.trim() || !corpo.trim()) {
      alert('Inserisci intestazione e corpo del messaggio');
      return;
    }
    if (elencoFinale.length === 0) {
      alert('Seleziona almeno un destinatario');
      return;
    }
    setInvio(true);
    try {
      await inviaMessaggio({
        intestazione,
        corpo,
        gruppi_id: gruppiSelezionati,
        tesserati_esclusi_id: esclusi,
        tesserati_aggiuntivi_id: aggiuntivi.map((a) => a.id),
      });
      alert(`Messaggio inviato a ${elencoFinale.length} destinatari`);
      setIntestazione('');
      setCorpo('');
      setGruppiSelezionati([]);
      setEsclusi([]);
      setAggiuntivi([]);
    } catch (e) {
      alert('Errore durante l\'invio del messaggio');
    } finally {
      setInvio(false);
    }
  };

  const apriStorico = () => {
    getMessaggiInviati().then((res) => setStorico(res.data));
    setMostraStorico(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white hover:text-blue-200 text-sm">← Dashboard</a>
          <h1 className="text-xl font-bold">Messaggio Broadcast</h1>
        </div>
        <button onClick={apriStorico} className="bg-white text-blue-800 px-4 py-1 rounded font-medium text-sm hover:bg-blue-50">
          Storico messaggi
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">1. Seleziona uno o più gruppi</h2>
          <div className="flex flex-wrap gap-2">
            {gruppi.map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGruppo(g.id)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  gruppiSelezionati.includes(g.id)
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {g.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            2. Destinatari ({elencoFinale.length})
          </h2>

          {destinatari.length === 0 && aggiuntivi.length === 0 ? (
            <p className="text-gray-400 text-sm">Seleziona un gruppo o aggiungi un tesserato manualmente</p>
          ) : (
            <div className="space-y-1 mb-4 max-h-64 overflow-y-auto">
              {destinatari.map((t) => {
                const escluso = esclusi.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className={`flex justify-between items-center px-3 py-2 rounded text-sm ${
                      escluso ? 'bg-gray-50 text-gray-400 line-through' : 'bg-blue-50'
                    }`}
                  >
                    <span>{t.nome} {t.cognome}</span>
                    {escluso ? (
                      <button onClick={() => riaggiungiDestinatario(t.id)} className="text-xs text-blue-600 hover:text-blue-800 no-underline">
                        Riaggiungi
                      </button>
                    ) : (
                      <button onClick={() => rimuoviDestinatario(t.id)} className="text-xs text-red-500 hover:text-red-700">
                        Rimuovi
                      </button>
                    )}
                  </div>
                );
              })}
              {aggiuntivi.map((t) => (
                <div key={`extra-${t.id}`} className="flex justify-between items-center px-3 py-2 rounded text-sm bg-green-50">
                  <span>{t.nome} {t.cognome} <span className="text-xs text-green-700">(aggiunto)</span></span>
                  <button onClick={() => rimuoviAggiuntivo(t.id)} className="text-xs text-red-500 hover:text-red-700">
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center border-t pt-4">
            <select
              value={tesseratoDaAggiungere}
              onChange={(e) => setTesseratoDaAggiungere(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Aggiungi tesserato non presente nei gruppi selezionati...</option>
              {tuttiTesserati
                .filter((t) => !destinatari.some((d) => d.id === t.id) && !aggiuntivi.some((a) => a.id === t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.nome} {t.cognome}</option>
                ))}
            </select>
            <button onClick={aggiungiTesseratoExtra} className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800">
              Aggiungi
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">3. Scrivi il messaggio</h2>
          <input
            type="text"
            placeholder="Intestazione (es. Comunicazione importante)"
            value={intestazione}
            onChange={(e) => setIntestazione(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Scrivi qui il corpo del messaggio..."
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleInvia}
            disabled={invio}
            className="mt-4 w-full bg-blue-700 text-white py-2.5 rounded font-medium text-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {invio ? 'Invio in corso...' : `Invia a ${elencoFinale.length} destinatari`}
          </button>
        </div>
      </main>

      {mostraStorico && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Storico messaggi inviati</h2>
              <button onClick={() => setMostraStorico(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {storico.length === 0 ? (
              <p className="text-gray-400 text-sm">Nessun messaggio inviato finora</p>
            ) : (
              <div className="space-y-4">
                {storico.map((m) => (
                  <div key={m.id} className="border border-gray-200 rounded p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-800">{m.intestazione}</h3>
                      <span className="text-xs text-gray-400">{new Date(m.data_invio).toLocaleString('it-IT')}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{m.corpo}</p>
                    <p className="text-xs text-gray-400">
                      {m.destinatari.length} destinatari · {m.destinatari.filter((d) => d.email_inviata).length} email inviate
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Messaggi;
