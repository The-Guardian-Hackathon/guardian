// HoldBot mock backend — implements docs/CONTRACT.md v2 on :4100 so the dashboard
// is never blocked on the real backend (:4000). With AUTO_ADVANCE=1 (default) it
// plays a scripted airline call so the whole demo flow runs solo.

import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 4100;
const AUTO = process.env.AUTO_ADVANCE !== "0";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const freshSession = (id) => ({
  session_id: id,
  mandate: null,
  original_flight: {
    flight_number: null, date: null, time: null,
    passenger_name: null, booking_ref: null, route: null,
  },
  rebooking: {
    status: "idle",
    new_flight_details: { time: null, date: null, fee: null },
    transcript_summary: null,
  },
  payment: { status: "pending", amount: null, transaction_id: null },
  events: [],
});

const sessions = { demo: freshSession("demo") };
const timers = [];
const clearTimers = () => { while (timers.length) clearTimeout(timers.pop()); };

const ev = (s, message) =>
  s.events.push({ timestamp: new Date().toISOString(), message });

const at = (ms, fn) => timers.push(setTimeout(fn, ms));

// Scripted "negotiate" call, fired when original_flight lands.
function playNegotiateScript(s) {
  at(1500, () => { s.rebooking.status = "calling_negotiate"; ev(s, "Dialing United Airlines rebooking line…"); });
  at(4000, () => ev(s, "On hold. You're position 4 in the queue — HoldBot is waiting so you don't have to."));
  at(9000, () => ev(s, "Still on hold — position 2. Elapsed 6 minutes (compressed for demo)."));
  at(13000, () => ev(s, "Airline agent picked up. HoldBot: \"I'm an AI assistant calling on behalf of the passenger, booking ref on file — the flight was cancelled, we need the earliest option tomorrow.\""));
  at(18000, () => ev(s, `Agent offered two options. Negotiating within your mandate: "${s.mandate ?? "earliest flight, no red-eye, fee under $150"}"`));
  at(22000, () => {
    s.rebooking.new_flight_details = { date: "2026-07-19", time: "7:15 AM", fee: 75 };
    s.rebooking.transcript_summary =
      "United offered UA 2145 tomorrow 7:15 AM, direct, same cabin. $75 change fee (asked for a waiver — denied, cancellation was weather-coded). Seat 14C held for 30 minutes.";
    s.rebooking.status = "awaiting_approval";
    ev(s, "Proposal ready — airline is holding seat 14C for 30 minutes. Waiting for your approval.");
  });
}

function playConfirmScript(s) {
  at(1000, () => ev(s, "Calling United back to confirm the held seat…"));
  at(4500, () => ev(s, "Agent confirmed UA 2145, seat 14C. Processing the $75 change fee."));
  at(7000, () => {
    s.payment = { status: "paid", amount: 75, transaction_id: "PAYPAL-SBX-88123" };
    ev(s, "Payment processed via PayPal sandbox — $75.00.");
  });
  at(9000, () => {
    s.rebooking.status = "confirmed";
    ev(s, "Rebooking confirmed. New confirmation code UA-R7Q2XM sent to your email. Total hold time absorbed by HoldBot: 41 minutes.");
  });
}

app.get("/session/:id", (req, res) => {
  const s = sessions[req.params.id];
  return s ? res.json(s) : res.status(404).json({ error: "no such session" });
});

app.patch("/session/:id", (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "no such session" });
  const hadFlight = !!s.original_flight.flight_number;
  for (const [k, v] of Object.entries(req.body ?? {})) {
    if (k === "session_id" || k === "events") continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) Object.assign(s[k], v);
    else s[k] = v;
  }
  if (AUTO && !hadFlight && s.original_flight.flight_number && s.rebooking.status === "idle") {
    ev(s, `Parsed cancelled itinerary — ${s.original_flight.flight_number} ${s.original_flight.route ?? ""} for ${s.original_flight.passenger_name ?? "passenger"}.`);
    playNegotiateScript(s);
  }
  res.json(s);
});

app.post("/session/:id/events", (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "no such session" });
  s.events.push(req.body);
  res.json({ ok: true });
});

app.post("/session/:id/approve", (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "no such session" });
  s.rebooking.status = "calling_confirm";
  ev(s, "You approved the 7:15 AM option by voice.");
  if (AUTO) playConfirmScript(s);
  res.status(202).json({ ok: true });
});

app.post("/session/:id/reject", (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "no such session" });
  s.rebooking.status = "rejected";
  ev(s, "You rejected the proposal. HoldBot released the held seat and ended the call.");
  res.status(202).json({ ok: true });
});

// Demo helper (not in contract): reset for the next rehearsal run.
app.post("/session/:id/reset", (req, res) => {
  clearTimers();
  sessions[req.params.id] = freshSession(req.params.id);
  res.json(sessions[req.params.id]);
});

app.listen(PORT, () => console.log(`HoldBot mock backend on :${PORT} (AUTO_ADVANCE=${AUTO ? "1" : "0"})`));
