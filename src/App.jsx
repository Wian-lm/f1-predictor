import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import Dashboard from './pages/Dashboard';
import LapTimes from './pages/LapTimes';
import TyreStrategy from './pages/TyreStrategy';
import PitStops from './pages/PitStops';
import Weather from './pages/Weather';
import RaceControl from './pages/RaceControl';
import TeamRadio from './pages/TeamRadio';
import ChampionshipStandings from './pages/ChampionshipStandings';
import Standings from './pages/Standings';
import PredictionModel from './pages/PredictionModel';
import EraSelector from './pages/EraSelector';
import ArchiveDashboard from './pages/ArchiveDashboard';

const VISITED_KEY = 'f1pw_visited';

const features = [
  { icon: '🏠', title: 'OVERVIEW',      desc: 'Live standings, fastest lap, weather and pit stop summary for any session.' },
  { icon: '⏱',  title: 'LAP TIMING',    desc: 'Per-driver lap time charts. Spot undercuts, traffic, and degradation trends.' },
  { icon: '🏆', title: 'RESULTS',       desc: 'Final race classification with gaps, DNF reasons, grid positions, and points.' },
  { icon: '📊', title: 'STANDINGS',     desc: 'Driver and constructor championship standings with points gaps and recent form.' },
  { icon: '🔧', title: 'PIT STOPS',     desc: 'Pit stop timing and tyre change data for every driver.' },
  { icon: '🌦', title: 'WEATHER',       desc: 'Track and air temperature, humidity, wind, and rainfall throughout a session.' },
  { icon: '🚩', title: 'RACE CONTROL',  desc: 'Safety car periods, yellow and red flags, penalties and DRS status.' },
  { icon: '📻', title: 'TEAM RADIO',    desc: 'Timestamped radio messages between drivers and their engineers.' },
  { icon: '🏎', title: 'TYRE STRATEGY', desc: 'Stint lengths and compound choices visualised for every driver.' },
  { icon: '🤖', title: 'PREDICTION',    desc: 'Model that scores drivers on lap consistency, tyre deg, and pit timing.' },
];

function WelcomeModal({ onDismiss }) {
  const { loading, loaded } = useSession();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,10,14,0.92)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 6, width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 0 60px rgba(232,0,45,0.12)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 28, color: 'var(--accent)' }}>⬡</span>
            <div>
              <div style={{
                fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
                fontSize: 20, letterSpacing: '0.15em', color: '#fff',
              }}>
                PIT WALL
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                color: 'var(--text3)', letterSpacing: '0.2em', marginTop: 2,
              }}>
                F1 RACE DATA ANALYSER · POWERED BY OPENF1
              </div>
            </div>
          </div>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            color: 'var(--text2)', lineHeight: 1.7, letterSpacing: '0.04em',
          }}>
            Explore lap times, tyre strategies, pit stop data, and race positions
            for every session going back to 2023. Use the selectors at the top to
            pick a season, race weekend, and session.
          </p>
        </div>

        {/* Features grid */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700,
            letterSpacing: '0.2em', color: 'var(--text3)', marginBottom: 14,
          }}>
            WHAT'S INSIDE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '10px 12px', display: 'flex', gap: 10,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                <div>
                  <div style={{
                    fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700,
                    letterSpacing: '0.12em', color: 'var(--text2)', marginBottom: 4,
                  }}>
                    {f.title}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5,
                    color: 'var(--text3)', lineHeight: 1.6,
                  }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            color: loading ? 'var(--accent3)' : loaded ? 'var(--green)' : 'var(--text3)',
            letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: loading ? 'var(--accent3)' : loaded ? 'var(--green)' : 'var(--text3)',
              animation: loading ? 'pulse 1s infinite' : 'none',
            }} />
            {loading && 'LOADING LATEST RACE DATA IN THE BACKGROUND...'}
            {loaded  && 'RACE DATA READY'}
            {!loading && !loaded && 'DATA WILL LOAD WHEN YOU ENTER'}
          </div>
          <button
            onClick={onDismiss}
            style={{
              padding: '9px 28px', flexShrink: 0,
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 3, cursor: 'pointer',
              fontFamily: "'Orbitron', sans-serif", fontSize: 9,
              fontWeight: 700, letterSpacing: '0.15em',
            }}
          >
            ENTER PIT WALL
          </button>
        </div>
      </div>
    </div>
  );
}

