import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LapTimes from './pages/LapTimes';
import TyreStrategy from './pages/TyreStrategy';
import RaceResults from './pages/RaceResults';
import ChampionshipStandings from './pages/ChampionshipStandings';
import PredictionModel from './pages/PredictionModel';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/lap-times', label: 'Lap Times' },
  { to: '/tyre-strategy', label: 'Tyre Strategy' },
  { to: '/race-results', label: 'Race Results' },
  { to: '/standings', label: 'Standings' },
  { to: '/prediction', label: 'Prediction Model' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white font-sans">
        <header className="bg-gray-900 border-b border-red-600 px-6 py-4 flex items-center gap-4">
          <span className="text-red-500 font-bold text-xl tracking-wide">F1 PREDICTOR</span>
        </header>
        <nav className="bg-gray-900 border-b border-gray-800 px-6 flex gap-1 overflow-x-auto">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lap-times" element={<LapTimes />} />
            <Route path="/tyre-strategy" element={<TyreStrategy />} />
            <Route path="/race-results" element={<RaceResults />} />
            <Route path="/standings" element={<ChampionshipStandings />} />
            <Route path="/prediction" element={<PredictionModel />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
