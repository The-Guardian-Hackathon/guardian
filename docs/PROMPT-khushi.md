# Person A's prompt — Voice & Booking (paste into Claude Code inside `backend/`)

```
I'm building a hackathon project: a voice AI agent that handles flight cancellation recovery. Full flow: user uploads a cancelled flight itinerary PDF → my teammate's system parses it and finds rebooking options → my agent CALLS THE USER'S REAL PHONE NUMBER and negotiates the rebooking live (the user answers and role-plays as the airline rep) → proposal gets reviewed on a web app → if approved, my agent CALLS THE USER'S PHONE AGAIN to confirm → payment is processed.

I have ~5 hours and one teammate. I own the VOICE CALLS + BOOKING LOOKUP + PAYMENT half. My teammate owns PDF parsing, the shared backend/schema, and the review dashboard UI.

TECH STACK: Node.js/Express (or Python/FastAPI — pick one, stay consistent). REST endpoints, no heavy framework — we need this working end to end in 5 hours, not architecturally pretty.

APIS: Vocal Bridge (outbound voice calls — confirmed our plan includes Pilot/outbound calling access), Sabre APIs (flight lookup/rebooking search), PayPal (fee payment). I'll paste in real docs/keys as I get them from Discord — adapt your calls to match real method signatures when I do. Until then, build against clearly-labeled mock functions (MOCK_SABRE_SEARCH, MOCK_PAYPAL_CHARGE) so the rest of the system works and we can swap in real calls without breaking anything.

SHARED SCHEMA (do not change shape — my teammate's backend and dashboard read/write this too):
{
  "session_id": "string",
  "original_flight": {
    "flight_number": null, "date": null, "time": null,
    "passenger_name": null, "booking_ref": null, "route": null
  },
  "rebooking": {
    "status": "idle|calling_negotiate|awaiting_approval|approved|rejected|calling_confirm|confirmed",
    "new_flight_details": { "time": null, "date": null, "fee": null },
    "transcript_summary": null
  },
  "payment": { "status": "pending|paid|failed", "amount": null, "transaction_id": null },
  "events": []   // append-only log: { "timestamp", "phase", "message" }
}

Expose/consume via REST:
- GET /session/:id
- PATCH /session/:id  (update any top-level field)
- POST /session/:id/events

MY BUILD ORDER (checkpoint after each step):

STEP 1 (Hour 1): Scaffolding + Sabre lookup
- Build a simple function that takes the parsed original_flight data (which my teammate will populate) and calls Sabre to search for rebooking options on the same route (mock as MOCK_SABRE_SEARCH returning 2-3 fake flight options if real access isn't ready).
- Store the top rebooking option candidate — this becomes context the agent uses when it calls.

STEP 2 (Hour 1-2.5): Outbound Call #1 — Negotiate
- Build the Vocal Bridge outbound call: agent dials the user's real phone number (configurable, will be my number during testing).
- Agent's call script: introduce itself as calling on behalf of the passenger about the cancelled flight, ask about rebooking options, negotiate (mention the Sabre-found option as a reference point: "I see there's a 3:45pm flight available, does that work / is there a fee?").
- The user (playing the airline rep) will respond naturally — capture the call transcript.
- After the call ends, extract structured data from the transcript (new flight time, fee amount) — use an LLM call (function calling / structured extraction) on the transcript text to pull these into new_flight_details.
- PATCH /session/:id to update rebooking.status to "awaiting_approval" and populate new_flight_details.
- POST an event: "Negotiation complete, awaiting your review."

STEP 3 (Hour 2.5-3.5): Approval listener + Outbound Call #2 — Confirm
- Build an endpoint POST /session/:id/approve that my teammate's dashboard hits when the user taps Approve.
- On receiving approval, trigger Vocal Bridge outbound call #2: a short call back to the same phone number, script: "Hi, calling to confirm we're accepting the [time] rebooking for [fee]." User answers again as the airline rep to confirm.
- After confirmation, PATCH status to "confirmed".
- Build a matching POST /session/:id/reject endpoint that just logs a rejection event and stops (status → "rejected") — doesn't need to do anything fancy.

STEP 4 (Hour 3.5-4.5): PayPal payment
- On successful confirm call, if there's a fee > 0, trigger a PayPal sandbox payment for that amount (mock as MOCK_PAYPAL_CHARGE until real sandbox keys are in).
- On success, PATCH payment.status to "paid" with a transaction_id, log event "Payment processed."
- Handle failure gracefully: log it, don't mark session as fully confirmed if payment fails.

STEP 5 (Hour 4.5-5): Polish + rehearse
- Test both calls end-to-end at least 3 times back-to-back — outbound calling is the riskiest live element, make sure it reliably connects and the transcript extraction reliably produces usable structured data.
- Add basic retry/error handling if a call fails to connect (log clearly, don't crash the whole flow).
- Sync with teammate: confirm every status change you produce shows up correctly on their dashboard.

CONSTRAINTS:
- Only ever call the real phone number provided for testing — never call a real airline or third party.
- PayPal must stay in sandbox mode, never a live charge.
- If Vocal Bridge, Sabre, or PayPal real credentials aren't ready by hour 2, proceed fully on mocks with clear TODO markers — don't block.
- Prioritize "the two calls reliably work live" above all other polish — this is the core of the demo.

Start by scaffolding the shared session schema REST API (GET/PATCH/POST), since my teammate needs this immediately too, then move to Step 1.
```
