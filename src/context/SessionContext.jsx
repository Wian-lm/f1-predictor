import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import supabase from '../lib/supabase';
import { idbGet, idbSet } from '../lib/localCache';
import {
  getSchedule, getMeetings, getSessions,
  getSessionData, forceRefreshSessionData,
  getRaceResults, getSprintResults,
} from '../api/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isValidSessionData(d) {
  return d && (Object.keys(d.drivers || {}).length > 0 || (d.laps || []).length > 0);
}

// Load session data: IndexedDB (L1) → Supabase+OpenF1 (L2, via api/index.js)
async function loadSessionWithCache(sk) {
  const local = await idbGet(`session:${sk}`);
  if (isValidSessionData(local)) return local;
  const result = await getSessionData(sk);
  if (isValidSessionData(result)) await idbSet(`session:${sk}`, result);
  return result;
}

// Build enriched meetings list from Jolpica schedule + OpenF1 meetings.
// Each meeting carries both the OpenF1 meeting_key (for session loading) and
// the Jolpica round number (for results fetching).
async function loadEnrichedMeetings(year) {
  const [schedule, of1Meetings] = await Promise.all([
    getSchedule(year),
    getMeetings(year),
  ]);

  if (schedule?.length) {
    // Date-proximity match: find the OpenF1 meeting within 7 days of each race
    const of1Map = {};
    if (of1Meetings?.length) {
      for (const race of schedule) {
        const raceDate = new Date(race.date).getTime();
        let best = null, bestDiff = Infinity;
        for (const m of of1Meetings) {
          const diff = Math.abs(new Date(m.date_start).getTime() - raceDate);
          if (diff < bestDiff && diff < 7 * 24 * 60 * 60 * 1000) {
            best = m; bestDiff = diff;
          }
        }
        if (best) of1Map[race.round] = best;
      }
    }
    return schedule.map(race => {
      const of1m = of1Map[race.round];
      return {
        meeting_key:  of1m?.meeting_key || null,
        round:        Number(race.round),
        meeting_name: race.raceName,
        country_name: race.Circuit?.Location?.country || '',
        date_start:   of1m?.date_start || race.date,
      };
    });
  }

  // Jolpica has no data for this year — fall back to OpenF1 only
  return (of1Meetings || []).map((m, i) => ({ ...m, round: i + 1 }));
}