const navItems = [
  { to: '/',              label: '🏠 OVERVIEW'     },
  { to: '/standings',     label: '🏆 RESULTS'       },
  { to: '/championship',  label: '📊 STANDINGS'     },
  { to: '/lap-times',     label: '⏱ LAP TIMING'    },
  { to: '/tyre-strategy', label: '🏎 TYRE STRATEGY' },
  { to: '/pit-stops',     label: '🔧 PIT STOPS'     },
  { to: '/weather',       label: '🌦 WEATHER'       },
  { to: '/race-control',  label: '🚩 RACE CONTROL'  },
  { to: '/team-radio',    label: '📻 TEAM RADIO'    },
  { to: '/prediction',    label: '🤖 PREDICTION'    },
  { to: '/archive',       label: '📁 ARCHIVE'       },
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

function BookmarkDrawer({ onClose }) {
  const { bookmarks, loadBookmark, removeBookmark } = useSession();

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
      background: 'var(--surface)', borderLeft: '1px solid var(--border)',
      zIndex: 200, display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface2)',
      }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text2)' }}>
          ⭐ BOOKMARKS
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!bookmarks.length && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 8 }}>⭐</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em' }}>
              NO BOOKMARKS YET
            </div>
          </div>
        )}
        {bookmarks.map(bm => (
          <div key={bm.session_key} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 3, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { loadBookmark(bm); onClose(); }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                {bm.country_name} · {bm.session_name}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                {bm.meeting_name} · {bm.year}
              </div>
            </div>
            <button
              onClick={() => removeBookmark(bm.session_key)}
              title="Remove bookmark"
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionBar() {
  const {
    year, meetings, sessions, meetingKey, sessionKey, loading, loaded, sessionInfo,
    bookmarks, isBookmarked, addBookmark, removeBookmark,
    onYearChange, onMeetingChange, onSessionChange, loadAll,
  } = useSession();

  const [showBookmarks, setShowBookmarks] = useState(false);
  const canLoad = !!sessionKey;
  const bookmarked = isBookmarked(sessionKey);

  function fmtSessionInfo() {
    if (!sessionInfo) return '';
    const d = sessionInfo.date_start
      ? new Date(sessionInfo.date_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';
    return [sessionInfo.location, sessionInfo.session_name, d].filter(Boolean).join(' · ');
  }

  function handleBookmarkToggle() {
    if (!sessionKey || !loaded) return;
    if (bookmarked) {
      removeBookmark(sessionKey);
    } else {
      const meeting = meetings.find(m => String(m.meeting_key) === String(meetingKey));
      const session = sessions.find(s => String(s.session_key) === String(sessionKey));
      addBookmark({
        session_key: sessionKey,
        session_name: session?.session_name || sessionInfo?.session_name || '',
        session_type: session?.session_type || sessionInfo?.session_type || '',
        meeting_name: meeting?.meeting_name || '',
        country_name: meeting?.country_name || sessionInfo?.location || '',
        year,
      });
    }
  }

  return (
    <>
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
          {meetings
            .filter(m => year !== new Date().getFullYear().toString() || new Date(m.date_start) <= new Date())
            .map(m => (
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

        {/* Reload button — only show after data is loaded, for force-refreshing */}
        {loaded && (
          <button
            onClick={() => loadAll(sessionKey)}
            disabled={loading}
            style={{
              padding: '5px 16px',
              background: loading ? 'var(--surface3)' : 'var(--surface3)',
              color: loading ? 'var(--text3)' : 'var(--text2)',
              border: '1px solid var(--border2)', borderRadius: 3,
              fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            ↺ RELOAD
          </button>
        )}

        {/* Bookmark toggle */}
        {loaded && (
          <button
            onClick={handleBookmarkToggle}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this session'}
            style={{
              background: bookmarked ? 'rgba(255,215,0,0.15)' : 'var(--surface3)',
              border: `1px solid ${bookmarked ? 'var(--gold)' : 'var(--border2)'}`,
              color: bookmarked ? 'var(--gold)' : 'var(--text3)',
              borderRadius: 3, padding: '5px 10px', cursor: 'pointer', fontSize: 13,
            }}
          >
            {bookmarked ? '⭐' : '☆'}
          </button>
        )}

        {/* Bookmarks drawer toggle */}
        <button
          onClick={() => setShowBookmarks(v => !v)}
          style={{
            background: showBookmarks ? 'rgba(255,215,0,0.1)' : 'var(--surface3)',
            border: `1px solid ${showBookmarks ? 'var(--gold)' : 'var(--border2)'}`,
            color: showBookmarks ? 'var(--gold)' : 'var(--text3)',
            borderRadius: 3, padding: '5px 10px', cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          ⭐ {bookmarks.length > 0 ? bookmarks.length : 'SAVED'}
        </button>

        {sessionInfo && !loading && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>
            {fmtSessionInfo()}
          </span>
        )}

        {loading && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em' }}>
            {loaded ? 'REFRESHING...' : 'FETCHING LATEST RACE DATA...'}
          </span>
        )}
      </div>

      {showBookmarks && <BookmarkDrawer onClose={() => setShowBookmarks(false)} />}
    </>
  );
}

function Layout() {
  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem(VISITED_KEY)
  );
  const location = useLocation();
  const isArchive = location.pathname.startsWith('/archive');

  function dismissWelcome() {
    localStorage.setItem(VISITED_KEY, '1');
    setShowWelcome(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', position: 'relative', zIndex: 1 }}>
      {showWelcome && <WelcomeModal onDismiss={dismissWelcome} />}
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

      {!isArchive && <SessionBar />}

      <main style={{ padding: '20px 24px', maxWidth: 1600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/standings"     element={<ChampionshipStandings />} />
          <Route path="/championship"  element={<Standings />} />
          <Route path="/lap-times"     element={<LapTimes />} />
          <Route path="/pit-stops"     element={<PitStops />} />
          <Route path="/weather"       element={<Weather />} />
          <Route path="/race-control"  element={<RaceControl />} />
          <Route path="/team-radio"    element={<TeamRadio />} />
          <Route path="/tyre-strategy" element={<TyreStrategy />} />
          <Route path="/prediction"    element={<PredictionModel />} />
          <Route path="/archive"       element={<EraSelector />} />
          <Route path="/archive/:eraId" element={<ArchiveDashboard />} />
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
