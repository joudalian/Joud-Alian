// A small local stand-in for Stripe, for the automated tests only (no network, no keys). It answers the two API
// calls the site makes (POST /v1/coupons, POST /v1/checkout/sessions) and serves a fake hosted payment page whose
// "Pay" button sends a signed checkout.session.completed webhook to the site and then redirects to the success
// URL, the way Stripe does. Signatures use the documented scheme (HMAC-SHA256 of "timestamp.payload").
//
//   node scripts/stripe-mock.mjs  (env: STRIPE_MOCK_PORT, STRIPE_WEBHOOK_SECRET, WEBHOOK_URL)
import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.STRIPE_MOCK_PORT ?? 12111);
const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const webhookUrl = process.env.WEBHOOK_URL ?? "http://localhost:3100/api/stripe/webhook";
const sessions = new Map();
const coupons = new Map();
const id = (prefix) => `${prefix}_test_${randomBytes(9).toString("hex")}`;

/** Stripe's form encoding (a[b][0][c]=1) back into objects and arrays. */
function parseForm(body) {
  const out = {};
  for (const [rawKey, value] of new URLSearchParams(body)) {
    const keys = rawKey.replace(/\]/g, "").split("[");
    let node = out;
    keys.forEach((key, i) => {
      if (i === keys.length - 1) node[key] = value;
      else node = node[key] ??= /^\d+$/.test(keys[i + 1]) ? [] : {};
    });
  }
  return out;
}

export function sign(payload, at = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac("sha256", secret).update(`${at}.${payload}`).digest("hex");
  return `t=${at},v1=${v1}`;
}

async function sendEvent(type, object) {
  const payload = JSON.stringify({ id: id("evt"), object: "event", type, livemode: false, created: Math.floor(Date.now() / 1000), data: { object } });
  const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": sign(payload) }, body: payload });
  return response.status;
}

const json = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json", "Request-Id": id("req") });
  res.end(JSON.stringify(data));
};

createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const url = new URL(req.url, `http://localhost:${port}`);

  if (req.method === "POST" && url.pathname === "/v1/coupons") {
    const params = parseForm(body);
    const coupon = { id: id("co"), object: "coupon", amount_off: Number(params.amount_off), currency: params.currency, duration: params.duration };
    coupons.set(coupon.id, coupon);
    return json(res, 200, coupon);
  }
  if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
    const p = parseForm(body);
    const items = (p.line_items ?? []).reduce((sum, l) => sum + Number(l.price_data.unit_amount) * Number(l.quantity), 0);
    const shipping = (p.shipping_options ?? []).reduce((sum, o) => sum + Number(o.shipping_rate_data.fixed_amount.amount), 0);
    const discount = (p.discounts ?? []).reduce((sum, d) => sum + (coupons.get(d.coupon)?.amount_off ?? 0), 0);
    const session = {
      id: id("cs"),
      object: "checkout.session",
      mode: p.mode,
      currency: "usd",
      amount_total: items + shipping - discount,
      customer_email: p.customer_email,
      client_reference_id: p.client_reference_id,
      metadata: p.metadata ?? {},
      payment_status: "unpaid",
      status: "open",
      success_url: p.success_url,
      cancel_url: p.cancel_url,
      livemode: false,
      line_items: p.line_items,
      allowed_payment_method_types: p.allowed_payment_method_types ?? null,
    };
    session.url = `http://localhost:${port}/pay/${session.id}`;
    sessions.set(session.id, session);
    return json(res, 200, session);
  }
  // Inspection endpoint for the tests: the last sessions created.
  if (req.method === "GET" && url.pathname === "/__sessions") return json(res, 200, [...sessions.values()]);

  const pay = url.pathname.match(/^\/pay\/(cs_test_\w+)(\/(complete|cancel|expire))?$/);
  if (pay) {
    const session = sessions.get(pay[1]);
    if (!session) return json(res, 404, { error: { message: "No such session" } });
    if (!pay[2]) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><html lang="en"><head><title>Test payment</title></head><body>
<h1>Test payment page</h1><p>Amount: <span id="amount">${session.amount_total}</span> USD cents</p>
<form method="post" action="/pay/${session.id}/complete"><button>Pay</button></form>
<form method="post" action="/pay/${session.id}/cancel"><button>Back to the shop</button></form></body></html>`);
    }
    if (pay[3] === "complete") {
      Object.assign(session, { payment_status: "paid", status: "complete", payment_intent: id("pi") });
      await sendEvent("checkout.session.completed", session);
      res.writeHead(303, { Location: session.success_url });
      return res.end();
    }
    if (pay[3] === "expire") {
      session.status = "expired";
      const status = await sendEvent("checkout.session.expired", session);
      return json(res, 200, { status });
    }
    res.writeHead(303, { Location: session.cancel_url });
    return res.end();
  }
  json(res, 404, { error: { message: `Not mocked: ${req.method} ${url.pathname}` } });
}).listen(port, () => console.log(`Stripe stand-in on http://localhost:${port}`));
