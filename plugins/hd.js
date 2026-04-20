import FormData from "form-data";
import * as Jimp from "jimp";
import { deductEnergy, syncEnergy, initEconomy, FEES, MAX_ENERGY } from '../lib/economy.js'

let handler = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender]
  if (user) {
    initEconomy(user)
    syncEnergy(user)
    if (user.energy < FEES.hd) {
      throw `╭────『 ⚡ طاقة ناضبة 』────\n│\n│ ❌ تحسين الصورة يحتاج *${FEES.hd} ⚡*\n│ طاقتك: *${user.energy}/${MAX_ENERGY}*\n│\n│ 💡 استخدم *${usedPrefix}يومي* أو انتظر الشحن التلقائي\n│\n╰──────────────────`.trim()
    }
  }

  conn.hdr = conn.hdr || {}
  if (m.sender in conn.hdr)
    throw "⏳ لا تزال عملية جارية، انتظر حتى تنتهي."

  let q    = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || q.mediaType || ""

  if (!mime) throw '❌ أرسل أو اقتبس صورة مع الأمر.'
  if (!/image\/(jpe?g|png)/.test(mime)) throw '❌ الصيغة المدعومة: JPG أو PNG فقط.'

  conn.hdr[m.sender] = true
  if (user) deductEnergy(user, FEES.hd)

  await m.reply(`⚙️ جاري رفع جودة الصورة... ⚡ -${FEES.hd} طاقة`)

  let error
  try {
    const img  = await q.download?.()
    const This = await processing(img, "enhance")
    await conn.sendFile(m.chat, This, "hd.jpg", "✅ تم رفع الجودة!", m)
  } catch (er) {
    error = true
  } finally {
    if (error) m.reply("❌ فشل تحسين الصورة، حاول مجدداً.")
    delete conn.hdr[m.sender]
  }
}

handler.help    = ['جوده', 'HD']
handler.tags    = ['tools', 'ai']
handler.command = /^(جوده|دقه|hd|HD)$/i
handler.register = false
handler.limit    = false
export default handler

async function processing(urlPath, method) {
  return new Promise((resolve, reject) => {
    const Methods = ["enhance", "recolor", "dehaze"]
    if (!Methods.includes(method)) method = Methods[0]

    const Form   = new FormData()
    const scheme = "https://inferenceengine.vyro.ai/" + method

    Form.append("model_version", 1, {
      "Content-Transfer-Encoding": "binary",
      contentType: "multipart/form-data; charset=utf-8",
    })
    Form.append("image", Buffer.from(urlPath), {
      filename: "enhance_image_body.jpg",
      contentType: "image/jpeg",
    })

    Form.submit(
      {
        url: scheme,
        host: "inferenceengine.vyro.ai",
        path: "/" + method,
        protocol: "https:",
        headers: {
          "User-Agent": "okhttp/4.9.3",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
        },
      },
      (err, res) => {
        if (err) return reject(err)
        const data = []
        res.on("data", chunk => data.push(chunk))
           .on("end",  () => resolve(Buffer.concat(data)))
           .on("error", reject)
      }
    )
  })
}
