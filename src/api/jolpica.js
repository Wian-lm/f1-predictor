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
