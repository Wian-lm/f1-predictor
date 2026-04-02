import { useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { driverColor, COMPOUND_COLORS, COMPOUND_TEXT } from '../utils';

function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
      <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '0.15em' }}>{text}</div>
    </div>
  );
}

function TyrePill({ compound, big }) {
  const bg = COMPOUND_COLORS[compound] || '#555';
  const fg = COMPOUND_TEXT[compound] || '#fff';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 3, fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
      background: bg, color: fg,
      padding: big ? '5px 13px' : '2px 7px',
      fontSize: big ? 11 : 9,
    }}>{compound}</span>
  );
}

export default function TyreStrategy() {
  const { loaded, loading, data } = useSession();
  const { drivers, stints, positions, weather } = data;

  const totalLaps = useMemo(() => Math.max(...stints.map(s => s.lap_end || 0)), [stints]);
  const hasWet = useMemo(() => weather.some(w => w.rainfall), [weather]);

  const latestByDrv = useMemo(() => {
    const m = {};
    positions.forEach(p => {
      if (!m[p.driver_number] || new Date(p.date) > new Date(m[p.driver_number].date)) m[p.driver_number] = p;
    });
    return m;
  }, [positions]);

  const driverStints = useMemo(() => {
    const m = {};
    stints.forEach(s => {
      const dn = String(s.driver_number);
      if (!m[dn]) m[dn] = [];
      m[dn].push(s);
    });
    Object.values(m).forEach(arr => arr.sort((a, b) => (a.lap_start || 0) - (b.lap_start || 0)));
    return m;
  }, [stints]);

  const stratKey = arr => arr.map(s => s.compound || '?').join(' → ');

  const { sortedStrats, stratCount } = useMemo(() => {
    const count = {}, score = {};
    Object.entries(driverStints).forEach(([dn, arr]) => {
      const key = stratKey(arr);
      count[key] = (count[key] || 0) + 1;
      const pos = latestByDrv[dn]?.position || 20;
      score[key] = (score[key] || 0) + Math.max(1, 21 - pos);
    });
    return { sortedStrats: Object.entries(score).sort((a, b) => b[1] - a[1]), stratCount: count };
  }, [driverStints, latestByDrv]);

  const stopCounts = useMemo(() => {
    const m = {};
    Object.values(driverStints).forEach(arr => {
      const stops = arr.length - 1;
      const lbl = stops === 0 ? 'NO STOP' : stops === 1 ? '1-STOP' : `${stops}-STOP`;
      m[lbl] = (m[lbl] || 0) + 1;
    });
    return m;
  }, [driverStints]);

  const usedCompounds = useMemo(() => [...new Set(stints.map(s => s.compound).filter(Boolean))], [stints]);
  const sortedDrivers = useMemo(() => Object.keys(driverStints).sort((a, b) => (latestByDrv[a]?.position || 99) - (latestByDrv[b]?.position || 99)), [driverStints, latestByDrv]);

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🏎" text="SELECT A SESSION AND CLICK LOAD DATA" />;
  if (!stints.length) return <Empty icon="🏎" text="NO STINT DATA FOR THIS SESSION" />;

  const topStrat = sortedStrats[0]?.[0] || '—';
  const topStops = (topStrat.match(/→/g) || []).length;
  const stopWord = topStops === 0 ? 'NO-STOP' : topStops === 1 ? '1-STOP' : `${topStops}-STOP`;
  const totalDrvs = Object.keys(driverStints).length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* RECOMMENDED STRATEGY */}
        <div className="card">
          <div className="card-hdr"><div className="card-title">📋 RECOMMENDED STRATEGY</div></div>
          <div className="card-body">
            <div style={{ marginBottom: 14 }}>
              <div className="stat-lbl" style={{ marginBottom: 9 }}>OPTIMAL STRATEGY ({stopWord})</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 9 }}>
                {topStrat.split(' → ').map((c, i, arr) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <TyrePill compound={c} big />
                    {i < arr.length - 1 && <span style={{ color: 'var(--text3)', fontSize: 12, margin: '0 3px' }}>→</span>}
                  </span>
                ))}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                USED BY {stratCount[topStrat]} DRIVER{stratCount[topStrat] !== 1 ? 'S' : ''} · {totalLaps} RACE LAPS{hasWet ? ' · 🌧 WET CONDITIONS DETECTED' : ''}
              </div>
            </div>
            {sortedStrats.length > 1 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div className="stat-lbl" style={{ marginBottom: 9 }}>ALTERNATIVE STRATEGIES</div>
                {sortedStrats.slice(1, 4).map(([key]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7, flexWrap: 'wrap' }}>
                    {key.split(' → ').map((c, i, arr) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <TyrePill compound={c} />
                        {i < arr.length - 1 && <span style={{ color: 'var(--text3)', fontSize: 12, margin: '0 3px' }}>→</span>}
                      </span>
                    ))}
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', marginLeft: 5 }}>
                      {stratCount[key]} driver{stratCount[key] !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* STRATEGY BREAKDOWN */}
        <div className="card">
          <div className="card-hdr"><div className="card-title">📊 STRATEGY BREAKDOWN</div></div>
          <div className="card-body">
            {Object.entries(stopCounts).sort((a, b) => b[1] - a[1]).map(([lbl, cnt]) => {
              const pct = Math.round((cnt / totalDrvs) * 100);
              return (
                <div key={lbl} className="champ-row" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text)' }}>{lbl}</span>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {cnt} driver{cnt !== 1 ? 's' : ''} <span style={{ fontSize: 9, color: 'var(--text3)' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, transition: 'width .8s ease', width: `${pct}%`, background: 'var(--accent3)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DRIVER STRATEGIES */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">🏎 DRIVER STRATEGIES</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {usedCompounds.map(c => {
              const bg = COMPOUND_COLORS[c] || '#555';
              return (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text2)' }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: bg }} />
                  {c}
                </span>
              );
            })}
          </div>
        </div>
        <div className="card-body">
          {sortedDrivers.map(dn => {
            const d = drivers[dn];
            const col = driverColor(d);
            const arr = driverStints[dn];
            const pos = latestByDrv[dn]?.position;
            const stops = arr.length - 1;
            const stopLbl = stops === 0 ? 'NO STOP' : stops === 1 ? '1-STOP' : `${stops}-STOP`;
            const tagCls = stops <= 1 ? 't-blue' : stops === 2 ? 't-orange' : 't-red';
            const posCls = pos ? (['', 'p1', 'p2', 'p3'][pos] || 'pn') : '';

            return (
              <div key={dn} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 80px', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(30,45,61,.5)' }}>
                {/* Driver info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pos && <span className={`pos-badge ${posCls}`}>{pos}</span>}
                  <div className="drv-dot" style={{ background: col }} />
                  <div>
                    <span className="drv-abbr" style={{ color: col }}>{d?.name_acronym || '#' + dn}</span>
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{d?.team_name || ''}</div>
                  </div>
                </div>

                {/* Stint bar */}
                <div>
                  <div style={{ height: 26, borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 4 }}>
                    {arr.map((s, i) => {
                      const lapCount = Math.max(1, (s.lap_end || totalLaps) - (s.lap_start || 1) + 1);
                      const pct = (lapCount / totalLaps) * 100;
                      const comp = s.compound || 'UNKNOWN';
                      const bg = COMPOUND_COLORS[comp] || '#555';
                      const fg = COMPOUND_TEXT[comp] || '#fff';
                      const lbl = lapCount > totalLaps * 0.1 ? comp[0] : '';
                      return (
                        <div key={i} title={`${comp}: Laps ${s.lap_start}–${s.lap_end || '?'} (${lapCount} laps)`}
                          style={{
                            width: `${pct}%`, height: '100%', background: bg, color: fg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700,
                            borderRight: i < arr.length - 1 ? '2px solid rgba(0,0,0,0.25)' : 'none',
                          }}
                        >{lbl}</div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {arr.map((s, i) => {
                      const lapCount = Math.max(1, (s.lap_end || totalLaps) - (s.lap_start || 1) + 1);
                      const comp = s.compound || '?';
                      const bg = COMPOUND_COLORS[comp] || '#555';
                      const fg = COMPOUND_TEXT[comp] || '#fff';
                      const age = s.tyre_age_at_start > 0 ? ` (used+${s.tyre_age_at_start})` : '';
                      return (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ background: bg, color: fg, padding: '1px 5px', borderRadius: 2, fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700 }}>{comp[0]}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>L{s.lap_start}–{s.lap_end || '?'} ({lapCount}){age}</span>
                          {i < arr.length - 1 && <span style={{ color: 'var(--border2)', margin: '0 3px' }}>·</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Stop label */}
                <div style={{ textAlign: 'right' }}>
                  <span className={`tag ${tagCls}`}>{stopLbl}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
