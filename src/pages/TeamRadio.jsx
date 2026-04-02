import { useState, useMemo } from 'react';
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

function playRadio(url, btn) {
  const a = new Audio(url);
  btn.textContent = '⏸';
  a.onended = () => { btn.textContent = '▶'; };
  a.play().catch(() => { window.open(url, '_blank'); btn.textContent = '▶'; });
}

export default function TeamRadio() {
  const { loaded, loading, data } = useSession();
  const { drivers, radio } = data;
  const [drvFilter, setDrvFilter] = useState('');

  const driverList = useMemo(() => [...new Set(radio.map(r => r.driver_number))], [radio]);

  const filtered = useMemo(() =>
    [...radio].filter(r => !drvFilter || String(r.driver_number) === String(drvFilter)).reverse(),
    [radio, drvFilter]
  );

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="📻" text="SELECT A SESSION AND CLICK LOAD DATA" />;
  if (!radio.length) return <Empty icon="📻" text="NO TEAM RADIO FOR THIS SESSION" />;

  return (
    <div>
      {/* FILTER */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <span style={slbl}>FILTER DRIVER</span>
        <select style={sel} value={drvFilter} onChange={e => setDrvFilter(e.target.value)}>
          <option value="">ALL DRIVERS</option>
          {driverList.map(n => {
            const d = drivers[n];
            return <option key={n} value={n}>{d ? `${d.name_acronym} · ${d.full_name}` : '#' + n}</option>;
          })}
        </select>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
          {filtered.length} MESSAGES
        </span>
      </div>

      <div className="card">
        <div className="card-hdr"><div className="card-title">📻 TEAM RADIO FEED</div></div>
        <div className="card-body" style={{ maxHeight: 600, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filtered.map((r, i) => {
            const d = drivers[r.driver_number];
            const col = driverColor(d);
            return (
              <div key={i} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 3, padding: '9px 12px',
                display: 'flex', gap: 9, alignItems: 'center',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: col }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: col, minWidth: 36 }}>
                    {d?.name_acronym || '#' + r.driver_number}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
                    {fmtTs(r.date)}
                  </div>
                </div>
                {r.recording_url
                  ? (
                    <button
                      onClick={e => playRadio(r.recording_url, e.currentTarget)}
                      title="Play audio"
                      style={{
                        background: 'var(--accent)', border: 'none', borderRadius: '50%',
                        width: 24, height: 24, cursor: 'pointer', color: '#fff', fontSize: 9,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginLeft: 'auto', flexShrink: 0,
                      }}
                    >▶</button>
                  )
                  : <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>NO AUDIO</span>
                }
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
