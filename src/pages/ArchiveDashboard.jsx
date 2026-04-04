import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ERAS } from './archiveEras';
import {
  getSchedule, getRaceResults, getSprintResults,
  getDriverStandings, getConstructorStandings,
  getQualifyingResults, getArchiveLapTimes, getArchivePitStops,
} from '../api/index.js';
import { teamColorByName } from '../utils';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const TAB_LABELS = {
  results:    '🏁 RACE',
  standings:  '📊 STANDINGS',
  qualifying: '⏱ QUALIFYING',
  laps:       '📈 LAP TIMES',
  pitstops:   '🔧 PIT STOPS',
  sprint:     '⚡ SPRINT',
};

const sel = {
  background: 'var(--surface3)', border: '1px solid var(--border2)',
  color: 'var(--text)', padding: '5px 10px', borderRadius: 3,
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
  cursor: 'pointer', outline: 'none',
};
const slbl = {
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
  letterSpacing: '0.15em', color: 'var(--text3)',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function posCls(p) { return ['', 'p1', 'p2', 'p3'][p] || 'pn'; }

function parseLapTime(t) {
  if (!t) return null;
  const parts = t.split(':');
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(t) || null;
}

function fmtSeconds(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(3).padStart(6, '0');
  return m > 0 ? `${m}:${sec}` : `${s.toFixed(3)}`;
}

function driverCode(r) {
  return r.driverCode || r.driver?.split(' ').pop()?.slice(0, 3).toUpperCase() || '?';
}

// ─── SHARED UI ───────────────────────────────────────────────────────────────

function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
      <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '0.15em' }}>{text}</div>
    </div>
  );
}

function Spin() { return <Empty icon="⟳" text="LOADING..." />; }

