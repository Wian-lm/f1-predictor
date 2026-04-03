import supabase from '../lib/supabase';
import * as jolpica from './jolpica';
import * as openf1 from './openf1';

const TTL = {
  jolpica: 24 * 60 * 60 * 1000,       // 24 hours — historical results don't change
  openf1:   1 * 60 * 60 * 1000,        // 1 hour   — live session data
  mapping: 30 * 24 * 60 * 60 * 1000,   // 30 days  — round→meeting mapping is permanent
};

// ---------------------------------------------------------------------------
// api_cache table helpers
// ---------------------------------------------------------------------------
async function cacheGet(key) {
  try {
    const { data } = await supabase
      .from('api_cache')
      .select('data, cached_at')
      .eq('cache_key', key)
      .single();
    return data || null;
  } catch {
    return null;
  }
}

function cacheSet(key, data) {
  supabase.from('api_cache').upsert({
    cache_key: key,
    data,
    cached_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {});
}

function isFresh(cachedAt, ttl) {
  return Date.now() - new Date(cachedAt).getTime() < ttl;
}

async function withCache(key, ttl, fetcher) {
  const cached = await cacheGet(key);
  if (cached && isFresh(cached.cached_at, ttl)) return cached.data;
  try {
    const result = await fetcher();
    if (result != null) {
      cacheSet(key, result);
      return result;
    }
  } catch { /* ignore */ }
  return cached?.data ?? null; // stale fallback beats nothing
}

// ---------------------------------------------------------------------------
// Schedule — Jolpica, cached 24 h
// ---------------------------------------------------------------------------
export async function getSchedule(year) {
  return withCache(
    `jolpica:schedule:${year}`,
    TTL.jolpica,
    () => jolpica.fetchSchedule(year)
  );
}

// ---------------------------------------------------------------------------
// OpenF1 meetings list — used for round→meeting_key matching, cached 24 h
// ---------------------------------------------------------------------------
export async function getMeetings(year) {
  return withCache(
    `openf1:meetings:${year}`,
    TTL.jolpica,
    () => openf1.fetchMeetings({ year })
  );
}

// ---------------------------------------------------------------------------
// OpenF1 sessions for a meeting — cached 24 h
// ---------------------------------------------------------------------------
export async function getSessions(meetingKey) {
  return withCache(
    `openf1:sessions:${meetingKey}`,
    TTL.jolpica,
    () => openf1.fetchSessions({ meeting_key: meetingKey })
  );
}

// ---------------------------------------------------------------------------
// Full OpenF1 session data — stored in the existing session_cache table
// IndexedDB caching is handled by the caller (SessionContext) on top of this.
// ---------------------------------------------------------------------------
async function buildSessionData(sk) {
  const [driversArr, laps, positions, pitStops, weather, raceControl, radio, stints] =
    await Promise.all([
      openf1.fetchDrivers({ session_key: sk }),
      openf1.fetchLaps({ session_key: sk }),
      openf1.fetchPosition({ session_key: sk }),
      openf1.fetchPit({ session_key: sk }),
      openf1.fetchWeather({ session_key: sk }),
      openf1.fetchRaceControl({ session_key: sk }),
      openf1.fetchTeamRadio({ session_key: sk }),
      openf1.fetchStints({ session_key: sk }),
    ]);
  const drivers = {};
  driversArr.forEach(d => { drivers[d.driver_number] = d; });
  return { drivers, laps, positions, pitStops, weather, raceControl, radio, standings: [], stints };
}

async function writeSessionCache(sk, data) {
  try {
    await supabase.from('session_cache').upsert({
      session_key: String(sk),
      data,
      cached_at: new Date().toISOString(),
    });
  } catch { /* ignore */ }
}

export async function getSessionData(sk) {
  try {
    const { data: cached } = await supabase
      .from('session_cache')
      .select('data')
      .eq('session_key', String(sk))
      .single();
    if (cached?.data && Object.keys(cached.data.drivers || {}).length > 0) {
      return cached.data;
    }
  } catch { /* cache miss */ }

  const result = await buildSessionData(sk);
  writeSessionCache(sk, result);
  return result;
}

export async function forceRefreshSessionData(sk) {
  const result = await buildSessionData(sk);
  writeSessionCache(sk, result);
  return result;
}

// ---------------------------------------------------------------------------
// Race results — Jolpica, cached 24 h, normalised
// ---------------------------------------------------------------------------
function normaliseResults(raw) {
  if (!raw) return null;
  return {
    round:    Number(raw.round),
    season:   Number(raw.season),
    raceName: raw.raceName,
    circuit:  raw.Circuit?.circuitName || '',
    circuitId: raw.Circuit?.circuitId || '',
    country:  raw.Circuit?.Location?.country || '',
    date:     raw.date,
    results:  (raw.Results || raw.SprintResults || []).map(r => {
      const rawStatus = r.status || '';
      const isLapped   = /^\+\d+\s+Lap/i.test(rawStatus);
      const isFinished = rawStatus === 'Finished' || isLapped;
      const isDNS      = rawStatus === 'Did Not Start' || Number(r.grid) === 0;
      const isDSQ      = /disqualif|excluded/i.test(rawStatus);

      let status, statusDetail;
      if      (isDNS)      { status = 'DNS'; statusDetail = ''; }
      else if (isDSQ)      { status = 'DSQ'; statusDetail = ''; }
      else if (isLapped)   { status = 'Finished'; statusDetail = rawStatus; }
      else if (isFinished) { status = 'Finished'; statusDetail = ''; }
      else                 { status = 'DNF'; statusDetail = rawStatus; }

      return {
        position:     Number(r.position),
        positionText: r.positionText,
        driver:       `${r.Driver.givenName} ${r.Driver.familyName}`,
        driverCode:   r.Driver.code,
        driverId:     r.Driver.driverId,
        team:         r.Constructor.name,
        teamId:       r.Constructor.constructorId,
        grid:         Number(r.grid),
        laps:         Number(r.laps),
        status,
        statusDetail,
        time:         r.Time?.time || null,
        points:       Number(r.points),
        fastestLap:   r.FastestLap?.rank === '1',
      };
    }),
  };
}

export async function getRaceResults(year, round) {
  const raw = await withCache(
    `jolpica:results:${year}:${round}`,
    TTL.jolpica,
    () => jolpica.fetchRaceResults(year, round)
  );
  return normaliseResults(raw);
}

export async function getSprintResults(year, round) {
  const raw = await withCache(
    `jolpica:sprint:${year}:${round}`,
    TTL.jolpica,
    () => jolpica.fetchSprintResults(year, round)
  );
  return normaliseResults(raw);
}

// ---------------------------------------------------------------------------
// Standings — Jolpica, cached 24 h, normalised
// ---------------------------------------------------------------------------
function normaliseDriverStandings(raw) {
  if (!raw) return null;
  return {
    season: Number(raw.season),
    round:  Number(raw.round),
    standings: (raw.DriverStandings || []).map(s => ({
      position:   Number(s.position),
      driver:     `${s.Driver.givenName} ${s.Driver.familyName}`,
      driverCode: s.Driver.code,
      driverId:   s.Driver.driverId,
      team:       s.Constructors?.[0]?.name || '',
      teamId:     s.Constructors?.[0]?.constructorId || '',
      points:     Number(s.points),
      wins:       Number(s.wins),
    })),
  };
}

function normaliseConstructorStandings(raw) {
  if (!raw) return null;
  return {
    season: Number(raw.season),
    round:  Number(raw.round),
    standings: (raw.ConstructorStandings || []).map(s => ({
      position: Number(s.position),
      team:     s.Constructor.name,
      teamId:   s.Constructor.constructorId,
      points:   Number(s.points),
      wins:     Number(s.wins),
    })),
  };
}

export async function getDriverStandings(year, round = null) {
  const key = round
    ? `jolpica:driverstandings:${year}:${round}`
    : `jolpica:driverstandings:${year}`;
  const raw = await withCache(key, TTL.jolpica, () => jolpica.fetchDriverStandings(year, round));
  return normaliseDriverStandings(raw);
}

export async function getConstructorStandings(year, round = null) {
  const key = round
    ? `jolpica:constructorstandings:${year}:${round}`
    : `jolpica:constructorstandings:${year}`;
  const raw = await withCache(key, TTL.jolpica, () => jolpica.fetchConstructorStandings(year, round));
  return normaliseConstructorStandings(raw);
}

// ---------------------------------------------------------------------------
// Recent points — fetch last N race results and sum points per driver code
// ---------------------------------------------------------------------------
export async function getLastNRoundsPoints(year, currentRound, n = 3) {
  const rounds = [];
  for (let i = 0; i < n && currentRound - i > 0; i++) rounds.push(currentRound - i);
  const results = await Promise.all(rounds.map(r => getRaceResults(year, r)));
  const points = {};
  for (const race of results) {
    if (!race) continue;
    for (const r of race.results) {
      if (r.points > 0) points[r.driverCode] = (points[r.driverCode] || 0) + r.points;
    }
  }
  return points;
}
