# Guardian — the pitch model (rehearse from this)

## One-liner

Every travel app sells bookings. Nobody sells the coordination between them — today **the human is the integration layer** (you tell the hotel about the flight, the restaurant about the delay). Guardian replaces that layer with a voice agent.

## The slot model (how Guardian thinks)

A trip is a set of **slots** (flights, stay, transport, food, activities). Every input is *evidence* that fills some slots and implies others.

- **Booked** — evidence was a confirmation (has a record locator). Guardian guards it, never touches it.
- **Drafted** — inferred need, not acted on. Every draft shows *why* it exists.
- **Missing info** — Guardian can't draft without asking one question.

**Minimal input: any artifact with a place + a date window.** Home city and standing preferences come from the profile.

Slots are **conditional, not fixed**: land at 9 PM → no food slot is drafted. Free afternoon → an Explore slot appears. Round trip → two flight slots. The UI renders whatever slots exist.

## Scenario matrix (for Q&A)

| User provides | Guardian drafts | Guardian asks |
|---|---|---|
| Flight confirmation | hotel (nights = trip length), pickup timed to landing, food/explore if the hours are free | one question: area/budget for the hotel |
| Hotel confirmation only | flight from home city, timed to land before check-in | more, not less — flights are expensive: "morning or evening? cabin?" |
| Event invite / poster | the entire trip, timed backwards from the event | budget tier, +1 or solo |
| Everything booked | nothing | nothing — pure Guard mode (monitor + recover) |
| Chat mentions only | drafts accumulate silently | it waits; never acts on chat alone |

**Rule: the more expensive and preference-laden the slot, the more it asks; the more mechanical, the more it just does.**

## The preference layer

1. **Heard** — casual mentions in chat/conversation ("no seafood", "fly before noon") land in the profile automatically.
2. **Asked** — low confidence → ONE voice question, not a form.
3. **Confirmed** — the trust line, say it verbatim to judges: **"Guardian prepares everything, and books nothing without a spoken yes."** Every commit passes the guardrail (timing conflicts, double-booking, price cap) first.

## Phase → proof → sponsor

- **Listen** = ingestion (screenshot → structured trip) → LandingAI
- **Win** = action where no API exists (phone negotiation) → Vocal Bridge + Sabre + PayPal
- **Recover** = resilience (one delay, whole day re-derived, restaurant called by phone) → American Airlines angle
- **Confirm-before-commit** = trust → what every judge who has watched an agent go rogue is silently checking for