function Bar({ pct, color }) {
  return (
    <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', borderRadius: 2, transition: 'width .8s ease', width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── RESULTS GRID ─────────────────────────────────────────────────────────────

function ResultsGrid({ results }) {
  if (!results?.length) return <Empty icon="🏁" text="NO RESULTS DATA" />;

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 130px 36px 100px 44px',
        gap: '0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 4,
      }}>
        {['POS', 'DRIVER', 'TEAM', 'GRD', 'TIME / STATUS', 'PTS'].map(h => (
          <div key={h} style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: 7.5,
            color: 'var(--text3)', letterSpacing: '0.1em',
            textAlign: h === 'POS' ? 'left' : 'right',
          }}>{h}</div>
        ))}
      </div>

      {results.map(r => {
        const code = driverCode(r);
        const teamCol = teamColorByName(r.team);
        const isFinished = r.status === 'Finished';
        const timeDisplay = isFinished
          ? (r.position === 1 ? (r.time || 'FL') : r.time ? `+${r.time}` : r.statusDetail || '—')
          : `${r.status}${r.statusDetail ? ` · ${r.statusDetail}` : ''}`;
        const timeColor = !isFinished
          ? (r.status === 'DSQ' ? '#ff4444' : 'var(--accent)')
          : r.position === 1 ? 'var(--text)' : 'var(--text2)';

        return (
          <div key={r.driverId || r.driver} style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 130px 36px 100px 44px',
            gap: '0 10px', padding: '5px 0',
            borderBottom: '1px solid var(--border)', alignItems: 'center',
          }}>
            <span className={`pos-badge ${posCls(r.position)}`}>{r.positionText}</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <div className="drv-dot" style={{ background: teamCol, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9.5, fontWeight: 700, color: teamCol, flexShrink: 0 }}>
                {code}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.driver}
              </span>
            </div>

            <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.team}
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {r.grid > 0 ? r.grid : <span style={{ fontSize: 8 }}>PL</span>}
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: timeColor }}>
              {timeDisplay}
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: r.points > 0 ? '#fff' : 'var(--text3)' }}>
              {r.points > 0 ? r.points : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── QUALIFYING GRID ─────────────────────────────────────────────────────────

function QualifyingGrid({ data }) {
  if (!data?.results?.length) return <Empty icon="⏱" text="NO QUALIFYING DATA" />;

  const hasQ2 = data.results.some(r => r.q2);
  const hasQ3 = data.results.some(r => r.q3);
  const cols = hasQ3
    ? '32px 1fr 130px 80px 80px 80px'
    : hasQ2 ? '32px 1fr 130px 80px 80px' : '32px 1fr 130px 110px';
  const hdrs = ['POS', 'DRIVER', 'TEAM', 'Q1', ...(hasQ2 ? ['Q2'] : []), ...(hasQ3 ? ['Q3'] : [])];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        {hdrs.map(h => (
          <div key={h} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7.5, color: 'var(--text3)', letterSpacing: '0.1em', textAlign: h === 'POS' ? 'left' : 'right' }}>
            {h}
          </div>
        ))}
      </div>

      {data.results.map(r => {
        const code = driverCode(r);
        const teamCol = teamColorByName(r.team);
        return (
          <div key={r.driverId || r.driver} style={{
            display: 'grid', gridTemplateColumns: cols,
            gap: '0 10px', padding: '5px 0',
            borderBottom: '1px solid var(--border)', alignItems: 'center',
          }}>
            <span className={`pos-badge ${posCls(r.position)}`}>{r.position}</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <div className="drv-dot" style={{ background: teamCol, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9.5, fontWeight: 700, color: teamCol, flexShrink: 0 }}>
                {code}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.driver}
              </span>
            </div>

            <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.team}
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: r.position === 1 ? 'var(--accent2)' : 'var(--text2)', fontWeight: r.position === 1 ? 700 : 400 }}>
              {r.q1 || '—'}
            </div>
            {hasQ2 && (
              <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: r.q2 ? 'var(--text2)' : 'var(--text3)' }}>
                {r.q2 || '—'}
              </div>
            )}
            {hasQ3 && (
              <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: r.q3 ? 'var(--accent2)' : 'var(--text3)', fontWeight: r.q3 && r.position === 1 ? 700 : 400 }}>
                {r.q3 || '—'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STANDINGS ────────────────────────────────────────────────────────────────

function DriverStandingsPanel({ data }) {
  if (!data?.standings?.length) return <Empty icon="👤" text="NO STANDINGS DATA" />;
  const max = data.standings[0]?.points || 1;

  return (
    <div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 14 }}>
        {data.season} · AFTER ROUND {data.round} · {data.standings.length} DRIVERS
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 1fr 70px 44px 80px',
        gap: '0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8,
      }}>
        {['POS', 'DRIVER', 'POINTS', 'WINS', 'GAP'].map(h => (
          <div key={h} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7.5, color: 'var(--text3)', letterSpacing: '0.1em', textAlign: h === 'POS' || h === 'DRIVER' ? 'left' : 'right' }}>
            {h}
          </div>
        ))}
      </div>
      {data.standings.map(s => {
        const code = driverCode(s);
        const teamCol = teamColorByName(s.team);
        const gap = s.position === 1 ? null : s.points - max;
        return (
          <div key={s.driverId} style={{ marginBottom: 10 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 70px 44px 80px',
              gap: '0 10px', alignItems: 'center', marginBottom: 4,
            }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>P{s.position}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: teamCol }}>{code}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.driver}
                  </span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--text3)' }}>{s.team}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>{s.points}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--text3)', marginLeft: 3 }}>pts</span>
              </div>
              <div style={{ textAlign: 'right', fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'var(--text2)' }}>
                {s.wins > 0 ? s.wins : <span style={{ color: 'var(--text3)' }}>—</span>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {s.position === 1
                  ? <span className="tag t-green">LEADER</span>
                  : <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--accent)' }}>{gap} pts</span>
                }
              </div>
            </div>
            <Bar pct={Math.round((s.points / max) * 100)} color={teamCol} />
          </div>
        );
      })}
    </div>
  );
}

