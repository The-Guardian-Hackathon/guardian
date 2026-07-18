# HoldBot 📞

**Never wait on hold again.** Your flight gets cancelled → HoldBot parses the itinerary, calls the airline, waits on hold, negotiates the rebooking within your mandate, and you approve with one word. Built on Guardian at the Sabre × Vocal Bridge hackathon (July 2026).

**Trust model — mandate, menu, veto:** HoldBot decides freely inside your pre-authorized constraints, asks you mid-call on real tradeoffs, and structurally cannot commit or spend beyond the mandate without your explicit yes.

## Repo layout

| Folder | Owner | What |
|---|---|---|
| `frontend/` | Khushi | Next.js dashboard: PDF/screenshot upload → LandingAI parse (real) → live call screen → approve/reject → confirmation |
| `mock-server/` | Khushi | CONTRACT v2 mock backend on :4100 with a scripted airline call (AUTO_ADVANCE=1) so the demo runs solo |
| `backend/` | Teammate | Real backend on :4000, same routes: Vocal Bridge calls, Sabre lookup, PayPal |
| `docs/CONTRACT.md` | **FROZEN** | The shared session schema + REST routes |
| `docs/PITCH.md` | — | Pitch model & Q&A prep |

## Run the demo (no real backend needed)

```bash
cd mock-server && npm i && npm start          # :4100
cd frontend && cp .env.example .env.local && npm i && npm run dev   # :3000
```

Upload `frontend/public/demo-cancelled-itinerary.pdf`, confirm the parse, watch the call, approve.
Reset between rehearsals: `curl -X POST localhost:4100/session/demo/reset`

Swap to the real backend: set `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000` — zero code changes.

## Rules

- Never call real airlines/hotels — the "airline agent" is a second VB agent or a teammate's phone.
- PayPal sandbox only. HoldBot discloses it's an AI at the top of every call.
