import { isVip, initEconomy, logTransaction, fmt } from '../lib/economy.js'

const REWARD = 500
const XP_REWARD = 100
const TIMEOUT = 30000 // 30 seconds

const questions = [
  { q: "ما هي عاصمة اليابان؟", a: "طوكيو" },
  { q: "من هو مكتشف الجاذبية؟", a: "نيوتن" },
  { q: "ما هو أطول نهر في العالم؟", a: "النيل" },
  { q: "ما هي أكبر قارة في العالم؟", a: "آسيا" },
  { q: "ما هو الكوكب الأحمر؟", a: "المريخ" },
  { q: "ما هو أسرع حيوان بري؟", a: "الفهد" },
  { q: "كم عدد ألوان قوس قزح؟", a: "7" },
  { q: "ما هي عاصمة فرنسا؟", a: "باريس" },
  { q: "من هو مؤسس شركة مايكروسوفت؟", a: "بيل جيتس" },
  { q: "ما هو المعدن السائل في درجة حرارة الغرفة؟", a: "الزئبق" },
  { q: "ما هي عاصمة المملكة العربية السعودية؟", a: "الرياض" },
  { q: "من هو أول من هبط على سطح القمر؟", a: "نيل أرمسترونج" },
  { q: "ما هي عاصمة مصر؟", a: "القاهرة" },
  { q: "ما هو أكبر محيط في العالم؟", a: "المحيط الهادئ" },
  { q: "ما هو العنصر الكيميائي الذي رمزه O؟", a: "الأكسجين" }
]

let handler = async (m, { conn, usedPrefix, command }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  conn.trivia = conn.trivia || {}

  if (conn.trivia[m.chat]) {
    return m.reply(`*⚠️ هناك سؤال قائم بالفعل في هذا القروب!*\nأجب عليه أولاً.\n👤 العضوية: ${vipStatus}`)
  }

  const item = questions[Math.floor(Math.random() * questions.length)]
  const id = Date.now()
  
  conn.trivia[m.chat] = {
    id,
    q: item.q,
    a: item.a.toLowerCase(),
    time: setTimeout(() => {
      if (conn.trivia[m.chat] && conn.trivia[m.chat].id === id) {
        conn.reply(m.chat, `*⌛ انتهى الوقت!*\nالإجابة الصحيحة كانت: *${item.a}*\n👤 العضوية: ${vipStatus}`, null)
        delete conn.trivia[m.chat]
      }
    }, TIMEOUT)
  }

  const caption = `
╭────『 ❓ سؤال وجواب 』────
│
│ ❓ *السؤال:* ${item.q}
│
│ ⏳ لديك *30 ثانية* للإجابة!
│ 💰 الجائزة: *${fmt(REWARD)}* + *${XP_REWARD} XP*
│
│ 💡 أجب بالرد على هذه الرسالة
│
│ 👤 العضوية: ${vipStatus}
╰──────────────────`.trim()

  await conn.reply(m.chat, caption, m)
}

handler.before = async function (m) {
  this.trivia = this.trivia || {}
  if (!this.trivia[m.chat]) return true
  if (!m.quoted || !m.quoted.fromMe || !m.quoted.text || !/سؤال/i.test(m.quoted.text)) return true

  const trivia = this.trivia[m.chat]
  const answer = m.text.trim().toLowerCase()
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'

  if (answer === trivia.a) {
    clearTimeout(trivia.time)
    const user = global.db.data.users[m.sender]
    initEconomy(user, m.sender)
    user.money += REWARD
    user.exp = (user.exp || 0) + XP_REWARD
    logTransaction(user, 'earn', REWARD, 'Trivia win')

    const name = await this.getName(m.sender).catch(() => m.sender.split('@')[0])
    await m.reply(`*🎉 أحسنت يا ${name} (@${m.sender.split('@')[0]})! إجابة صحيحة!*\n\n💰 ربحت: *${fmt(REWARD)}*\n⭐ XP: *+${XP_REWARD}*\n👤 العضوية: ${vipStatus}`, null, { mentions: [m.sender] })
    delete this.trivia[m.chat]
    return false
  }
  return true
}

handler.help = ['سؤال_وجواب']
handler.tags = ['game']
handler.command = /^(سؤال_وجواب|trivia|سؤال2)$/i

export default handler
