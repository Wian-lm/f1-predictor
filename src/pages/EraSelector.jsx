import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERAS } from './archiveEras';

function EraCard({ era, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${era.color}10` : 'var(--surface)',
        border: `1px solid ${hovered ? era.color : era.color + '40'}`,
        borderRadius: 6, padding: '20px 22px',
        cursor: 'pointer', transition: 'all 0.2s',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: era.color }} />

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
            fontSize: 12, letterSpacing: '0.12em', color: era.color,
          }}>
            {era.label}
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            color: 'var(--text3)', letterSpacing: '0.1em',
          }}>
            {era.subtitle}
          </div>
        </div>

        <p style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          color: 'var(--text2)', lineHeight: 1.65, marginBottom: 14,
        }}>
          {era.desc}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          {era.features.map(f => (
            <span key={f} style={{
              background: `${era.color}18`,
              border: `1px solid ${era.color}35`,
              color: era.color,
              borderRadius: 3, padding: '2px 7px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8.5, letterSpacing: '0.06em',
            }}>
              {f}
            </span>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          fontFamily: "'Orbitron', sans-serif", fontSize: 8.5, fontWeight: 700,
          color: hovered ? era.color : 'var(--text3)', letterSpacing: '0.1em',
          transition: 'color 0.2s',
        }}>
          EXPLORE →
        </div>
      </div>
    </div>
  );
}

export default function EraSelector() {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border2)',
            color: 'var(--text2)', borderRadius: 3, padding: '6px 14px',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          ← LIVE
        </button>
        <div>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
            fontSize: 16, letterSpacing: '0.15em', color: '#fff',
          }}>
            ARCHIVE
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
            color: 'var(--text3)', letterSpacing: '0.15em', marginTop: 2,
          }}>
            HISTORICAL F1 DATA · 1950–2022 · JOLPICA / ERGAST
          </div>
        </div>
      </div>

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
        color: 'var(--text3)', letterSpacing: '0.2em', marginBottom: 16,
      }}>
        SELECT AN ERA TO EXPLORE — EACH ERA HAS A CONSISTENT SET OF AVAILABLE DATA
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 14,
      }}>
        {ERAS.map(era => (
          <EraCard
            key={era.id}
            era={era}
            onClick={() => navigate(`/archive/${era.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
