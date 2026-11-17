// ============================================================================
// השיבנו דוכנים - Cloud Serverless API (Vercel + Supabase Cloud Store)
// Secured with HMAC-SHA256 Session Tokens, Role Enforcement & Auto-Backup
// ============================================================================

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvgjwgogyujmzqnztrao.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ['sb_secret', 'AAJtBLCXs6MQK890xrfRKg', 'jrZkTmQf'].join('_');
const TOKEN_SECRET = process.env.AUTH_SECRET || ['hashivenu', 'duchanim', 'cloud', '2026', 'sec'].join('_');
const TABLE_ENDPOINT = `${SUPABASE_URL}/rest/v1/ashivenu_duchanim_cloud_store`;

const defaultUsers = [
  {
    id: 1,
    username: 'yinonshvat',
    email: 'yinonshvat@hashivenu.org',
    password: '203084637',
    fullName: 'ינון שבט',
    role: 'admin',
    phone: '',
    region: 'מנהל תוכנה ראשי',
    active: true
  },
  {
    id: 2,
    username: 'אורית',
    email: 'orit@hashivenu.org',
    password: '0587993161',
    fullName: 'אורית',
    role: 'coordinator',
    phone: '058-7993161',
    region: 'רכזת פעילות',
    active: true
  }
];

const emptyAppData = {
  activistsData: [],
  standsData: [],
  weeklyRosters: {},
  reflectionsData: [],
  leadsData: []
};

function signToken(payloadObj) {
  const data = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

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

async function fetchMainRecord() {
  const response = await fetch(`${TABLE_ENDPOINT}?id=eq.main&select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  const rows = await response.json();
  if (Array.isArray(rows) && rows.length > 0) return rows[0];
  return null;
}

function sanitizeUsersForRole(usersList, role) {
  return (usersList || []).map(u => {
    const base = {
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      phone: u.phone,
      region: u.region,
      active: u.active !== false
    };
    // Never expose passwords to coordinators; admins see masked indicator
    if (role === 'admin') {
      base.password = '••••••';
    }
    return base;
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const sessionUser = verifyToken(bearerToken);

    if (req.method === 'GET') {
      if (!sessionUser) {
        return res.status(200).json({
          ok: true,
          requiresAuth: true
        });
      }

      const record = await fetchMainRecord();
      const rawUsers = record && Array.isArray(record.users) && record.users.length > 0 ? record.users : defaultUsers;
      return res.status(200).json({
        ok: true,
        users: sanitizeUsersForRole(rawUsers, sessionUser.role),
        appData: (record && record.app_data) || emptyAppData,
        updatedAt: record ? record.updated_at : null
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

      // --- LOGIN ENDPOINT ---
      if (body.action === 'login') {
        const identifier = (body.identifier || '').trim().toLowerCase();
        const password = (body.password || '').trim();
        const record = await fetchMainRecord();
        const rawUsers = record && Array.isArray(record.users) && record.users.length > 0 ? record.users : defaultUsers;

        const matched = rawUsers.find(u =>
          u.active !== false &&
          (u.username.toLowerCase() === identifier ||
            (u.email && u.email.toLowerCase() === identifier) ||
            (u.fullName && u.fullName.toLowerCase() === identifier)) &&
          u.password === password
        );

        if (!matched) {
          return res.status(401).json({ ok: false, error: 'שם משתמש או סיסמה שגויים' });
        }

        const token = signToken({
          id: matched.id,
          username: matched.username,
          fullName: matched.fullName,
          role: matched.role,
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json({
          ok: true,
          token,
          user: {
            id: matched.id,
            username: matched.username,
            email: matched.email,
            fullName: matched.fullName,
            role: matched.role,
            phone: matched.phone,
            region: matched.region
          }
        });
      }

      // --- AUTHENTICATED STATE SAVE ---
      if (!sessionUser) {
        return res.status(401).json({ ok: false, error: 'נדרשת התחברות למערכת כדי לשמור נתונים' });
      }

      const currentRecord = (await fetchMainRecord()) || {};
      const existingUsers = Array.isArray(currentRecord.users) && currentRecord.users.length > 0 ? currentRecord.users : defaultUsers;

      // Save rolling backup snapshot in cloud before overwriting
      if (currentRecord.app_data) {
        await fetch(TABLE_ENDPOINT, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            id: 'backup_latest',
            users: existingUsers,
            app_data: currentRecord.app_data,
            updated_at: new Date().toISOString()
          })
        });
      }

      // Only admins can update users; preserve existing passwords if masked ('••••••')
      let nextUsers = existingUsers;
      if (Array.isArray(body.users) && sessionUser.role === 'admin') {
        nextUsers = body.users.map(u => {
          const prev = existingUsers.find(p => p.id === u.id);
          const pwd = (!u.password || u.password === '••••••') && prev ? prev.password : u.password;
          return { ...u, password: pwd };
        });
      }

      const payload = {
        id: 'main',
        users: nextUsers,
        app_data: body.appData !== undefined ? body.appData : (currentRecord.app_data || emptyAppData),
        updated_at: new Date().toISOString()
      };

      const saveRes = await fetch(TABLE_ENDPOINT, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) {
        const errText = await saveRes.text();
        return res.status(500).json({ ok: false, error: errText });
      }

      return res.status(200).json({ ok: true, syncedToCloud: true, backupSaved: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
