// PayPal — SANDBOX ONLY, always. Refuses to run if PAYPAL_ENV is not "sandbox".
// TODO(SWAP-IN): when real PayPal sandbox creds arrive, implement realPayPalCharge()
// (PAYPAL_CLIENT_ID/SECRET, orders API) keeping the same return shape.

const MOCK = process.env.MOCK !== '0';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function MOCK_PAYPAL_CHARGE({ amount, description }) {
  console.log(`[MOCK_PAYPAL_CHARGE] $${amount} — ${description}`);
  await sleep(500);
  return {
    ok: true,
    payment_id: `PAY-MOCK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    mock: true,
  };
}

async function realPayPalCharge({ amount, description }) {
  // TODO(SWAP-IN): real PayPal sandbox orders call. Must return { ok, payment_id }.
  throw new Error('PayPal real mode not wired yet — set MOCK=1');
}

async function paypalCharge(args) {
  if ((process.env.PAYPAL_ENV || 'sandbox') !== 'sandbox') {
    console.error('[paypalCharge] BLOCKED: PAYPAL_ENV is not "sandbox" — refusing to charge');
    return { ok: false, error: 'refused: PAYPAL_ENV must be sandbox' };
  }
  try {
    return MOCK ? await MOCK_PAYPAL_CHARGE(args) : await realPayPalCharge(args);
  } catch (err) {
    console.error(`[paypalCharge] FAILED: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

module.exports = { paypalCharge };
