import { xpRange } from '../lib/levelling.js'
import fetch from 'node-fetch'

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

// ── Section command lists ──────────────────────────────────────────────────
export const menuSections = {
  '📖 القرآن الكريم': (p) => `
*📖 ─── القرآن الكريم ───*

  ${p}اذكار الصباح  ⟵ أذكار الصباح اليومية
  ${p}اذكار المساء  ⟵ أذكار المساء اليومية
  ${p}ايه           ⟵ آية الكرسي
  ${p}قران          ⟵ آية عشوائية من القرآن`.trim(),

  '🤖 الذكاء الاصطناعي': (p) => `
*🤖 ─── الذكاء الاصطناعي ───*

  ${p}ai / ${p}بوت  ⟵ التحدث مع ChatGPT
  ${p}جوده           ⟵ رفع جودة الصورة بالـ AI
  ${p}شخصية          ⟵ تحليل شخصية أنيمي`.trim(),

  '🎮 الألعاب': (p) => `
*🎮 ─── الألعاب ───*

  ${p}اكس        ⟵ إكس أو (Tic Tac Toe)
  ${p}لو         ⟵ لعبة لو خيروك
  ${p}فزوره      ⟵ فزورة عشوائية
  ${p}رياضيات    ⟵ تحدي رياضيات
  ${p}رياضه      ⟵ لعبة رياضة
  ${p}سوال       ⟵ سؤال عشوائي
  ${p}علم        ⟵ خمّن علم الدولة
  ${p}رهان       ⟵ لعبة الرهان (Slot)
  ${p}تخمين      ⟵ تخمين الشخصية
  ${p}خمن        ⟵ خمّن الجواب`.trim(),

  '😄 ترفيه': (p) => `
*😄 ─── ترفيه وطرائف ───*

  ${p}ذكاء       ⟵ نسبة ذكائك عشوائياً
  ${p}جمال       ⟵ نسبة جمالك عشوائياً
  ${p}حظ         ⟵ حظك اليوم
  ${p}قلب        ⟵ رسالة قلب
  ${p}صراحه      ⟵ سؤال بصراحة
  ${p}نصيحه      ⟵ نصيحة عشوائية
  ${p}مقولات     ⟵ اقتباسات أنيمي
  ${p}زخرفه      ⟵ زخرفة نص
  ${p}احرف       ⟵ تحويل الأحرف
  ${p}قط         ⟵ صور قطط عشوائية
  ${p}كلب        ⟵ صور كلاب عشوائية
  ${p}انمي       ⟵ بحث عن أنيمي`.trim(),

  '🛠️ الأدوات': (p) => `
*🛠️ ─── الأدوات ───*

  ${p}ترجم        ⟵ ترجمة أي نص لأي لغة
  ${p}ذكرني       ⟵ ضبط تذكير بمهمة
  ${p}منبه        ⟵ ضبط منبّه بوقت محدد
  ${p}رمزي        ⟵ عرض رمز QR الخاص بك
  ${p}اختفاء      ⟵ وضع الاختفاء / AFK
  ${p}احرف        ⟵ تحويل وتزخرف الأحرف
  ${p}زخرفه       ⟵ زخرفة أي نص`.trim(),

  '💰 الاقتصاد': (p) => `
*💰 ─── الاقتصاد ───*

  ${p}البنك        ⟵ رصيدك ومستواك الحالي
  ${p}عمل          ⟵ اعمل واحصل على عملات
  ${p}لفل          ⟵ تفاصيل مستواك والـ XP
  ${p}شراء         ⟵ شراء عملات إضافية`.trim(),

  '📊 المعلومات': (p) => `
*📊 ─── المعلومات ───*

  ${p}الضعوم     ⟵ حالة البوت ووقت التشغيل
  ${p}التوقيت    ⟵ التوقيت الحالي
  ${p}رابطي      ⟵ رابط واتساب الخاص بك
  ${p}حكمه       ⟵ حكمة عشوائية
  ${p}حديث       ⟵ حديث نبوي شريف
  ${p}بلاغ       ⟵ إرسال بلاغ للمالك
  ${p}المالك     ⟵ معلومات مالك البوت`.trim(),

  '👑 أوامر المالك': (p) => `
*👑 ─── أوامر المالك ───*

  ${p}addprem      ⟵ إضافة مستخدم مميز
  ${p}المميزين     ⟵ قائمة المميزين
  ${p}بان          ⟵ حظر مستخدم
  ${p}فك-الحظر     ⟵ رفع الحظر عن مستخدم
  ${p}البلوكات     ⟵ قائمة المحظورين
  ${p}تشغيل        ⟵ تشغيل البوت
  ${p}ايقاف        ⟵ إيقاف البوت
  ${p}إعادة        ⟵ إعادة تشغيل البوت`.trim()
}

// ── Handler ────────────────────────────────────────────────────────────────
let handler = async (m, { conn, usedPrefix }) => {
  await conn.sendMessage(m.chat, { react: { text: '📋', key: m.key } })

  const user = global.db.data.users[m.sender] || {}
  const { limit = 0, level = 1, role = 'مستخدم', diamond = 0 } = user
  const { xp, max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const name = m.pushName || 'مستخدم'

  const stats = `
╔══〘 🌟 *SHADOW - Bot* 🌟 〙══╗
║
║  👤 *${name}*
║  🏆 المستوى: *${level}* │ الرتبة: *${role}*
║  ⭐ XP: *${xp} / ${max}*
║  🪙 عملات: *${limit}* │ 💎 ماس: *${diamond || 0}*
║  ⏱️ وقت التشغيل: *${uptime}*
║
╚══〘 👇 اختر القسم من التصويت 〙══╝`.trim()

  try {
    let thumb = global.imagen4
    try {
      const res = await fetch('https://telegra.ph/file/d7ae77d1178f9de50825c.jpg')
      thumb = Buffer.from(await res.arrayBuffer())
    } catch { /* use local fallback */ }

    // 1️⃣ Header image with stats
    await conn.sendMessage(m.chat, {
      image: global.imagen4,
      caption: stats,
      mentions: [m.sender],
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          mediaType: 'IMAGE',
          title: '『 𝐒𝐇𝐀𝐃𝐎𝐖 - Bot 』',
          body: `${name} │ المستوى ${level}`,
          thumbnail: thumb,
          sourceUrl: global.md
        }
      }
    }, { quoted: m })

    // 2️⃣ Poll with section options — user taps to get that section's commands
    const sectionNames = Object.keys(menuSections)
    const pollMsg = await conn.sendPoll(
      m.chat,
      '📋 اختر قسماً لعرض أوامره',
      sectionNames.map(s => [s]),
      { quoted: m }
    )

    // Store poll so vote-handler knows which prefix to use
    if (!global.menuPolls) global.menuPolls = new Map()
    const pollId = pollMsg?.key?.id
    if (pollId) {
      global.menuPolls.set(pollId, {
        chat: m.chat,
        sender: m.sender,
        prefix: usedPrefix,
        expires: Date.now() + 5 * 60 * 1000  // 5 minutes TTL
      })
    }
  } catch (e) {
    console.error('[MENU ERROR]', e)
    // Fallback: send plain text menu
    const allText = Object.values(menuSections).map(fn => fn(usedPrefix)).join('\n\n─────────────────\n\n')
    await conn.reply(m.chat, stats + '\n\n' + allText, m)
  }
}

handler.command = /^(اوامر|أوامر|المهام|مهام|menu|قائمة)$/i
handler.exp = 0
handler.fail = null
export default handler
