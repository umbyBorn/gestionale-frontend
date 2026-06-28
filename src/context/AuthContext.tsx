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
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [utente, setUtente] = useState<Utente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((res) => setUtente(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem('token', res.data.access_token);
    const me = await getMe();
    setUtente(me.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUtente(null);
  };

  return (
    <AuthContext.Provider value={{ utente, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return context;
};
