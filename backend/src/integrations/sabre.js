// Sabre — rebooking search on the cancelled flight's route.
// MOCK=1 (default): MOCK_SABRE_SEARCH returns realistic canned options.
// TODO(SWAP-IN): real Sabre search — user will provide docs + API key; implement
// realSabreSearch() with actual auth (SABRE_CLIENT_ID/SECRET, SABRE_ENV) keeping the
// same return shape: [{ flight_number, date, time, fee }].

const MOCK = process.env.MOCK !== '0';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function MOCK_SABRE_SEARCH(originalFlight) {
  const { route, date, flight_number } = originalFlight;
  console.log(`[MOCK_SABRE_SEARCH] searching rebooking options for ${flight_number || '?'} (${route || '?'}) on ${date || '?'}`);
  await sleep(800);
  const base = (flight_number || 'AA100').replace(/\d+$/, '');
  return [
    { flight_number: `${base}482`, date: date || null, time: '3:45 PM', fee: 75 },
    { flight_number: `${base}519`, date: date || null, time: '6:20 PM', fee: 0 },
    { flight_number: `${base}206`, date: date || null, time: '9:10 AM (next day)', fee: 40 },
  ];
}

async function realSabreSearch(originalFlight) {
  // TODO(SWAP-IN): real Sabre availability/rebooking search on originalFlight.route.
  throw new Error('Sabre real mode not wired yet — set MOCK=1');
}

async function searchRebookingOptions(originalFlight) {
  try {
    return MOCK ? await MOCK_SABRE_SEARCH(originalFlight) : await realSabreSearch(originalFlight);
  } catch (err) {
    console.error(`[sabreSearch] FAILED: ${err.message}`);
    return [];
  }
}

module.exports = { searchRebookingOptions };
