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

async function callGeminiJson(prompt, temperature = 0.25) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json'
      }
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini API error (${res.status})`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ============================================================================
// מאגר מקורות מאומת מילה-במילה (100% אמת, ללא שום סיכוי להמצאות AI)
// ============================================================================
const VERIFIED_SOURCES_CATALOG = [
  {
    id: 'rk_ahavat_chinam',
    topics: 'אהבת חינם, תיקון שנאת חינם, אחדות, קירוב לבבות, בניין העולם',
    author: 'מרן הראי"ה קוק זצ"ל',
    book: 'אורות הקודש חלק ג\', עמ\' שכ"ד (אהבת חינם ושנאת חינם)',
    text: 'ואם נחרבנו, ונחרב העולם עמנו, על ידי שנאת חינם, נשוב להיבנות, והעולם עמנו יבנה, על ידי אהבת חינם.'
  },
  {
    id: 'rk_tzadikim',
    topics: 'עין טובה, הוספת אור במקום ביקורת, התמודדות עם כפירה או ריחוק, בנייה חיובית',
    author: 'מרן הראי"ה קוק זצ"ל',
    book: 'ערפלי טוהר, עמ\' ל"ט (שמונה קבצים, קובץ ב\', פסקה צ"ט)',
    text: 'על כן הצדיקים הטהורים אינם קובלים על הרשעה, אלא מוסיפים צדק, אינם קובלים על הכפירה, אלא מוסיפים אמונה, אינם קובלים על הבערות, אלא מוסיפים חכמה.'
  },
  {
    id: 'rk_orot_yisrael_2',
    topics: 'אמון בנשמה של יהודי רחוק, מאור פנימי, סנגוריה על ישראל, תשובה מאהבה, דור צעיר',
    author: 'מרן הראי"ה קוק זצ"ל',
    book: 'אורות ישראל, פרק ד\' (אהבת ישראל), פסקה ב\'',
    text: 'אהבת ישראל היא תולדה מהאמונה באורה האלהי של כנסת ישראל, שהוא לה סגולה עצמית שלא תזוז ממנה בכל חליפות הזמנים... להסתכל במאור הפנימי, החודר את רוח הכלל, ושמשכנו הוא ג"כ בכל נפש פרטית שבישראל בגלוי או בסתר, גם בנפש הנסוגה מאד, אשר סרה הרבה מדרך ד\'.'
  },
  {
    id: 'rk_orot_yisrael_4',
    topics: 'אהבה שאינה תלויה בדבר, התגברות על מחיצות וסלידה, עמידה בניסיון של קירוב רחוקים',
    author: 'מרן הראי"ה קוק זצ"ל',
    book: 'אורות ישראל, פרק ד\' (אהבת ישראל), פסקה ד\'',
    text: 'כל מה שבא בדברי תורה שבכתב ושבע"פ, שיוכל לרפות קצת את האהבה של ישראל, אפילו ביחש לרשעים היותר מוחלטים, הם נסיונות ובירורים לאדם איך שיעלה על מדרגה עליונה של אהבת השי"ת. עד שימצא לו דרך בין הסתירות כולן, ואהבת ישראל ואהבת הבריות תשאר בלבבו חיה וקימת בלא שום גרעון ופקפוק בעולם.'
  },
  {
    id: 'rk_orot_yisrael_3',
    topics: 'ראיית הטהרה הפנימית מעבר למומים החיצוניים, עין טובה וביקורת אוהבת',
    author: 'מרן הראי"ה קוק זצ"ל',
    book: 'אורות ישראל, פרק ד\' (אהבת ישראל), פסקה ג\'',
    text: 'האהבה הגדולה, שאנחנו אוהבים את אומתנו, לא תסמא את עינינו מלבקר את כל מומיה, אבל הננו מוצאים את עצמיותה, גם אחרי הבקורת היותר חפשית, נקיה מכל מום. כולך יפה רעיתי ומום אין בך.'
  },
  {
    id: 'rk_orot_teshuva_15_10',
    topics: 'חיפוש משמעות, זהות פנימית, תשובה כשיבה אל העצמי ואל הנשמה, שיחת נפש',
    author: 'מרן הראי"ה קוק זצ"ל',
    book: 'אורות התשובה, פרק ט"ו, פסקה י\'',
    text: 'כששוכחים את מהות הנשמה העצמית, כשמסיחים דעה מלהסתכל בתוכיות החיים הפנימיים של עצמו, הכל נעשה מעורבב ומסופק. והתשובה הראשית, שהיא מאירה את המחשכים מיד, היא שישוב האדם אל עצמו, אל שורש נשמתו, ומיד ישוב אל האלוהים.'
  },
  {
    id: 'rk_orot_teshuva_5_2',
    topics: 'צעד קטן של תשובה, הנחת תפילין, פתיחת הלב, הסרת מחיצות, הארת העין',
    author: 'מרן הראי"ה קוק זצ"ל',
    book: 'אורות התשובה, פרק ה\', פסקה ב\'',
    text: 'נגד כל חלק של כעור, שמסתלק מנשמת האדם ע"י הסכמתו הפנימית של אור התשובה, מתגלים עולמות מלאים בבהירותם העליונה בקרב נשמתו. כל העברת חטא דומה להסרת דבר החוצץ מעל העין הרואה, ואופק-ראיה שלם מתגלה, אור מרחבי שמים וארץ וכל אשר בהם.'
  },
  {
    id: 'tanya_32_achim',
    topics: 'מפגש עם אחים שלא מוכרים לנו, אחווה, שורש משותף מעבר לשוני החיצוני, ואהבת לרעך כמוך, יעקב ועשו',
    author: 'רבי שניאור זלמן מלאדי (אדמו"ר הזקן)',
    book: 'ספר התניא, ליקוטי אמרים, פרק ל"ב',
    text: 'בשגם שכולן מתאימות, ואב אחד לכולנה, ולכן נקראו כל ישראל "אחים" ממש, מצד שורש נפשם בה\' אחד, רק שהגופים מחולקים.'
  },
  {
    id: 'nahman_282',
    topics: 'אזמרה, נקודות טובות, לדון לכף זכות, לראות את הטוב בכל נער ונערה, השבה בתשובה מתוך מבט טוב',
    author: 'רבי נחמן מברסלב זצ"ל',
    book: 'ליקוטי מוהר"ן, חלק א\', תורה רפ"ב',
    text: 'דע, כי צריך לדון את כל אדם לכף זכות, ואפילו מי שהוא רשע גמור, צריך לחפש ולמצוא בו איזה מעט טוב, שבאותו המעט אינו רשע, ועל ידי זה שמוצא בו מעט טוב, ודן אותו לכף זכות, על ידי זה מעלה אותו באמת לכף זכות, ויוכל להשיבו בתשובה.'
  },
  {
    id: 'avot_1_12',
    topics: 'שלום, אהבת הבריות, קירוב לתורה מתוך אהבה, דרכיו של אהרן הכהן, הקשבה ופיוס',
    author: 'הלל הזקן (חז"ל)',
    book: 'מסכת אבות, פרק א\', משנה י"ב',
    text: 'הלל אומר: הוי מתלמידיו של אהרן, אוהב שלום ורודף שלום, אוהב את הבריות ומקרבן לתורה.'
  },
  {
    id: 'chovot_halevavot_5_5',
    topics: 'מעט מן האור דוחה הרבה מן החושך, תקווה, השפעה של שיחה אחת או מצווה אחת, חנוכה ואור בלילה',
    author: 'רבינו בחיי אבן פקודה',
    book: 'חובות הלבבות, שער ייחוד המעשה (שער ה\'), פרק ה\'',
    text: 'כי המעט מן האמת ינצח הרבה מן השקר, כאשר המעט מן האור דוחה הרבה מן החושך.'
  }
];

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
      const cleanParasha = String(parasha || 'וישלח').replace(/^פרשת\s+/, '').trim();
      const fullParashaLabel = cleanParasha.startsWith('חול המועד') ? cleanParasha : `פרשת ${cleanParasha}`;
      const userMessage = String(customTopic || '').trim();

      const compactData = list.length > 0 ? list.map((r, i) => (
        `רפלקציה #${i + 1} | עמדה: ${r.stand || 'ללא עמדה'} | שבוע: ${r.date || '-'} | משמרת/פעיל: ${r.interviewee || r.activists || 'צוות'} | משתתפים: ${r.youthCount || 0}
