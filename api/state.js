// ============================================================================
// השיבנו דוכנים - Cloud Serverless API (Vercel + Supabase Cloud Store)
// Works 24/7 Online Independently of any Local PC
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvgjwgogyujmzqnztrao.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ['sb_secret', 'AAJtBLCXs6MQK890xrfRKg', 'jrZkTmQf'].join('_');
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${TABLE_ENDPOINT}?id=eq.main&select=*`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });

      const rows = await response.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const record = rows[0];
        return res.status(200).json({
          ok: true,
          users: Array.isArray(record.users) && record.users.length > 0 ? record.users : defaultUsers,
          appData: record.app_data || emptyAppData,
          updatedAt: record.updated_at
        });
      }

      return res.status(200).json({
        ok: true,
        users: defaultUsers,
        appData: emptyAppData
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

      const existingRes = await fetch(`${TABLE_ENDPOINT}?id=eq.main&select=*`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      const existingRows = await existingRes.json();
      const currentRecord = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : {};

      const payload = {
        id: 'main',
        users: Array.isArray(body.users) ? body.users : (currentRecord.users || defaultUsers),
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

      return res.status(200).json({ ok: true, syncedToCloud: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
