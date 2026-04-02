import { useSession } from '../context/SessionContext';
import { driverColor, fmtTime, fmtTs } from '../utils';

function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
      <div style={{ fontSize: 36, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '0.15em' }}>{text}</div>
    </div>
  );
}

function StatCard({ label, value, sub, valueStyle }) {
  return (
    <div className="stat-card">
      <div className="stat-lbl">{label}</div>
      <div className="stat-val" style={valueStyle}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const { loaded, loading, data } = useSession();
  const { drivers, laps, pitStops, weather, positions } = data;

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🏎️" text="SELECT A SESSION ABOVE TO LOAD DATA" />;

  const fastestLap = laps.reduce((b, l) => l.lap_duration && (!b || l.lap_duration < b.lap_duration) ? l : b, null);
  const lastWx = weather[weather.length - 1];

  // Latest position per driver
  const latestByDrv = {};
  positions.forEach(p => {
    if (!latestByDrv[p.driver_number] || new Date(p.date) > new Date(latestByDrv[p.driver_number].date))
      latestByDrv[p.driver_number] = p;
  });
  const sorted = Object.values(latestByDrv).sort((a, b) => a.position - b.position);

  const posCls = (pos) => (['', 'p1', 'p2', 'p3'][pos] || 'pn');

  return (
    <div>
      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
        <StatCard
          label="DRIVERS"
          value={Object.keys(drivers).length}
          sub="LOADED THIS SESSION"
        />
        <StatCard
          label="FASTEST LAP"
          value={fastestLap ? fmtTime(fastestLap.lap_duration) : '—'}
          valueStyle={{ fontSize: 15, color: 'var(--accent2)' }}
          sub={fastestLap
            ? `${drivers[fastestLap.driver_number]?.name_acronym || '#' + fastestLap.driver_number} · LAP ${fastestLap.lap_number}`
            : '—'}
        />
        <StatCard
          label="PIT STOPS"
          value={pitStops.length}
          sub="TOTAL THIS SESSION"
        />
        <StatCard
          label="TRACK TEMP"
          value={lastWx ? `${lastWx.track_temperature}°C` : '—'}
          sub={lastWx ? `AIR: ${lastWx.air_temperature}°C` : '—'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* POSITIONS */}
        <div className="card">
          <div className="card-hdr"><div className="card-title">🏁 LATEST POSITIONS</div></div>
          <div className="card-body">
            {!sorted.length
              ? <Empty icon="🏁" text="NO POSITION DATA" />
              : sorted.map(p => {
                  const d = drivers[p.driver_number];
                  const col = driverColor(d);
                  return (
                    <div key={p.driver_number} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className={`pos-badge ${posCls(p.position)}`}>{p.position}</span>
                      <div className="drv-dot" style={{ background: col }} />
                      <span className="drv-abbr" style={{ color: col }}>{d?.name_acronym || '#' + p.driver_number}</span>
                      <span className="drv-full">{d?.full_name || ''}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>{d?.team_name || ''}</span>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* WEATHER */}
        <div className="card">
          <div className="card-hdr"><div className="card-title">🌦 LATEST WEATHER</div></div>
          <div className="card-body">
            {!lastWx
              ? <Empty icon="🌦" text="NO WEATHER DATA" />
              : (
                <>
                  <div className="wx-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[
                      { icon: '🌡️', val: `${lastWx.air_temperature}°`, lbl: 'AIR TEMP' },
                      { icon: '🏎️', val: `${lastWx.track_temperature}°`, lbl: 'TRACK TEMP' },
                      { icon: '💧', val: `${lastWx.humidity}%`, lbl: 'HUMIDITY' },
                      { icon: '🌬️', val: lastWx.wind_speed, lbl: 'WIND m/s' },
                      { icon: '🧭', val: `${lastWx.wind_direction}°`, lbl: 'WIND DIR' },
                      { icon: lastWx.rainfall ? '🌧️' : '☀️', val: lastWx.rainfall ? 'WET' : 'DRY', lbl: 'RAINFALL' },
                    ].map(({ icon, val, lbl }) => (
                      <div key={lbl} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 3, padding: '10px 12px' }}>
                        <div style={{ fontSize: 20, marginBottom: 3 }}>{icon}</div>
                        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 600, color: '#fff' }}>{val}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5, color: 'var(--text3)', letterSpacing: '.1em', marginTop: 2 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 9, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                    PRESSURE: {lastWx.pressure} hPa · {fmtTs(lastWx.date)}
                  </div>
                </>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}