// ---------------------------------------------------------------------------
// Empty shapes
// ---------------------------------------------------------------------------
const emptyData = {
  drivers: {}, laps: [], positions: [], pitStops: [],
  weather: [], raceControl: [], radio: [], standings: [], stints: [],
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [year, setYear]               = useState('2026');
  const [meetings, setMeetings]       = useState([]);
  const [sessions, setSessions]       = useState([]);
  const [meetingKey, setMeetingKey]   = useState('');
  const [sessionKey, setSessionKey]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [loaded, setLoaded]           = useState(false);
  const [data, setData]               = useState(emptyData);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [bookmarks, setBookmarks]     = useState([]);

  // Jolpica state
  const [jolpikaRound, setJolpikaRound]             = useState(null);
  const [raceResults, setRaceResults]               = useState(null);
  const [raceResultsLoading, setRaceResultsLoading] = useState(false);

  // Refs for use inside useCallback without stale closures
  const sessionsRef      = useRef([]);
  const yearRef          = useRef('2026');
  const jolpikaRoundRef  = useRef(null);

  function updateSessions(sess) {
    setSessions(sess);
    sessionsRef.current = sess;
  }
  function updateYear(y) {
    setYear(y);
    yearRef.current = y;
  }
  function updateJolpikaRound(r) {
    setJolpikaRound(r);
    jolpikaRoundRef.current = r;
  }

  // ---------------------------------------------------------------------------
  // Bookmarks
  // ---------------------------------------------------------------------------
  async function loadBookmarks() {
    try {
      const { data: bm } = await supabase
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false });
      if (bm) setBookmarks(bm);
    } catch { /* ignore */ }
  }

  async function addBookmark(info) {
    const row = {
      session_key:  String(info.session_key),
      session_name: info.session_name,
      session_type: info.session_type,
      meeting_name: info.meeting_name,
      country_name: info.country_name,
      year:         String(info.year),
    };
    try {
      const { data: bm } = await supabase.from('bookmarks').upsert(row).select();
      if (bm) setBookmarks(prev => [bm[0], ...prev.filter(b => b.session_key !== row.session_key)]);
    } catch { /* ignore */ }
  }

  async function removeBookmark(sk) {
    try {
      await supabase.from('bookmarks').delete().eq('session_key', String(sk));
    } catch { /* ignore */ }
    setBookmarks(prev => prev.filter(b => b.session_key !== String(sk)));
  }

  function isBookmarked(sk) {
    return bookmarks.some(b => b.session_key === String(sk));
  }

  // ---------------------------------------------------------------------------
  // Fetch Jolpica results for a Race/Sprint session
  // ---------------------------------------------------------------------------
  async function fetchAndSetRaceResults(sessionType, round, yr) {
    if (!round || (sessionType !== 'Race' && sessionType !== 'Sprint')) {
      setRaceResults(null);
      return;
    }
    setRaceResultsLoading(true);
    try {
      const results = sessionType === 'Sprint'
        ? await getSprintResults(yr, round)
        : await getRaceResults(yr, round);
      setRaceResults(results);
    } catch {
      setRaceResults(null);
    } finally {
      setRaceResultsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Startup: auto-select most recent past race
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadBookmarks();

    async function init() {
      const yearsToTry = ['2026', '2025', '2024'];
      for (const y of yearsToTry) {
        const enriched = await loadEnrichedMeetings(y);
        if (!enriched?.length) continue;

        updateYear(y);
        setMeetings(enriched);

        const now = new Date();
        const past = y !== now.getFullYear().toString()
          ? enriched
          : enriched.filter(m => new Date(m.date_start) <= now);
        if (!past.length) return;

        const lastMeeting = past[past.length - 1];
        const mk = String(lastMeeting.meeting_key || '');
        setMeetingKey(mk);
        updateJolpikaRound(lastMeeting.round || null);

        if (!mk) return;
        const sess = await getSessions(mk);
        updateSessions(sess || []);
        if (!sess?.length) return;

        const lastSession = sess[sess.length - 1];
        const sk = String(lastSession.session_key);
        setSessionKey(sk);
        setSessionInfo(lastSession);
        setLoading(true);
        setLoaded(false);
        try {
          const result = await loadSessionWithCache(sk);
          setData(result);
          setLoaded(true);
        } finally {
          setLoading(false);
        }

        // Fetch Jolpica results in the background (non-blocking)
        fetchAndSetRaceResults(lastSession.session_type, lastMeeting.round, y);
        return;
      }
    }

    init().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Year change
  // ---------------------------------------------------------------------------
  const onYearChange = useCallback(async (y) => {
    updateYear(y);
    setMeetingKey('');
    updateSessions([]);
    setSessionKey('');
    setLoaded(false);
    setData(emptyData);
    setSessionInfo(null);
    updateJolpikaRound(null);
    setRaceResults(null);

    const enriched = await loadEnrichedMeetings(y);
    setMeetings(enriched || []);
  }, []);

  // ---------------------------------------------------------------------------
  // Meeting change
  // ---------------------------------------------------------------------------
  const onMeetingChange = useCallback(async (mk) => {
    setMeetingKey(mk);
    setSessionKey('');
    updateSessions([]);
    setLoaded(false);
    setData(emptyData);
    setSessionInfo(null);
    setRaceResults(null);

    // Find the round for this meeting from the meetings list
    // (meetings is closed over via a fresh read each time; using a ref to avoid
    //  stale-closure issues we read the current meetings from state indirectly)
    if (!mk) { updateJolpikaRound(null); return; }

    // Find the meeting object — we need the round for Jolpica
    // We can't close over meetings state in useCallback, so we pass it via a ref.
    // Instead, re-read from the enriched meetings by fetching them lazily from cache.
    // The round is embedded in the meeting objects stored in state; we resolve it
    // on the next render via the meetingsRef below.
    const sess = await getSessions(mk);
    updateSessions(sess || []);
  }, []);

  // Keep a ref to meetings so onMeetingChange can read the round without stale closure
  const meetingsRef = useRef([]);
  useEffect(() => { meetingsRef.current = meetings; }, [meetings]);

  // When meetingKey changes, sync the Jolpica round from meetings state
  useEffect(() => {
    if (!meetingKey) { updateJolpikaRound(null); return; }
    const meeting = meetingsRef.current.find(m => String(m.meeting_key) === String(meetingKey));
    updateJolpikaRound(meeting?.round || null);
  }, [meetingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Session change
  // ---------------------------------------------------------------------------
  const onSessionChange = useCallback(async (sk) => {
    if (!sk) { setSessionKey(''); return; }
    setSessionKey(sk);
    const sess = sessionsRef.current.find(s => String(s.session_key) === String(sk));
    setSessionInfo(sess || null);
    setLoading(true);
    setLoaded(false);
    setRaceResults(null);
    try {
      const result = await loadSessionWithCache(sk);
      setData(result);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
    fetchAndSetRaceResults(sess?.session_type, jolpikaRoundRef.current, yearRef.current);
  }, []);

  // ---------------------------------------------------------------------------
  // Force reload from OpenF1 (↺ button)
  // ---------------------------------------------------------------------------
  const loadAll = useCallback(async (sk) => {
    if (!sk) return;
    const sess = sessionsRef.current.find(s => String(s.session_key) === String(sk));
    setSessionInfo(sess || null);
    setLoading(true);
    setLoaded(false);
    try {
      const result = await forceRefreshSessionData(sk);
      await idbSet(`session:${sk}`, result);
      setData(result);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load bookmark
  // ---------------------------------------------------------------------------
  const loadBookmark = useCallback(async (bm) => {
    updateYear(bm.year);
    setLoaded(false);
    setData(emptyData);
    setRaceResults(null);

    const enriched = await loadEnrichedMeetings(bm.year);
    setMeetings(enriched || []);

    // Find matching meeting for this session
    try {
      const sessArr = await getSessions(''); // will return [] but side-effect finds via session_key below
      // Resolve meeting_key from OpenF1 directly for the bookmarked session
      const { apiFetch } = await import('../api/openf1.js');
      const sessData = await apiFetch('/sessions', { session_key: bm.session_key });
      if (sessData.length) {
        const mk = String(sessData[0].meeting_key);
        setMeetingKey(mk);
        const allSess = await getSessions(mk);
        updateSessions(allSess || []);

        const meeting = enriched?.find(m => String(m.meeting_key) === mk);
        updateJolpikaRound(meeting?.round || null);
      }
    } catch { /* ignore */ }

    const sk = String(bm.session_key);
    setSessionKey(sk);
    setSessionInfo({ session_name: bm.session_name, session_type: bm.session_type });
    setLoading(true);
    try {
      const result = await loadSessionWithCache(sk);
      setData(result);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
    fetchAndSetRaceResults(bm.session_type, jolpikaRoundRef.current, bm.year);
  }, []);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  return (
    <SessionContext.Provider value={{
      year, meetings, sessions, meetingKey, sessionKey,
      loading, loaded, data, sessionInfo,
      jolpikaRound, raceResults, raceResultsLoading,
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
