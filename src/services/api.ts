import axios from 'axios';

// In produzione (Render) punta all'API online. Nella build locale/offline
// (vedi local_app/) viene sovrascritta a build-time con REACT_APP_API_URL
// impostata su http://127.0.0.1:<porta locale>.
const API_URL = process.env.REACT_APP_API_URL || 'https://gestionale-sport-api.onrender.com';

const api = axios.create({
  baseURL: API_URL,
});

// Aggiunge automaticamente il token JWT a ogni richiesta
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Reindirizza al login se il token è scaduto
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- AUTH ----
export const login = (email: string, password: string) =>
  api.post('/auth/login', new URLSearchParams({ username: email, password }));

export const getMe = () => api.get('/auth/me');

// ---- TESSERATI ----
export const getTesserati = () => api.get('/tesserati/');
export const getTesserato = (id: number) => api.get(`/tesserati/${id}`);
export const creaTesserato = (data: any) => api.post('/tesserati/', data);
export const aggiornaTesserato = (id: number, data: any) => api.put(`/tesserati/${id}`, data);
export const eliminaTesserato = (id: number) => api.delete(`/tesserati/${id}`);

// ---- GRUPPI ----
export const getGruppi = () => api.get('/gruppi/');
export const creaGruppo = (data: any) => api.post('/gruppi/', data);
export const aggiornaGruppo = (id: number, data: any) => api.put(`/gruppi/${id}`, data);
export const eliminaGruppo = (id: number) => api.delete(`/gruppi/${id}`);

// ---- PAGAMENTI ----
export const getPagamenti = () => api.get('/pagamenti/');
export const getPagamentiTesserato = (tesseratoId: number) => api.get(`/pagamenti/tesserato/${tesseratoId}`);
export const getPagamentiScaduti = () => api.get('/pagamenti/scaduti/');
export const creaPagamento = (data: any) => api.post('/pagamenti/', data);
export const aggiornaPagamento = (id: number, data: any) => api.put(`/pagamenti/${id}`, data);
export const eliminaPagamento = (id: number) => api.delete(`/pagamenti/${id}`);
export const eliminaPagamentiNonPagatiTesserato = (tesseratoId: number) =>
  api.delete(`/pagamenti/tesserato/${tesseratoId}/non-pagati`);
export const registraIncasso = (id: number, metodo: string) =>
  api.put(`/pagamenti/${id}/registra-incasso?metodo=${metodo}`);

// Generazione automatica scadenze (es. Iscrizione + quote Settembre-Giugno)
export const generaPianoScadenze = (data: any) => api.post('/pagamenti/piano-scadenze', data);
// Pagamenti ad hoc di gruppo (completino, gita, torneo...)
export const creaPagamentoGruppo = (data: any) => api.post('/pagamenti/gruppo', data);
export const getPagamentiBatch = (batchId: string) => api.get(`/pagamenti/batch/${batchId}`);
export const modificaBatch = (batchId: string, data: any) => api.put(`/pagamenti/batch/${batchId}`, data);
export const eliminaBatch = (batchId: string, soloNonPagati = true) =>
  api.delete(`/pagamenti/batch/${batchId}?solo_non_pagati=${soloNonPagati}`);

// ---- PRIMA NOTA ----
export const getMovimenti = (params?: { data_da?: string; data_a?: string; tipo?: string; categoria?: string }) =>
  api.get('/prima-nota/', { params });
export const creaMovimento = (data: any) => api.post('/prima-nota/', data);
export const aggiornaMovimento = (id: number, data: any) => api.put(`/prima-nota/${id}`, data);
export const eliminaMovimento = (id: number) => api.delete(`/prima-nota/${id}`);

// ---- RENDICONTO ----
export const getRendiconto = (data_da?: string, data_a?: string) =>
  api.get('/rendiconto/', { params: { data_da, data_a } });

// ---- TARIFFE ----
export const getTariffe = () => api.get('/tariffe/');
export const creaTariffa = (data: any) => api.post('/tariffe/', data);

