const BASE = 'https://api.jolpi.ca/ergast/f1';

async function jFetch(path) {
  try {
    const r = await fetch(`${BASE}${path}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function fetchSchedule(year) {
  const data = await jFetch(`/${year}.json?limit=100`);
  return data?.MRData?.RaceTable?.Races || null;
}

export async function fetchRaceResults(year, round) {
  const data = await jFetch(`/${year}/${round}/results.json`);
  return data?.MRData?.RaceTable?.Races?.[0] || null;
}

export async function fetchSprintResults(year, round) {
  const data = await jFetch(`/${year}/${round}/sprint.json`);
  return data?.MRData?.RaceTable?.Races?.[0] || null;
}

export async function fetchQualifying(year, round) {
  const data = await jFetch(`/${year}/${round}/qualifying.json`);
  return data?.MRData?.RaceTable?.Races?.[0] || null;
}

export async function fetchDriverStandings(year, round = null) {
  const path = round ? `/${year}/${round}/driverstandings.json` : `/${year}/driverstandings.json`;
  const data = await jFetch(path);
  return data?.MRData?.StandingsTable?.StandingsLists?.[0] || null;
}

export async function fetchConstructorStandings(year, round = null) {
  const path = round ? `/${year}/${round}/constructorstandings.json` : `/${year}/constructorstandings.json`;
  const data = await jFetch(path);
  return data?.MRData?.StandingsTable?.StandingsLists?.[0] || null;
}

export async function fetchArchiveLapTimes(year, round) {
  const limit = 1000;
  const first = await jFetch(`/${year}/${round}/laps.json?limit=${limit}&offset=0`);
  if (!first) return null;
  const total = Number(first?.MRData?.total || 0);
  const firstLaps = first?.MRData?.RaceTable?.Races?.[0]?.Laps || [];
  if (!firstLaps.length) return null;
  if (total <= limit) return firstLaps;
  const extra = await Promise.all(
    Array.from({ length: Math.ceil(total / limit) - 1 }, (_, i) =>
      jFetch(`/${year}/${round}/laps.json?limit=${limit}&offset=${(i + 1) * limit}`)
        .then(d => d?.MRData?.RaceTable?.Races?.[0]?.Laps || [])
    )
  );
  return [...firstLaps, ...extra.flat()];
}

export async function fetchArchivePitStops(year, round) {
  const data = await jFetch(`/${year}/${round}/pitstops.json?limit=200`);
  return data?.MRData?.RaceTable?.Races?.[0]?.PitStops || null;
}
