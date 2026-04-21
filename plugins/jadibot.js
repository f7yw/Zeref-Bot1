/**
 * أوامر إدارة البوتات الفرعية (Sub-Bots / Jadibot).
 * كل الأوامر للمطور الحقيقي فقط.
 *
 *  .بوت_فرعي [رقم]              — إنشاء/استعادة بوت فرعي + إرسال كود الإقران
 *  .ازالة_بوت_فرعي [رقم]        — إغلاق وحذف بوت فرعي بشكل كامل
 *  .قائمة_البوتات_الفرعية      — عرض كل البوتات الفرعية ومزاياها
 *  .مزايا_البوت [رقم] [tag1,tag2,...] — تحديد المزايا (tags) المسموحة لبوت فرعي
 *
 *  وسوم المزايا الشائعة:
 *    main, profile, game, islamic, economy, media, ai, owner, group, jadibot
 */
import {
  createSubBot, destroySubBot, listSubBots, setSubBotFeatures, getSubBotFeatures
} from '../lib/jadibot.js'
import { progressTracker, notifySubBotEvent } from '../lib/notify.js'

let handler = async (m, { conn, args, command, usedPrefix }) => {
  const cmd = command.toLowerCase()

  // ── إنشاء بوت فرعي ──
  if (/^(بوت_فرعي|بوت_فرعى|jadibot|subbot)$/i.test(cmd)) {
    const num = (args[0] || '').replace(/\D/g, '')
    if (!num || num.length < 8) {
      return m.reply(
`╭───『 📌 إنشاء بوت فرعي 』
│
│ *الاستخدام:*
│ ${usedPrefix}بوت_فرعي 9677xxxxxxxx
│
│ *الخطوات بعد الأمر:*
│ ① سيتمّ تجهيز الجلسة وحفظها في السحاب.
│ ② سيُولَّد كود إقران من 8 رموز.
│ ③ تدخل الكود في:
│     WhatsApp ← الأجهزة المرتبطة
│     ← ربط جهاز ← ربط برقم الهاتف
│ ④ سيُعلَن الاتصال تلقائياً للمطور.
│
│ 💡 *المزايا الافتراضية:* islamic, main, profile
│ يمكن تعديلها لاحقاً عبر:
│ ${usedPrefix}مزايا_البوت <رقم> tag1,tag2,...
╰────────`)
    }

    const tracker = await progressTracker(conn, m, [
      'تحضير المجلد والجلسة',
      'الاتصال بخوادم واتساب',
      'توليد كود الإقران',
      'بانتظار إدخال الكود'
    ])

    try {
      await tracker.start('تحضير المجلد والجلسة', `📞 الرقم: +${num}`)

      // اعطِ المتعقِّب فرصة للظهور قبل بدء العملية الثقيلة
      await new Promise(r => setTimeout(r, 200))
      await tracker.start('الاتصال بخوادم واتساب', `📞 الرقم: +${num}`)

      const result = await createSubBot(num, m.sender)

      if (!result.ok) {
        await tracker.error('توليد كود الإقران', `❌ ${result.error}`)
        return
      }

      if (result.status === 'reconnected') {
        await tracker.done(
`✅ *تم استعادة البوت الفرعي مباشرة*

📞 *الرقم:* +${num}
🔌 *الحالة:* متصل (لا حاجة لكود)
🧩 *المزايا:* ${getSubBotFeatures(num).join(' • ') || '—'}`)
        return
      }

      await tracker.finish('توليد كود الإقران')
      await tracker.start('بانتظار إدخال الكود',
`🔐 *كود الإقران:* ${result.code}

📋 *طريقة الربط:*
1️⃣ افتح WhatsApp على الرقم +${num}
2️⃣ الإعدادات ← الأجهزة المرتبطة
3️⃣ ربط جهاز ← ربط برقم الهاتف
4️⃣ أدخل الكود أعلاه

🧩 *المزايا الافتراضية:* ${getSubBotFeatures(num).join(' • ')}
✏️ *لتعديل المزايا:* ${usedPrefix}مزايا_البوت ${num} game,islamic,media

⏰ *مدة صلاحية الكود:* ~60 ثانية. سيُعلَن لك تلقائياً عند نجاح الاتصال.`)

      // أبلغ المالك (دون انتظار)
      notifySubBotEvent(num, 'paired', { features: getSubBotFeatures(num) }).catch(() => {})
    } catch (e) {
      await tracker.error('توليد كود الإقران', `❌ خطأ: ${e?.message || e}`)
    }
    return
  }

  // ── إزالة بوت فرعي ──
  if (/^(ازالة_بوت_فرعي|إزالة_بوت_فرعي|removesubbot|delsubbot)$/i.test(cmd)) {
    const num = (args[0] || '').replace(/\D/g, '')
    if (!num) return m.reply(`📌 الاستخدام: *${usedPrefix}ازالة_بوت_فرعي 9677xxxxxxxx*`)
    await destroySubBot(num)
    return m.reply(`🗑️ تم حذف البوت الفرعي +${num} كاملاً.`)
  }

  // ── قائمة البوتات ──
  if (/^(قائمة_البوتات_الفرعية|قائمة_البوتات|listsubbots|subbots)$/i.test(cmd)) {
    const list = listSubBots()
    if (!list.length) return m.reply('📭 لا توجد بوتات فرعية مسجّلة.')
    const online  = list.filter(b => b.online).length
    const offline = list.length - online
    const lines = list.map((b, i) =>
      `${i + 1}. +${b.phone}  ${b.online ? '🟢 متصل' : '🔴 غير متصل'}\n   🧩 المزايا: ${b.features.join(', ') || '—'}\n   📅 ${b.createdAt ? new Date(b.createdAt).toLocaleString('ar') : '—'}`
    )
    return m.reply(
`╭──『 🤖 البوتات الفرعية 』──
📊 الإجمالي: ${list.length}  •  🟢 ${online} متصل  •  🔴 ${offline} غير متصل

${lines.join('\n\n')}
╰──────────`)
  }

  // ── ضبط المزايا ──
  if (/^(مزايا_البوت|set_features|features)$/i.test(cmd)) {
    const num = (args[0] || '').replace(/\D/g, '')
    if (!num || args.length < 2) {
      return m.reply(
`📌 الاستخدام:
*${usedPrefix}مزايا_البوت 9677xxxxxxxx tag1,tag2,tag3*

الوسوم المتاحة (أمثلة):
• main      — الأوامر العامة
• profile   — البروفايل والتسجيل
• game      — كل الألعاب
• islamic   — المحتوى الإسلامي
• economy   — البنك والاقتصاد
• media     — التحميلات والصوت/الفيديو
• ai        — الذكاء الاصطناعي
• group     — إدارة القروبات
• owner     — أدوات المطور (لا يُنصح إعطاؤها)

مثال:
*${usedPrefix}مزايا_البوت ${num || '9677xxxx'} game,islamic,profile*`)
    }
    const tags = args.slice(1).join(' ').split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
    const newFeatures = setSubBotFeatures(num, tags)
    return m.reply(
`✅ *تم تحديث مزايا البوت +${num}*

🧩 المزايا الجديدة:
${newFeatures.map(f => `  • ${f}`).join('\n') || '  (لا شيء)'}`)
  }
}

handler.help    = ['بوت_فرعي [رقم]', 'مزايا_البوت [رقم] [tags]', 'قائمة_البوتات_الفرعية']
handler.tags    = ['owner', 'jadibot']
handler.command = /^(بوت_فرعي|بوت_فرعى|jadibot|subbot|ازالة_بوت_فرعي|إزالة_بوت_فرعي|removesubbot|delsubbot|قائمة_البوتات_الفرعية|قائمة_البوتات|listsubbots|subbots|مزايا_البوت|set_features|features)$/i
handler.rowner  = true   // المطور الحقيقي فقط
handler.owner   = true

export default handler
