import { useSession } from '../context/SessionContext';
import { teamColorByName } from '../utils';

function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
      <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '0.15em' }}>{text}</div>
    </div>
  );
}

const POS_STYLE = {
  1: { background: '#b8860b', color: '#fff' },
  2: { background: '#888', color: '#fff' },
  3: { background: '#a0522d', color: '#fff' },
};

function PosBadge({ pos, text }) {
  const style = POS_STYLE[pos] || { background: 'var(--surface3)', color: 'var(--text2)' };
  return (
    <span style={{
      fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700,
      padding: '2px 6px', borderRadius: 2, minWidth: 28, textAlign: 'center',
      display: 'inline-block', ...style,
    }}>
      {text || `P${pos}`}
    </span>
  );
}

function StatusBadge({ status, detail }) {
  const colours = {
    DNF: { bg: 'rgba(232,0,45,0.18)', border: 'var(--accent)', color: 'var(--accent)' },
    DNS: { bg: 'rgba(100,100,100,0.18)', border: 'var(--text3)', color: 'var(--text3)' },
    DSQ: { bg: 'rgba(255,165,0,0.18)', border: '#ff8c00', color: '#ff8c00' },
  };
  const c = colours[status] || {};
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
      <span style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700,
        padding: '2px 5px', borderRadius: 2, border: `1px solid ${c.border}`,
        background: c.bg, color: c.color, letterSpacing: '0.08em',
      }}>
        {status}
      </span>
      {detail && (
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
          color: 'var(--text3)', letterSpacing: '0.04em',
        }}>
          {detail}
        </span>
      )}
    </div>
  );
}

function DeltaBadge({ grid, position, isDNS }) {
  if (isDNS || grid <= 0 || !position) return <span style={{ color: 'var(--text3)' }}>—</span>;
  const delta = grid - position;
  if (delta === 0) return <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>—</span>;
  return (
    <span style={{
      fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700,
      color: delta > 0 ? 'var(--green)' : 'var(--accent)',
    }}>
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

export default function Results() {
  const { loaded, loading, raceResults, raceResultsLoading, sessionInfo } = useSession();
  const sessionType = sessionInfo?.session_type;

  if (loading || raceResultsLoading) return <Empty icon="⟳" text="FETCHING DATA..." />;
  if (!loaded) return <Empty icon="🏆" text="SELECT A SESSION ABOVE TO LOAD DATA" />;

  if (sessionType !== 'Race' && sessionType !== 'Sprint') {
    return <Empty icon="🏆" text={`${sessionType?.toUpperCase() || 'SESSION'} · NO RACE CLASSIFICATION`} />;
  }

  if (!raceResults) return <Empty icon="🏆" text="RACE RESULTS NOT YET AVAILABLE" />;

  const { raceName, circuit, country, date, round, season, results } = raceResults;
  const isSprint = sessionType === 'Sprint';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          {raceName}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.12em' }}>
          {circuit} · {country} · {date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
          {' · '}{isSprint ? 'SPRINT' : `ROUND ${round} · ${season}`}
        </div>
      </div>

      <div className="card">
        <div className="card-hdr">
          <div className="card-title">{isSprint ? '⚡ SPRINT CLASSIFICATION' : '🏁 RACE CLASSIFICATION'}</div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
            {results.length} CLASSIFIED
          </span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>POS</th>
                <th>DRIVER</th>
                <th>TEAM</th>
                <th>TIME / GAP</th>
                <th>LAPS</th>
                <th>PTS</th>
                <th>GRID</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const teamCol = teamColorByName(r.team);
                const isDNS   = r.status === 'DNS';
                const isDNF   = r.status === 'DNF';
                const isDSQ   = r.status === 'DSQ';
                const isOut   = isDNS || isDNF || isDSQ;

                // Time/gap cell
                let timeDisplay;
                if (isDNS || isDNF || isDSQ) {
                  timeDisplay = <StatusBadge status={r.status} detail={isDNF || isDSQ ? r.statusDetail : null} />;
                } else if (r.statusDetail) {
                  // Lapped car: statusDetail = "+1 Lap"
                  timeDisplay = (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                      {r.statusDetail}
                    </span>
                  );
                } else {
                  timeDisplay = (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: r.position === 1 ? 'var(--green)' : 'var(--text)' }}>
                      {r.time || '—'}
                      {r.fastestLap && (
                        <span style={{ marginLeft: 5, fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: '#bf00ff', fontWeight: 700 }}>FL</span>
                      )}
                    </span>
                  );
                }

                return (
                  <tr key={r.driverId} style={{ opacity: isOut ? 0.55 : 1 }}>
                    <td>
                      <PosBadge pos={r.position} text={isDNS ? 'DNS' : isDSQ ? 'DSQ' : isDNF ? 'DNF' : undefined} />
                    </td>
                    <td>
                      <div className="drv-tag">
                        <div className="drv-dot" style={{ background: 'var(--border2)' }} />
                        <span className="drv-abbr" style={{ color: teamCol }}>{r.driverCode}</span>
                        <span className="drv-full">{r.driver}</span>
                      </div>
                    </td>
                    <td style={{ color: teamCol, fontSize: 10 }}>{r.team}</td>
                    <td>{timeDisplay}</td>
                    <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>
                      {r.laps > 0 ? r.laps : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: r.points > 0 ? '#fff' : 'var(--text3)' }}>
                        {r.points > 0 ? r.points : '—'}
                      </span>
                    </td>
                    <td style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: 'var(--text3)' }}>
                      {r.grid > 0 ? r.grid : <span style={{ color: 'var(--text3)' }}>PL</span>}
                    </td>
                    <td><DeltaBadge grid={r.grid} position={r.position} isDNS={isDNS} /></td>
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
