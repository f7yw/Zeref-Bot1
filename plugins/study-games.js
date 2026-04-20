import { initEconomy, logTransaction } from '../lib/economy.js'

const words = ['جامعة', 'مدرسة', 'رياضيات', 'فيزياء', 'كيمياء', 'اختبار', 'مراجعة', 'محاضرة', 'واجب', 'تلخيص']

function shuffle(word) {
  return word.split('').sort(() => Math.random() - 0.5).join('')
}

function mathQuestion() {
  const a = Math.floor(Math.random() * 20) + 1
  const b = Math.floor(Math.random() * 20) + 1
  const ops = [
    ['+', a + b],
    ['-', a - b],
    ['×', a * b]
  ]
  const [op, ans] = ops[Math.floor(Math.random() * ops.length)]
  return { q: `${a} ${op} ${b}`, ans: String(ans) }
}

let handler = async (m, { conn, command }) => {
  conn.studyGames = conn.studyGames || {}
  if (/^(كلمة|رتب)$/i.test(command)) {
    const answer = words[Math.floor(Math.random() * words.length)]
    conn.studyGames[m.chat] = { type: 'word', answer }
    return m.reply(`رتب الكلمة:\n*${shuffle(answer)}*\n\nاكتب: .حل ${answer}`)
  }
  if (/^(سرعة|حساب_سريع)$/i.test(command)) {
    const game = mathQuestion()
    conn.studyGames[m.chat] = { type: 'math', answer: game.ans }
    return m.reply(`أجب بسرعة:\n*${game.q} = ؟*\n\nاكتب: .حل إجابتك`)
  }
  if (/^(ذاكرة)$/i.test(command)) {
    const seq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 9) + 1).join('')
    conn.studyGames[m.chat] = { type: 'memory', answer: seq }
    return m.reply(`احفظ الرقم خلال 10 ثواني:\n*${seq}*\n\nاكتب: .حل الرقم`)
  }
  if (/^(حل)$/i.test(command)) {
    const game = conn.studyGames?.[m.chat]
    const answer = (m.text || '').replace(/^[./#!]?\s*حل\s*/i, '').trim()
    if (!game) return m.reply('لا توجد لعبة تعليمية نشطة. جرّب .كلمة أو .سرعة')
    if (answer === game.answer) {
      delete conn.studyGames[m.chat]
      const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
      initEconomy(user)
      user.exp   = (user.exp   || 0) + 25
      user.money = (user.money || 0) + 20
      user.totalEarned = (user.totalEarned || 0) + 20
      logTransaction(user, 'earn', 20, '📚 فوز لعبة تعليمية')
      return m.reply('✅ صحيح! حصلت على 25 XP و20 عملة.')
    }
    return m.reply(`❌ غير صحيح. حاول مرة أخرى أو اكتب الإجابة بدقة.`)
  }
}

handler.help = ['كلمة', 'سرعة', 'ذاكرة', 'حل']
handler.tags = ['game', 'study']
handler.command = /^(كلمة|رتب|سرعة|حساب_سريع|ذاكرة|حل)$/i

export default handler