import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTesserati, getGruppi, getPagamentiScaduti, getStaff } from '../services/api';

const Dashboard: React.FC = () => {
  const { utente, logout, hasPermesso, ruolo } = useAuth();

  const [stats, setStats] = useState({ tesserati: 0, gruppi: 0, pagamentiScaduti: 0, staff: 0 });

  useEffect(() => {
    Promise.all([getTesserati(), getGruppi(), getPagamentiScaduti(), getStaff()])
      .then(([t, g, p, s]) => {
        setStats({ tesserati: t.data.length, gruppi: g.data.length, pagamentiScaduti: p.data.length, staff: s.data.length });
      });
  }, []);

  const menu = [
    { titolo: 'Tesserati', descrizione: 'Gestisci le schede anagrafiche', href: '/tesserati', colore: 'bg-blue-50 border-blue-200', sezione: 'tesserati' },
    { titolo: 'Gruppi', descrizione: 'Organizza i corsi e le squadre', href: '/gruppi', colore: 'bg-green-50 border-green-200', sezione: 'gruppi' },
    { titolo: 'Pagamenti', descrizione: 'Gestisci quote e incassi', href: '/pagamenti', colore: 'bg-yellow-50 border-yellow-200', sezione: 'pagamenti' },
    { titolo: 'Staff', descrizione: 'Gestisci collaboratori e contratti', href: '/staff', colore: 'bg-purple-50 border-purple-200', sezione: 'staff' },
    { titolo: 'Presenze', descrizione: 'Registra le presenze agli allenamenti', href: '/presenze', colore: 'bg-orange-50 border-orange-200', sezione: 'presenze' },
    { titolo: 'Assemblee', descrizione: 'Gestisci assemblee e verbali', href: '/assemblee', colore: 'bg-red-50 border-red-200', sezione: 'assemblee' },
    { titolo: 'Calendario', descrizione: 'Gestisci eventi e allenamenti', href: '/calendario', colore: 'bg-teal-50 border-teal-200', sezione: 'calendario' },
    { titolo: 'Messaggi', descrizione: 'Invia comunicazioni broadcast ai tesserati', href: '/messaggi', colore: 'bg-pink-50 border-pink-200', sezione: 'messaggi' },
  ];

  return (
    <div className="bg-gray-100 min-h-full">
      <div className="p-6">
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
          {menu.filter(item => hasPermesso(item.sezione)).map((item) => (
            <a key={item.href} href={item.href} className={`border rounded-lg p-4 hover:shadow-md transition ${item.colore}`}>
              <h3 className="font-bold text-gray-800">{item.titolo}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.descrizione}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;