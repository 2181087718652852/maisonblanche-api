const https = require('https');

const ICS_URL = 'https://www.lodgify.com/3bf17184-ad17-49aa-ac49-761643c4d702.ics';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchText(res.headers.location).then(resolve, reject);
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function parseICS(text) {
  const booked = new Set();
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  let dtStart = null;
  let dtEnd = null;
  let inEvent = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      dtStart = null;
      dtEnd = null;
    } else if (trimmed === 'END:VEVENT') {
      inEvent = false;
      if (dtStart && dtEnd) {
        const start = icsToDate(dtStart);
        const end = icsToDate(dtEnd);
        if (start && end) {
          const cur = new Date(start);
          while (cur < end) {
            booked.add(toISO(cur));
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
        }
      }
    } else if (inEvent) {
      if (/^DTSTART/i.test(line)) dtStart = line.split(/[;:]/g).pop().trim();
      else if (/^DTEND/i.test(line)) dtEnd = line.split(/[;:]/g).pop().trim();
    }
  }
  return [...booked].sort();
}

function icsToDate(str) {
  const s = str.replace(/[TZ]/g, '');
  if (s.length < 8) return null;
  return new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));
}

function toISO(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');

  try {
    const text = await fetchText(ICS_URL);
    const bookedDates = parseICS(text);
    res.status(200).json({ bookedDates });
  } catch (e) {
    console.error('Calendar handler error:', e);
    res.status(500).json({ bookedDates: [], error: 'Failed to fetch calendar' });
  }
};
