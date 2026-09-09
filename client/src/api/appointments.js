import { http } from './http.js';

/** Appointment availability + booking. Booking requires login. */
export const appointmentsApi = {
  availability: (jewellerId, date) =>
    http.get('/api/appointments/availability', { jewellerId, date }),
  list: (query) => http.get('/api/appointments', query),
  get: (id) => http.get(`/api/appointments/${id}`),
  book: (body) => http.post('/api/appointments', body),
  update: (id, body) => http.patch(`/api/appointments/${id}`, body),
  cancel: (id) => http.del(`/api/appointments/${id}`),
};

export default appointmentsApi;
