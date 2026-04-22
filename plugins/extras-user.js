/**
 * أوامر إضافية مفيدة لكل المستخدمين:
 *   .هل_تعلم    ← معلومة عشوائية
 *   .نكته       ← نكتة عربية
 *   .قصة        ← قصة قصيرة ملهمة
 *   .قصيدة      ← بيت شعر عربي
 *   .تاريخ      ← تاريخ اليوم (ميلادي + هجري + الساعة)
 *   .عمري <سنة> ← حساب العمر بدقة (سنوات/أيام/ساعات)
 *   .عشوائي [حد] ← رقم عشوائي (افتراضياً 1-100)
 *   .طقس <مدينة> ← حالة الطقس عبر wttr.in (مجاني، بدون مفتاح)
 *   .مواعيد_الصلاة <مدينة> ← أوقات الصلاة عبر api.aladhan.com
 */

import axios from 'axios'

const FACTS = [
  'النحلة تستطيع التعرف على وجوه البشر.',
  'قلب الحوت الأزرق يزن أكثر من 600 كجم.',
  'العسل لا يفسد أبداً — وُجد عسل عمره 3000 سنة في مقابر فرعونية وهو صالح للأكل.',
  'الأخطبوط له ثلاثة قلوب وتسعة أدمغة.',
  'الإنسان يبلع لعاباً بمقدار حوالي 1 لتر يومياً.',
  'الموز نبات عشبي وليس شجرة.',
  'تستطيع الذاكرة البشرية تخزين ما يعادل 2.5 مليون جيجابايت.',
  'الفيلة لا تستطيع القفز.',
  'تتجدد بشرتك بالكامل كل 27 يوماً تقريباً.',
  'القطط تنام نحو 70% من حياتها.',
  'الأرض تدور حول الشمس بسرعة 107,000 كم/س.',
  'مكة المكرمة كانت أول قبلة قبل تحويلها إلى الكعبة المشرفة.',
  'أصغر عظمة في جسم الإنسان داخل الأذن وطولها 3 ملم فقط.',
]
const JOKES = [
  'سأل المعلم الطالب: لو عندك 10 تفاحات وأخذ منك أحمد 4 كم يبقى؟ قال: 10، لأني ما أعطيته شيء!',
  'قال شخص لصديقه: نسيت اسم زوجتي! قال: اسمها هدى. قال: أعرف اسمها، نسيت أنني متزوج!',
  'الزوجة لزوجها: لماذا تأخّرت؟ قال: كنت في المسجد. قالت: المسجد سكنوا فيه؟',
  'سألوا نصرالدين: كم عمرك؟ قال: 40. سألوه بعد عشر سنين: كم عمرك؟ قال: 40! قالوا: قبل عشر سنين قلت 40! قال: أنا رجل ثابت على كلامي.',
  'دخل مريض على الطبيب وقال: يا دكتور أنسى كل شيء بسرعة! قال الطبيب: منذ متى وأنت كذلك؟ قال: منذ متى ماذا؟',
]
const STORIES = [
  '*🍃 الفلاح والحجر*\nمرّ فلاح فوجد حجراً ضخماً في الطريق، فأزاحه بعد جهد، وتحته كيس ذهب وورقة: "لمن أزاح الحجر."\n\n💡 *العبرة:* العقبات قد تخفي وراءها فرصاً عظيمة.',
  '*🌿 الفأر والأسد*\nنام أسد فقفز فأر فوقه فأمسك به، فاستعطفه فأطلقه. وفي يوم وقع الأسد في شَرَك، فجاء الفأر وقرض الحبال حتى تحرّر.\n\n💡 *العبرة:* لا تستهن بأحد.',
  '*🌟 الشمعة*\nسأل رجل حكيماً: كيف أُغيّر العالم؟ فأشعل شمعة في غرفة مظلمة وقال: ابدأ بشمعتك أنت.\n\n💡 *العبرة:* التغيير يبدأ منك.',
]
const POEMS = [
  '*المتنبي:*\nإذا غامرتَ في شَرَفٍ مَرومِ\nفلا تَقنَع بما دونَ النجومِ\nفطعمُ الموتِ في أمرٍ حقيرٍ\nكطعمِ الموتِ في أمرٍ عظيمِ',
  '*المتنبي:*\nعلى قَدرِ أهلِ العزمِ تأتي العزائِمُ\nوتأتي على قَدرِ الكِرامِ المكارِمُ',
  '*الإمام الشافعي:*\nدع الأيامَ تفعلُ ما تشاءُ\nوطِبْ نفساً إذا حكمَ القضاءُ\nولا تَجزَع لحادثةِ الليالي\nفما لحوادثِ الدنيا بقاءُ',
  '*أحمد شوقي:*\nقمْ للمعلمِ وفِّهِ التبجيلا\nكاد المعلمُ أن يكونَ رسولا',
]

const pick = a => a[Math.floor(Math.random() * a.length)]

