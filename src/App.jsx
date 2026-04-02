import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import Dashboard from './pages/Dashboard';
import LapTimes from './pages/LapTimes';
import TyreStrategy from './pages/TyreStrategy';
import RaceResults from './pages/RaceResults';
import PitStops from './pages/PitStops';
import Weather from './pages/Weather';
import RaceControl from './pages/RaceControl';
import TeamRadio from './pages/TeamRadio';
import ChampionshipStandings from './pages/ChampionshipStandings';
import PredictionModel from './pages/PredictionModel';

const navItems = [
  { to: '/',               label: '🏠 OVERVIEW'      },
  { to: '/lap-times',      label: '⏱ LAP TIMING'     },
  { to: '/race-results',   label: '🏁 POSITIONS'      },
  { to: '/pit-stops',      label: '🔧 PIT STOPS'      },
  { to: '/weather',        label: '🌦 WEATHER'        },
  { to: '/race-control',   label: '🚩 RACE CONTROL'   },
  { to: '/team-radio',     label: '📻 TEAM RADIO'     },
  { to: '/standings',      label: '🏆 STANDINGS'      },
  { to: '/tyre-strategy',  label: '🏎 TYRE STRATEGY'  },
  { to: '/prediction',     label: '🤖 PREDICTION'     },
];

const sel = {
  background: 'var(--surface3)', border: '1px solid var(--border2)',
  color: 'var(--text)', padding: '5px 10px', borderRadius: 3,
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
  cursor: 'pointer', outline: 'none',
};

const slbl = {
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
  letterSpacing: '0.15em', color: 'var(--text3)', textTransform: 'uppercase',
};

function SessionBar() {
  const { year, meetings, sessions, meetingKey, sessionKey, loading, loaded,
    sessionInfo, onYearChange, onMeetingChange, onSessionChange, loadAll } = useSession();

  const canLoad = !!sessionKey;

  function fmtSessionInfo() {
    if (!sessionInfo) return '';
    const d = new Date(sessionInfo.date_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${sessionInfo.location} · ${sessionInfo.session_name} · ${d}`;
  }

  return (
    <div style={{
      background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
      padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span style={slbl}>SEASON</span>
      <select style={sel} value={year} onChange={e => onYearChange(e.target.value)}>
        <option value="2026">2026</option>
        <option value="2025">2025</option>
        <option value="2024">2024</option>
        <option value="2023">2023</option>
      </select>

      <span style={slbl}>RACE WEEKEND</span>
      <select style={sel} value={meetingKey} onChange={e => onMeetingChange(e.target.value)}>
        <option value="">— Select weekend —</option>
        {meetings.map(m => (
          <option key={m.meeting_key} value={m.meeting_key}>
            {m.country_name} · {m.meeting_name}
          </option>
        ))}
      </select>

      <span style={slbl}>SESSION</span>
      <select style={sel} value={sessionKey} onChange={e => onSessionChange(e.target.value)} disabled={!meetingKey}>
        <option value="">— Select session —</option>
        {sessions.map(s => (
          <option key={s.session_key} value={s.session_key}>
            {s.session_name} · {s.session_type}
          </option>
        ))}
      </select>

      <button
        onClick={() => loadAll(sessionKey)}
        disabled={!canLoad || loading}
        style={{
          padding: '5px 16px',
          background: canLoad && !loading ? 'var(--accent)' : 'var(--surface3)',
          color: canLoad && !loading ? '#fff' : 'var(--text3)',
          border: 'none', borderRadius: 3,
          fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.12em', cursor: canLoad && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? '⟳ LOADING...' : loaded ? '↺ RELOAD' : '▶ LOAD DATA'}
      </button>

      {sessionInfo && (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>
          {fmtSessionInfo()}
        </span>
      )}
    </div>
  );
}

function Layout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', position: 'relative', zIndex: 1 }}>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,10,14,0.97)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 24, height: 56,
      }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 17,
          letterSpacing: '0.15em', color: '#fff', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: 'var(--accent)', fontSize: 22 }}>⬡</span>
          <div>
            PIT WALL
            <span style={{
              fontSize: 8, fontFamily: "'IBM Plex Mono', monospace",
              color: 'var(--text3)', letterSpacing: '0.2em', display: 'block', marginTop: 1,
            }}>
              F1 PREDICTOR · OPENF1 API
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          color: 'var(--text2)', letterSpacing: '0.1em',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--green)', animation: 'pulse 2s infinite',
          }} />
          OPENF1 CONNECTED
        </div>
      </header>

      {/* NAV */}
      <nav style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex',
        position: 'sticky', top: 56, zIndex: 99, overflowX: 'auto',
      }}>
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              padding: '12px 18px',
              fontFamily: "'Orbitron', sans-serif", fontSize: '8.5px', fontWeight: 600,
              letterSpacing: '0.12em',
              color: isActive ? '#fff' : 'var(--text3)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              whiteSpace: 'nowrap', textDecoration: 'none', transition: 'all .2s',
              display: 'flex', alignItems: 'center', gap: 6,
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* SESSION BAR */}
      <SessionBar />

      {/* MAIN */}
      <main style={{ padding: '20px 24px', maxWidth: 1600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/lap-times"     element={<LapTimes />} />
          <Route path="/race-results"  element={<RaceResults />} />
          <Route path="/pit-stops"     element={<PitStops />} />
          <Route path="/weather"       element={<Weather />} />
          <Route path="/race-control"  element={<RaceControl />} />
          <Route path="/team-radio"    element={<TeamRadio />} />
          <Route path="/standings"     element={<ChampionshipStandings />} />
          <Route path="/tyre-strategy" element={<TyreStrategy />} />
          <Route path="/prediction"    element={<PredictionModel />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Layout />
      </SessionProvider>
    </BrowserRouter>
  );
}
