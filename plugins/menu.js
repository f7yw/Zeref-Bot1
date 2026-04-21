import { xpRange } from '../lib/levelling.js'
import { syncEnergy, initEconomy, getRole, isVip , isVip} from '../lib/economy.js'
import { typingDelay } from '../lib/presence.js'

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function normalizeChoice(text = '') {
  const map = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  }

  return text
    .trim()
    .replace(/[٠-٩۰-۹]/g, d => map[d] || d)
    .trim()
}

const sections = {
  free: {
    title: '🎁 الخدمات المجانية',
    text: (p) => `
*🎁 ─── الخدمات المجانية ───*

${p}نصيحه        ⟵ نصيحة عشوائية
${p}ترجم en النص ⟵ ترجمة لأي لغة
${p}بروفايل      ⟵ ملفك الشخصي الكامل
${p}اذكار الصباح ⟵ أذكار الصباح
${p}اذكار المساء ⟵ أذكار المساء
${p}ايه           ⟵ آية الكرسي
${p}قران          ⟵ آية عشوائية
${p}الله 1        ⟵ أسماء الله الحسنى
${p}التوقيت       ⟵ الوقت الحالي
${p}بلاغ          ⟵ إرسال بلاغ للمالك
${p}تسجيل         ⟵ إنشاء حسابك`.trim()
  },

  games: {
    title: '🎮 الألعاب والترفيه',
    text: (p) => `
*🎮 ─── الألعاب التنافسية ───*

*👥 ألعاب جماعية:*
${p}شطرنج      ⟵ شطرنج (Chess.com Style)
${p}اكس        ⟵ إكس أو (Tic Tac Toe)
${p}اربعة      ⟵ لعبة Connect 4 الجديدة!
${p}رهان       ⟵ راهن أعضاء القروب 🎰

*🎯 ألعاب ذكاء وجوائز:*
${p}سؤال2      ⟵ سؤال وجواب (Trivia) الجديد!
${p}تحدي       ⟵ تحدي رياضيات 🧮
${p}سوال       ⟵ سؤال عشوائي (جائزة 🪙)
${p}خمن_رقم   ⟵ تخمين رقم من 1 إلى 100
${p}ايموجي     ⟵ لغز الإيموجي
${p}تخمين      ⟵ تخمين الشخصية

*🎲 ألعاب سريعة:*
${p}فزوره      ⟵ فزورة عشوائية
${p}علم        ⟵ خمّن علم الدولة
${p}نرد        ⟵ رمي النرد
${p}حجر        ⟵ حجر ورقة مقص
${p}لو         ⟵ لعبة لو خيروك`.trim()
  },

  economy: {
    title: '💼 الاقتصاد والمتجر',
    text: (p) => `
*💼 ─── الاقتصاد والمحفظة ───*

*📊 الرصيد:*
${p}البنك           ⟵ رصيدك ومحفظتك
${p}طاقة            ⟵ حالة الطاقة
${p}معاملاتي        ⟵ آخر 20 معاملة
${p}تقرير_المال     ⟵ تقرير مالي مفصل
${p}لفل             ⟵ مستواك وتفاصيل XP

*💸 العمليات:*
${p}ايداع 500       ⟵ إيداع في البنك
${p}سحب 500         ⟵ سحب من البنك
${p}تحويل @ش 500    ⟵ تحويل لعضو

*🛒 المتجر:*
${p}شراء_الماس 5    ⟵ اشترِ ماس (1💎=1,000🪙)
${p}شراء_عملات 3    ⟵ بع ماس (1💎=800🪙)`.trim()
  },

  ai: {
    title: '🤖 الذكاء الاصطناعي',
    text: (p) => `
*🤖 ─── الذكاء الاصطناعي ───*

${p}ai / ${p}بوت  ⟵ التحدث مع ChatGPT
${p}جوده           ⟵ رفع جودة الصورة
${p}شخصية          ⟵ تحليل شخصية أنيمي`.trim()
  },

  media: {
    title: '🎧 الوسائط والتحميل',
    text: (p) => `
*🎧 ─── الوسائط ───*

${p}بحث_يوتيوب    ⟵ البحث في يوتيوب
${p}بنترست        ⟵ صور بنترست
${p}ملصق          ⟵ تحويل لملصق
${p}صوره          ⟵ تحويل ملصق لصورة
${p}تحميل_صوت     ⟵ تحميل من يوتيوب
${p}تحميل_فيديو    ⟵ تحميل الفيديو`.trim()
  },

  group: {
    title: '👥 إدارة المجموعات',
    text: (p) => `
*👥 ─── إدارة القروب ───*

${p}طرد @شخص       ⟵ طرد عضو
${p}اضف رقم        ⟵ إضافة عضو
${p}رفع @شخص       ⟵ رفع مشرف
${p}قفل_القروب     ⟵ المشرفون فقط
${p}منشن_ظاهر      ⟵ منشن للجميع
${p}الحماية تشغيل  ⟵ حماية الروابط`.trim()
  },

  owner: {
    title: '👑 أوامر المالك',
    text: (p) => `
*👑 ─── أوامر المالك ───*

${p}addprem @شخص    ⟵ إضافة مميز
${p}فك-الحظر @شخص   ⟵ رفع حظر
${p}بلوك @شخص       ⟵ حظر واتساب
${p}إعادة           ⟵ ريستارت البوت
${p}نسخة_احتياطية   ⟵ داتابيز البوت`.trim()
  }
}

