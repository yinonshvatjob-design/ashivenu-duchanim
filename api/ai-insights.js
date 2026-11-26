// ============================================================================
// השיבנו דוכנים - Executive AI Reflections & Logistics Insights API
// Powered by Google Gemini 2.5 Flash (Executive Hebrew Analysis)
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
        temperature: 0.25,
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

function buildStats(refs) {
  const totalParticipants = refs.reduce((sum, r) => sum + (parseInt(r.youthCount) || 0), 0);
  const byStand = {};
  let leadsCount = 0;

  refs.forEach(r => {
    const st = r.stand || 'ללא עמדה';
    if (!byStand[st]) byStand[st] = { count: 0, participants: 0 };
    byStand[st].count++;
    byStand[st].participants += (parseInt(r.youthCount) || 0);
    if (r.leads && r.leads.trim()) leadsCount++;
  });

  const standBreakdown = Object.entries(byStand)
    .sort((a, b) => b[1].participants - a[1].participants)
    .map(([name, info]) => `${name}: ${info.participants} משתתפים (${info.count} רפלקציות)`);

  return { totalParticipants, standsCount: Object.keys(byStand).length, leadsCount, standBreakdown };
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

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ ok: false, error: 'מפתח GEMINI_API_KEY לא מוגדר בשרת.' });
  }

  const { action, reflection, reflections, scopeLabel } = req.body || {};

  try {
    if (action === 'analyze_reflection') {
      if (!reflection) return res.status(400).json({ ok: false, error: 'חסרים נתוני רפלקציה.' });

      const prompt = `אתה יועץ ארגוני בכיר ומנהל הערכה ומדידה (Evaluation & Field Analytics) של מיזם "השיבנו דוכנים" — מערך דוכני שיח, זהות וקירוב לבבות בימי חמישי בלילה.
עליך לנתח את רפלקציית המשמרת שלהלן בשפה עברית רשמית, מקצועית, חדה, עניינית ועשירה (לא חזרה שטחית על הטקסט ולא סיסמאות ריקות!).
התבסס אך ורק על העובדות שבטקסט. אל תמציא פרטים שלא נכתבו.

החזר JSON תקני במבנה המדויק הבא:
{
  "aiTags": ["3 עד 4 תגיות נושא מקצועיות, מדויקות ורשמיות בעברית (2-4 מילים כל אחת), המייצגות את מוקדי השיח, מאפייני הקהל והיבטי השטח"],
  "qualitativeInsight": "ניתוח איכותני מקצועי ורשמי בן 2 עד 3 משפטים: מהי הדינמיקה המרכזית שהתגלתה בעמדה, מה עבד היטב באינטראקציה עם המשתתפים, ומהי ההמלצה המקצועית לשימור או לדיוק לקראת המשמרת הבאה.",
  "logisticsActions": ["רשימת משימות לוגיסטיות/תפעוליות קונקרטיות לטיפול בניסוח אופרטיבי מקצועי (למשל: 'השלמת מלאי כיבוד ונרות בעמדת ...'), רק אם עולה צורך לוגיסטי מהדיווח. אם אין צורך לוגיסטי — החזר מערך ריק []"]
}

נתוני המשמרת לניתוח:
- עמדה: ${reflection.stand || 'לא צוין'}
- תאריך/פרשה: ${reflection.date || 'לא צוין'}
- מרואיין/ת: ${reflection.interviewee || reflection.activists || 'לא צוין'}
- צוות במשמרת: ${reflection.activists || 'לא צוין'}
- מספר משתתפים: ${reflection.youthCount || 0}
- טווח גילאים: ${reflection.ageRange || 'לא צוין'}
- שעות פעילות בפועל: ${reflection.hours || 'לא צוין'}
- תיאור האווירה והגזרה: ${reflection.atmosphere || 'לא דווח'}
- סיפור מרכזי / שיחת עומק: ${reflection.story || 'לא דווח'}
- תשאול לוגיסטי: ${reflection.logistics || 'לא דווח'}
- משתתפים לליווי והמשך קשר: ${reflection.leads || 'אין'}`;

      const result = await callGeminiJson(prompt);
      return res.status(200).json({
        ok: true,
        aiTags: Array.isArray(result.aiTags) && result.aiTags.length > 0 ? result.aiTags.slice(0, 4) : ['פעילות שטח'],
        qualitativeInsight: result.qualitativeInsight || '',
        logisticsActions: Array.isArray(result.logisticsActions) ? result.logisticsActions : [],
        mode: 'gemini'
      });
    }

    if (action === 'parasha_reflection_sheet') {
      const { parasha, parashaDate, customTopic } = req.body || {};
      const list = Array.isArray(reflections) ? reflections : [];
      const currentParasha = parasha || 'חיי שרה';

      const compactData = list.length > 0 ? list.map((r, i) => (
        `רפלקציה #${i + 1} | עמדה: ${r.stand || 'ללא עמדה'} | שבוע: ${r.date || '-'} | משמרת/פעיל: ${r.interviewee || r.activists || 'צוות'} | משתתפים: ${r.youthCount || 0}
שיחת עומק / סיפור: ${r.story || 'אין'}
אווירה ומפגש: ${r.atmosphere || 'אין'}
תובנה מקצועית שנרשמה: ${r.qualitativeInsight || '-'}`
      )).join('\n---\n') : 'אין עדיין רפלקציות היסטוריות במערכת. השתמש בדוגמה מעצימה וריאליסטית מהווי דוכני שיח וקירוב בירושלים.';

      const prompt = `אתה רב, מחנך והוגה דעות עמוק ומנוסה במיזם "השיבנו" — מערך דוכני שיח, זהות יהודית וקירוב לבבות לנוער ולצעירים ברחובות ירושלים בלילות חמישי.
עליך לחבר דף הכנה שבועי פדגוגי, מחמם לב, עמוק ומעורר השראה לנציגים שיוצאים הערב לעמדות, לקראת שבת פרשת "${currentParasha}" (${parashaDate || ''}).
${customTopic ? `דגש מיוחד שביקש הרכז: ${customTopic}` : ''}

הדרישות הפדגוגיות והספרותיות (חובה מוחלטת):
1. שפה חמה, חיה, לבבית, מלאת אמון ואהבת ישראל — לא רובוטית, לא סיסמתית ולא מנוכרת! כתוב בסגנון חסידי עמוק ותורת ארץ ישראל.
2. ציטוט אותנטי ומדויק של מרן הרב אברהם יצחק הכהן קוק זצ"ל (או מדרש חז"ל / מאמר חסידי מובהק), עם מראה מקום אמיתי ומדויק מתוך ספריו (למשל: מוסר אביך, ערפלי טוהר, אורות התשובה, עין איה, אורות הקודש וכד'). אל תמציא ציטוט או מראה מקום!
3. חיבור ישיר וחי לרפלקציה אמיתית אחת מתוך הרשימה שנמסרה להלן. בחר רפלקציה אמיתית, ציין את העמדה ואת פרטי המפגש, והראה כיצד היא משקפת את עומק הנקודה של הפרשה ושל מאמר הרב קוק.
4. "תכל'ס לעמדה להערב" — 3 דגשים מעשיים, קונקרטיים וחמים לנציגים בשטח (איך לפתוח שיחה, איך להקשיב בלי לשפוט, איך ליצור קשר של אמון).
5. ברכת יציאה לשליחות — קצרה ומרוממת נפש.

החזר JSON תקני במבנה המדויק הבא:
{
  "title": "כותרת ראשית חמה ומזמינה לדף ההכנה (לדוגמה: 'לראות את הניצוץ מעבר לרעש')",
  "parashaLink": "פסוק או מוטיב מרכזי מפרשת ${currentParasha} וחיבורו לשליחות של קירוב ושיח (2-3 משפטים חמים)",
  "sourceQuote": {
    "author": "שם המחבר המדויק (למשל: מרן הראי\"ה קוק זצ\"ל)",
    "book": "שם הספר ומראה המקום המדויק (למשל: ערפלי טוהר, עמ' נ\"ו / עין איה ברכות פ\"א)",
    "text": "הציטוט האותנטי והמדויק בלשון קודשו"
  },
  "spiritualInsight": "ביאור פדגוגי מעמיק, חם ולא רובוטי על הציטוט, המדגיש את האמון בנשמה הישראלית, את כוחו של המפגש הבלתי אמצעי בליל חמישי, ואיך מביטים בנער או נערה ברחוב מתוך עין טובה (3-4 פסקאות קצרות וקולחות).",
  "featuredReflection": {
    "stand": "שם העמדה מתוך הרפלקציה שנבחרה",
    "activist": "שם הפעיל/המשמרת מתוך הנתונים",
    "story": "תמצית הסיפור והמפגש האמיתי שהתרחש בעמדה",
    "lesson": "איך הסיפור הזה מוכיח ומאיר את דבר הפרשה והרב קוק בשטח"
  },
  "practicalTakeaways": [
    "דגש מעשי 1 לעמדה להערב (תכל'ס, מנוסח ישירות לנציג)",
    "דגש מעשי 2 לעמדה להערב",
    "דגש מעשי 3 לעמדה להערב"
  ],
  "blessing": "ברכת הדרך קצרה ומרוממת לפעילי המשמרת לקראת יציאתם לרחובות"
}

הרפלקציות האמיתיות מהשטח:
${compactData}`;

      const result = await callGeminiJson(prompt);
      return res.status(200).json({
        ok: true,
        sheet: result,
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
          recommendations: [],
          logisticsSummary: [],
          stats: { totalParticipants: 0, standsCount: 0, leadsCount: 0, reflectionsCount: 0 },
          mode: 'gemini'
        });
      }

      const stats = buildStats(list);
      const compactData = list.map((r, i) => (
        `רפלקציה #${i + 1} | עמדה: ${r.stand} | שבוע: ${r.date} | מרואיין/ת: ${r.interviewee || r.activists} | משתתפים: ${r.youthCount || 0} | גילאים: ${r.ageRange || '-'} | שעות: ${r.hours || '-'}
אווירה וגזרה: ${r.atmosphere || 'לא צוין'}
סיפור / שיחת עומק: ${r.story || 'לא צוין'}
תשאול לוגיסטי: ${r.logistics || 'לא צוין'}
פניות לליווי והמשך קשר: ${r.leads || 'אין'}`
      )).join('\n====================\n');

      const prompt = `אתה מנהל המחקר, התובנות והתפעול הבכיר של מיזם "השיבנו דוכנים".
עליך להפיק דוח הנהלה רשמי, מקצועי, מובנה ומשוכלל בעברית תקנית גבוהה על בסיס הרפלקציות האמיתיות שלהלן בלבד.
כלל ברזל: אין להמציא מספרים, עמדות או עובדות שאינם מופיעים בנתונים. נתח את הדפוסים לעומק והפק ערך ניהולי אמיתי.

החזר JSON תקני במבנה המדויק הבא:
{
  "summary": "תקציר מנהלים רשמי ומקיף (3-4 משפטים) המסכם את היקף הפעילות, אופי המפגשים, רוח השטח ורמת האפקטיביות של העמדות.",
  "qualitativeInsights": ["4 עד 6 תובנות איכותניות מקצועיות ומעמיקות: דפוסים חוזרים בשיח המשתתפים, השוואה בין גזרות/עמדות, גורמי הצלחה בולטים ונקודות תורפה שזוהו בשטח."],
  "recommendations": ["3 עד 4 המלצות אופרטיביות ומקצועיות להנהלה ולרכזים לקראת השבוע הבא (שיפור תדרוך פעילים, דיוק מיקום/שעות, העמקת הליווי למשתתפים)."],
  "logisticsSummary": ["רשימת משימות לוגיסטיות קונקרטיות לטיפול לפי עמדה (בניסוח ברור ומוכן לביצוע), או ['לא דווחו פערים או תקלות לוגיסטיות ברפלקציות שנבדקו.'] אם אין."]
}

היקף הדוח: ${scopeLabel || 'רפלקציות נבחרות'}
נתונים כמותיים אמיתיים:
- סה"כ רפלקציות: ${list.length}
- סה"כ משתתפים: ${stats.totalParticipants}
- עמדות מדווחות: ${stats.standsCount}
- רפלקציות עם פניות לליווי: ${stats.leadsCount}
- פילוח לפי עמדות: ${stats.standBreakdown.join(' | ')}

הרפלקציות הגולמיות מהשטח:
${compactData}`;

      const result = await callGeminiJson(prompt);
      return res.status(200).json({
        ok: true,
        summary: result.summary || '',
        standBreakdown: stats.standBreakdown,
        qualitativeInsights: Array.isArray(result.qualitativeInsights) ? result.qualitativeInsights : [],
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        logisticsSummary: Array.isArray(result.logisticsSummary) ? result.logisticsSummary : [],
        stats: { ...stats, reflectionsCount: list.length },
        mode: 'gemini'
      });
    }

    return res.status(400).json({ ok: false, error: 'פעולה לא מוכרת.' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: `שגיאה במנוע ה-AI: ${err.message}` });
  }
};
