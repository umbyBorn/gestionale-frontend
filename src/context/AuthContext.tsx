import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getMe } from '../services/api';

interface Utente {
  id: number;
  email: string;
  ruolo: string;
  attivo: boolean;
}

interface AuthContextType {
  utente: Utente | null;
  ruolo: string | null;
  tesseratoId: number | null;
  permessi: Record<string, boolean>;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermesso: (sezione: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [utente, setUtente] = useState<Utente | null>(null);
  const [ruolo, setRuolo] = useState<string | null>(null);
  const [tesseratoId, setTesseratoId] = useState<number | null>(null);
  const [permessi, setPermessi] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const ruoloSalvato = localStorage.getItem('ruolo');
    const tesseratoIdSalvato = localStorage.getItem('tesserato_id');
    const permessiSalvati = localStorage.getItem('permessi');
    if (token) {
      if (ruoloSalvato) setRuolo(ruoloSalvato);
      if (tesseratoIdSalvato && tesseratoIdSalvato !== 'null') setTesseratoId(parseInt(tesseratoIdSalvato));
      if (permessiSalvati) setPermessi(JSON.parse(permessiSalvati));
      getMe()
        .then((res) => setUtente(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('ruolo');
          localStorage.removeItem('tesserato_id');
          localStorage.removeItem('permessi');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem('token', res.data.access_token);
    localStorage.setItem('ruolo', res.data.ruolo);
    if (res.data.tesserato_id) localStorage.setItem('tesserato_id', String(res.data.tesserato_id));
    if (res.data.permessi) localStorage.setItem('permessi', JSON.stringify(res.data.permessi));
    setRuolo(res.data.ruolo);
    setTesseratoId(res.data.tesserato_id || null);
    setPermessi(res.data.permessi || {});
    const me = await getMe();
    setUtente(me.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('ruolo');
    localStorage.removeItem('tesserato_id');
    localStorage.removeItem('permessi');
    setUtente(null);
    setRuolo(null);
    setTesseratoId(null);
    setPermessi({});
  };

  const hasPermesso = (sezione: string): boolean => {
    if (ruolo === 'amministratore') return true;
    if (ruolo === 'operatore') return permessi[sezione] !== false;
    return false;
  };

  return (
    <AuthContext.Provider value={{ utente, ruolo, tesseratoId, permessi, loading, login, logout, hasPermesso }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return context;
};
