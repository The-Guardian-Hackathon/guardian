// Vocal Bridge LIVE outbound call.
// Dials DEMO_PHONE via POST /api/v1/calls, joins the call's LiveKit room as a
// data-only "monitor" participant, sends a context client action, and captures the
// agent's structured report action (with transcript price-parsing as backup).
// NOTE: the /calls/:id status API is unreliable (stays "initiated" during live calls) —
// we trust room data + timeouts instead, never the status field.

const { Room, RoomEvent } = require('@livekit/rtc-node');

const VB_URL = 'https://vocalbridgeai.com';
const CALL_TIMEOUT_MS = 120_000;

function vbHeaders() {
  return {
    'X-API-Key': process.env.VOCAL_BRIDGE_API_KEY,
    'X-Agent-Id': process.env.VOCAL_BRIDGE_AGENT_ID,
    'Content-Type': 'application/json',
  };
}

async function placeOutboundCall() {
  const phone = process.env.DEMO_PHONE;
  if (!phone) throw new Error('DEMO_PHONE not set');
  const res = await fetch(`${VB_URL}/api/v1/calls`, {
    method: 'POST',
    headers: vbHeaders(),
    body: JSON.stringify({ phone_number: phone }),
  });
  if (!res.ok) throw new Error(`POST /calls failed: ${res.status} ${await res.text()}`);
  return res.json(); // { call_id, room_name, livekit_url, token, ... }
}

// Backup for when the agent forgets to trigger the report action: pull the last
// plausible dollar amount from a spoken line ("there's a 75 dollar fee", "$40").
function parsePriceFromText(text) {
  const matches = [...text.matchAll(/\$?\s?(\d{1,4})(?:\.\d{2})?\s*(?:dollar|buck|fee)?/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 0 && n <= 5000);
  return matches.length ? matches[matches.length - 1] : null;
}

// Places one live call, injects context, resolves with the captured report payload:
//   { ...reportPayload, source: 'report' } or { fee, source: 'transcript' } or null.
// onEvent(message) streams call moments (rep quotes, captures) to the caller.
async function runLiveCall({
  context,
  contextAction = 'rebooking_context',
  captureAction = 'report_agreement',
  speakerLabel = 'Airline rep',
  onEvent = () => {},
  timeoutMs = CALL_TIMEOUT_MS,
}) {
  const call = await placeOutboundCall();
  console.log(`[vblive] dialing ${call.destination} (call ${call.call_id}, room ${call.room_name})`);

  const room = new Room();
  const transcript = [];
  let captured = null;
  let lastTranscriptPrice = null;
  let finished = false;

  const result = await new Promise(async (resolve) => {
    const finish = (why) => {
      if (finished) return;
      finished = true;
      console.log(`[vblive] finishing (${why}); captured=${JSON.stringify(captured)} transcriptPrice=${lastTranscriptPrice}`);
      resolve(captured || (lastTranscriptPrice !== null
        ? { fee: lastTranscriptPrice, source: 'transcript' }
        : null));
    };
    const timer = setTimeout(() => finish('timeout'), timeoutMs);

    room.on(RoomEvent.DataReceived, (payload) => {
      let msg;
      try { msg = JSON.parse(Buffer.from(payload).toString('utf8')); } catch { return; }
      if (msg.type !== 'client_action') return;

      if (msg.action === 'send_transcript') {
        const { role, text } = msg.payload || {};
        if (!text) return;
        console.log(`[vblive] ${role}: ${text}`);
        transcript.push({ role, text });
        if (role === 'user') {
          onEvent(`${speakerLabel}: "${text}"`);
          const p = parsePriceFromText(text);
          if (p !== null) lastTranscriptPrice = p;
        }
      } else if (msg.action === captureAction) {
        const data = msg.payload || {};
        captured = { ...data, source: 'report' };
        onEvent(`Captured: ${JSON.stringify(data)}`);
        if (data.is_final) setTimeout(() => finish('final report'), 3000); // let the goodbye land
      }
    });

    // Phone side hung up → give trailing data 2s to arrive, then wrap up
    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      console.log(`[vblive] participant left: ${p?.identity}`);
      setTimeout(() => finish('participant left'), 2000);
    });
    room.on(RoomEvent.Disconnected, () => finish('room disconnected'));

    try {
      await room.connect(call.livekit_url, call.token, { autoSubscribe: true, dynacast: false });
      console.log('[vblive] joined call room as monitor');
      const ctxMsg = JSON.stringify({ type: 'client_action', action: contextAction, payload: context });
      await room.localParticipant.publishData(new TextEncoder().encode(ctxMsg), {
        reliable: true,
        topic: 'client_actions',
      });
      console.log(`[vblive] ${contextAction} sent:`, JSON.stringify(context));
    } catch (err) {
      console.error('[vblive] room join/publish failed:', err.message);
      clearTimeout(timer);
      finish('join failed');
    }
  });

  try { await room.disconnect(); } catch {}
  return result ? { ...result, transcript } : null;
}

module.exports = { runLiveCall, parsePriceFromText };
