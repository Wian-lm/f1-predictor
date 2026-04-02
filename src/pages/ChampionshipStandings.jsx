import { useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { driverColor } from '../utils';

function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
      <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '0.15em' }}>{text}</div>
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 3, transition: 'width .8s ease', width: `${pct}%`, background: color }} />
    </div>
  );
}

// Points awarded per finishing position (F1 scoring)
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export default function ChampionshipStandings() {
  const { loaded, loading, data, sessionInfo } = useSession();
  const { drivers, positions, laps } = data;

  // Final position per driver from the last position entry
  const finalPositions = useMemo(() => {
    const latest = {};
    positions.forEach(p => {
      if (!latest[p.driver_number] || new Date(p.date) > new Date(latest[p.driver_number].date))
        latest[p.driver_number] = p;
    });
    return Object.values(latest).sort((a, b) => (a.position || 99) - (b.position || 99));
  }, [positions]);

  // Best lap per driver
  const bestLaps = useMemo(() => {
    const m = {};
    laps.forEach(l => {
      if (l.lap_duration && (!m[l.driver_number] || l.lap_duration < m[l.driver_number]))
        m[l.driver_number] = l.lap_duration;
    });
    return m;
  }, [laps]);

  // Team points from finishing positions (sum of both drivers)
  const teamPoints = useMemo(() => {
    const teams = {};
    finalPositions.forEach(p => {
      const d = drivers[p.driver_number];
      const team = d?.team_name;
      if (!team) return;
      const pts = POINTS[p.position - 1] || 0;
      if (!teams[team]) teams[team] = { name: team, pts: 0, color: driverColor(d) };
      teams[team].pts += pts;
    });
    return Object.values(teams).sort((a, b) => b.pts - a.pts);
  }, [finalPositions, drivers]);

  const maxPts = (POINTS[0] || 25);
  const maxTeamPts = teamPoints[0]?.pts || 1;

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🏆" text="SELECT A SESSION ABOVE TO LOAD DATA" />;
  if (!finalPositions.length) return <Empty icon="🏆" text="NO POSITION DATA FOR THIS SESSION" />;

  const isRace = sessionInfo?.session_type === 'Race';

  return (
    <div>
      <div style={{ marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em' }}>
        {isRace ? 'POINTS AWARDED BASED ON FINISHING POSITIONS' : 'FINAL CLASSIFICATION · NON-RACE SESSION (NO POINTS AWARDED)'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* DRIVER CLASSIFICATION */}
        <div className="card">
          <div className="card-hdr"><div className="card-title">👤 DRIVER CLASSIFICATION</div></div>
          <div className="card-body">
            {finalPositions.map(p => {
              const d = drivers[p.driver_number] || {};
              const col = driverColor(d);
              const pts = isRace ? (POINTS[p.position - 1] || 0) : null;
              const best = bestLaps[p.driver_number];
              const pct = isRace ? Math.round(((pts || 0) / maxPts) * 100) : Math.round(((finalPositions.length - p.position + 1) / finalPositions.length) * 100);
              return (
                <div key={p.driver_number} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)', minWidth: 14 }}>P{p.position}</span>
                      <div className="drv-dot" style={{ background: col }} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text)' }}>{d.name_acronym || '#' + p.driver_number}</span>
                      <span style={{ fontSize: 9, color: 'var(--text3)' }}>{d.team_name || ''}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {isRace && <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: pts ? '#fff' : 'var(--text3)' }}>{pts} PTS</span>}
                      {best && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', marginLeft: 8 }}>{best.toFixed(3)}s</span>}
                    </div>
                  </div>
                  <Bar pct={pct} color={col} />
                </div>
              );
            })}
          </div>
        </div>

        {/* TEAM CLASSIFICATION */}
        <div className="card">
          <div className="card-hdr"><div className="card-title">🏎️ CONSTRUCTOR CLASSIFICATION</div></div>
          <div className="card-body">
            {teamPoints.length
              ? teamPoints.map((t, i) => {
                  const pct = Math.round((t.pts / maxTeamPts) * 100);
                  return (
                    <div key={t.name} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>#{i + 1}</span>
                          <div className="drv-dot" style={{ background: t.color }} />
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text)' }}>{t.name}</span>
                        </div>
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>
                          {isRace ? `${t.pts} PTS` : `${finalPositions.filter(p => drivers[p.driver_number]?.team_name === t.name).length} DRIVERS`}
                        </span>
                      </div>
                      <Bar pct={pct} color={t.color} />
                    </div>
                  );
                })
              : <Empty icon="🏎️" text="NO TEAM DATA" />
            }
          </div>
        </div>
      </div>
    </div>
  );
}
