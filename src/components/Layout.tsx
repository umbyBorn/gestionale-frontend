import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface SottoVoce {
  label: string;
  path: string;
  badge?: string;
}

interface VoceMenu {
  id: string;
  label: string;
  icona: string;
  path?: string;
  sottovoci?: SottoVoce[];
  soloAdmin?: boolean;
  sezione?: string;
}

const MENU: VoceMenu[] = [
  {
    id: 'tesserati',
    label: 'Tesserati',
    icona: '👥',
    sezione: 'tesserati',
    sottovoci: [
      { label: 'Elenco tesserati', path: '/tesserati' },
      { label: 'Gruppi', path: '/gruppi' },
      { label: 'Importazione', path: '/import' },
    ],
  },
  {
    id: 'contabilita',
    label: 'Contabilità',
    icona: '💰',
    sezione: 'pagamenti',
    sottovoci: [
      { label: 'Pagamenti', path: '/pagamenti' },
      { label: 'Prima nota', path: '/prima-nota' },
      { label: 'Rendiconto', path: '/rendiconto' },
    ],
  },
  {
    id: 'staff',
    label: 'Staff',
    icona: '👨‍💼',
    sezione: 'staff',
    sottovoci: [
      { label: 'Elenco staff', path: '/staff' },
      { label: 'Compensi', path: '/staff' },
    ],
  },
  {
    id: 'attivita',
    label: 'Attività',
    icona: '📅',
    sottovoci: [
      { label: 'Calendario', path: '/calendario', },
      { label: 'Presenze', path: '/presenze' },
      { label: 'Assemblee', path: '/assemblee' },
    ],
  },
  {
    id: 'comunicazioni',
    label: 'Comunicazioni',
    icona: '📢',
    sezione: 'messaggi',
    sottovoci: [
      { label: 'Messaggi', path: '/messaggi' },
    ],
  },
  {
    id: 'iscrizioni',
    label: 'Iscrizioni online',
    icona: '📝',
    path: '/iscrizioni',
  },
  {
    id: 'impostazioni',
    label: 'Impostazioni',
    icona: '⚙️',
    soloAdmin: true,
    sottovoci: [
      { label: 'Utenti e permessi', path: '/admin' },
    ],
  },
  ...(process.env.REACT_APP_LOCALE === 'true' ? [{
    id: 'sincronizza',
    label: 'Sincronizza',
    icona: '🔄',
    path: '/sincronizza',
  }] : []),
];

interface LayoutProps {
  children: React.ReactNode;
  titolo?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, titolo }) => {
  const { utente, logout, ruolo, hasPermesso } = useAuth();
  const { iscritto, attivaPush } = usePushNotifications(utente?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarAperta, setSidebarAperta] = useState(true);
  const [sezioniAperte, setSezioniAperte] = useState<string[]>(['tesserati', 'attivita']);

  const toggleSezione = (id: string) => {
    setSezioniAperte(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const isAttivo = (path: string) => location.pathname === path;
  const isSezioneAttiva = (voce: VoceMenu) =>
    voce.sottovoci?.some(sv => location.pathname === sv.path);

  const menuFiltrato = MENU.filter(voce => {
    if (voce.soloAdmin && ruolo !== 'amministratore') return false;
    if (voce.sezione && !hasPermesso(voce.sezione)) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* OVERLAY MOBILE */}
      {sidebarAperta && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden"
          onClick={() => setSidebarAperta(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed top-0 left-0 h-full z-30 flex flex-col
        bg-[#0f2744] text-white
        transition-all duration-300 ease-in-out
        ${sidebarAperta ? 'w-60' : 'w-0 lg:w-16'}
        overflow-hidden
      `}>
        {/* LOGO */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <img src="/logo.png" alt="PGS Juvenilia" className="w-10 h-10 object-contain flex-shrink-0" />
          {sidebarAperta && (
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-tight">PGS JUVENILIA</p>
              <p className="text-xs text-blue-300 leading-tight">Gestionale</p>
            </div>
          )}
        </div>

        {/* NAVIGAZIONE */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {/* Dashboard */}
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition
              ${location.pathname === '/' ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-white/10'}`}
          >
            <span className="text-lg flex-shrink-0">🏠</span>
            {sidebarAperta && <span className="font-medium">Dashboard</span>}
          </button>

          {/* Sezioni */}
          {menuFiltrato.map(voce => {
            const aperta = sezioniAperte.includes(voce.id);
            const attiva = isSezioneAttiva(voce);
            return (
              <div key={voce.id} className="mb-1">
                <button
                  onClick={() => {
                    if (voce.path) { navigate(voce.path); }
                    else toggleSezione(voce.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
                    ${attiva ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/10'}`}
                >
                  <span className="text-lg flex-shrink-0">{voce.icona}</span>
                  {sidebarAperta && (
                    <>
                      <span className="flex-1 font-medium text-left">{voce.label}</span>
                      {voce.sottovoci && (
                        <span className="text-xs text-blue-300">{aperta ? '▾' : '▸'}</span>
                      )}
                    </>
                  )}
                </button>

                {/* Sottovoci */}
                {sidebarAperta && voce.sottovoci && aperta && (
                  <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                    {voce.sottovoci.map(sv => (
                      <button
                        key={sv.path}
                        onClick={() => navigate(sv.path)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition
                          ${isAttivo(sv.path)
                            ? 'bg-blue-500 text-white font-medium'
                            : 'text-blue-200 hover:bg-white/10 hover:text-white'
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isAttivo(sv.path) ? 'bg-white' : 'bg-blue-400'}`} />
                        {sv.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* PUSH NOTIFICATIONS — temporaneamente nascosta (logica mantenuta) */}
        {false && sidebarAperta && (
          <div className="px-4 py-2 border-t border-white/10">
            {!iscritto ? (
              <button
                onClick={attivaPush}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs hover:bg-yellow-500/30 transition"
              >
                <span>🔔</span>
                <span>Attiva notifiche</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-green-300">
                <span>🔔</span>
                <span>Notifiche attive</span>
              </div>
            )}
          </div>
        )}

        {/* UTENTE */}
        <div className="px-4 py-4 border-t border-white/10">
          {sidebarAperta ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {utente?.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{utente?.email}</p>
                <p className="text-xs text-blue-300 capitalize">{ruolo}</p>
              </div>
              <button onClick={logout} title="Esci" className="text-blue-300 hover:text-white text-sm">↩</button>
            </div>
          ) : (
            <button onClick={logout} className="w-full flex justify-center text-blue-300 hover:text-white">↩</button>
          )}
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${sidebarAperta ? 'lg:ml-60' : 'lg:ml-16'}`}>
        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0 z-10">
          <button
            onClick={() => setSidebarAperta(!sidebarAperta)}
            className="text-gray-500 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1">
            {titolo || 'Dashboard'}
          </h1>
        </header>

        {/* PAGINA */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