// ---- STAFF ----
export const getStaff = () => api.get('/staff/');
export const creaStaff = (data: any) => api.post('/staff/', data);
export const aggiornaStaff = (id: number, data: any) => api.put(`/staff/${id}`, data);
export const eliminaStaff = (id: number) => api.delete(`/staff/${id}`);
export const getGruppiStaff = (id: number) => api.get(`/staff/${id}/gruppi`);
export const aggiornaGruppiStaff = (id: number, gruppo_ids: number[]) => api.put(`/staff/${id}/gruppi`, { gruppo_ids });

// ---- COMPENSI ----
export const getCompensiStaff = (staffId: number) => api.get(`/staff/${staffId}/compensi`);
export const creaCompenso = (data: any) => api.post('/compensi/', data);
export const aggiornaCompenso = (id: number, data: any) => api.put(`/compensi/${id}`, data);
export const eliminaCompenso = (id: number) => api.delete(`/compensi/${id}`);

// ---- CONTRATTI ----
export const getContrattiStaff = (staffId: number) => api.get(`/staff/${staffId}/contratti`);
export const creaContratto = (data: any) => api.post('/contratti/', data);
export const aggiornaContratto = (id: number, data: any) => api.put(`/contratti/${id}`, data);
export const eliminaContratto = (id: number) => api.delete(`/contratti/${id}`);

// ---- EVENTI E PRESENZE ----
export const getEventi = () => api.get('/eventi/');
export const creaEvento = (data: any) => api.post('/eventi/', data);
export const modificaEvento = (eventoId: number, data: any) => api.put(`/eventi/${eventoId}`, data);
export const eliminaEvento = (eventoId: number) => api.delete(`/eventi/${eventoId}`);
export const eliminaOccorrenza = (eventoId: number, forzaConPresenze = false) =>
  api.delete(`/eventi/${eventoId}/occorrenza?forza_con_presenze=${forzaConPresenze}`);

// ---- EVENTI RICORRENTI (creazione/modifica/eliminazione in blocco) ----
export const getEventiRicorrenti = () => api.get('/eventi-ricorrenti/');
export const creaEventoRicorrente = (data: any) => api.post('/eventi-ricorrenti/', data);
export const modificaEventoRicorrente = (id: number, data: any) => api.put(`/eventi-ricorrenti/${id}`, data);
export const eliminaEventoRicorrente = (id: number, eliminaFuturi = true, forzaConPresenze = false) =>
  api.delete(`/eventi-ricorrenti/${id}?elimina_futuri=${eliminaFuturi}&forza_con_presenze=${forzaConPresenze}`);
export const getPresenzeEvento = (eventoId: number) => api.get(`/eventi/${eventoId}/presenze`);
export const registraPresenza = (data: any) => api.post('/presenze/', data);

// ---- ASSEMBLEE ----
export const getAssemblee = () => api.get('/assemblee/');
export const getAssemblea = (id: number) => api.get(`/assemblee/${id}`);
export const creaAssemblea = (data: any) => api.post('/assemblee/', data);
export const aggiornaAssemblea = (id: number, data: any) => api.put(`/assemblee/${id}`, data);
export const eliminaAssemblea = (id: number) => api.delete(`/assemblee/${id}`);

export const getPuntiAssemblea = (assembleaId: number) => api.get(`/assemblee/${assembleaId}/punti`);
export const creaPunto = (data: any) => api.post('/punti/', data);
export const aggiornaEsitoPunto = (id: number, esito: string) => api.put(`/punti/${id}/esito?esito=${encodeURIComponent(esito)}`);

export const getPartecipantiAssemblea = (assembleaId: number) => api.get(`/assemblee/${assembleaId}/partecipanti`);
export const registraPartecipazione = (data: any) => api.post('/partecipazioni/', data);
export const aggiornaPartecipazione = (id: number, data: any) => api.put(`/partecipazioni/${id}`, data);

export const getTesseratiGruppo = (gruppoId: number) =>
  api.get(`/messaggi/gruppi/${gruppoId}/tesserati`);

