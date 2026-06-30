import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTesserati, getGruppi, getPagamentiScaduti, getStaff } from '../services/api';

const Dashboard: React.FC = () => {
  const { utente, logout } = useAuth();
  const [stats, setStats] = useState({ tesserati: 0, gruppi: 0, pagamentiScaduti: 0, staff: 0 });

  useEffect(() => {
    Promise.all([getTesserati(), getGruppi(), getPagamentiScaduti(), getStaff()])
      .then(([t, g, p, s]) => {
        setStats({ tesserati: t.data.length, gruppi: g.data.length, pagamentiScaduti: p.data.length, staff: s.data.length });
      });
  }, []);

  const menu = [
    { titolo: 'Tesserati', descrizione: 'Gestisci le schede anagrafiche', href: '/tesserati', colore: 'bg-blue-50 border-blue-200' },
    { titolo: 'Gruppi', descrizione: 'Organizza i corsi e le squadre', href: '/gruppi', colore: 'bg-green-50 border-green-200' },
    { titolo: 'Pagamenti', descrizione: 'Gestisci quote e incassi', href: '/pagamenti', colore: 'bg-yellow-50 border-yellow-200' },
    { titolo: 'Staff', descrizione: 'Gestisci collaboratori e contratti', href: '/staff', colore: 'bg-purple-50 border-purple-200' },
    { titolo: 'Presenze', descrizione: 'Registra le presenze agli allenamenti', href: '/presenze', colore: 'bg-orange-50 border-orange-200' },
    { titolo: 'Assemblee', descrizione: 'Gestisci assemblee e verbali', href: '/assemblee', colore: 'bg-red-50 border-red-200' },
    { titolo: 'Calendario', descrizione: 'Gestisci eventi e allenamenti', href: '/calendario', colore: 'bg-teal-50 border-teal-200' },
    { titolo: 'Messaggi', descrizione: 'Invia comunicazioni broadcast ai tesserati', href: '/messaggi', colore: 'bg-pink-50 border-pink-200' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Gestionale Sportivo</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">{utente?.email}</span>
          <button onClick={logout} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm">Esci</button>
        </div>
      </header>
      <main className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Tesserati attivi</p>
            <p className="text-3xl font-bold text-blue-800">{stats.tesserati}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Gruppi</p>
            <p className="text-3xl font-bold text-blue-800">{stats.gruppi}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Pagamenti scaduti</p>
            <p className="text-3xl font-bold text-red-600">{stats.pagamentiScaduti}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Staff</p>
            <p className="text-3xl font-bold text-blue-800">{stats.staff}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {menu.map((item) => (
            <a key={item.href} href={item.href} className={`border rounded-lg p-4 hover:shadow-md transition ${item.colore}`}>
              <h3 className="font-bold text-gray-800">{item.titolo}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.descrizione}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;