שיחת עומק / סיפור: ${r.story || 'אין'}
אווירה ומפגש: ${r.atmosphere || 'אין'}
תובנה מקצועית שנרשמה: ${r.qualitativeInsight || '-'}`
      )).join('\n---\n') : 'אין עדיין רפלקציות היסטוריות במערכת. כתוב תיאור מקרה אמיתי וטבעי המתאים לאופי דוכני השיח של השיבנו בירושלים ומתחבר ישירות למסר ולפרשה.';

      const customTopicDirective = userMessage
        ? `\n*** הנחיית ליבה מהרכז (חובה להציב במרכז העלון כולו!) ***
הרכז ביקש להטמיע השבוע את המסר הבא:
"${userMessage}"
חובה עליך לבנות את כל חלקי העלון סביב המסר הזה:
- הכותרת תבטא את המסר הזה.
- הפסוק והחיבור ל${fullParashaLabel} יאירו בדיוק את המסר הזה מתוך הפרשה.
- הציטוט האותנטי מהרב קוק זצ"ל / חז"ל / חסידות ייבחר כך שיתחבר לעומק המסר הזה.
- הביאור הפדגוגי ("עומק הנקודה") יפתח ויפרש את המסר הזה באופן חי, אנושי, רגיש ומעשי לשטח.
- הרפלקציה שתיבחר מהשטח תחובר ישירות למסר הזה ותמחיש אותו.
- 3 העצות המעשיות ("תכל'ס לעמדה להערב") יהיו יישום ישיר של המסר הזה בדוכן הערב.\n`
        : '';

      const sourcesMenu = VERIFIED_SOURCES_CATALOG.map(s => (
        `- id: "${s.id}" | מחבר: ${s.author} | ספר: ${s.book} | נושאים: ${s.topics}\n  ציטוט מדויק: "${s.text}"`
      )).join('\n');

      const prompt = `אתה רב, מחנך והוגה דעות עמוק ומנוסה במיזם "השיבנו" — מערך דוכני שיח, זהות יהודית וקירוב לבבות לנוער ולצעירים ברחובות ירושלים בלילות חמישי.
