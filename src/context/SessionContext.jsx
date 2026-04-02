import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const BASE = 'https://api.openf1.org/v1';

function apiFetch(ep, params = {}) {
  const u = new URL(BASE + ep);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return fetch(u.toString()).then(r => r.ok ? r.json() : []).catch(() => []);
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

  const loadMeetings = useCallback(async (y) => {
    const m = await apiFetch('/meetings', { year: y });
    setMeetings(m.sort((a, b) => new Date(a.date_start) - new Date(b.date_start)));
    setMeetingKey('');
    setSessions([]);
    setSessionKey('');
    setLoaded(false);
    setData(emptyData);
  }, []);

  useEffect(() => { loadMeetings(year); }, []);

  const onYearChange = useCallback(async (y) => {
    setYear(y);
    await loadMeetings(y);
  }, [loadMeetings]);

  const onMeetingChange = useCallback(async (mk) => {
    setMeetingKey(mk);
    setSessionKey('');
    setLoaded(false);
    setData(emptyData);
    if (!mk) return;
    const s = await apiFetch('/sessions', { meeting_key: mk });
    setSessions(s);
  }, []);

  const onSessionChange = useCallback((sk) => {
    setSessionKey(sk);
    setLoaded(false);
  }, []);

  const loadAll = useCallback(async (sk) => {
    if (!sk) return;
    setLoading(true);
    setLoaded(false);

    const [driversArr, laps, positions, pitStops, weather, raceControl, radio, standings, stints] = await Promise.all([
      apiFetch('/drivers', { session_key: sk }),
      apiFetch('/laps', { session_key: sk }),
      apiFetch('/position', { session_key: sk }),
      apiFetch('/pit', { session_key: sk }),
      apiFetch('/weather', { session_key: sk }),
      apiFetch('/race_control', { session_key: sk }),
      apiFetch('/team_radio', { session_key: sk }),
      apiFetch('/standings', { session_key: sk }),
      apiFetch('/stints', { session_key: sk }),
    ]);

    const drivers = {};
    driversArr.forEach(d => { drivers[d.driver_number] = d; });

    const sess = sessions.find(s => String(s.session_key) === String(sk));
    setSessionInfo(sess || null);
    setData({ drivers, laps, positions, pitStops, weather, raceControl, radio, standings, stints });
    setLoading(false);
    setLoaded(true);
  }, [sessions]);

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
