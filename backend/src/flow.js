const { patchSession, appendEvent } = require('./store');
const { searchRebookingOptions } = require('./integrations/sabre');
const { runLiveCall } = require('./integrations/vblive');
const { paypalCharge } = require('./integrations/paypal');

const LIVE = () => process.env.LIVE_CALLS === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Call #1 — Negotiate. Triggered automatically when original_flight is PATCHed in.
// ---------------------------------------------------------------------------
async function startRecovery(session) {
  const say = (phase, message) => appendEvent(session, { phase, message });
  if (session.rebooking.status !== 'idle') {
    console.log(`[flow] startRecovery ignored — status is ${session.rebooking.status}`);
    return;
  }

  const of = session.original_flight;
  say('search', `Cancelled flight ${of.flight_number || '?'} (${of.route || '?'}) — searching rebooking options...`);
  const options = await searchRebookingOptions(of);
  session.rebooking_options = options; // additive field: context for the call + dashboard detail
  if (!options.length) {
    say('search', 'No rebooking options found — cannot proceed.');
    return;
  }
  say('search', `Found ${options.length} options. Best candidate: ${options[0].time} (${options[0].flight_number}), fee $${options[0].fee}.`);

  patchSession(session, { rebooking: { status: 'calling_negotiate' } });
  say('call', `Calling the airline to negotiate the rebooking... (phone ringing)`);
  const mandate = session.mandate || 'earliest reasonable option, keep the fee low';
  say('call', `Negotiating within your mandate: "${mandate}"`);

  let agreement = null;
  if (LIVE()) {
    try {
      agreement = await runLiveCall({
        context: {
          round: 'negotiate',
          passenger_name: of.passenger_name,
          booking_ref: of.booking_ref,
          cancelled_flight: { flight_number: of.flight_number, date: of.date, time: of.time, route: of.route },
          options,
          mandate,
        },
        // "call" keywords keep the dashboard's live-call indicator lit during the call
        onEvent: (m) => say('call', `On the call — ${m}`),
      });
    } catch (err) {
      console.error('[flow] negotiate call failed:', err.message);
    }
  } else {
    // MOCK negotiate: pretend the rep agreed to the top option after a short call
    await sleep(4000);
    const top = options[0];
    agreement = { time: top.time, date: top.date, fee: top.fee, is_final: true, source: 'mock' };
    say('call', `[mock call] Rep agreed: ${top.time} flight, $${top.fee} change fee.`);
  }

  if (!agreement || (agreement.time == null && agreement.fee == null)) {
    patchSession(session, { rebooking: { status: 'idle' } });
    say('call', 'Negotiation call failed or produced no usable agreement — status reset, trigger again to retry.');
    return;
  }

  const top = options[0];
  const details = {
    time: agreement.time ?? top.time,
    date: agreement.date ?? top.date ?? of.date,
    fee: typeof agreement.fee === 'number' ? agreement.fee : top.fee,
  };
  patchSession(session, {
    rebooking: {
      status: 'awaiting_approval',
      new_flight_details: details,
      transcript_summary: `Negotiated with airline: rebooking to the ${details.time} flight on ${details.date || 'the same date'}, change fee $${details.fee}.${agreement.source === 'transcript' ? ' (parsed from transcript)' : ''}`,
    },
  });
  say('review', `Negotiation complete, awaiting your review.`);
}

// ---------------------------------------------------------------------------
// Call #2 — Confirm. Triggered by POST /session/:id/approve.
// ---------------------------------------------------------------------------
async function approveAndConfirm(session) {
  const say = (phase, message) => appendEvent(session, { phase, message });
  if (session.rebooking.status !== 'awaiting_approval') {
    console.log(`[flow] approve ignored — status is ${session.rebooking.status}`);
    return { ok: false, reason: `status is ${session.rebooking.status}` };
  }

  patchSession(session, { rebooking: { status: 'approved' } });
  say('review', 'Approved. Calling the airline to confirm the rebooking...');
  patchSession(session, { rebooking: { status: 'calling_confirm' } });

  const d = session.rebooking.new_flight_details;
  let confirmed = false;
  if (LIVE()) {
    try {
      const result = await runLiveCall({
        context: {
          round: 'confirm',
          passenger_name: session.original_flight.passenger_name,
          booking_ref: session.original_flight.booking_ref,
          agreed: { time: d.time, date: d.date, fee: d.fee },
        },
        onEvent: (m) => say('call', `On the call — ${m}`),
      });
      confirmed = !!result; // any captured report or fee mention counts; null = call produced nothing
    } catch (err) {
      console.error('[flow] confirm call failed:', err.message);
    }
  } else {
    await sleep(2500);
    say('call', `[mock call] Confirmed the ${d.time} rebooking, $${d.fee} fee.`);
    confirmed = true;
  }

  if (!confirmed) {
    patchSession(session, { rebooking: { status: 'awaiting_approval' } });
    say('call', 'Confirmation call failed — still awaiting approval, tap Approve to retry.');
    return { ok: false, reason: 'confirm call failed' };
  }

  patchSession(session, { rebooking: { status: 'confirmed' } });
  say('confirm', `Rebooking confirmed: ${d.time}${d.date ? ` on ${d.date}` : ''}.`);

  await processPayment(session);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Payment — only ever runs after confirmed, only if fee > 0.
// ---------------------------------------------------------------------------
async function processPayment(session) {
  const say = (phase, message) => appendEvent(session, { phase, message });
  const fee = session.rebooking.new_flight_details.fee;

  if (!fee || fee <= 0) {
    patchSession(session, { payment: { status: 'paid', amount: 0, transaction_id: null } });
    say('payment', 'No change fee — nothing to pay.');
    return;
  }

  say('payment', `Processing $${fee} change fee via PayPal sandbox...`);
  const charge = await paypalCharge({
    amount: fee,
    description: `Flight rebooking change fee (session ${session.session_id})`,
  });
  if (charge.ok) {
    patchSession(session, { payment: { status: 'paid', amount: fee, transaction_id: charge.payment_id } });
    say('payment', `Payment processed: $${fee} (${charge.payment_id}).`);
  } else {
    patchSession(session, { payment: { status: 'failed', amount: fee, transaction_id: null } });
    say('payment', `Payment FAILED: ${charge.error || 'unknown error'}. Rebooking is confirmed but unpaid — needs attention.`);
  }
}

function reject(session) {
  patchSession(session, { rebooking: { status: 'rejected' } });
  appendEvent(session, { phase: 'review', message: 'Rebooking rejected by user. Stopping here.' });
}

module.exports = { startRecovery, approveAndConfirm, reject };