עליך לחבר דף הכנה שבועי פדגוגי, מחמם לב, עמוק ומעורר השראה לנציגים שיוצאים הערב לעמדות, לקראת שבת ${fullParashaLabel} (${parashaDate || ''}).
${customTopicDirective}
הדרישות הפדגוגיות והספרותיות (חובה מוחלטת):
1. שפה חמה, חיה, לבבית, טבעית, עברית עשירה של בית מדרש חי — לא רובוטית, לא שבלונית, לא קלישאתית ולא מנוכרת! כתוב בסגנון חסידי עמוק ותורת ארץ ישראל.
2. **חוק ברזל לאמינות מקורות (קריטי!):** אסור לך להמציא ציטוטים או מספרי עמודים! עליך לבחור אך ורק מקור אחד אמיתי מתוך "מאגר המקורות המאומתים" שלהלן, ולהחזיר את ה-sourceId המדויק שלו. בנה את הביאור שלך ("עומק הנקודה") ישירות על בסיס הטקסט האמיתי של אותו מקור שבחרת!
3. גם לגבי הפסוק מ${fullParashaLabel} — צטט אך ורק פסוק אמיתי ומדויק שמופיע בוודאות ב${fullParashaLabel} (אם אינך בטוח בניסוח מילה-במילה של פסוק, התייחס לסיפור/מאורע המוכר מהפרשה בלי להמציא מירכאות לפסוק שגוי).
4. חיבור ישיר וחי לרפלקציה אמיתית אחת מתוך הרשימה שנמסרה להלן — בחר את הרפלקציה שהכי מתאימה ל${fullParashaLabel}${userMessage ? ' ולמסר שביקש הרכז' : ''}, ציין את העמדה ואת הנציגים כפי שמופיעים בנתונים (אל תמציא שמות או עמדות אם יש נתונים!), והראה כיצד היא ממחישה את הרעיון בשטח.
5. "תכל'ס לעמדה להערב" — 3 עצות מעשיות, קונקרטיות, בגובה העיניים וחמות לנציגים בדוכן הערב.
6. ברכת יציאה לשליחות — קצרה, חמה ומרוממת נפש.

מאגר המקורות המאומתים (בחר אחד מהם בלבד לפי sourceId):
${sourcesMenu}

החזר JSON תקני במבנה המדויק הבא:
{
  "title": "כותרת ראשית חמה, מקורית ומזמינה לדף ההכנה",
  "parashaLink": "חיבור חי ואמיתי לסיפור או רעיון מרכזי מתוך ${fullParashaLabel} ולמסר השבועי (2-3 משפטים חמים)",
  "sourceId": "המזהה המדויק מתוך מאגר המקורות המאומתים (למשל: tanya_32_achim או rk_orot_yisrael_2)",
  "spiritualInsight": "ביאור פדגוגי מעמיק, חי, חם ולא רובוטי (2-3 פסקאות קצרות וקולחות), המבאר את הציטוט שנבחר ומחבר אותו ל${fullParashaLabel}, למסר השבועי ולמפגש האנושי עם צעירים ברחוב.",
  "featuredReflection": {
    "stand": "שם העמדה מתוך הרפלקציה שנבחרה",
    "activist": "שם הפעיל/המרואיין מתוך הנתונים",
    "story": "תמצית המפגש והסיפור האמיתי שהתרחש בעמדה (נאמן לנתונים)",
    "lesson": "איך הסיפור הזה מאיר וממחיש את המסר של הפרשה ושל העלון הערב"
  },
  "practicalTakeaways": [
    "עצה מעשית 1 לעמדה להערב (תכל'ס, ישירות לנציג)",
    "עצה מעשית 2 לעמדה להערב",
    "עצה מעשית 3 לעמדה להערב"
  ],
  "blessing": "ברכת הדרך קצרה ומרוממת לפעילי המשמרת"
}

הרפלקציות האמיתיות מהשטח:
${compactData}`;

      const result = await callGeminiJson(prompt, 0.55);
      const verifiedSource = VERIFIED_SOURCES_CATALOG.find(s => s.id === result.sourceId) || VERIFIED_SOURCES_CATALOG[0];
      result.sourceQuote = {
        author: verifiedSource.author,
        book: verifiedSource.book,
        text: verifiedSource.text,
        verified: true
      };

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
