import { isVip } from '../lib/economy.js'
import { toDataURL } from 'qrcode'
let handler = async (m, { text, conn }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
if (!text) throw `*حط النص او رقم التلفون او اي حاجه انت عاوز تحولها لباركود (Qr Code)*`
conn.sendFile(m.chat, await toDataURL(text.slice(0, 2048), { scale: 8 }), 'qrcode.png', '¯\\_(𝑩𝒚 : 𝑺𝒉𝒂𝒅𝒐𝒘 )_/¯', m)
}
handler.help = ['', 'code'].map(v => 'qr' + v + ' <teks>')
handler.tags = ['tools']
handler.command = /^qr(code)?|كود|باركود$/i
export default handler
