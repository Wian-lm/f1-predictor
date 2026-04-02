import { useState, useMemo } from 'react';
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

export default function LapTimes() {
  const { loaded, loading, data } = useSession();
  const { drivers, laps } = data;
  const [drvFilter, setDrvFilter] = useState('');
  const [sortBy, setSortBy] = useState('lap');

  const driverList = useMemo(() => [...new Set(laps.map(l => l.driver_number))].sort((a, b) => a - b), [laps]);

  const fastestAll = useMemo(() => Math.min(...laps.filter(l => l.lap_duration).map(l => l.lap_duration)), [laps]);
  const drvBest = useMemo(() => {
    const m = {};
    laps.forEach(l => { if (l.lap_duration && (!m[l.driver_number] || l.lap_duration < m[l.driver_number])) m[l.driver_number] = l.lap_duration; });
    return m;
  }, [laps]);

  const filtered = useMemo(() => {
    let rows = laps.filter(l => !drvFilter || String(l.driver_number) === String(drvFilter));
    if (sortBy === 'time') rows = [...rows].sort((a, b) => (a.lap_duration || 999) - (b.lap_duration || 999));
    else if (sortBy === 'driver') rows = [...rows].sort((a, b) => String(a.driver_number).localeCompare(String(b.driver_number)));
    else rows = [...rows].sort((a, b) => a.lap_number - b.lap_number);
    return rows;
  }, [laps, drvFilter, sortBy]);

  const fastestLap = laps.find(l => l.lap_duration === fastestAll);

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="⏱" text="SELECT A SESSION AND CLICK LOAD DATA" />;

  return (
    <div>
      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={slbl}>DRIVER</span>
        <select style={sel} value={drvFilter} onChange={e => setDrvFilter(e.target.value)}>
          <option value="">ALL DRIVERS</option>
          {driverList.map(n => {
            const d = drivers[n];
            return <option key={n} value={n}>{d ? `${d.name_acronym} · ${d.full_name}` : '#' + n}</option>;
          })}
        </select>
        <span style={slbl}>SORT</span>
        <select style={sel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="lap">LAP #</option>
          <option value="time">LAP TIME</option>
          <option value="driver">DRIVER</option>
        </select>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>
          {filtered.length} LAPS
        </span>
      </div>

      <div className="card">
        <div className="card-hdr">
          <div className="card-title">⏱ LAP TIMES</div>
          {fastestLap && (
            <span className="tag t-orange">
              ⚡ FASTEST: {drivers[fastestLap.driver_number]?.name_acronym || '#' + fastestLap.driver_number} {fmtTime(fastestAll)}
            </span>
          )}
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>LAP</th><th>DRIVER</th><th>LAP TIME</th>
                <th>S1</th><th>S2</th><th>S3</th>
                <th>TYRE</th><th>SPEED TRAP</th><th>FLAG</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const d = drivers[l.driver_number];
                const col = driverColor(d);
                const isFast = l.lap_duration === fastestAll;
                const isPB = !isFast && l.lap_duration === drvBest[l.driver_number];
                const ltCls = isFast ? 'lt-fast' : isPB ? 'lt-pb' : 'lt-norm';
                const comp = l.compound || '?';
                return (
                  <tr key={i}>
                    <td style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>{l.lap_number}</td>
                    <td>
                      <div className="drv-tag">
                        <div className="drv-dot" style={{ background: col }} />
                        <span className="drv-abbr" style={{ color: col }}>{d?.name_acronym || '#' + l.driver_number}</span>
                      </div>
                    </td>
                    <td className={ltCls}>
                      {l.lap_duration ? fmtTime(l.lap_duration) : '—'} {isFast ? '⚡' : isPB ? '●' : ''}
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{l.duration_sector_1 ? fmtTime(l.duration_sector_1) : '—'}</td>
                    <td style={{ color: 'var(--text2)' }}>{l.duration_sector_2 ? fmtTime(l.duration_sector_2) : '—'}</td>
                    <td style={{ color: 'var(--text2)' }}>{l.duration_sector_3 ? fmtTime(l.duration_sector_3) : '—'}</td>
                    <td><span className={`tyre ${comp}`}>{comp[0] || '?'}</span></td>
                    <td style={{ color: 'var(--accent3)' }}>{l.st_speed ? `${l.st_speed} km/h` : '—'}</td>
                    <td>{l.is_pit_out_lap ? <span className="tag t-orange">PIT OUT</span> : '—'}</td>
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
