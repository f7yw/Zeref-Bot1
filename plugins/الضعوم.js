let handler = async (m, { conn }) => {
  let _uptime = process.uptime() * 1000
  let uptime = clockString(_uptime)
  let taguser = '@' + m.sender.split('@')[0]

  let str = `╭────『 🤖 彡ℤ𝕖𝕣𝕖𝕗 』────
│
│ *➤ مرحبًا ${taguser}*
│
│ *🤖 حالة البوت:* نشط ✅
│ *⏱️ وقت التشغيل:*${uptime}
│
│ *👑 المطور:* 彡ℤ𝕖𝕣𝕖𝕗
│ *📞 تواصل:* wa.me/${global.nomorown}
│ *🔗 GitHub:* ${global.md}
│
╰──────────────────`.trim()

  await m.reply(str)
}

handler.help = ['دعم', 'وقت']
handler.tags = ['main']
handler.command = /^(الدعم|وقت|الضعوم)$/i
export default handler

function clockString(ms) {
  let d = isNaN(ms) ? '--' : Math.floor(ms / 86400000)
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24
  let m2 = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return `\n│ ⬛ ${d} يوم | ${h} ساعة | ${m2} دقيقة | ${s} ثانية`
}