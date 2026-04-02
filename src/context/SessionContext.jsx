import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import supabase from '../lib/supabase';

const BASE = 'https://api.openf1.org/v1';

function apiFetch(ep, params = {}, timeoutMs = 20000) {
  const u = new URL(BASE + ep);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(u.toString(), { signal: controller.signal })
    .then(r => { clearTimeout(timer); return r.ok ? r.json() : []; })
    .catch(() => { clearTimeout(timer); return []; });
}

async function fetchSessionData(sk) {
  const [driversArr, laps, positions, pitStops, weather, raceControl, radio, stints] = await Promise.all([
    apiFetch('/drivers',      { session_key: sk }),
    apiFetch('/laps',         { session_key: sk }, 60000), // laps can be large — longer timeout
    apiFetch('/position',     { session_key: sk }),
    apiFetch('/pit',          { session_key: sk }),
    apiFetch('/weather',      { session_key: sk }),
    apiFetch('/race_control', { session_key: sk }),
    apiFetch('/team_radio',   { session_key: sk }),
    apiFetch('/stints',       { session_key: sk }),
  ]);
  const drivers = {};
  driversArr.forEach(d => { drivers[d.driver_number] = d; });
  return { drivers, laps, positions, pitStops, weather, raceControl, radio, standings: [], stints };
}

// Returns cached data if valid, otherwise fetches from OpenF1 and caches in background
async function fetchWithCache(sk) {
  try {
    const { data: cached } = await supabase
      .from('session_cache')
      .select('data')
      .eq('session_key', String(sk))
      .single();

    if (cached?.data && (
      Object.keys(cached.data.drivers || {}).length > 0 ||
      (cached.data.laps || []).length > 0
    )) {
      return cached.data;
    }
  } catch (_) { /* cache miss — fall through to API */ }

  const result = await fetchSessionData(sk);

  // Write cache in background — never block on it
  supabase.from('session_cache').upsert({
    session_key: String(sk),
    data: result,
    cached_at: new Date().toISOString(),
  }).catch(() => {});

  return result;
}

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

  // Auto-load most recent past race on startup
  useEffect(() => {
    loadBookmarks().catch(() => {});

    async function autoLoad() {
      const now = new Date();
      const yearsToTry = ['2026', '2025', '2024'];

      let sorted = [];
      let chosenYear = '2026';
      for (const y of yearsToTry) {
        const mtgs = await apiFetch('/meetings', { year: y });
        sorted = mtgs.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
        if (sorted.length) { chosenYear = y; break; }
      }

      setYear(chosenYear);
      setMeetings(sorted);
      if (!sorted.length) return;

      const past = sorted.filter(m => new Date(m.date_start) <= now);
      const latest = past.length ? past[past.length - 1] : sorted[sorted.length - 1];
      setMeetingKey(String(latest.meeting_key));

      const sess = await apiFetch('/sessions', { meeting_key: latest.meeting_key });
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
    const m = await apiFetch('/meetings', { year: y });
    setMeetings(m.sort((a, b) => new Date(a.date_start) - new Date(b.date_start)));
  }, []);

  const onMeetingChange = useCallback(async (mk) => {
    setMeetingKey(mk);
    setSessionKey('');
    updateSessions([]);
    setLoaded(false);
    setData(emptyData);
    setSessionInfo(null);
    if (!mk) return;
    const sess = await apiFetch('/sessions', { meeting_key: mk });
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

  const loadAll = useCallback(async (sk) => {
    if (!sk) return;
    const sess = sessionsRef.current.find(s => String(s.session_key) === String(sk));
    setSessionInfo(sess || null);
    setLoading(true);
    setLoaded(false);
    try {
      const result = await fetchSessionData(sk);
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

    const mtgs = await apiFetch('/meetings', { year: bm.year });
    setMeetings(mtgs.sort((a, b) => new Date(a.date_start) - new Date(b.date_start)));

    const sess = await apiFetch('/sessions', { session_key: bm.session_key });
    if (sess.length) {
      setMeetingKey(String(sess[0].meeting_key));
      const allSess = await apiFetch('/sessions', { meeting_key: sess[0].meeting_key });
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
