import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import supabase from '../lib/supabase';
import { idbGet, idbSet } from '../lib/localCache';

const BASE = 'https://api.openf1.org/v1';

// ---------------------------------------------------------------------------
// OpenF1 fetch — throttled to ≈1.8 req/s with 429 retry/backoff.
// Only called when all cache layers miss, so rate limits are rarely an issue.
// ---------------------------------------------------------------------------
let _nextSlot = 0;
function reserveSlot() {
  const now = Date.now();
  _nextSlot = Math.max(_nextSlot, now) + 550;
  return _nextSlot - 550 - now;
}

async function apiFetch(ep, params = {}, timeoutMs = 30000) {
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

// ---------------------------------------------------------------------------
// Calendar staleness logic.
// If the next race is more than 7 days away, nothing can have changed — keep
// the cache. During race week (≤7 days) refresh at most once every 6 hours.
// After the final race of the season, refresh at most once per day.
// ---------------------------------------------------------------------------
function isCalendarStale(meetings, fetchedAt) {
  const now = Date.now();
  const age = now - fetchedAt;
  const futureDates = meetings
    .map(m => new Date(m.date_start).getTime())
    .filter(t => t > now)
    .sort((a, b) => a - b);

  if (!futureDates.length) return age > 24 * 60 * 60 * 1000; // end of season — daily
  const daysToNext = (futureDates[0] - now) / (1000 * 60 * 60 * 24);
  if (daysToNext > 7) return false;            // no race this week — never stale
  return age > 6 * 60 * 60 * 1000;            // race week — refresh every 6 h
}

// ---------------------------------------------------------------------------
// Calendar: meetings list for a year.
// Cache layers: IndexedDB → Supabase → OpenF1
// ---------------------------------------------------------------------------
async function loadCalendar(year) {
  let fallback = null;

  // 1. IndexedDB
  const local = await idbGet(`calendar:${year}`);
  if (local?.meetings?.length) {
    if (!isCalendarStale(local.meetings, local.fetchedAt)) return local.meetings;
    fallback = local.meetings; // stale but usable if OpenF1 fails
  }

  // 2. Supabase
  try {
    const { data: cached } = await supabase
      .from('session_cache')
      .select('data, cached_at')
      .eq('session_key', `calendar:${year}`)
      .single();
    if (cached?.data?.meetings?.length) {
      const fetchedAt = new Date(cached.cached_at).getTime();
      if (!isCalendarStale(cached.data.meetings, fetchedAt)) {
        await idbSet(`calendar:${year}`, { meetings: cached.data.meetings, fetchedAt });
        return cached.data.meetings;
      }
      fallback = cached.data.meetings; // stale but usable if OpenF1 fails
    }
  } catch { /* cache miss */ }

  // 3. OpenF1 — short timeout, meetings is a small request
  const meetings = await apiFetch('/meetings', { year }, 10000);
  const sorted = meetings.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
  if (sorted.length) {
    const entry = { meetings: sorted, fetchedAt: Date.now() };
    await idbSet(`calendar:${year}`, entry);
    supabase.from('session_cache').upsert({
      session_key: `calendar:${year}`,
      data: { meetings: sorted },
      cached_at: new Date().toISOString(),
    }).catch(() => {});
    return sorted;
  }

  // OpenF1 failed or returned nothing — use stale cache rather than empty
  return fallback || [];
}

// ---------------------------------------------------------------------------
// Sessions for a meeting.
// Cache layers: IndexedDB → Supabase → OpenF1
// ---------------------------------------------------------------------------
async function loadMeetingSessions(meetingKey) {
  // 1. IndexedDB
  const local = await idbGet(`sessions:${meetingKey}`);
  if (local?.length) return local;

  // 2. Supabase
  try {
    const { data: cached } = await supabase
      .from('session_cache')
      .select('data')
      .eq('session_key', `sessions:${meetingKey}`)
      .single();
    if (cached?.data?.sessions?.length) {
      await idbSet(`sessions:${meetingKey}`, cached.data.sessions);
      return cached.data.sessions;
    }
  } catch { /* cache miss */ }

  // 3. OpenF1 — short timeout, sessions list is a small request
  const sessions = await apiFetch('/sessions', { meeting_key: meetingKey }, 10000);
  if (sessions.length) {
    await idbSet(`sessions:${meetingKey}`, sessions);
    supabase.from('session_cache').upsert({
      session_key: `sessions:${meetingKey}`,
      data: { sessions },
      cached_at: new Date().toISOString(),
    }).catch(() => {});
  }
  return sessions;
}

// ---------------------------------------------------------------------------
// Full session data (drivers, laps, pit stops, etc.)
// Cache layers: IndexedDB → Supabase → OpenF1
// ---------------------------------------------------------------------------
function isValidSessionData(d) {
  return d && (Object.keys(d.drivers || {}).length > 0 || (d.laps || []).length > 0);
}

async function fetchSessionData(sk) {
  const driversArr  = await apiFetch('/drivers',      { session_key: sk });
  const laps        = await apiFetch('/laps',         { session_key: sk }, 90000);
  const positions   = await apiFetch('/position',     { session_key: sk });
  const pitStops    = await apiFetch('/pit',          { session_key: sk });
  const weather     = await apiFetch('/weather',      { session_key: sk });
  const raceControl = await apiFetch('/race_control', { session_key: sk });
  const radio       = await apiFetch('/team_radio',   { session_key: sk });
  const stints      = await apiFetch('/stints',       { session_key: sk });
  const drivers = {};
  driversArr.forEach(d => { drivers[d.driver_number] = d; });
  return { drivers, laps, positions, pitStops, weather, raceControl, radio, standings: [], stints };
}

async function fetchWithCache(sk) {
  // 1. IndexedDB
  const local = await idbGet(`session:${sk}`);
  if (isValidSessionData(local)) return local;

  // 2. Supabase
  try {
    const { data: cached } = await supabase
      .from('session_cache')
      .select('data')
      .eq('session_key', String(sk))
      .single();
    if (isValidSessionData(cached?.data)) {
      await idbSet(`session:${sk}`, cached.data);
      return cached.data;
    }
  } catch { /* cache miss */ }

  // 3. OpenF1
  const result = await fetchSessionData(sk);
  await idbSet(`session:${sk}`, result);
  supabase.from('session_cache').upsert({
    session_key: String(sk),
    data: result,
    cached_at: new Date().toISOString(),
  }).catch(() => {});
  return result;
}

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------
const emptyData = {
  drivers: {}, laps: [], positions: [], pitStops: [],
  weather: [], raceControl: [], radio: [], standings: [], stints: [],
};

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [year, setYear] = useState('2026');
  const [meetings, setMeetings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [meetingKey, setMeetingKey] = useState('');
  const [sessionKey, setSessionKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState(emptyData);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);

  const sessionsRef = useRef([]);

  function updateSessions(sess) {
    setSessions(sess);
    sessionsRef.current = sess;
  }

  async function loadBookmarks() {
    const { data: bm } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false });
    if (bm) setBookmarks(bm);
  }

  async function addBookmark(info) {
    const row = {
      session_key: String(info.session_key),
      session_name: info.session_name,
      session_type: info.session_type,
      meeting_name: info.meeting_name,
      country_name: info.country_name,
      year: String(info.year),
    };
    const { data: bm } = await supabase.from('bookmarks').upsert(row).select();
    if (bm) setBookmarks(prev => [bm[0], ...prev.filter(b => b.session_key !== row.session_key)]);
  }

  async function removeBookmark(sk) {
    await supabase.from('bookmarks').delete().eq('session_key', String(sk));
    setBookmarks(prev => prev.filter(b => b.session_key !== String(sk)));
  }

  function isBookmarked(sk) {
    return bookmarks.some(b => b.session_key === String(sk));
  }

  // Auto-load most recent completed race on startup
  useEffect(() => {
    loadBookmarks().catch(() => {});

    async function autoLoad() {
      const now = new Date();
      const yearsToTry = ['2026', '2025', '2024'];

      let sorted = [];
      let chosenYear = '2026';
      for (const y of yearsToTry) {
        sorted = await loadCalendar(y);
        if (sorted.length) { chosenYear = y; break; }
      }

      setYear(chosenYear);
      setMeetings(sorted);
      if (!sorted.length) return;

      const past = sorted.filter(m => new Date(m.date_start) <= now);
      const latest = past.length ? past[past.length - 1] : sorted[sorted.length - 1];
      setMeetingKey(String(latest.meeting_key));

      const sess = await loadMeetingSessions(latest.meeting_key);
      updateSessions(sess);
      if (!sess.length) return;

      const raceSession = sess.find(s => s.session_type === 'Race') || sess[sess.length - 1];
      const sk = String(raceSession.session_key);
      setSessionKey(sk);
      setSessionInfo(raceSession);

      setLoading(true);
      try {
        const result = await fetchWithCache(sk);
        setData(result);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    autoLoad().catch(() => setLoading(false));
  }, []);

  const onYearChange = useCallback(async (y) => {
    setYear(y);
    setMeetingKey('');
    updateSessions([]);
    setSessionKey('');
    setLoaded(false);
    setData(emptyData);
    setSessionInfo(null);
    const m = await loadCalendar(y);
    setMeetings(m);
  }, []);

  const onMeetingChange = useCallback(async (mk) => {
    setMeetingKey(mk);
    setSessionKey('');
    updateSessions([]);
    setLoaded(false);
    setData(emptyData);
    setSessionInfo(null);
    if (!mk) return;
    const sess = await loadMeetingSessions(mk);
    updateSessions(sess);
  }, []);

  const onSessionChange = useCallback(async (sk) => {
    if (!sk) { setSessionKey(''); return; }
    setSessionKey(sk);
    const sess = sessionsRef.current.find(s => String(s.session_key) === String(sk));
    setSessionInfo(sess || null);
    setLoading(true);
    setLoaded(false);
    try {
      const result = await fetchWithCache(sk);
      setData(result);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Force-refresh from OpenF1, bypassing all caches. Updates both cache layers.
  const loadAll = useCallback(async (sk) => {
    if (!sk) return;
    const sess = sessionsRef.current.find(s => String(s.session_key) === String(sk));
    setSessionInfo(sess || null);
    setLoading(true);
    setLoaded(false);
    try {
      const result = await fetchSessionData(sk);
      await idbSet(`session:${sk}`, result);
      supabase.from('session_cache').upsert({
        session_key: String(sk),
        data: result,
        cached_at: new Date().toISOString(),
      }).catch(() => {});
      setData(result);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBookmark = useCallback(async (bm) => {
    setYear(bm.year);
    setLoaded(false);
    setData(emptyData);

    const mtgs = await loadCalendar(bm.year);
    setMeetings(mtgs);

    // Find which meeting this session belongs to (1 OpenF1 call if not cached)
    const sess = await apiFetch('/sessions', { session_key: bm.session_key });
    if (sess.length) {
      const mk = String(sess[0].meeting_key);
      setMeetingKey(mk);
      const allSess = await loadMeetingSessions(mk);
      updateSessions(allSess);
    }

    const sk = String(bm.session_key);
    setSessionKey(sk);
    setSessionInfo({ session_name: bm.session_name, session_type: bm.session_type });
    setLoading(true);
    try {
      const result = await fetchWithCache(sk);
      setData(result);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SessionContext.Provider value={{
      year, meetings, sessions, meetingKey, sessionKey,
      loading, loaded, data, sessionInfo,
      bookmarks, isBookmarked, addBookmark, removeBookmark, loadBookmark,
      onYearChange, onMeetingChange, onSessionChange, loadAll,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
