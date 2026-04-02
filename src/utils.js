export const TEAM_COLORS = {
  'Red Bull': '#3671C6', 'Mercedes': '#27F4D2', 'Ferrari': '#E8002D',
  'McLaren': '#FF8000', 'Aston Martin': '#229971', 'Alpine': '#0093CC',
  'Williams': '#64C4FF', 'AlphaTauri': '#5E8FAA', 'RB': '#6692FF',
  'Sauber': '#52E252', 'Haas': '#B6BABD',
};

export const COMPOUND_COLORS = {
  SOFT: '#00bfff', MEDIUM: '#ffd700', HARD: '#888888',
  INTERMEDIATE: '#39b54a', WET: '#0067ff',
};

export const COMPOUND_TEXT = {
  SOFT: '#000', MEDIUM: '#000', HARD: '#fff',
  INTERMEDIATE: '#000', WET: '#fff',
};

export function driverColor(d) {
  if (d?.team_colour) return '#' + d.team_colour;
  if (d?.team_name) {
    for (const [k, v] of Object.entries(TEAM_COLORS))
      if (d.team_name.includes(k)) return v;
  }
  return '#5577aa';
}

export function fmtTime(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(3).padStart(6, '0');
  return m > 0 ? `${m}:${sec}` : `${Number(s).toFixed(3)}s`;
}

export function fmtTs(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  } catch { return ts; }
}
