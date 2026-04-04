import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../context/SessionContext';
import { teamColorByName } from '../utils';
import { getDriverStandings, getConstructorStandings, getLastNRoundsPoints } from '../api/index.js';

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
    <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', minWidth: 60 }}>
      <div style={{ height: '100%', borderRadius: 2, transition: 'width .8s ease', width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function Standings() {
  const { year, jolpikaRound } = useSession();

  const [activeTab, setActiveTab]             = useState('drivers');
  const [driverData, setDriverData]           = useState(null);
  const [constructorData, setConstructorData] = useState(null);
  const [recentPoints, setRecentPoints]       = useState({});
  const [loadingData, setLoadingData]         = useState(false);

  const loadStandings = useCallback(async (year, round) => {
    setLoadingData(true);
    try {
      const [d, c] = await Promise.all([
        getDriverStandings(year, round || null),
        getConstructorStandings(year, round || null),
      ]);
      setDriverData(d);
      setConstructorData(c);
      // Load recent points using the round from the standings response (most accurate)
      const currentRound = d?.round || round;
      if (currentRound) {
        const pts = await getLastNRoundsPoints(year, currentRound, 3);
        setRecentPoints(pts);
      }
    } catch {
      setDriverData(null);
      setConstructorData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Re-fetch when global year or round changes
  useEffect(() => {
    loadStandings(year, jolpikaRound);
  }, [year, jolpikaRound, loadStandings]);

  const leaderPts       = driverData?.standings?.[0]?.points || 1;
  const leaderTeamPts   = constructorData?.standings?.[0]?.points || 1;

  // Build team → drivers map from driver standings for constructor sub-tab
  const teamDrivers = {};
  (driverData?.standings || []).forEach(d => {
    if (!teamDrivers[d.teamId]) teamDrivers[d.teamId] = [];
    teamDrivers[d.teamId].push(d);
  });

  const afterRound = driverData?.round
    ? `AFTER ROUND ${driverData.round}`
    : '';

  return (
    <div>
      {/* Header row */}
      {afterRound && (
        <div style={{ marginBottom: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em' }}>
          {afterRound}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
        {['drivers', 'constructors'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '9px 20px',
            fontFamily: "'Orbitron', sans-serif", fontSize: 8.5, fontWeight: 600,
            letterSpacing: '0.12em',
            color: activeTab === tab ? '#fff' : 'var(--text3)',
            borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'none', border: 'none', borderRadius: 0,
            cursor: 'pointer', transition: 'all .2s',
          }}>
            {tab === 'drivers' ? '👤 DRIVERS' : '🏎️ CONSTRUCTORS'}
          </button>
        ))}
      </div>

      {loadingData && <Empty icon="⟳" text="LOADING STANDINGS..." />}

      {!loadingData && activeTab === 'drivers' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">👤 DRIVER CHAMPIONSHIP</div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {driverData ? `${driverData.standings.length} DRIVERS · ${driverData.season}` : ''}
            </span>
          </div>
          <div className="card-body">
            {!driverData
              ? <Empty icon="👤" text="NO STANDINGS DATA AVAILABLE" />
              : (
                <>
                  {/* Column headers */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 70px 44px 80px 70px',
                    gap: '0 10px', marginBottom: 8, paddingBottom: 6,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {['POS', 'DRIVER', 'POINTS', 'WINS', 'GAP', 'LAST 3'].map(h => (
                      <div key={h} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7.5, color: 'var(--text3)', letterSpacing: '0.1em', textAlign: h === 'POS' || h === 'DRIVER' ? 'left' : 'right' }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  {driverData.standings.map(s => {
                    const teamCol  = teamColorByName(s.team);
                    const gap      = s.position === 1 ? null : s.points - leaderPts;
                    const recent   = recentPoints[s.driverCode] || 0;
                    const pct      = Math.round((s.points / leaderPts) * 100);
                    return (
                      <div key={s.driverId} style={{ marginBottom: 10 }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '28px 1fr 70px 44px 80px 70px',
                          gap: '0 10px', alignItems: 'center', marginBottom: 5,
                        }}>
                          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>
                            P{s.position}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: teamCol }}>
                                {s.driverCode}
                              </span>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.driver}
                              </span>
                            </div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--text3)', marginTop: 1 }}>
                              {s.team}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>
                              {s.points}
                            </span>
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
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: recent > 0 ? 'var(--green)' : 'var(--text3)', fontWeight: 700 }}>
                              {recent > 0 ? `+${recent}` : '—'}
                            </span>
                          </div>
                        </div>
                        <Bar pct={pct} color={teamCol} />
                      </div>
                    );
                  })}
                </>
              )
            }
          </div>
        </div>
      )}

      {!loadingData && activeTab === 'constructors' && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">🏎️ CONSTRUCTOR CHAMPIONSHIP</div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
              {constructorData ? `${constructorData.standings.length} CONSTRUCTORS · ${constructorData.season}` : ''}
            </span>
          </div>
          <div className="card-body">
            {!constructorData
              ? <Empty icon="🏎️" text="NO STANDINGS DATA AVAILABLE" />
              : (
                <>
                  {/* Column headers */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 70px 44px 80px',
                    gap: '0 10px', marginBottom: 8, paddingBottom: 6,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {['POS', 'CONSTRUCTOR', 'POINTS', 'WINS', 'GAP'].map(h => (
                      <div key={h} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7.5, color: 'var(--text3)', letterSpacing: '0.1em', textAlign: h === 'POS' || h === 'CONSTRUCTOR' ? 'left' : 'right' }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  {constructorData.standings.map(s => {
                    const teamCol = teamColorByName(s.team);
                    const gap     = s.position === 1 ? null : s.points - leaderTeamPts;
                    const pct     = Math.round((s.points / leaderTeamPts) * 100);
                    const drivers = teamDrivers[s.teamId] || [];
                    return (
                      <div key={s.teamId} style={{ marginBottom: 14 }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '28px 1fr 70px 44px 80px',
                          gap: '0 10px', alignItems: 'center', marginBottom: 5,
                        }}>
                          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: 'var(--text3)' }}>
                            P{s.position}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <div className="drv-dot" style={{ background: teamCol }} />
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.team}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff' }}>
                              {s.points}
                            </span>
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

                        <Bar pct={pct} color={teamCol} />

                        {/* Drivers under this constructor */}
                        {drivers.length > 0 && (
                          <div style={{ marginTop: 5, paddingLeft: 38, display: 'flex', gap: 16 }}>
                            {drivers.map(d => (
                              <div key={d.driverId} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8.5, fontWeight: 700, color: teamCol }}>
                                  {d.driverCode}
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
                </>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}
