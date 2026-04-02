import { useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { driverColor, fmtTs } from '../utils';

function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
      <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '0.15em' }}>{text}</div>
    </div>
  );
}

export default function RaceResults() {
  const { loaded, loading, data } = useSession();
  const { drivers, positions, pitStops } = data;

  const latestByDrv = useMemo(() => {
    const m = {};
    positions.forEach(p => {
      if (!m[p.driver_number] || new Date(p.date) > new Date(m[p.driver_number].date)) m[p.driver_number] = p;
    });
    return m;
  }, [positions]);

  const sorted = useMemo(() => Object.values(latestByDrv).sort((a, b) => a.position - b.position), [latestByDrv]);

  const pitsByDriver = useMemo(() => {
    const m = {};
    pitStops.forEach(p => { if (!m[p.driver_number]) m[p.driver_number] = []; m[p.driver_number].push(p); });
    return m;
  }, [pitStops]);

  const posCls = pos => ['', 'p1', 'p2', 'p3'][pos] || 'pn';

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🏁" text="SELECT A SESSION ABOVE TO LOAD DATA" />;
  if (!sorted.length) return <Empty icon="🏁" text="NO POSITION DATA FOR THIS SESSION" />;

  return (
    <div>
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">🏁 FINAL STANDINGS SNAPSHOT</div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
            {positions.length} ENTRIES · {sorted.length} DRIVERS
          </span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>POS</th><th>DRIVER</th><th>TEAM</th>
                <th>PIT STOPS</th><th>GAP</th><th>LAST UPDATE</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const d = drivers[p.driver_number];
                const col = driverColor(d);
                const pits = pitsByDriver[p.driver_number]?.length || 0;
                const gapPct = Math.max(5, 100 - i * 6);
                return (
                  <tr key={p.driver_number}>
                    <td><span className={`pos-badge ${posCls(p.position)}`}>{p.position}</span></td>
                    <td>
                      <div className="drv-tag">
                        <div className="drv-dot" style={{ background: col }} />
                        <span className="drv-abbr" style={{ color: col }}>{d?.name_acronym || '#' + p.driver_number}</span>
                        <span className="drv-full">{d?.full_name || ''}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text3)', fontSize: 10 }}>{d?.team_name || '—'}</td>
                    <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>
                      {pits > 0 ? pits : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td>
                      {i === 0
                        ? <span className="tag t-green">LEADER</span>
                        : <div style={{ display: 'inline-block', width: 70, height: 4, background: 'var(--surface3)', borderRadius: 2, verticalAlign: 'middle', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--accent3)', borderRadius: 2, width: `${gapPct}%` }} />
                          </div>
                      }
                    </td>
                    <td style={{ color: 'var(--text3)' }}>{fmtTs(p.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
