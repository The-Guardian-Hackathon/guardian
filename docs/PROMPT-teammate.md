# Person 2's prompt — Intake & Review UI (paste into Claude Code inside `frontend/`)

```
I'm building a hackathon project: a voice AI agent that handles flight cancellation recovery. Full flow: user uploads a cancelled flight itinerary PDF → I parse it and extract flight details → my teammate's agent calls the user's real phone to negotiate a rebooking → the proposed new flight shows up on my dashboard for review → user approves or rejects → my teammate's agent calls again to confirm → payment processes → dashboard shows final confirmation.

I have ~5 hours and one teammate. I own PDF PARSING + SHARED BACKEND/SCHEMA + REVIEW DASHBOARD. My teammate owns the live voice calls, Sabre lookup, and PayPal payment.

TECH STACK: React (Vite, simple setup) for the dashboard, talking to a small REST backend. My teammate is building the backend API endpoints — assume they exist at the routes below even before they're live; build against a local mock server matching the same schema so I'm not blocked waiting on them.

APIS: LandingAI (PDF/document parsing) for extracting itinerary details. I'll paste in real docs/keys as I get them from Discord — adapt integration to match. Until then, build against a clearly-labeled mock function (MOCK_LANDINGAI_PARSE) with a realistic hardcoded response so the rest of the flow works.

SHARED SCHEMA (do not change shape — my teammate's backend reads/writes this too):
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
  "events": []
}

Assume REST endpoints exist at:
- GET /session/:id
- PATCH /session/:id
- POST /session/:id/events
- POST /session/:id/approve
- POST /session/:id/reject

MY BUILD ORDER (checkpoint after each step):

STEP 1 (Hour 1): Schema + mock backend
- Set up a local mock server (json-server or a few Express stubs) implementing the endpoints above, so I can build the dashboard independently before my teammate's real backend is live.
- Seed it with one sample session with realistic fake original_flight data.
- Finalize and share this schema file with my teammate immediately — this is the fixed contract, don't let it drift.

STEP 2 (Hour 1-2): Upload + LandingAI parsing
- Build the upload screen: a simple file drop/upload for a PDF itinerary.
- On upload, send the PDF to LandingAI to extract flight_number, date, time, passenger_name, booking_ref, route. Mock this as MOCK_LANDINGAI_PARSE returning realistic hardcoded values if real access isn't ready — clearly marked TODO for swapping in the real call.
- PATCH /session/:id with the extracted original_flight data.
- Show a clean "Here's what we found" confirmation screen with the extracted details before proceeding.

STEP 3 (Hour 2-3): Live status + call-in-progress UI
- Build a "Finding your options and calling the airline..." screen that appears once parsing is done, polling GET /session/:id every 1-2 seconds to reflect rebooking.status changes live (idle → calling_negotiate → awaiting_approval).
- Show a simple animated "call in progress" indicator (pulsing phone icon, timer) during calling_negotiate — this is a key visual beat since the actual call is happening on a real phone off-screen, so the screen needs to visibly communicate "something is happening right now."
- Show the events log as a scrolling feed underneath for extra visible detail.

STEP 4 (Hour 3-4): Review + Approve/Reject card
- When status hits "awaiting_approval", show a clear proposal card: new flight time/date and fee, extracted from new_flight_details, with big Approve / Reject buttons.
- Approve button calls POST /session/:id/approve — then screen transitions back to a "Calling to confirm..." status screen (same pattern as Step 3), polling until status becomes "confirmed".
- Reject button calls POST /session/:id/reject — show a simple "Rebooking cancelled" end state.
- When status becomes "confirmed", show a final confirmation screen with the new flight details and payment status (from the payment object).

STEP 5 (Hour 4-5): Integration + polish + rehearse
- Swap the dashboard's data source from your local mock server to my teammate's real backend once ready (should just be a base URL change if schema held).
- Test the full flow end to end at least 3 times: upload PDF → parsed details shown → calling screen → proposal review → approve → confirming screen → final confirmation with payment.
- Polish visuals last (status colors, animations) only after the flow is functionally reliable — reliability matters far more than aesthetics for this demo.

CONSTRAINTS:
- Do not change the shared schema shape after Step 1 hand-off — add optional fields if needed, don't restructure existing ones.
- Keep polling simple (1-2s interval) rather than building websockets — robustness over elegance given the timebox.
- If LandingAI real access isn't ready by hour 2, proceed with the mock and keep the swap-in clearly marked — don't block on it.
- The "call in progress" UI moments (Step 3) are important — since the real action happens on a phone off-screen, the dashboard needs to make the audience feel like something live is happening, not just staring at a static loading spinner.

Start by scaffolding the mock backend + shared schema file, then move to Step 2 (upload + parsing) immediately after.
```
