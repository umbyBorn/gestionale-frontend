import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
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
import DocumentiSocietari from './pages/DocumentiSocietari';
import LibroSoci from './pages/LibroSoci';
import PortaleTesserato from './pages/PortaleTesserato';
import FormIscrizione from './pages/FormIscrizione';
import Iscrizioni from './pages/Iscrizioni';
import Importazione from './pages/Importazione';
import PrimaNota from './pages/PrimaNota';
import Rendiconto from './pages/Rendiconto';
import Sincronizza from './pages/Sincronizza';

const RouteGuard: React.FC<{ children: React.ReactNode; titolo?: string; sezione?: string; soloAdmin?: boolean }> = ({
  children, titolo, sezione, soloAdmin
}) => {
  const { utente, loading, ruolo, hasPermesso } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Caricamento...</div>;
  if (!utente) return <Navigate to="/login" />;
  if (ruolo === 'tesserato') return <Navigate to="/portale" />;
  if (soloAdmin && ruolo !== 'amministratore') return <Navigate to="/" />;
  if (sezione && !hasPermesso(sezione)) return <Navigate to="/" />;
  return <Layout titolo={titolo}>{children}</Layout>;
};

const RequireLogin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { utente, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Caricamento...</div>;
  if (!utente) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/portale" element={<RequireLogin><PortaleTesserato /></RequireLogin>} />
          <Route path="/" element={<RouteGuard titolo="Dashboard"><Dashboard /></RouteGuard>} />
          <Route path="/tesserati" element={<RouteGuard titolo="Tesserati" sezione="tesserati"><Tesserati /></RouteGuard>} />
          <Route path="/gruppi" element={<RouteGuard titolo="Gruppi" sezione="gruppi"><Gruppi /></RouteGuard>} />
          <Route path="/pagamenti" element={<RouteGuard titolo="Pagamenti" sezione="pagamenti"><Pagamenti /></RouteGuard>} />
          <Route path="/staff" element={<RouteGuard titolo="Staff" sezione="staff"><Staff /></RouteGuard>} />
          <Route path="/presenze" element={<RouteGuard titolo="Presenze" sezione="presenze"><Presenze /></RouteGuard>} />
          <Route path="/assemblee" element={<RouteGuard titolo="Assemblee" sezione="assemblee"><Assemblee /></RouteGuard>} />
          <Route path="/calendario" element={<RouteGuard titolo="Calendario" sezione="calendario"><Calendario /></RouteGuard>} />
          <Route path="/messaggi" element={<RouteGuard titolo="Messaggi" sezione="messaggi"><Messaggi /></RouteGuard>} />
          <Route path="/prima-nota" element={<RouteGuard titolo="Prima nota" sezione="pagamenti"><PrimaNota /></RouteGuard>} />
          <Route path="/rendiconto" element={<RouteGuard titolo="Rendiconto" sezione="pagamenti"><Rendiconto /></RouteGuard>} />
          {(process.env.REACT_APP_LOCALE === 'true' || window.location.hostname === '127.0.0.1') && (
            <Route path="/sincronizza" element={<Sincronizza />} />
          )}
          <Route path="/admin" element={<RouteGuard titolo="Utenti e permessi" soloAdmin><Admin /></RouteGuard>} />
          <Route path="/documenti-societari" element={<RouteGuard titolo="Documenti societari"><DocumentiSocietari /></RouteGuard>} />
          <Route path="/libro-soci" element={<RouteGuard titolo="Libro Soci"><LibroSoci /></RouteGuard>} />
          <Route path="/iscrizioni" element={<RouteGuard titolo="Iscrizioni online"><Iscrizioni /></RouteGuard>} />
          <Route path="/iscriviti/:token" element={<FormIscrizione />} />
          <Route path="/import" element={<RouteGuard titolo="Importazione" sezione="tesserati"><Importazione /></RouteGuard>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
