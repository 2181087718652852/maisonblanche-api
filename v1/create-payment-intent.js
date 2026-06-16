const https = require('https');
const qs = require('querystring');

const STRIPE_SK = process.env.STRIPE_SECRET_KEY;
const PMC_ID = 'pmc_1TTUlHAA2CcQXqlz7kix6QIz';

function stripePost(path, params) {
  const body = qs.stringify(params);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.stripe.com',
        path,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SK}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'Stripe-Version': '2023-10-16',
        },
      },
      (rs) => {
        let d = '';
        rs.on('data', (c) => (d += c));
        rs.on('end', () => {
          try { resolve({ status: rs.statusCode, body: JSON.parse(d) }); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!STRIPE_SK) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const { amount, currency = 'cad', metadata = {} } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const customerRes = await stripePost('/v1/customers', {
      email: metadata.email || '',
      name: `${metadata.firstName || ''} ${metadata.lastName || ''}`.trim(),
      phone: metadata.phone || '',
    });
    if (customerRes.status !== 200) {
      console.error('Stripe customer error:', customerRes.body);
      return res.status(customerRes.status).json({
        error: customerRes.body?.error?.message || 'Failed to create customer',
      });
    }
    const customerId = customerRes.body.id;

    const params = {
      amount: Math.round(amount),
      currency: String(currency).toLowerCase(),
      capture_method: 'manual',
      customer: customerId,
      payment_method_configuration: PMC_ID,
      setup_future_usage: 'off_session',
      'payment_method_options[acss_debit][mandate_options][payment_schedule]': 'sporadic',
      'payment_method_options[acss_debit][mandate_options][transaction_type]': 'personal',
      'payment_method_options[acss_debit][verification_method]': 'instant',
      'metadata[checkIn]': metadata.checkIn || '',
      'metadata[checkOut]': metadata.checkOut || '',
      'metadata[guests]': String(metadata.guests || 1),
      'metadata[email]': metadata.email || '',
      'metadata[firstName]': metadata.firstName || '',
      'metadata[lastName]': metadata.lastName || '',
      'metadata[phone]': metadata.phone || '',
      'metadata[currency]': String(currency).toUpperCase(),
      'metadata[source]': 'maison-blanche-booking',
    };

    const result = await stripePost('/v1/payment_intents', params);

    if (result.status !== 200) {
      console.error('Stripe PI error:', result.body);
      return res.status(result.status).json({
        error: result.body?.error?.message || 'Stripe error',
      });
    }

    res.status(200).json({
      clientSecret: result.body.client_secret,
      paymentIntentId: result.body.id,
      customerId,
    });
  } catch (e) {
    console.error('Create PI error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};
