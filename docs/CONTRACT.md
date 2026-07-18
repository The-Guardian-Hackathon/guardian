# CONTRACT v2 — HoldBot (frozen shared interface)

**Pivot 2026-07-18 ~1 PM:** we narrowed to HoldBot — flight-cancellation recovery by phone.
Old Guardian trip contract is in git history; this file is now the single source of truth.
**Do not change shapes. Additive optional fields only.**

## Ownership

| Piece | Owner |
|---|---|
| Dashboard (upload → parse → review → confirm), LandingAI parsing, mock server | Khushi |
| Real backend at these same routes: Vocal Bridge calls, Sabre lookup, PayPal | Teammate |

The dashboard talks to `NEXT_PUBLIC_BACKEND_URL`. Mock server runs on **:4100**;
teammate's real backend on **:4000**. Swap = one env change, zero code.

## Session object

```json
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
```

- All `original_flight` / `new_flight_details` values are strings (fee is a number) or null.
- `events` is append-only: `{ "timestamp": "ISO-8601", "message": "string" }`.
  Messages are plain professional sentences — the feed renders them verbatim.
  Call-ish words ("calling", "on hold", "dialing") light the live-call indicator.
- `transcript_summary`: one or two sentences of what the airline agent said/offered.

## REST API (same routes on mock :4100 and real :4000)

| Method & path | Body | Effect |
|---|---|---|
| `GET /session/:id` | — | full session. Dashboard polls this every 1.5s — it's the live wire. |
| `PATCH /session/:id` | partial session | shallow-merge per top-level key. Dashboard PATCHes `original_flight` after parsing; backend PATCHes `rebooking`/`payment` as calls progress. |
| `POST /session/:id/events` | one event | append to the log |
| `POST /session/:id/approve` | `{}` | user approved the proposal → backend sets `calling_confirm`, makes the confirm call, then `confirmed` + payment |
| `POST /session/:id/reject` | `{}` | → status `rejected`, end state |

Seed: both servers boot with one session, id **`demo`**, everything null/idle.

## Status flow the dashboard renders

`idle` → (parse done, backend notices original_flight) → `calling_negotiate`
→ `awaiting_approval` (proposal card: new time/date/fee + transcript_summary)
→ approve → `calling_confirm` → `confirmed` (+ payment paid)
→ or reject → `rejected`.

Backend: drive drama through `events` while a status is active — the audience
watches the feed during the live phone call ("Dialing United…", "On hold — position 4",
"Agent picked up", "Negotiating…").
