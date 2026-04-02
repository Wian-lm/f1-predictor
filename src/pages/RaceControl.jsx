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

const FLAG_ICON = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴', SC: '🚗', VSC: '🚙', CLEAR: '✅' };
const FLAG_BORDER = { GREEN: 'var(--green)', YELLOW: 'var(--yellow)', RED: 'var(--accent)', SC: 'var(--accent2)', VSC: 'var(--accent2)' };

export default function RaceControl() {
  const { loaded, loading, data } = useSession();
  const { raceControl } = data;

  const msgs = [...raceControl].reverse();

  if (loading) return <Empty icon="⟳" text="FETCHING FROM OPENF1..." />;
  if (!loaded) return <Empty icon="🚩" text="SELECT A SESSION AND CLICK LOAD DATA" />;
  if (!msgs.length) return <Empty icon="🚩" text="NO RACE CONTROL MESSAGES FOR THIS SESSION" />;

  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">🚩 RACE CONTROL MESSAGES</div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>{msgs.length} MESSAGES</span>
      </div>
      <div className="card-body" style={{ maxHeight: 600, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {msgs.map((m, i) => {
          const f = m.flag || '';
          const ico = FLAG_ICON[f] || '📢';
          const borderColor = FLAG_BORDER[f] || 'var(--border2)';
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '8px 12px', borderRadius: 3, background: 'var(--surface2)',
              borderLeft: `3px solid ${borderColor}`,
            }}>
              <span style={{ fontSize: 15, minWidth: 20 }}>{ico}</span>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4 }}>{m.message || '—'}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                  {fmtTs(m.date)}{m.lap_number ? ` · LAP ${m.lap_number}` : ''}{m.category ? ` · ${m.category}` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
