import axios from 'axios';

const BASE_URL = 'https://api.openf1.org/v1';

const api = axios.create({
  baseURL: BASE_URL,
});

export const fetchMeetings = (params = {}) =>
  api.get('/meetings', { params }).then(r => r.data);

export const fetchSessions = (params = {}) =>
  api.get('/sessions', { params }).then(r => r.data);

export const fetchDrivers = (params = {}) =>
  api.get('/drivers', { params }).then(r => r.data);

export const fetchLaps = (params = {}) =>
  api.get('/laps', { params }).then(r => r.data);

export const fetchStints = (params = {}) =>
  api.get('/stints', { params }).then(r => r.data);

export const fetchPit = (params = {}) =>
  api.get('/pit', { params }).then(r => r.data);

export const fetchWeather = (params = {}) =>
  api.get('/weather', { params }).then(r => r.data);

export const fetchRaceControl = (params = {}) =>
  api.get('/race_control', { params }).then(r => r.data);

export const fetchPosition = (params = {}) =>
  api.get('/position', { params }).then(r => r.data);

export default api;
