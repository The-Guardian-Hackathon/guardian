const { randomUUID } = require('crypto');

const sessions = new Map();

function emptySession(id) {
  return {
    session_id: id,
    // user's plain-language call instructions (what the agent may accept without asking)
    mandate: null,
    original_flight: {
      flight_number: null, date: null, time: null,
      passenger_name: null, booking_ref: null, route: null,
    },
    rebooking: {
      status: 'idle',
      new_flight_details: { time: null, date: null, fee: null },
      transcript_summary: null,
    },
    payment: { status: 'pending', amount: null, transaction_id: null },
    events: [],
  };
}

// Merge plain objects one key at a time, recursing into nested objects
// (so PATCHing rebooking.new_flight_details.fee doesn't wipe its siblings).
function deepMerge(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)
      && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function newSession(partial = {}, id) {
  const session = emptySession(id || randomUUID().slice(0, 8));
  const { session_id, events, ...rest } = partial || {};
  deepMerge(session, rest);
  sessions.set(session.session_id, session);
  return session;
}

function getSession(id) {
  return sessions.get(id) || null;
}

// PATCH semantics: deep-merge top-level fields; session_id and events are immutable here.
function patchSession(session, body = {}) {
  const { session_id, events, ...rest } = body;
  deepMerge(session, rest);
  return session;
}

function appendEvent(session, { phase, message, timestamp } = {}) {
  const event = {
    timestamp: timestamp || new Date().toISOString(),
    phase: phase || 'system',
    message: String(message || ''),
  };
  session.events.push(event);
  return event;
}

module.exports = { sessions, newSession, getSession, patchSession, appendEvent };
