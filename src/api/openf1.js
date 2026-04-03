const BASE = 'https://api.openf1.org/v1';

// Rate limiter — queues slots at ~1.8 req/s to stay under OpenF1's limit
let _nextSlot = 0;
function reserveSlot() {
  const now = Date.now();
  _nextSlot = Math.max(_nextSlot, now) + 550;
  return _nextSlot - 550 - now;
}

export async function apiFetch(ep, params = {}, timeoutMs = 30000) {
  const u = new URL(BASE + ep);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const maxRetries = 4;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const wait = reserveSlot();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(u.toString(), { signal: controller.signal });
      clearTimeout(timer);
      if (r.status === 429) {
        const retryAfter = parseInt(r.headers.get('Retry-After') || '0') * 1000;
        const backoff = Math.max(retryAfter, 2000 * Math.pow(2, attempt));
        if (attempt < maxRetries - 1) { await new Promise(res => setTimeout(res, backoff)); continue; }
        return [];
      }
      return r.ok ? await r.json() : [];
    } catch {
      clearTimeout(timer);
      if (attempt < maxRetries - 1) await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
    }
  }
  return [];
}

export const fetchMeetings     = (p = {}) => apiFetch('/meetings',      p, 10000);
export const fetchSessions     = (p = {}) => apiFetch('/sessions',      p, 10000);
export const fetchDrivers      = (p = {}) => apiFetch('/drivers',       p);
export const fetchLaps         = (p = {}) => apiFetch('/laps',          p, 90000);
export const fetchPosition     = (p = {}) => apiFetch('/position',      p);
export const fetchPit          = (p = {}) => apiFetch('/pit',           p);
export const fetchWeather      = (p = {}) => apiFetch('/weather',       p);
export const fetchRaceControl  = (p = {}) => apiFetch('/race_control',  p);
export const fetchTeamRadio    = (p = {}) => apiFetch('/team_radio',    p);
export const fetchStints       = (p = {}) => apiFetch('/stints',        p);
