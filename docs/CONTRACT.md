# CONTRACT — frozen shared interface

Both halves of Guardian build against this file. **Do not change shapes or routes without both teammates agreeing.** Additive optional fields are OK; renames/removals are not.

The backend (`backend/`, port **4000**) owns this data and serves it. The frontend (`frontend/`, port **3000**) reads and renders it, and triggers demo actions.

## Trip object

```json
{
  "trip_id": "string",
  "traveler": { "name": "string", "phone": "string" },
  "legs": {
    "flight":    { "status": "draft|bidding|booked|disrupted", "details": {}, "price": null },
    "hotel":     { "status": "draft|bidding|booked|disrupted", "details": {}, "price": null },
    "dinner":    { "status": "draft|bidding|booked|disrupted", "details": {}, "price": null },
    "transport": { "status": "draft|bidding|booked|disrupted", "details": {}, "price": null }
  },
  "events": []
}
```

- `details` is a free-form object per leg. Suggested keys so the dashboard can render nicely:
  - flight: `carrier`, `flight_no`, `depart_iso`, `arrive_iso`, `origin`, `dest`, `confirmation_id`
  - hotel: `name`, `checkin_iso`, `nights`, `perks`, `confirmation_id`
  - dinner: `restaurant`, `time_iso`, `party_size`, `confirmation_id`
  - transport: `type`, `pickup_iso`, `pickup_location`, `confirmation_id`
- `price` is a number (USD) or null.
- **Legs are dynamic (additive, non-breaking):** the four keys above are the core set, but `legs` may contain any keys — e.g. `flight_return` for a round trip, `food` instead of/alongside `dinner`, `activity` for an explore suggestion. Omit slots that aren't relevant (late-night arrival → no food slot). The frontend renders whatever keys exist; icon/kind is inferred from the key name. Draft legs should carry `details.reason` (a one-line "why Guardian drafted this") — the dashboard displays it.
- `events` is **append-only**. Each entry:

```json
{ "timestamp": "ISO-8601", "phase": "listen|win|guard|recover", "message": "string" }
```

## REST API (served by backend at `http://localhost:4000`)

| Method & path | Body | Returns | Notes |
|---|---|---|---|
| `POST /trip` | `{ "draft_legs": {...}, "traveler": {...} }` (optional) | full trip object | Creates a trip. Frontend calls this after LandingAI extraction with whatever legs it parsed. |
| `GET /trip/:id` | — | full trip object | Dashboard polls this every 1–2s. This is the live wire. |
| `PATCH /trip/:id/leg/:legName` | `{ "status"?, "details"?, "price"? }` | updated trip object | Partial update; merge, don't replace `details`. |
| `POST /trip/:id/events` | one event object | `{ "ok": true }` | Append to the log. |
| `POST /trip/:id/bid/:legName` | `{}` | `202 { "ok": true }` | Kicks off the bidding war for that leg. Backend streams progress via events + PATCHes; frontend just watches. |
| `POST /trip/:id/disrupt` | `{ "leg": "flight", "reason": "delayed", "delay_minutes": 120 }` | `202 { "ok": true }` | Demo trigger. Backend runs the recovery cascade; progress arrives via events + leg updates. |

Frontend never mutates leg state except through these routes. Backend never renders UI.

## Mock mode

Backend env `MOCK=1` (default): every route works with realistic canned data and simulated bidding/booking, so the frontend is never blocked. `MOCK=0` swaps in real Sabre/PayPal/Vocal Bridge behind the same shapes.

Frontend env `NEXT_PUBLIC_BACKEND_URL` defaults to `http://localhost:4000`. Until the backend is up, the frontend uses a local fixture file matching this contract exactly.

## Demo phone numbers

Outbound Vocal Bridge calls in the demo target *our own* numbers (a teammate's phone or a second VB agent standing in as "the restaurant"). Real businesses are never called.
