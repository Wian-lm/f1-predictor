import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const BASE = 'https://api.openf1.org/v1';

function apiFetch(ep, params = {}) {
  const u = new URL(BASE + ep);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return fetch(u.toString()).then(r => r.ok ? r.json() : []).catch(() => []);
}

async function fetchSessionData(sk) {
  const [driversArr, laps, positions, pitStops, weather, raceControl, radio, standings, stints] = await Promise.all([
    apiFetch('/drivers',      { session_key: sk }),
    apiFetch('/laps',         { session_key: sk }),
    apiFetch('/position',     { session_key: sk }),
    apiFetch('/pit',          { session_key: sk }),
    apiFetch('/weather',      { session_key: sk }),
    apiFetch('/race_control', { session_key: sk }),
    apiFetch('/team_radio',   { session_key: sk }),
    apiFetch('/standings',    { session_key: sk }),
    apiFetch('/stints',       { session_key: sk }),
  ]);
  const drivers = {};
  driversArr.forEach(d => { drivers[d.driver_number] = d; });
  return { drivers, laps, positions, pitStops, weather, raceControl, radio, standings, stints };
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

  // Ref so callbacks always see latest sessions without stale closures
  const sessionsRef = useRef([]);

  function updateSessions(sess) {
    setSessions(sess);
    sessionsRef.current = sess;
  }

  // On startup: try 2026, fall back to 2025 then 2024 until meetings are found
  useEffect(() => {
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

      // Pick most recent past meeting
      const past = sorted.filter(m => new Date(m.date_start) <= now);
      const latest = past.length ? past[past.length - 1] : sorted[sorted.length - 1];
      setMeetingKey(String(latest.meeting_key));

      // Fetch sessions and update ref immediately (don't wait for re-render)
      const sess = await apiFetch('/sessions', { meeting_key: latest.meeting_key });
      updateSessions(sess);
      if (!sess.length) return;

      // Prefer Race session, fall back to last session
      const raceSession = sess.find(s => s.session_type === 'Race') || sess[sess.length - 1];
      const sk = String(raceSession.session_key);
      setSessionKey(sk);
      setSessionInfo(raceSession);

      setLoading(true);
      const result = await fetchSessionData(sk);
      setData(result);
      setLoading(false);
      setLoaded(true);
    }
    autoLoad();
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

  // Auto-loads data as soon as user picks a session — no button needed
  const onSessionChange = useCallback(async (sk) => {
    if (!sk) { setSessionKey(''); return; }
    setSessionKey(sk);
    const sess = sessionsRef.current.find(s => String(s.session_key) === String(sk));
    setSessionInfo(sess || null);
    setLoading(true);
    setLoaded(false);
    const result = await fetchSessionData(sk);
    setData(result);
    setLoading(false);
    setLoaded(true);
  }, []);

  const loadAll = useCallback(async (sk) => {
    if (!sk) return;
    const sess = sessionsRef.current.find(s => String(s.session_key) === String(sk));
    setSessionInfo(sess || null);
    setLoading(true);
    setLoaded(false);
    const result = await fetchSessionData(sk);
    setData(result);
    setLoading(false);
    setLoaded(true);
  }, []);

  return (
    <SessionContext.Provider value={{
      year, meetings, sessions, meetingKey, sessionKey,
      loading, loaded, data, sessionInfo,
      onYearChange, onMeetingChange, onSessionChange, loadAll,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