function ConstructorStandingsPanel({ data, driverStandings }) {
  if (!data?.standings?.length) return <Empty icon="🏎️" text="NO CONSTRUCTOR STANDINGS DATA" />;
  const max = data.standings[0]?.points || 1;
  const teamDrivers = {};
  (driverStandings?.standings || []).forEach(d => {
    if (!teamDrivers[d.teamId]) teamDrivers[d.teamId] = [];
    teamDrivers[d.teamId].push(d);
  });

  return (
    <div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 14 }}>
        {data.season} · AFTER ROUND {data.round} · {data.standings.length} CONSTRUCTORS
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 1fr 70px 44px 80px',
        gap: '0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8,
      }}>
        {['POS', 'CONSTRUCTOR', 'POINTS', 'WINS', 'GAP'].map(h => (
          <div key={h} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7.5, color: 'var(--text3)', letterSpacing: '0.1em', textAlign: h === 'POS' || h === 'CONSTRUCTOR' ? 'left' : 'right' }}>
            {h}
          </div>
        ))}
      </div>
      {data.standings.map(s => {
        const teamCol = teamColorByName(s.team);
        const gap = s.position === 1 ? null : s.points - max;
        const drivers = teamDrivers[s.teamId] || [];
        return (
          <div key={s.teamId} style={{ marginBottom: 14 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 70px 44px 80px',
              gap: '0 10px', alignItems: 'center', marginBottom: 4,
            }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>P{s.position}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div className="drv-dot" style={{ background: teamCol }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.team}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>{s.points}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--text3)', marginLeft: 3 }}>pts</span>
              </div>
              <div style={{ textAlign: 'right', fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'var(--text2)' }}>
                {s.wins > 0 ? s.wins : <span style={{ color: 'var(--text3)' }}>—</span>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {s.position === 1
                  ? <span className="tag t-green">LEADER</span>
                  : <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--accent)' }}>{gap} pts</span>
                }
              </div>
            </div>
            <Bar pct={Math.round((s.points / max) * 100)} color={teamCol} />
            {drivers.length > 0 && (
              <div style={{ marginTop: 4, paddingLeft: 34, display: 'flex', gap: 16 }}>
                {drivers.map(d => (
                  <div key={d.driverId} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8.5, fontWeight: 700, color: teamCol }}>
                      {driverCode(d)}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, color: 'var(--text3)' }}>
                      {d.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── LAP TIMES CHART (lazy) ───────────────────────────────────────────────────

function LapsPanel({ year, round, raceData }) {
  const [laps, setLaps]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  // Reset when round or year changes
  useEffect(() => { setLoaded(false); setLaps(null); }, [year, round]);

  // Lazy-fetch when this panel mounts / round-year reset clears loaded flag
  useEffect(() => {
    if (loaded || !round) return;
    setLoading(true);
    getArchiveLapTimes(year, round)
      .then(d => { setLaps(d); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [year, round, loaded]);

  if (loading) return <Spin />;
  if (!laps?.length) return <Empty icon="📈" text="NO LAP TIME DATA AVAILABLE FOR THIS ROUND" />;

  // Build driverId → team map from race results
  const driverTeamMap = {};
  (raceData?.results || []).forEach(r => { driverTeamMap[r.driverId] = r.team; });

  // driverId → display code
  const driverNameMap = {};
  (raceData?.results || []).forEach(r => { driverNameMap[r.driverId] = driverCode(r); });

  // Collect all driverIds from lap data
  const driverSet = new Set();
  laps.forEach(l => (l.Timings || []).forEach(t => driverSet.add(t.driverId)));
  const driverIds = [...driverSet];

  // Convert to Recharts format: [{ lap: 1, hamilton: 98.5, ... }, ...]
  const chartData = laps.map(lap => {
    const row = { lap: Number(lap.number) };
    (lap.Timings || []).forEach(t => {
      const s = parseLapTime(t.time);
      if (s && s > 20 && s < 600) row[t.driverId] = s;
    });
    return row;
  });

  // Compute median for Y-axis domain (exclude outliers like safety car laps)
  const allTimes = chartData.flatMap(d => driverIds.map(id => d[id]).filter(Boolean));
  allTimes.sort((a, b) => a - b);
  const median = allTimes[Math.floor(allTimes.length / 2)] || null;
  const yDomain = median
    ? [Math.floor(median * 0.95), Math.ceil(median * 1.12)]
    : ['auto', 'auto'];

  const driverColors = {};
  driverIds.forEach(id => { driverColors[id] = teamColorByName(driverTeamMap[id] || ''); });

  return (
    <div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 16 }}>
        {laps.length} LAPS · {driverIds.length} DRIVERS
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 24, left: 56 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="lap"
            tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fill: 'var(--text3)' }}
            label={{ value: 'LAP', position: 'insideBottom', offset: -12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fill: 'var(--text3)' }}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={fmtSeconds}
            tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fill: 'var(--text3)' }}
            width={58}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }}
            formatter={(val, name) => [fmtSeconds(val), driverNameMap[name] || name]}
            labelFormatter={l => `LAP ${l}`}
          />
          {driverIds.map(id => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              dot={false}
              strokeWidth={1.5}
              stroke={driverColors[id]}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── PIT STOPS TABLE (lazy) ───────────────────────────────────────────────────

function PitStopsPanel({ year, round, raceData }) {
  const [pits, setPits]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => { setLoaded(false); setPits(null); }, [year, round]);

  useEffect(() => {
    if (loaded || !round) return;
    setLoading(true);
    getArchivePitStops(year, round)
      .then(d => { setPits(d); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [year, round, loaded]);

  if (loading) return <Spin />;
  if (!pits?.length) return <Empty icon="🔧" text="NO PIT STOP DATA AVAILABLE FOR THIS ROUND" />;

  const driverMap = {};
  (raceData?.results || []).forEach(r => {
    driverMap[r.driverId] = { code: driverCode(r), team: r.team };
  });

  return (
    <div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 14 }}>
        {pits.length} PIT STOPS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 130px 44px 90px', gap: '0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        {['LAP', 'DRIVER', 'TEAM', 'STOP', 'DURATION'].map(h => (
          <div key={h} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7.5, color: 'var(--text3)', letterSpacing: '0.1em', textAlign: h === 'LAP' ? 'left' : 'right' }}>
            {h}
          </div>
        ))}
      </div>
      {pits.map((p, i) => {
        const d = driverMap[p.driverId];
        const teamCol = teamColorByName(d?.team || '');
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 130px 44px 90px', gap: '0 10px', padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>{p.lap}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <div className="drv-dot" style={{ background: teamCol, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: teamCol }}>
                {d?.code || p.driverId}
              </span>
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d?.team || '—'}
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              #{p.stop}
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: p.duration ? 'var(--text)' : 'var(--text3)' }}>
              {p.duration || '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ArchiveDashboard() {
  const { eraId }  = useParams();
  const navigate   = useNavigate();
  const era        = ERAS.find(e => e.id === Number(eraId));

  const [year, setYear]           = useState(String(era?.end || 2022));
  const [round, setRound]         = useState(null);
  const [schedule, setSchedule]   = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(era?.tabs?.[0] || 'results');
  const [standingsTab, setStandingsTab] = useState('drivers');

  const [raceData,             setRaceData]             = useState(null);
  const [qualData,             setQualData]             = useState(null);
  const [driverStandings,      setDriverStandings]      = useState(null);
  const [constructorStandings, setConstructorStandings] = useState(null);
  const [sprintData,           setSprintData]           = useState(null);
  const [dataLoading,          setDataLoading]          = useState(false);

  if (!era) { navigate('/archive'); return null; }

  const years = Array.from({ length: era.end - era.start + 1 }, (_, i) => era.end - i);

  function clearData() {
    setRaceData(null); setQualData(null);
    setDriverStandings(null); setConstructorStandings(null);
    setSprintData(null);
  }

  // Fetch schedule on year change
  useEffect(() => {
    setScheduleLoading(true);
    setSchedule([]);
    setRound(null);
    clearData();
    getSchedule(year).then(s => {
      const races = s || [];
      setSchedule(races);
      if (races.length) setRound(String(races[races.length - 1].round));
    }).finally(() => setScheduleLoading(false));
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all eager data on round change
  useEffect(() => {
    if (!round) return;
    setDataLoading(true);
    clearData();

    const fetches = [
      getRaceResults(year, round).then(setRaceData),
      getDriverStandings(year, round).then(setDriverStandings),
    ];
    if (era.tabs.includes('qualifying')) {
      fetches.push(getQualifyingResults(year, round).then(setQualData));
    }
    if (era.id >= 2) {
      fetches.push(getConstructorStandings(year, round).then(setConstructorStandings));
    }
    if (era.tabs.includes('sprint')) {
      fetches.push(getSprintResults(year, round).then(setSprintData));
    }

    Promise.all(fetches).finally(() => setDataLoading(false));
  }, [round, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRace = schedule.find(r => String(r.round) === String(round));

  const isLazyTab = activeTab === 'laps' || activeTab === 'pitstops';
  const showSpinner = dataLoading && !isLazyTab;

  return (
    <div>
      {/* Era header + selectors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/archive')}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border2)',
            color: 'var(--text2)', borderRadius: 3, padding: '6px 12px',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0,
          }}
        >
          ← ERAS
        </button>

        <div style={{ borderLeft: `3px solid ${era.color}`, paddingLeft: 12 }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 14, letterSpacing: '0.12em', color: era.color }}>
            {era.label}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em', marginTop: 2 }}>
            {era.subtitle} · HISTORICAL ARCHIVE
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={slbl}>SEASON</span>
          <select style={sel} value={year} onChange={e => setYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <span style={slbl}>ROUND</span>
          <select
            style={sel}
            value={round || ''}
            onChange={e => setRound(e.target.value)}
            disabled={scheduleLoading || !schedule.length}
          >
            {scheduleLoading
              ? <option>Loading...</option>
              : schedule.map(r => (
                <option key={r.round} value={r.round}>
                  R{r.round} · {r.raceName}
                </option>
              ))
            }
          </select>

          {selectedRace && !scheduleLoading && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {selectedRace.Circuit?.Location?.country || ''} · {selectedRace.date}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {era.tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 18px',
            fontFamily: "'Orbitron', sans-serif", fontSize: 8.5, fontWeight: 600,
            letterSpacing: '0.12em',
            color: activeTab === tab ? '#fff' : 'var(--text3)',
            borderBottom: activeTab === tab ? `2px solid ${era.color}` : '2px solid transparent',
            background: 'none', border: 'none', borderRadius: 0,
            cursor: 'pointer', transition: 'color .2s', whiteSpace: 'nowrap',
          }}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Loading spinner for eager tabs */}
      {showSpinner && <Spin />}

      {/* Race results */}
      {!showSpinner && activeTab === 'results' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">🏁 RACE RESULTS</div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {raceData ? `${raceData.season} · ${raceData.raceName}` : ''}
            </span>
          </div>
          <div className="card-body">
            {raceData ? <ResultsGrid results={raceData.results} /> : <Empty icon="🏁" text="NO DATA FOR THIS ROUND" />}
          </div>
        </div>
      )}

      {/* Qualifying */}
      {!showSpinner && activeTab === 'qualifying' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">⏱ QUALIFYING</div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {qualData ? `${qualData.season} · ${qualData.raceName}` : ''}
            </span>
          </div>
          <div className="card-body">
            <QualifyingGrid data={qualData} />
          </div>
        </div>
      )}

      {/* Standings */}
      {!showSpinner && activeTab === 'standings' && (
        <div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
            {['drivers', ...(era.id >= 2 ? ['constructors'] : [])].map(sub => (
              <button key={sub} onClick={() => setStandingsTab(sub)} style={{
                padding: '9px 20px',
                fontFamily: "'Orbitron', sans-serif", fontSize: 8.5, fontWeight: 600,
                letterSpacing: '0.12em',
                color: standingsTab === sub ? '#fff' : 'var(--text3)',
                borderBottom: standingsTab === sub ? `2px solid ${era.color}` : '2px solid transparent',
                background: 'none', border: 'none', borderRadius: 0,
                cursor: 'pointer', transition: 'color .2s',
              }}>
                {sub === 'drivers' ? '👤 DRIVERS' : '🏎️ CONSTRUCTORS'}
              </button>
            ))}
          </div>
          <div className="card">
            <div className="card-body">
              {standingsTab === 'drivers'
                ? <DriverStandingsPanel data={driverStandings} />
                : <ConstructorStandingsPanel data={constructorStandings} driverStandings={driverStandings} />
              }
            </div>
          </div>
        </div>
      )}

      {/* Lap times (lazy) */}
      {activeTab === 'laps' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">📈 LAP TIMES</div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>PER-DRIVER LAP-BY-LAP</span>
          </div>
          <div className="card-body">
            <LapsPanel year={year} round={round} raceData={raceData} />
          </div>
        </div>
      )}

      {/* Pit stops (lazy) */}
      {activeTab === 'pitstops' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">🔧 PIT STOPS</div>
          </div>
          <div className="card-body">
            <PitStopsPanel year={year} round={round} raceData={raceData} />
          </div>
        </div>
      )}

      {/* Sprint */}
      {!showSpinner && activeTab === 'sprint' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">⚡ SPRINT RESULTS</div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {sprintData ? `${sprintData.season} · ${sprintData.raceName}` : ''}
            </span>
          </div>
          <div className="card-body">
            {sprintData
              ? <ResultsGrid results={sprintData.results} />
              : <Empty icon="⚡" text="NO SPRINT RACE THIS ROUND" />
            }
          </div>
        </div>
      )}
    </div>
  );
}
