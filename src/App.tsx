import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tesserati from './pages/Tesserati';
import Gruppi from './pages/Gruppi';
import Pagamenti from './pages/Pagamenti';
import Staff from './pages/Staff';
import Presenze from './pages/Presenze';
import Assemblee from './pages/Assemblee';
import Calendario from './pages/Calendario';
import Messaggi from './pages/Messaggi';
import Admin from './pages/Admin';
import PortaleTesserato from './pages/PortaleTesserato';

const RequireLogin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { utente, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  if (!utente) return <Navigate to="/login" />;
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; sezione?: string }> = ({ children, sezione }) => {
  const { utente, loading, hasPermesso, ruolo } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  if (!utente) return <Navigate to="/login" />;
  if (ruolo === 'tesserato') return <Navigate to="/portale" />;
  if (sezione && !hasPermesso(sezione)) return <Navigate to="/" />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { utente, loading, ruolo } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  if (!utente) return <Navigate to="/login" />;
  if (ruolo !== 'amministratore') return <Navigate to="/" />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tesserati" element={<ProtectedRoute sezione="tesserati"><Tesserati /></ProtectedRoute>} />
          <Route path="/gruppi" element={<ProtectedRoute sezione="gruppi"><Gruppi /></ProtectedRoute>} />
          <Route path="/pagamenti" element={<ProtectedRoute sezione="pagamenti"><Pagamenti /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute sezione="staff"><Staff /></ProtectedRoute>} />
          <Route path="/presenze" element={<ProtectedRoute sezione="presenze"><Presenze /></ProtectedRoute>} />
          <Route path="/assemblee" element={<ProtectedRoute sezione="assemblee"><Assemblee /></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute sezione="calendario"><Calendario /></ProtectedRoute>} />
          <Route path="/messaggi" element={<ProtectedRoute sezione="messaggi"><Messaggi /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/portale" element={<RequireLogin><PortaleTesserato /></RequireLogin>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
