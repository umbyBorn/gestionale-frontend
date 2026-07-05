import axios from 'axios';

const API_URL = 'https://gestionale-sport-api.onrender.com';

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
export const getPagamentiScaduti = () => api.get('/pagamenti/scaduti/');
export const creaPagamento = (data: any) => api.post('/pagamenti/', data);
export const registraIncasso = (id: number, metodo: string) =>
  api.put(`/pagamenti/${id}/registra-incasso?metodo=${metodo}`);

// ---- TARIFFE ----
export const getTariffe = () => api.get('/tariffe/');
export const creaTariffa = (data: any) => api.post('/tariffe/', data);

// ---- STAFF ----
export const getStaff = () => api.get('/staff/');
export const creaStaff = (data: any) => api.post('/staff/', data);
export const aggiornaStaff = (id: number, data: any) => api.put(`/staff/${id}`, data);

// ---- EVENTI E PRESENZE ----
export const getEventi = () => api.get('/eventi/');
export const creaEvento = (data: any) => api.post('/eventi/', data);
export const getPresenzeEvento = (eventoId: number) => api.get(`/eventi/${eventoId}/presenze`);
export const registraPresenza = (data: any) => api.post('/presenze/', data);

// ---- ASSEMBLEE ----
export const getAssemblee = () => api.get('/assemblee/');
export const creaAssemblea = (data: any) => api.post('/assemblee/', data);

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

// ---- ADMIN ----
export const getUtenti = () => api.get('/admin/utenti');
export const creaUtente = (data: any) => api.post('/admin/utenti', data);
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