const menuSections = Object.fromEntries(
  Object.keys(sections).map((key, i) => [String(i + 1), { key, ...sections[key] }])
)

function buildStats(m, user, level, role, max, uptime, vipStatus) {
  const name = m.pushName || 'مستخدم'
  const money = user.money || 0
  const bank = user.bank || 0
  const energy = typeof user.energy === 'number' ? user.energy : 100
  const epct = Math.max(0, Math.min(10, Math.floor((energy / 100) * 10)))
  const ebar = '█'.repeat(epct) + '░'.repeat(10 - epct)
  const vip = isVip(m.sender)

  return `╔══〘 🌟 *SHADOW - Bot* 🌟 〙══╗
║
║  👤 *${name}*
║  🏆 المستوى: *${level}* │ ${role}
║  ⭐ XP: *${user.exp || 0} / ${max}*
║
║  ─── الأموال ───
║  💰 محفظة: *${money.toLocaleString('en')} 🪙*
║  🏦 بنك:   *${bank.toLocaleString('en')} 🪙*
║  💎 ماس:   *${user.diamond || 0}*
║  👑 عضوية: *${vipStatus}*
║
║  ─── الطاقة ───
║  ${ebar} ${vip ? '∞' : energy}/100 ⚡
║
║  ⏱️ وقت التشغيل: *${uptime}*
║
╚══〘 👇 اختر قسماً من القائمة 〙══╝`.trim()
}

function buildMenuText(prefix, stats) {
  const pageText = Object.entries(menuSections)
    .map(([num, s]) => `*${num}.* ${s.title}`)
    .join('\n')

  return `${stats}\n\n${pageText}\n\n💡 أرسل رقم القسم للتفاصيل`
}

function buildSection(prefix, key, stats, vipStatus) {
  return `${stats}\n\n${sections[key].text(prefix)}\n\n👤 العضوية: ${vipStatus}`
}

let handler = async (m, { conn, usedPrefix }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const user = global.db.data.users[m.sender] || {}
  initEconomy(user)
  syncEnergy(user, m.sender)

  const level = user.level || 0
  const role = getRole(level)
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const stats = buildStats(m, user, level, role, max, uptime, vipStatus)

  await typingDelay(conn, m.chat, 1500)

  global.menuSessions ??= {}
  global.menuSessions[m.sender] = { prefix: usedPrefix, ts: Date.now() }

  await conn.sendMessage(
    m.chat,
    { image: global.imagen4, caption: buildMenuText(usedPrefix, stats) },
    { quoted: m }
  )
}

handler.command = /^(اوامر|أوامر|الاوامر|الأوامر|menu|help|قائمة|القائمة)$/i

handler.all = async function (m) {
  const conn = this
  const session = global.menuSessions?.[m.sender]
  if (!session) return

  const prefix = session.prefix || '.'
  const raw = (m.text || '').trim()
  if (!raw || /^[./#!]/.test(raw)) return // Ignore commands
  
  const choice = normalizeChoice(raw)
  const section = menuSections[choice]
  if (!section) return

  if (Date.now() - session.ts > 5 * 60 * 1000) {
    delete global.menuSessions[m.sender]
    return
  }

  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const user = global.db.data.users[m.sender] || {}
  initEconomy(user)
  syncEnergy(user, m.sender)

  const level = user.level || 0
  const role = getRole(level)
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const stats = buildStats(m, user, level, role, max, uptime, vipStatus)

  await typingDelay(conn, m.chat, 1000)

  await conn.sendMessage(
    m.chat,
    { text: buildSection(prefix, section.key, stats, vipStatus) },
    { quoted: m }
  )

  delete global.menuSessions[m.sender]
}

export default handler
