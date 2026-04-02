import { useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { driverColor, fmtTime } from '../utils';

function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
      <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '0.15em' }}>{text}</div>
    </div>
  );
}

function scoreDriver({ laps, stints, positions, driverNumber }) {
  const dLaps = laps.filter(l => l.driver_number === driverNumber && l.lap_duration);
  if (!dLaps.length) return null;

  // Consistency: lower std deviation = better
  const times = dLaps.map(l => l.lap_duration);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((s, t) => s + (t - avg) ** 2, 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, 100 - stdDev * 10);

  // Pace: lower avg lap time = better (relative)
  const paceScore = avg;

  // Pit stop efficiency: fewer / faster stops
  const dStints = stints.filter(s => s.driver_number === driverNumber);
  const pitCount = dStints.length - 1;

  // Final position
  const latestPos = positions
    .filter(p => p.driver_number === driverNumber)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.position || 20;

  return { avg, stdDev, consistencyScore, paceScore, pitCount, latestPos, lapCount: dLaps.length };
}

export default function PredictionModel() {
  const { loaded, loading, data } = useSession();
  const { drivers, laps, stints, positions } = data;

  const predictions = useMemo(() => {
    if (!loaded || !laps.length) return [];
    const driverNumbers = [...new Set(laps.map(l => l.driver_number))];
    const scores = driverNumbers
      .map(dn => ({ dn, ...scoreDriver({ laps, stints, positions, driverNumber: dn }) }))
      .filter(s => s.avg != null);

    // Normalise pace (lower is better → higher score)
    const minAvg = Math.min(...scores.map(s => s.avg));
    const maxAvg = Math.max(...scores.map(s => s.avg));
    const range = maxAvg - minAvg || 1;

    return scores.map(s => {
      const paceScore = 100 - ((s.avg - minAvg) / range) * 100;
      const pitPenalty = s.pitCount * 3;
      const posBonus = Math.max(0, 20 - s.latestPos) * 1.5;
      const total = paceScore * 0.5 + s.consistencyScore * 0.35 + posBonus - pitPenalty;
      return { ...s, paceScore, total: Math.max(0, total) };
    }).sort((a, b) => b.total - a.total);
  }, [loaded, laps, stints, positions]);

  const maxScore = predictions[0]?.total || 1;

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🤖" text="SELECT A SESSION ABOVE TO LOAD DATA" />;
  if (!predictions.length) return <Empty icon="🤖" text="NOT ENOUGH DATA FOR PREDICTIONS" />;

  return (
    <div>
      {/* INFO BANNER */}
      <div style={{
        background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 4, padding: '10px 14px', marginBottom: 14,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--accent3)', lineHeight: 1.6,
      }}>
        🤖 PREDICTION SCORE = 50% PACE + 35% CONSISTENCY + 15% POSITION BONUS — BASED ON SESSION LAP DATA
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* PREDICTION RANKING */}
        <div className="card">
          <div className="card-hdr"><div className="card-title">🏆 PREDICTED FINISH ORDER</div></div>
          <div className="card-body">
            {predictions.map((s, i) => {
              const d = drivers[s.dn];
              const col = driverColor(d);
              const pct = Math.round((s.total / maxScore) * 100);
              const posCls = ['', 'p1', 'p2', 'p3'][i + 1] || 'pn';
              return (
                <div key={s.dn} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`pos-badge ${posCls}`}>{i + 1}</span>
                      <div className="drv-dot" style={{ background: col }} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text)' }}>
                        {d?.name_acronym || '#' + s.dn}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text3)' }}>{d?.team_name || ''}</span>
                    </div>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {s.total.toFixed(1)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, transition: 'width .8s ease', width: `${pct}%`, background: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DRIVER STATS */}
        <div className="card">
          <div className="card-hdr"><div className="card-title">📊 DRIVER PERFORMANCE STATS</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>DRIVER</th>
                  <th>AVG LAP</th>
                  <th>CONSISTENCY</th>
                  <th>PIT STOPS</th>
                  <th>LAPS</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map(s => {
                  const d = drivers[s.dn];
                  const col = driverColor(d);
                  const consCls = s.consistencyScore > 80 ? 't-green' : s.consistencyScore > 60 ? 't-blue' : 't-grey';
                  return (
                    <tr key={s.dn}>
                      <td>
                        <div className="drv-tag">
                          <div className="drv-dot" style={{ background: col }} />
                          <span className="drv-abbr" style={{ color: col }}>{d?.name_acronym || '#' + s.dn}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--accent2)' }}>{fmtTime(s.avg)}</td>
                      <td><span className={`tag ${consCls}`}>{s.consistencyScore.toFixed(0)}</span></td>
                      <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>{s.pitCount}</td>
                      <td style={{ color: 'var(--text3)' }}>{s.lapCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
