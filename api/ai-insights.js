// ============================================================================
// השיבנו דוכנים - Real AI Reflections & Logistics Insights API
// Uses Google Gemini API (gemini-2.5-flash) when GEMINI_API_KEY is configured,
// with a 100% real data-driven fallback (zero fake numbers) if key is missing.
// ============================================================================

const crypto = require('crypto');

const TOKEN_SECRET = process.env.AUTH_SECRET || ['hashivenu', 'duchanim', 'cloud', '2026', 'sec'].join('_');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

async function callGeminiJson(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini API error (${res.status})`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text);
}

function localAnalyzeReflection(ref) {
  const combined = `${ref.atmosphere || ''} ${ref.story || ''} ${ref.logistics || ''} ${ref.leads || ''}`;
  const tags = [];
  const rules = [
    [/תפילין|ציצית|מזוזה/, 'מצוות מעשיות (תפילין/ציצית)'],
    [/אמונה|השקפה|שאל|אלוקים|תורה/, 'שאלות באמונה והשקפה'],
    [/שבת|קידוש|סעודה|אירוח/, 'אירוח ושמירת שבת'],
    [/שיעור|חברותא|ללמוד|לימוד/, 'עניין בשיעורים ולימוד'],
    [/לב|עומק|רגש|נפש|משמעות|בכה/, 'שיחת עומק וחיפוש משמעות'],
    [/חסר|כיבוד|נרות|שולחן|שתייה|ציוד|שינוע|רכב|איחור|תקלה/, 'נושא לוגיסטי לטיפול']
  ];
  rules.forEach(([re, label]) => {
    if (re.test(combined)) tags.push(label);
  });
  if (tags.length === 0) tags.push('פעילות שטח שוטפת');

  const logisticsActions = [];
  if (ref.logistics && ref.logistics.trim()) {
    ref.logistics
      .split(/\r?\n|[.;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2)
      .forEach(item => logisticsActions.push(`${ref.stand}: ${item}`));
  }

  const parts = [];
  if (ref.youthCount) parts.push(`נרשמו ${ref.youthCount} משתתפים בעמדת ${ref.stand}.`);
  if (ref.story) parts.push(`מוקד עיקרי: ${ref.story.slice(0, 140)}${ref.story.length > 140 ? '...' : ''}`);
  else if (ref.atmosphere) parts.push(`אווירה בשטח: ${ref.atmosphere.slice(0, 140)}${ref.atmosphere.length > 140 ? '...' : ''}`);

  return {
    aiTags: tags.slice(0, 4),
    qualitativeInsight: parts.join(' ') || 'תועדה פעילות בעמדה.',
    logisticsActions,
    mode: 'local_fallback'
  };
}

function localWeeklyReport(refs) {
  const totalParticipants = refs.reduce((sum, r) => sum + (parseInt(r.youthCount) || 0), 0);
  const byStand = {};
  const logisticsSummary = [];
  const qualitativeInsights = [];

  refs.forEach(r => {
    const st = r.stand || 'ללא עמדה';
    if (!byStand[st]) byStand[st] = { count: 0, participants: 0 };
    byStand[st].count++;
    byStand[st].participants += (parseInt(r.youthCount) || 0);

    if (r.logistics && r.logistics.trim()) {
      logisticsSummary.push(`${st}${r.interviewee ? ' (' + r.interviewee + ')' : ''}: ${r.logistics.trim()}`);
    }
    if (r.story && r.story.trim()) {
      qualitativeInsights.push(`${st}: ${r.story.trim().slice(0, 180)}${r.story.trim().length > 180 ? '...' : ''}`);
    } else if (r.atmosphere && r.atmosphere.trim()) {
      qualitativeInsights.push(`${st}: ${r.atmosphere.trim().slice(0, 180)}`);
    }
  });

  const standBreakdown = Object.entries(byStand)
    .sort((a, b) => b[1].participants - a[1].participants)
    .map(([name, info]) => `${name}: ${info.participants} משתתפים (${info.count} רפלקציות)`);

  return {
    summary: `הוזנו ${refs.length} רפלקציות עם סה"כ ${totalParticipants} משתתפים ב-${Object.keys(byStand).length} עמדות.`,
    standBreakdown,
    qualitativeInsights: qualitativeInsights.slice(0, 6),
    logisticsSummary: logisticsSummary.length > 0 ? logisticsSummary : ['לא דווחו חוסרים או תקלות לוגיסטיות ברפלקציות שנבחרו.'],
    mode: 'local_fallback'
  };
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
  if (!sessionUser) {
    return res.status(401).json({ ok: false, error: 'נדרשת התחברות למערכת.' });
  }

  const { action, reflection, reflections, scopeLabel } = req.body || {};

  try {
    if (action === 'analyze_reflection') {
      if (!reflection) return res.status(400).json({ ok: false, error: 'חסרים נתוני רפלקציה.' });

      if (!GEMINI_API_KEY) {
        return res.status(200).json({ ok: true, ...localAnalyzeReflection(reflection) });
      }

      const prompt = `אתה אנליסט שטח חכם של ארגון "השיבנו דוכנים" (דוכני שיח וקירוב לבבות בימי חמישי בלילה).
נתח את הרפלקציה הבאה בעברית בלבד והחזר JSON תקני במבנה המדויק:
{
  "aiTags": ["2 עד 4 תגיות נושא קצרות וברורות בעברית"],
  "qualitativeInsight": "תובנה איכותנית תמציתית ומדויקת (1-2 משפטים) על מה שקרה בשטח ומה כדאי ללמוד/לשמר",
  "logisticsActions": ["רשימת משימות או חוסרים לוגיסטיים קונקרטיים לטיפול מהטקסט, או מערך ריק אם אין"]
}

נתוני הרפלקציה:
עמדה: ${reflection.stand || ''}
מרואיין/ת: ${reflection.interviewee || reflection.activists || ''}
מספר משתתפים: ${reflection.youthCount || 0}
שעות: ${reflection.hours || ''}
אווירה וגזרה: ${reflection.atmosphere || ''}
סיפור / שיחת עומק: ${reflection.story || ''}
תשאול לוגיסטי: ${reflection.logistics || ''}
משתתפים לליווי והמשך טיפול: ${reflection.leads || ''}`;

      const result = await callGeminiJson(prompt);
      return res.status(200).json({
        ok: true,
        aiTags: Array.isArray(result.aiTags) && result.aiTags.length > 0 ? result.aiTags.slice(0, 4) : ['פעילות שטח'],
        qualitativeInsight: result.qualitativeInsight || '',
        logisticsActions: Array.isArray(result.logisticsActions) ? result.logisticsActions : [],
        mode: 'gemini'
      });
    }

    if (action === 'weekly_report') {
      const list = Array.isArray(reflections) ? reflections : [];
      if (list.length === 0) {
        return res.status(200).json({
          ok: true,
          summary: 'אין עדיין רפלקציות בסינון הנוכחי להפקת דוח.',
          standBreakdown: [],
          qualitativeInsights: [],
          logisticsSummary: [],
          mode: GEMINI_API_KEY ? 'gemini' : 'local_fallback'
        });
      }

      const baseStats = localWeeklyReport(list);
      if (!GEMINI_API_KEY) {
        return res.status(200).json({ ok: true, ...baseStats });
      }

      const compactData = list.map((r, i) => (
        `#${i + 1} | עמדה: ${r.stand} | תאריך: ${r.date} | מרואיין: ${r.interviewee || r.activists} | משתתפים: ${r.youthCount || 0}
אווירה: ${r.atmosphere || '-'}
סיפור/עומק: ${r.story || '-'}
לוגיסטיקה: ${r.logistics || '-'}
פניות לליווי: ${r.leads || '-'}`
      )).join('\n---\n');

      const prompt = `אתה מנהל תובנות שטח של ארגון "השיבנו דוכנים".
הפק דוח תובנות אמיתי ומבוסס אך ורק על הרפלקציות שלמטה (אסור להמציא שום מספר או עובדה שלא מופיעים בטקסט!).
החזר JSON תקני בעברית במבנה המדויק:
{
  "summary": "פסקת סיכום מנהלים קצרה (2-3 משפטים) על התמונה הכוללת",
  "qualitativeInsights": ["3 עד 5 תובנות איכותניות חדות על דפוסים בשטח, עמדות בולטות ונקודות לשימור/שיפור"],
  "logisticsSummary": ["רשימת פעולות לוגיסטיות קונקרטיות לטיפול לקראת השבוע הבא לפי עמדות, או משפט אחד אם לא דווחו בעיות"]
}

היקף הדוח: ${scopeLabel || 'רפלקציות נבחרות'}
סה"כ רפלקציות: ${list.length}
פילוח משתתפים אמיתי: ${baseStats.standBreakdown.join(' | ')}

הרפלקציות:
${compactData}`;

      const result = await callGeminiJson(prompt);
      return res.status(200).json({
        ok: true,
        summary: result.summary || baseStats.summary,
        standBreakdown: baseStats.standBreakdown,
        qualitativeInsights: Array.isArray(result.qualitativeInsights) ? result.qualitativeInsights : baseStats.qualitativeInsights,
        logisticsSummary: Array.isArray(result.logisticsSummary) ? result.logisticsSummary : baseStats.logisticsSummary,
        mode: 'gemini'
      });
    }

    return res.status(400).json({ ok: false, error: 'פעולה לא מוכרת.' });
  } catch (err) {
    // Graceful fallback with real data if Gemini fails
    if (action === 'analyze_reflection' && reflection) {
      return res.status(200).json({ ok: true, ...localAnalyzeReflection(reflection), warning: err.message });
    }
    if (action === 'weekly_report' && Array.isArray(reflections)) {
      return res.status(200).json({ ok: true, ...localWeeklyReport(reflections), warning: err.message });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
};
