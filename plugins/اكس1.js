import { isVip } from '../lib/economy.js'

const arabicToNum = { '١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
                      '۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','٨':'8','۹':'9' }

function normalizeText(raw) {
  if (!raw) return ''
  return raw.trim()
    .replace(/[١-٩۱-۹]/g, d => arabicToNum[d] || d)
    .replace(/^[./#!]\s*/, '')  // strip command prefix if present
    .trim()
}

const WIN_SCORE  = 7000
const PLAY_SCORE = 99

function renderBoard(game) {
  return game.render().map(v => ({
    X: '❎', O: '⭕',
    1: '1️⃣', 2: '2️⃣', 3: '3️⃣',
    4: '4️⃣', 5: '5️⃣', 6: '6️⃣',
    7: '7️⃣', 8: '8️⃣', 9: '9️⃣',
  }[v]))
}

function displayJid(jid) {
  if (!jid || jid === 'pending') return '?'
  if (jid.includes('@lid')) return jid.split('@')[0].replace(/^0+/, '')
  return jid.split('@')[0]
}

async function buildBoardStr(conn, room, statusLine) {
  const arr = renderBoard(room.game)
  const getName = async (jid) => {
    try { return await conn.getName(jid) } catch { return displayJid(jid) }
  }
  const nameX = await getName(room.game.playerX)
  const nameO = await getName(room.game.playerO)
  const vipX = isVip(room.game.playerX) ? '💎 مميز' : '❌ عادي'
  const vipO = isVip(room.game.playerO) ? '💎 مميز' : '❌ عادي'

  return `╭────『 🎮 لعبة XO 』────
│
│ ❎ = ${nameX} (@${displayJid(room.game.playerX)}) 👤 العضوية: ${vipX}
│ ⭕ = ${nameO} (@${displayJid(room.game.playerO)}) 👤 العضوية: ${vipO}
│
│   ${arr.slice(0, 3).join('')}
│   ${arr.slice(3, 6).join('')}
│   ${arr.slice(6).join('')}
│
│ ${statusLine}
╰──────────────────`.trim()
}

async function sendToRoom(conn, room, text, m) {
  const opts = { mentions: conn.parseMention(text) }
  await conn.sendMessage(room.x, { text, ...opts }, { quoted: m })
  if (room.o && room.o !== room.x) {
    await conn.sendMessage(room.o, { text, ...opts }, { quoted: m })
  }
}

export async function before(m) {
  if (m.isBaileys) return true
  this.game = this.game || {}

  const room = Object.values(this.game).find(r =>
    r.id && r.game && r.state === 'PLAYING' &&
    [r.game.playerX, r.game.playerO].includes(m.sender)
  )
  if (!room) return true

  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const getName = async (jid) => {
    try { return await this.getName(jid) } catch { return jid.split('@')[0] }
  }

  const normalized = normalizeText(m.text)
  const isSurrender = /^(استسلم|nyerah|surrender)$/i.test(normalized)
  const isNumber    = /^[1-9]$/.test(normalized)

  if (!isNumber && !isSurrender) return true

  if (!isSurrender && m.sender !== room.game.currentTurn) {
    const nameTurn = await getName(room.game.currentTurn)
    await m.reply(`⏳ ليس دورك! دور ${nameTurn} (@${displayJid(room.game.currentTurn)})\n👤 العضوية: ${vipStatus}`, null, { mentions: [room.game.currentTurn] })
    return false
  }

  let ok = 1
  if (!isSurrender) {
    ok = room.game.turn(m.sender === room.game.playerO, parseInt(normalized) - 1)
    if (ok < 1) {
      const errMsg = {
        '-3': '⚠️ اللعبة منتهية بالفعل!',
        '-2': '❌ خطأ في اللعب!',
        '-1': '❌ الرقم خارج النطاق (1-9)!',
        0:    '🚫 هذه الخانة مشغولة! اختر خانة أخرى.',
      }[ok] || '❌ خطأ غير معروف'
      await m.reply(`${errMsg}\n👤 العضوية: ${vipStatus}`)
      return false
    }
  }

  if (isSurrender) {
    room.game._currentTurn = (m.sender === room.game.playerX)
  }

  const isWin = isSurrender ? room.game.currentTurn !== m.sender : !!room.game.winner
  const isTie = !isWin && room.game.board === 511
  const winner = isSurrender ? room.game.currentTurn : room.game.winner

  let statusLine
  if (isWin) {
    const winnerName = await getName(winner)
    statusLine = `🏆 مبروك ${winnerName} (@${displayJid(winner)})! فزت! 🎉`
  } else if (isTie) {
    statusLine = `🤝 تعادل! لعبة رائعة من الطرفين`
  } else {
    const nameTurn = await getName(room.game.currentTurn)
    statusLine = `⌛ دورك ${nameTurn} (@${displayJid(room.game.currentTurn)})`
  }

  const str = await buildBoardStr(this, room, statusLine)

  if (isTie || isWin) {
    const users = global.db.data.users
    if (users[room.game.playerX]) users[room.game.playerX].exp = (users[room.game.playerX].exp || 0) + PLAY_SCORE
    if (users[room.game.playerO]) users[room.game.playerO].exp = (users[room.game.playerO].exp || 0) + PLAY_SCORE
    if (isWin && users[winner])   users[winner].exp = (users[winner].exp || 0) + (WIN_SCORE - PLAY_SCORE)
    delete this.game[room.id]
  }

  await sendToRoom(this, room, `${str}\n👤 العضوية: ${vipStatus}`, m)
  return false
}
