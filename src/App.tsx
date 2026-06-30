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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { utente, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;
  if (!utente) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tesserati" element={<ProtectedRoute><Tesserati /></ProtectedRoute>} />
          <Route path="/gruppi" element={<ProtectedRoute><Gruppi /></ProtectedRoute>} />
          <Route path="/pagamenti" element={<ProtectedRoute><Pagamenti /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
          <Route path="/presenze" element={<ProtectedRoute><Presenze /></ProtectedRoute>} />
          <Route path="/assemblee" element={<ProtectedRoute><Assemblee /></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
          <Route path="/messaggi" element={<ProtectedRoute><Messaggi /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;