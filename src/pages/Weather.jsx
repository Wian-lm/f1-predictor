import { useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { fmtTs } from '../utils';

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

export default function Weather() {
  const { loaded, loading, data } = useSession();
  const { weather } = data;

  const last = weather[weather.length - 1];

  const stats = useMemo(() => {
    if (!weather.length) return null;
    const avgA = (weather.reduce((s, x) => s + (x.air_temperature || 0), 0) / weather.length).toFixed(1);
    const maxT = Math.max(...weather.filter(x => x.track_temperature != null).map(x => x.track_temperature));
    const minT = Math.min(...weather.filter(x => x.track_temperature != null).map(x => x.track_temperature));
    return { avgA, maxT, minT };
  }, [weather]);

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🌦" text="SELECT A SESSION ABOVE TO LOAD DATA" />;
  if (!weather.length) return <Empty icon="🌦" text="NO WEATHER DATA FOR THIS SESSION" />;

  return (
    <div>
      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
        <StatCard label="AIR TEMP NOW" value={`${last.air_temperature}°C`} sub={`SESSION AVG: ${stats.avgA}°C`} />
        <StatCard label="TRACK TEMP NOW" value={`${last.track_temperature}°C`} sub={`MAX: ${stats.maxT}° · MIN: ${stats.minT}°`} />
        <StatCard label="HUMIDITY" value={`${last.humidity}%`} sub={`PRESSURE: ${last.pressure} hPa`} />
        <StatCard
          label="CONDITIONS"
          value={last.rainfall ? '🌧️ WET' : '☀️ DRY'}
          valueStyle={{ fontSize: 14 }}
          sub={`WIND: ${last.wind_speed} m/s @ ${last.wind_direction}°`}
        />
      </div>

      {/* WEATHER LOG TABLE */}
      <div className="card">
        <div className="card-hdr"><div className="card-title">🌦 WEATHER LOG (MOST RECENT FIRST)</div></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>TIME</th><th>AIR °C</th><th>TRACK °C</th>
                <th>HUMIDITY %</th><th>PRESSURE hPa</th>
                <th>WIND m/s</th><th>WIND DIR °</th><th>RAIN</th>
              </tr>
            </thead>
            <tbody>
              {[...weather].reverse().map((wx, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text3)' }}>{fmtTs(wx.date)}</td>
                  <td>{wx.air_temperature ?? '—'}</td>
                  <td>{wx.track_temperature ?? '—'}</td>
                  <td>{wx.humidity ?? '—'}</td>
                  <td>{wx.pressure ?? '—'}</td>
                  <td>{wx.wind_speed ?? '—'}</td>
                  <td>{wx.wind_direction ?? '—'}</td>
                  <td>{wx.rainfall ? <span className="tag t-blue">YES</span> : <span className="tag t-grey">NO</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
