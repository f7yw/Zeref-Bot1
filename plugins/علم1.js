import similarity from 'similarity'
import { initEconomy, logTransaction, fmt } from '../lib/economy.js'

const threshold = 0.72

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

let handler = m => m
handler.before = async function (m) {
  let id = m.chat
  this.tekateki = this.tekateki || {}
  
  if (!m.quoted || !m.quoted.fromMe || !m.quoted.isBaileys) return !0
  if (!(id in this.tekateki)) return !0

  const entry = this.tekateki[id]
  const entryId = Array.isArray(entry) ? (entry[0]?.id || entry[0]?.key?.id) : entry.msgId
  if (m.quoted.id !== entryId) return !0

  const json = Array.isArray(entry) ? entry[1] : entry.question
  const reward = Array.isArray(entry) ? entry[2] : entry.reward
  const timer = Array.isArray(entry) ? entry[3] : entry.timer

  const userAns = normalize(m.text || '')
  const correctAns = normalize(json.response)

  if (userAns === correctAns) {
    const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
    initEconomy(user, m.sender)
    
    const xpBonus = reward
    const moneyReward = Math.floor(reward / 10)
    
    user.exp = (user.exp || 0) + xpBonus
    user.money = (user.money || 0) + moneyReward
    user.totalEarned = (user.totalEarned || 0) + moneyReward
    logTransaction(user, 'earn', moneyReward, `🎮 فوز في لعبة ${json.question?.slice(0, 10) || 'علم1'}`)

    let name = await this.getName(m.sender)

    await this.reply(
      m.chat, 
      `╭────『 ✅ إجابة صحيحة! 』────
│
│ 🎉 أحسنت *@${m.sender.split('@')[0]}* (${name})!
│
│ ⭐ +${xpBonus} XP
│ 💰 +${fmt(moneyReward)}
│
╰──────────────────`.trim(), 
      m, 
      { mentions: [m.sender] }
    )
    
    clearTimeout(timer)
    delete this.tekateki[id]
  } else if (similarity(userAns, correctAns) >= threshold) {
    await this.reply(m.chat, `*قربت يحب حاول!*`, m)
  } else {
    await this.reply(m.chat, '*❌ غلط يحب حاول تاني!*', m)
  }
  return !0
}

handler.exp = 0
export default handler
