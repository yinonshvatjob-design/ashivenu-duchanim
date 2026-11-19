// ============================================================================
// השיבנו דוכנים - Google Keep Sync API for yinon@hvn.co.il
// Uses Official Google Keep REST API (v1) via Google Workspace Service Account
// (Domain-Wide Delegation) or reports setup instructions if not yet configured.
// ============================================================================

const crypto = require('crypto');

const TOKEN_SECRET = process.env.AUTH_SECRET || ['hashivenu', 'duchanim', 'cloud', '2026', 'sec'].join('_');
const KEEP_USER_EMAIL = process.env.KEEP_USER_EMAIL || 'yinon@hvn.co.il';
const KEEP_NOTE_TITLE = process.env.KEEP_NOTE_TITLE || 'השיבנו דוכנים - משימות';
const KEEP_API_BASE = 'https://keep.googleapis.com/v1';

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getGoogleAccessToken(serviceAccount, subjectEmail) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: subjectEmail,
    scope: 'https://www.googleapis.com/auth/keep',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })).toString('base64url');

  const signInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(serviceAccount.private_key, 'base64url');
  const assertion = `${signInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'OAuth token error');
  }
  return tokenData.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const sessionUser = verifyToken(bearerToken);

  if (!sessionUser || sessionUser.username !== 'yinonshvat') {
    return res.status(403).json({ ok: false, error: 'סנכרון Google Keep זמין לחשבון ינון בלבד.' });
  }

  const saRaw = process.env.GOOGLE_KEEP_SERVICE_ACCOUNT_JSON;
  if (!saRaw) {
    return res.status(200).json({
      ok: false,
      needsSetup: true,
      email: KEEP_USER_EMAIL,
      noteTitle: KEEP_NOTE_TITLE,
      error: `טרם הוגדר מפתח חיבור ל-Google Keep עבור ${KEEP_USER_EMAIL}. יש להגדיר ב-Vercel את משתנה הסביבה GOOGLE_KEEP_SERVICE_ACCOUNT_JSON (חשבון שירות עם Domain-Wide Delegation ל-hvn.co.il).`
    });
  }

  try {
    const serviceAccount = JSON.parse(saRaw);
    const accessToken = await getGoogleAccessToken(serviceAccount, KEEP_USER_EMAIL);
    const localTasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];

    // 1. Fetch notes from Google Keep
    const listRes = await fetch(`${KEEP_API_BASE}/notes?pageSize=50`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const listData = await listRes.json();
    if (!listRes.ok) {
      throw new Error(listData.error?.message || 'שגיאה בקריאת פתקים מ-Google Keep');
    }

    const notes = Array.isArray(listData.notes) ? listData.notes : [];
    const targetNote = notes.find(n => (n.title || '').trim() === KEEP_NOTE_TITLE && !n.trashed);

    // 2. Merge items from Keep note into local tasks
    const keepItems = targetNote?.body?.list?.listItems || [];
    const localByText = new Map(localTasks.map(t => [(t.text || '').trim(), t]));
    const mergedTasks = [...localTasks];

    for (const item of keepItems) {
      const txt = (item.text?.text || '').trim();
      if (!txt) continue;
      if (!localByText.has(txt)) {
        mergedTasks.push({
          id: 'task-keep-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          ownerUsername: 'yinonshvat',
          ownerName: 'ינון שבט',
          text: txt,
          done: Boolean(item.checked),
          priority: 'normal',
          sharedWith: [],
          order: mergedTasks.length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fromKeep: true
        });
      }
    }

    // 3. Push merged checklist to Keep (create note if missing)
    const desiredListItems = mergedTasks.map(t => ({
      text: { text: t.text },
      checked: Boolean(t.done)
    }));

    if (!targetNote) {
      await fetch(`${KEEP_API_BASE}/notes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: KEEP_NOTE_TITLE,
          body: { list: { listItems: desiredListItems } }
        })
      });
    }

    return res.status(200).json({
      ok: true,
      email: KEEP_USER_EMAIL,
      noteTitle: KEEP_NOTE_TITLE,
      syncedAt: Date.now(),
      tasks: mergedTasks,
      noteFound: Boolean(targetNote)
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: `שגיאת סנכרון מול Google Keep: ${err.message}`
    });
  }
};
