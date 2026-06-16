const https = require('https');

const ADMIN_EMAIL = ['info@lamaisonblanche.ca', 'orangeidle25@pm.me']; // info@lamaisonblanche.ca
const FROM_EMAIL = 'La Maison Blanche <noreply@mail.lamaisonblanche.ca>';
const RESEND_SK = process.env.RESEND_SK;

function resendSend({ to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });
    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_SK}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve({ ok: true, body: JSON.parse(d) }); }
            catch { resolve({ ok: true, body: d }); }
          } else {
            console.error('Resend error:', res.statusCode, d);
            resolve({ ok: false, status: res.statusCode, body: d });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function formatDate(iso, locale) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function guestEmailHtml(b, locale) {
  const isFr = locale === 'fr';
  const greeting = isFr ? `Bonjour ${b.firstName},` : `Hello ${b.firstName},`;
  const intro = isFr
    ? `Votre réservation à La Maison Blanche est <strong>confirmée</strong> ! Merci d'avoir réservé avec nous.`
    : `Your booking at La Maison Blanche is <strong>confirmed</strong>! Thank you for booking with us.`;
  const labelArrival = isFr ? "Date d'arrivée" : 'Arrival date';
  const labelDeparture = isFr ? 'Date de départ' : 'Departure date';
  const labelGuests = isFr ? 'Nombre de personnes' : 'Number of guests';
  const labelBookingId = isFr ? 'Numéro de réservation' : 'Booking ID';
  const contactLine = isFr
    ? `Si vous avez une question, n'hésitez pas à nous contacter au <a href="mailto:info@lamaisonblanche.ca" style="color:#000;text-decoration:none">info@lamaisonblanche.ca</a>`
    : `If you have any questions, feel free to contact us at <a href="mailto:info@lamaisonblanche.ca" style="color:#000;text-decoration:none">info@lamaisonblanche.ca</a>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="x-apple-disable-message-reformatting">
<style>p,span,h1,h2,h3,h4,h5,h6{margin:0;padding:0}a[x-apple-data-detectors]{color:inherit!important;text-decoration:inherit!important}</style>
</head>
<body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#f0f1f5;margin:0;padding:0">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f0f1f5" style="background-color:#f0f1f5"><tbody><tr><td style="background-color:#f0f1f5">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;min-height:600px;margin:0 auto;background-color:#ffffff"><tbody>
<tr><td style="vertical-align:top;padding:0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tbody>
<tr><td style="padding:24px 0;vertical-align:top">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-size:16px;line-height:1.4;text-align:left;font-family:Arial,Helvetica,sans-serif;word-wrap:break-word;word-break:break-word"><tbody>
<tr><td dir="ltr" style="font-size:25px;font-weight:700;text-align:left;padding:0 24px 16px">La Maison Blanche</td></tr>
<tr><td dir="ltr" style="font-size:16px;text-align:left;padding:0 24px 16px">${greeting}</td></tr>
<tr><td dir="ltr" style="font-size:16px;text-align:left;padding:0 24px 16px">${intro}</td></tr>
<tr><td dir="ltr" style="font-size:16px;text-align:left;padding:0 24px 8px">${labelArrival}: ${formatDate(b.checkIn, locale)}</td></tr>
<tr><td dir="ltr" style="font-size:16px;text-align:left;padding:0 24px 8px">${labelDeparture}: ${formatDate(b.checkOut, locale)}</td></tr>
<tr><td dir="ltr" style="font-size:16px;text-align:left;padding:0 24px 8px">${labelGuests}: ${b.guests}</td></tr>
<tr><td dir="ltr" style="font-size:16px;text-align:left;padding:0 24px 16px">${contactLine}</td></tr>
<tr><td dir="ltr" style="font-size:16px;font-weight:700;text-align:left;padding:16px 24px 4px">©2026 La Maison Blanche</td></tr>
<tr><td dir="ltr" style="font-size:14px;color:#555;text-align:left;padding:0 24px 4px">933 Route Prévost, Île d'Orléans, Québec, CA</td></tr>
<tr><td dir="ltr" style="font-size:14px;color:#555;text-align:left;padding:0 24px 24px">info@lamaisonblanche.ca | <a href="tel:+15149942080" style="color:#000;text-decoration:none">+1 (514) 994-2080</a></td></tr>
</tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</body></html>`;
}

function guestEmailText(b, locale) {
  const isFr = locale === 'fr';
  if (isFr) {
    return `La Maison Blanche

Bonjour ${b.firstName},

Votre réservation à La Maison Blanche est confirmée! Merci d'avoir réservé avec nous.

Date d'arrivée: ${formatDate(b.checkIn, 'fr')}
Date de départ: ${formatDate(b.checkOut, 'fr')}
Nombre de personnes: ${b.guests}

Si vous avez une question, n'hésitez pas à nous contacter au info@lamaisonblanche.ca

©2026 La Maison Blanche
933 Route Prévost, Île d'Orléans, Québec, CA
info@lamaisonblanche.ca | +1 (514) 994-2080`;
  }
  return `La Maison Blanche

Hello ${b.firstName},

Your booking at La Maison Blanche is confirmed! Thank you for booking with us.

Arrival date: ${formatDate(b.checkIn, 'en')}
Departure date: ${formatDate(b.checkOut, 'en')}
Number of guests: ${b.guests}

If you have any questions, feel free to contact us at info@lamaisonblanche.ca

©2026 La Maison Blanche
933 Route Prévost, Île d'Orléans, Québec, CA
info@lamaisonblanche.ca | +1 (514) 994-2080`;
}

function adminEmailHtml(b) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f7f7f7;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 16px rgba(0,0,0,.06)">
<h1 style="margin:0 0 16px;font-size:22px">Nouvelle réservation — La Maison Blanche</h1>
<p style="color:#717171;margin:0 0 24px;font-size:14px">Une nouvelle réservation vient d'être confirmée.</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">
<tr><td style="padding:8px 0;color:#717171;width:40%">ID de réservation</td><td style="padding:8px 0;font-family:monospace;font-size:13px;word-break:break-all">${b.bookingId}</td></tr>
<tr><td style="padding:8px 0;color:#717171">Nom</td><td style="padding:8px 0">${b.firstName} ${b.lastName}</td></tr>
<tr><td style="padding:8px 0;color:#717171">Courriel</td><td style="padding:8px 0"><a href="mailto:${b.email}" style="color:#1a1a1a">${b.email}</a></td></tr>
<tr><td style="padding:8px 0;color:#717171">Téléphone</td><td style="padding:8px 0">${b.phone || '—'}</td></tr>
<tr><td style="padding:8px 0;color:#717171">Arrivée</td><td style="padding:8px 0">${b.checkIn}</td></tr>
<tr><td style="padding:8px 0;color:#717171">Départ</td><td style="padding:8px 0">${b.checkOut}</td></tr>
<tr><td style="padding:8px 0;color:#717171">Voyageurs</td><td style="padding:8px 0">${b.guests}</td></tr>
${b.locale ? `<tr><td style="padding:8px 0;color:#717171">Langue</td><td style="padding:8px 0">${b.locale}</td></tr>` : ''}
</table>
<p style="color:#717171;margin-top:24px;font-size:13px">Percevoir le paiement dans le <a href="https://dashboard.stripe.com/payments/${b.bookingId}" style="color:#1a1a1a">tableau de bord Stripe</a>.</p>
</div></body></html>`;
}

function adminEmailText(b) {
  return `Nouvelle réservation — La Maison Blanche

ID de réservation: ${b.bookingId}
Nom: ${b.firstName} ${b.lastName}
Courriel: ${b.email}
Téléphone: ${b.phone || '—'}
Arrivée: ${b.checkIn}
Départ: ${b.checkOut}
Voyageurs: ${b.guests}

Stripe: https://dashboard.stripe.com/fr-ca/payments/${b.bookingId}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!RESEND_SK) {
    return res.status(500).json({ error: 'Resend not configured' });
  }

  try {
    const b = req.body || {};
    if (!b.bookingId || !b.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const locale = b.locale === 'fr' ? 'fr' : 'en';

    const guestSubject = locale === 'fr'
      ? 'Votre réservation est confirmée — La Maison Blanche'
      : 'Your booking is confirmed — La Maison Blanche';

    const guestRes = await resendSend({
      to: b.email,
      subject: guestSubject,
      html: guestEmailHtml(b, locale),
      text: guestEmailText(b, locale),
    });

    const adminRes = await resendSend({
      to: ADMIN_EMAIL,
      subject: `Nouvelle réservation de ${b.firstName} ${b.lastName}`,
      html: adminEmailHtml(b),
      text: adminEmailText(b),
    });

    res.status(200).json({
      ok: true,
      guest: guestRes.ok,
      admin: adminRes.ok,
    });
  } catch (e) {
    console.error('Email handler error:', e);
    res.status(500).json({ error: 'Failed to send emails' });
  }
};
