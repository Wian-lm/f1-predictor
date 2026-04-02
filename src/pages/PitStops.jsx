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

export default function PitStops() {
  const { loaded, loading, data } = useSession();
  const { drivers, pitStops } = data;

  const sorted = useMemo(() => [...pitStops].sort((a, b) => (a.lap_number || 0) - (b.lap_number || 0)), [pitStops]);

  const ranked = useMemo(() => {
    const byDrv = {};
    pitStops.forEach(p => {
      if (p.stop_duration && (!byDrv[p.driver_number] || p.stop_duration < byDrv[p.driver_number].stop_duration))
        byDrv[p.driver_number] = p;
    });
    return Object.values(byDrv).sort((a, b) => a.stop_duration - b.stop_duration);
  }, [pitStops]);

  const maxStop = ranked[ranked.length - 1]?.stop_duration || 5;

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🔧" text="SELECT A SESSION ABOVE TO LOAD DATA" />;
  if (!pitStops.length) return <Empty icon="🔧" text="NO PIT STOP DATA FOR THIS SESSION" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {/* PIT STOP LOG */}
      <div className="card">
        <div className="card-hdr"><div className="card-title">🔧 PIT STOP LOG</div></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>DRIVER</th><th>LAP</th><th>STOP TIME</th><th>LANE TIME</th><th>RATING</th></tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const d = drivers[p.driver_number];
                const col = driverColor(d);
                const fast = p.stop_duration && p.stop_duration < 2.5;
                const good = p.stop_duration && p.stop_duration < 3.0;
                return (
                  <tr key={i}>
                    <td>
                      <div className="drv-tag">
                        <div className="drv-dot" style={{ background: col }} />
                        <span className="drv-abbr" style={{ color: col }}>{d?.name_acronym || '#' + p.driver_number}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>{p.lap_number || '—'}</td>
                    <td className={fast ? 'lt-pb' : ''}>
                      {p.stop_duration ? `${p.stop_duration.toFixed(3)}s` : '—'} {fast ? '⚡' : ''}
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{p.lane_duration ? `${p.lane_duration.toFixed(3)}s` : '—'}</td>
                    <td>
                      {fast
                        ? <span className="tag t-green">FAST</span>
                        : good
                          ? <span className="tag t-blue">GOOD</span>
                          : <span className="tag t-grey">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FASTEST STOPS RANKING */}
      <div className="card">
        <div className="card-hdr"><div className="card-title">⚡ FASTEST STOPS RANKING</div></div>
        <div className="card-body">
          {ranked.map((p, i) => {
            const d = drivers[p.driver_number];
            const col = driverColor(d);
            const pct = Math.round((p.stop_duration / maxStop) * 100);
            return (
              <div key={p.driver_number} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>#{i + 1}</span>
                    <div className="drv-dot" style={{ background: col }} />
                    <span className="champ-name">{d?.name_acronym || '#' + p.driver_number}</span>
                  </div>
                  <span className="champ-pts">{p.stop_duration.toFixed(3)}s</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, transition: 'width .8s ease', width: `${pct}%`, background: col }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