export const inviaMessaggio = (dati: any) =>
  api.post('/messaggi/invia', dati);

export const getMessaggiInviati = () =>
  api.get('/messaggi/');
export const getGruppiTesserato = (id: number) => api.get(`/tesserati/${id}/gruppi`);
export const aggiornaGruppiTesserato = (id: number, gruppiId: number[]) =>
  api.put(`/tesserati/${id}/gruppi`, gruppiId);

// ---- GENITORI ----
export const getGenitori = () => api.get('/tesserati/genitori/');
export const creaGenitore = (data: any) => api.post('/tesserati/genitori/', data);
export const aggiornaGenitore = (id: number, data: any) => api.put(`/tesserati/genitori/${id}`, data);

// ---- FOTO E DOCUMENTI ----
export const caricaFoto = (tesseratoId: number, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/tesserati/${tesseratoId}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const getDocumenti = (tesseratoId: number) => api.get(`/tesserati/${tesseratoId}/documenti`);

export const caricaDocumento = (tesseratoId: number, tipo: string, file: File, dataScadenza?: string, note?: string) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('tipo', tipo);
  if (dataScadenza) fd.append('data_scadenza', dataScadenza);
  if (note) fd.append('note', note);
  return api.post(`/tesserati/${tesseratoId}/documenti`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const eliminaDocumento = (documentoId: number) => api.delete(`/tesserati/documenti/${documentoId}`);

export const eliminaTesseratoDefinitivo = (id: number) => api.delete(`/tesserati/${id}/definitivo`);
export const eliminaTesseratiInBlocco = (tesserato_ids: number[]) =>
  api.post('/tesserati/elimina-in-blocco', { tesserato_ids });

// ---- IMPORTAZIONE ----
export const importaTesserati = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/import/tesserati', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const importaStaff = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/import/staff', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// ---- ADMIN ----
export const getUtenti = () => api.get('/admin/utenti');
export const creaUtente = (data: any) => api.post('/admin/utenti', data);
export const modificaUtente = (utenteId: number, data: any) => api.put(`/admin/utenti/${utenteId}`, data);
export const eliminaUtente = (utenteId: number) => api.delete(`/admin/utenti/${utenteId}`);
export const aggiornaPermesso = (utenteId: number, sezione: string, abilitato: boolean) =>
  api.put(`/admin/utenti/${utenteId}/permesso`, { sezione, abilitato });
export const toggleUtente = (utenteId: number, attivo: boolean) =>
  api.put(`/admin/utenti/${utenteId}/attivo?attivo=${attivo}`);
export const cambiaPassword = (utenteId: number, nuovaPassword: string) =>
  api.put(`/admin/utenti/${utenteId}/password?nuova_password=${nuovaPassword}`);
export const getSezioni = () => api.get('/admin/sezioni');

export const getMessaggiTesserato = (tesseratoId: number) => api.get(`/messaggi/tesserato/${tesseratoId}`);

export const getTuttiTesserati = () => api.get('/tesserati/tutti');

export const riattivaTesserato = (id: number) => api.put(`/tesserati/${id}/riattiva`);

// ---- PUSH NOTIFICATIONS ----
export const getVapidPublicKey = () => api.get('/push/vapid-public-key');
export const subscribePush = (data: any) => api.post('/push/subscribe', data);
export const unsubscribePush = (endpoint: string) => api.delete(`/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`);

export const getCompagniGruppo = (tesseratoId: number) => api.get(`/tesserati/${tesseratoId}/compagni`);
export const getStatisticheTesserato = (tesseratoId: number) => api.get(`/tesserati/${tesseratoId}/statistiche`);
export const getPresenzeTesserato = (tesseratoId: number) => api.get(`/tesserati/${tesseratoId}/presenze`);
export const aggiornaPresenza = (presenzaId: number, data: any) => api.put(`/presenze/${presenzaId}`, data);
export const annullaAssenza = (eventoId: number, tesseratoId: number) => api.delete(`/eventi/${eventoId}/presenze/${tesseratoId}`);
