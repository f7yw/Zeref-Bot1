/**
 * Paid-service confirmation system
 * Usage:
 *   const ok = await askConfirm(conn, m, 'هل تريد استخدام 50 طاقة لإتمام هذه العملية؟')
 *   if (!ok) return
 */

const pendingConfirms = new Map()

export async function askConfirm(conn, m, promptText, timeoutMs = 30000) {
  const key = `${m.chat}:${m.sender}`

  try {
    await conn.sendPresenceUpdate('composing', m.chat)
    await new Promise(r => setTimeout(r, 600))
    await conn.sendPresenceUpdate('paused', m.chat)
  } catch {}

  const msg = await conn.sendMessage(
    m.chat,
    {
      text: `╭────『 ⚠️ تأكيد الطلب 』────\n│\n│ ${promptText}\n│\n│ ✅ اكتب *نعم* أو *تأكيد* للمتابعة\n│ ❌ اكتب *لا* أو *إلغاء* للإلغاء\n│\n│ ⏱️ المهلة: ${Math.round(timeoutMs / 1000)} ثانية\n╰──────────────────`.trim()
    },
    { quoted: m }
  )

  return new Promise(resolve => {
    const timer = setTimeout(() => {
      pendingConfirms.delete(key)
      conn.sendMessage(m.chat, { text: '⌛ انتهت مهلة التأكيد — تم إلغاء الطلب.' }, { quoted: msg }).catch(() => {})
      resolve(false)
    }, timeoutMs)

    pendingConfirms.set(key, {
      resolve, timer,
      msgId: msg?.key?.id
    })
  })
}

export function handleConfirmReply(conn, m) {
  const key = `${m.chat}:${m.sender}`
  const entry = pendingConfirms.get(key)
  if (!entry) return false

  const text = (m.text || '').trim().toLowerCase()
  const yes = /^(نعم|تأكيد|yes|ok|اوك|يس|ايوه|ايه|موافق)$/.test(text)
  const no  = /^(لا|إلغاء|الغاء|no|cancel|مش|لاء|رفض)$/.test(text)

  if (!yes && !no) return false

  clearTimeout(entry.timer)
  pendingConfirms.delete(key)

  if (yes) {
    conn.sendMessage(m.chat, { text: '✅ تم التأكيد، جاري تنفيذ الطلب...' }, { quoted: m }).catch(() => {})
    entry.resolve(true)
  } else {
    conn.sendMessage(m.chat, { text: '❌ تم إلغاء الطلب.' }, { quoted: m }).catch(() => {})
    entry.resolve(false)
  }

  return true
}

export function hasPendingConfirm(m) {
  return pendingConfirms.has(`${m.chat}:${m.sender}`)
}
