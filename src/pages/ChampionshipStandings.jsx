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

export default function ChampionshipStandings() {
  const { loaded, loading, data } = useSession();
  const { drivers, standings } = data;

  const driverStandings = useMemo(() =>
    standings.filter(s => s.driver_number != null).sort((a, b) => (a.driver_position || 99) - (b.driver_position || 99)),
    [standings]
  );

  const constructorStandings = useMemo(() => {
    const teamMap = {};
    standings.forEach(s => {
      if (!s.team_name) return;
      const pts = s.constructor_points || 0;
      if (!teamMap[s.team_name] || pts > teamMap[s.team_name].pts) {
        teamMap[s.team_name] = {
          name: s.team_name, pts, pos: s.constructor_position,
          color: s.driver_number ? driverColor(drivers[s.driver_number]) : '#666',
        };
      }
    });
    return Object.values(teamMap).sort((a, b) => (a.pos || 99) - (b.pos || 99));
  }, [standings, drivers]);

  const maxDrv = driverStandings[0]?.driver_points || 1;
  const maxCon = constructorStandings[0]?.pts || 1;

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🏆" text="SELECT A SESSION AND CLICK LOAD DATA" />;
  if (!standings.length) return <Empty icon="🏆" text="NO STANDINGS DATA FOR THIS SESSION" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {/* DRIVER CHAMPIONSHIP */}
      <div className="card">
        <div className="card-hdr"><div className="card-title">👤 DRIVER CHAMPIONSHIP</div></div>
        <div className="card-body">
          {driverStandings.map((s, i) => {
            const d = drivers[s.driver_number] || {};
            const col = driverColor(d);
            const pts = s.driver_points || 0;
            const pct = Math.round((pts / maxDrv) * 100);
            return (
              <div key={s.driver_number} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>{s.driver_position || i + 1}</span>
                    <div className="drv-dot" style={{ background: col }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text)' }}>{d.name_acronym || '#' + s.driver_number}</span>
                    <span style={{ fontSize: 9, color: 'var(--text3)' }}>{d.team_name || ''}</span>
                  </div>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>{pts} PTS</span>
                </div>
                <Bar pct={pct} color={col} />
              </div>
            );
          })}
        </div>
      </div>

      {/* CONSTRUCTOR CHAMPIONSHIP */}
      <div className="card">
        <div className="card-hdr"><div className="card-title">🏎️ CONSTRUCTOR CHAMPIONSHIP</div></div>
        <div className="card-body">
          {constructorStandings.map((t, i) => {
            const pct = Math.round((t.pts / maxCon) * 100);
            return (
              <div key={t.name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>{t.pos || i + 1}</span>
                    <div className="drv-dot" style={{ background: t.color }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text)' }}>{t.name}</span>
                  </div>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>{t.pts} PTS</span>
                </div>
                <Bar pct={pct} color={t.color} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
