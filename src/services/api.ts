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
