import { api } from './api.js';
export async function getBookingPaymentSummary(signal) {
  const response = await api.get('/reservations/access/payment-summary', { withCredentials: true, signal });
  return response.data.data;
}
export async function getBookingPaymentState(signal) {
  const summary = await getBookingPaymentSummary(signal);
  if (summary.requiresReview) return { state: 'REVIEW_REQUIRED', checkoutUrl: null };
  if (summary.status === 'PAID') return { state: 'PAID', checkoutUrl: null };
  return getBookingCheckout(signal);
}
export async function getBookingCheckout(signal) {
  const response = await api.get('/reservations/access/checkout', { withCredentials: true, signal });
  return response.data.data;
}
export async function createBookingCheckout(requestId) {
  const response = await api.post('/reservations/access/checkout', { requestId }, { withCredentials: true });
  return response.data.data;
}
