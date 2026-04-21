import { isVip } from '../lib/economy.js'
let handler = async (m, { usedPrefix, command }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  await m.reply(`❌ أمر تحميل الفيديو معطّل حالياً.\nجرب ${usedPrefix}بحث_يوتيوب للبحث عن الفيديو.\n👤 العضوية: ${vipStatus}`)
}
handler.help = []
handler.tags = ['downloader']
handler.command = /^(فيديو|video|dl|تحميل)$/i
handler.disabled = true
export default handler
