import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore('');
    setLoading(true);
    try {
      await login(email, password);
      window.location.href = '/';
    } catch {
      setErrore('Email o password errati');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="PGS Juvenilia" className="w-20 h-20 object-contain" />
        </div>
        <h1 className="text-xl font-bold text-center text-blue-800 mb-1 tracking-wide">
          PGS JUVENILIA
        </h1>
        <p className="text-center text-sm font-medium text-red-600 mb-2">GESTIONALE</p>
        <p className="text-center text-gray-500 mb-6">Accedi al tuo account</p>

        {errore && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {errore}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="admin@gestionale.it"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 transition disabled:opacity-50"
        >
          {loading ? 'Accesso in corso...' : 'Accedi'}
        </button>
      </div>
    </div>
  );
};

export default Login;
