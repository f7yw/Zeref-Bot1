import { isVip } from '../lib/economy.js'
let handler = async (m, { usedPrefix, command }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  await m.reply(`❌ أمر تحميل الأغنية معطّل حالياً.\nجرب ${usedPrefix}بحث_يوتيوب للبحث عن الأغنية.\n👤 العضوية: ${vipStatus}`)
}
handler.help = []
handler.tags = ['downloader']
handler.command = /^(mp3|اغنيه|اغنية|اغنيه صوت|تحميل صوت|موسيقى|موسيقا)$/i
handler.disabled = true
export default handler