let handler = async (m, { conn, command, text }) => {
  const c = String(command || '').toLowerCase().trim()

  // ───── هل تعلم ─────
  if (/^(هل_تعلم|هل-تعلم|معلومة|fact)$/i.test(c))
    return m.reply(`💡 *هل تعلم؟*\n\n${pick(FACTS)}`)

  // ───── نكتة ─────
  if (/^(نكته|نكتة|joke)$/i.test(c))
    return m.reply(`😂 *نكتة*\n\n${pick(JOKES)}`)

  // ───── قصة ─────
  if (/^(قصة|قصه|story)$/i.test(c))
    return m.reply(`📖 *قصة قصيرة*\n\n${pick(STORIES)}`)

  // ───── قصيدة ─────
  if (/^(قصيدة|قصيده|شعر|poem)$/i.test(c))
    return m.reply(`📜 *من عيون الشعر العربي*\n\n${pick(POEMS)}`)

  // ───── تاريخ اليوم ─────
  if (/^(تاريخ|تاريخ_اليوم|تاريخ-اليوم|date|التاريخ)$/i.test(c)) {
    const now = new Date()
    const greg = now.toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    let hijri = '—'
    try { hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { year:'numeric', month:'long', day:'numeric' }).format(now) } catch {}
    const time = now.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' })
    return m.reply(
`📅 *تاريخ اليوم*

🌙 *الهجري:*  ${hijri}
☀️ *الميلادي:* ${greg}
⏰ *الساعة:*  ${time}`)
  }

  // ───── عمري ─────
  if (/^(عمري|احسب_عمري|age)$/i.test(c)) {
    const year = parseInt(String(text || '').replace(/[^\d]/g, ''))
    if (!year || year < 1900 || year > new Date().getFullYear())
      return m.reply('📌 *الاستخدام:* `.عمري 1995`\nاكتب سنة ميلادك الميلادية.')
    const ageY = new Date().getFullYear() - year
    return m.reply(
`🎂 *حاسبة العمر*

🗓️ سنة الميلاد: *${year}*
📆 العمر: *${ageY}* سنة
☀️ بالأيام: *${(ageY*365).toLocaleString('en')}* يوم
⏰ بالساعات: *${(ageY*365*24).toLocaleString('en')}* ساعة`)
  }

  // ───── عشوائي ─────
  if (/^(عشوائي|random|رقم_عشوائي)$/i.test(c)) {
    const max = Math.max(2, parseInt(String(text || '').replace(/[^\d]/g, '')) || 100)
    const n = Math.floor(Math.random() * max) + 1
    return m.reply(`🎲 *رقم عشوائي بين 1 و ${max}:*\n\n*${n}*`)
  }

  // ───── طقس ─────
  if (/^(طقس|weather|الطقس)$/i.test(c)) {
    const city = String(text || '').trim()
    if (!city) return m.reply('🌤️ *الاستخدام:* `.طقس صنعاء`')
    try {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=ar`
      const { data } = await axios.get(url, { timeout: 12000 })
      const cur = data.current_condition?.[0] || {}
      const today = data.weather?.[0] || {}
      return m.reply(
`🌤️ *حالة الطقس — ${city}*

🌡️ الحرارة الآن: *${cur.temp_C}°م* (يحس كأنه ${cur.FeelsLikeC}°م)
☁️ الحالة: ${cur.lang_ar?.[0]?.value || cur.weatherDesc?.[0]?.value || '—'}
💧 الرطوبة: ${cur.humidity}%
💨 الرياح: ${cur.windspeedKmph} كم/س
📊 اليوم: عظمى *${today.maxtempC}°م* / صغرى *${today.mintempC}°م*`)
    } catch {
      return m.reply('❌ تعذّر جلب الطقس. تأكد من اسم المدينة (مثال: `.طقس صنعاء`).')
    }
  }

  // ───── مواعيد الصلاة ─────
  if (/^(مواعيد_الصلاة|مواعيد-الصلاة|اوقات_الصلاة|أوقات_الصلاة|صلاتي|prayer|prayertimes)$/i.test(c)) {
    const city = String(text || '').trim() || 'Mecca'
    try {
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=&method=4`
      const { data } = await axios.get(url, { timeout: 12000 })
      const t = data?.data?.timings
      if (!t) throw new Error('no timings')
      return m.reply(
`🕌 *مواعيد الصلاة — ${city}*

📅 ${data.data.date.readable}
🌙 ${data.data.date.hijri.date} هـ

🕓 الفجر:    *${t.Fajr}*
🌅 الشروق:   *${t.Sunrise}*
🌞 الظهر:    *${t.Dhuhr}*
🌇 العصر:    *${t.Asr}*
🌆 المغرب:   *${t.Maghrib}*
🌃 العشاء:   *${t.Isha}*`)
    } catch {
      return m.reply('❌ تعذّر جلب مواعيد الصلاة. تأكد من اسم المدينة (مثال: `.مواعيد_الصلاة صنعاء`).')
    }
  }
}

handler.help    = ['هل_تعلم','نكته','قصة','قصيدة','تاريخ','عمري <سنة>','عشوائي [حد]','طقس <مدينة>','مواعيد_الصلاة <مدينة>']
handler.tags    = ['main']
handler.command = /^(هل_تعلم|هل-تعلم|معلومة|fact|نكته|نكتة|joke|قصة|قصه|story|قصيدة|قصيده|شعر|poem|تاريخ|تاريخ_اليوم|تاريخ-اليوم|date|التاريخ|عمري|احسب_عمري|age|عشوائي|random|رقم_عشوائي|طقس|weather|الطقس|مواعيد_الصلاة|مواعيد-الصلاة|اوقات_الصلاة|أوقات_الصلاة|صلاتي|prayer|prayertimes)$/i

export default handler
