const https = require('https');
const querystring = require('querystring');

function verifyToken(token, ip) {
  const secret = process.env.TURNSTILE_SK;
  if (!secret) return Promise.resolve({ success: false, error: 'Server not configured' });
  if (!token) return Promise.resolve({ success: false, error: 'Missing token' });

  const body = querystring.stringify({
    secret,
    response: token,
    ...(ip ? { remoteip: ip } : {}),
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'challenges.cloudflare.com',
        path: '/turnstile/v0/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try { resolve(JSON.parse(d)); }
          catch { resolve({ success: false, error: 'Invalid response' }); }
        });
      }
    );
    req.on('error', (e) => resolve({ success: false, error: e.message }));
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

  try {
    const { token } = req.body || {};
    const ip = (req.headers['cf-connecting-ip'] ||
                req.headers['x-forwarded-for'] || '').split(',')[0].trim();

    const result = await verifyToken(token, ip);
    if (!result.success) {
      return res.status(403).json({ ok: false, error: 'Bot verification failed' });
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Turnstile handler error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
