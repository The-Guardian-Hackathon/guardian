require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { newSession, getSession, patchSession, appendEvent } = require('./store');
const { startRecovery, approveAndConfirm, reject } = require('./flow');

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

function requireSession(req, res) {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: `session ${req.params.id} not found` });
    return null;
  }
  return session;
}

app.post('/session', (req, res) => {
  const session = newSession(req.body || {});
  appendEvent(session, { phase: 'system', message: 'Session created.' });
  res.status(201).json(session);
});

app.get('/session/:id', (req, res) => {
  const session = requireSession(req, res);
  if (session) res.json(session);
});

app.patch('/session/:id', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const body = req.body || {};
  patchSession(session, body);
  res.json(session);

  // Auto-trigger: parsed flight data arriving kicks off search + negotiate call
  const of = body.original_flight;
  if (of && (of.flight_number || of.route) && session.rebooking.status === 'idle') {
    startRecovery(session).catch((err) => {
      console.error('[recovery] crashed:', err);
      appendEvent(session, { phase: 'system', message: `Recovery flow error: ${err.message}` });
    });
  }
});

app.post('/session/:id/events', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  appendEvent(session, req.body || {});
  res.json({ ok: true });
});

app.post('/session/:id/approve', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  res.status(202).json({ ok: true });
  approveAndConfirm(session).catch((err) => {
    console.error('[approve] crashed:', err);
    appendEvent(session, { phase: 'system', message: `Confirm flow error: ${err.message}` });
  });
});

app.post('/session/:id/reject', (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  reject(session);
  res.json({ ok: true });
});

// Demo helper (not in contract, mirrors the mock server): reset for the next rehearsal run.
// In-flight call flows keep writing to the orphaned old object, so a reset mid-call is safe.
app.post('/session/:id/reset', (req, res) => {
  const fresh = newSession({}, req.params.id);
  appendEvent(fresh, { phase: 'system', message: 'Session reset — ready for the next run.' });
  res.json(fresh);
});

const demo = newSession({}, 'demo');
appendEvent(demo, { phase: 'system', message: 'Session ready — waiting for an itinerary upload.' });

app.listen(PORT, () => {
  console.log(`Recovery backend on http://localhost:${PORT} (MOCK=${process.env.MOCK ?? '1'}, LIVE_CALLS=${process.env.LIVE_CALLS ?? '0'})`);
  console.log(`Seeded session: GET http://localhost:${PORT}/session/demo`);
});
