# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**f1-predictor** is a React + Vite web application for visualising F1 race data and predicting race outcomes. It consumes the public [OpenF1 API](https://api.openf1.org/v1) — no authentication required.

**Goal**: Analyse lap times, tyre strategies, pit stop data, and historical results to build a prediction model for F1 race finishing positions.

## Tech Stack

- **React 18** + **Vite** — frontend framework and dev server
- **React Router DOM** — client-side routing
- **Recharts** — charting library for lap times, strategy visualisations
- **Axios** — HTTP client for OpenF1 API calls
- **Tailwind CSS v4** — utility-first styling (via `@tailwindcss/vite` plugin)

## Development

```bash
npm run dev      # start dev server (localhost:5173)
npm run build    # production build
npm run preview  # preview production build
```

No backend, no auth, no environment variables needed.

## Project Structure

```
src/
  api/
    openf1.js          # Axios instance + named fetch helpers for all endpoints
  pages/
    Dashboard.jsx              # Overview stats
    LapTimes.jsx               # Lap time analysis
    TyreStrategy.jsx           # Stint/tyre compound visualisation
    RaceResults.jsx            # Race finishing positions
    ChampionshipStandings.jsx  # Driver & constructor standings
    PredictionModel.jsx        # Prediction output (WIP)
  App.jsx              # Router layout + nav
  main.jsx             # React entry point
  index.css            # Tailwind import
```

## OpenF1 API Endpoints

All endpoints are under `https://api.openf1.org/v1`. Key parameters shared across endpoints: `session_key`, `meeting_key`, `driver_number`.

| Endpoint | Description | Key params |
|---|---|---|
| `/meetings` | Race weekends (GPs) | `year` |
| `/sessions` | Sessions within a meeting (FP1, Q, R…) | `meeting_key`, `session_type` |
| `/drivers` | Driver info for a session | `session_key` |
| `/laps` | Per-lap timing data | `session_key`, `driver_number` |
| `/stints` | Tyre stint data | `session_key`, `driver_number` |
| `/pit` | Pit stop events | `session_key`, `driver_number` |
| `/position` | Position changes during a session | `session_key`, `driver_number` |
| `/weather` | Track/air weather data | `session_key` |
| `/race_control` | Safety car, flags, penalties | `session_key` |

All helpers live in `src/api/openf1.js` and accept a `params` object for filtering.

## Supported Seasons

2023, 2024, 2025, 2026 — hardcoded in session selectors. 2026 is the default. Add future years by adding an `<option>` to the year `<select>` in `src/App.jsx` and updating the default `useState` in `src/context/SessionContext.jsx`.

## Architecture Notes

- State management is local (useState/useEffect per page) for now — no Redux or Zustand yet.
- Each page fetches its own data independently using the helpers from `src/api/openf1.js`.
- Charts use Recharts components (LineChart for lap times, BarChart for pit stops, etc.).
- The prediction model page is a placeholder — the plan is to score drivers based on recent lap time consistency, tyre degradation rate, and pit stop timing.
