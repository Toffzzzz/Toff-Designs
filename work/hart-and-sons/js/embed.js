/*
 * Hart & Sons: the message API (Contract A, business 'trades'; plan sections 10.2 to 10.4
 * and 10.8). Active only inside a frame (window.parent !== window). The envelope, origin
 * and source checks, queue, ready/hello and state throttling live in
 * assets/shared/embed-api.js; this file lists the actions and their arguments.
 * Every action goes through the same functions as the visitor's own controls.
 */
import { serve, v } from '../../../assets/shared/embed-api.js';
import { VISIT_JOBS, QUOTE_JOBS, WINDOW_KEYS, POSTCODE_DISTRICT } from './rules.js';
import { apiRequestVisit, apiQuoteFromList, resetAll, getState } from './booking.js';
import { onChange } from './store.js';

export function initEmbed() {
  const api = serve({
    business: 'trades',
    getState,
    actions: {
      request_visit: {
        args: {
          job: v.oneOf(VISIT_JOBS),
          date: v.date(),
          window: v.oneOf(WINDOW_KEYS),
          postcode_district: v.string({ max: 5, pattern: POSTCODE_DISTRICT }),
        },
        run: (a) => apiRequestVisit(a),
      },
      quote_from_list: {
        args: { job: v.oneOf(QUOTE_JOBS) },
        run: (a) => apiQuoteFromList(a.job),
      },
      reset: { args: {}, run: () => resetAll() },
    },
  });
  // The visitor's own changes (and a request running out) are announced too.
  if (api.active) onChange(() => api.notifyState());
  return api;
}
