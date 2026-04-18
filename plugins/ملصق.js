import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { execSync, execFileSync } from 'child_process'
import sharp from 'sharp'
import { typingDelay, recordingDelay } from '../lib/presence.js'

const FFMPEG = (() => {
  try { return execSync('which ffmpeg', { encoding: 'utf8' }).trim() } catch { return 'ffmpeg' }
})()

const BOT_PACK  = 'SHADOW Bot'
const BOT_AUTH  = 'Zeref | t.me/ZerefBot'
const TMP = tmpdir()

function tmpFile(ext) {
  return path.join(TMP, `shadow_stk_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)
}

async function embedWebpMetadata(webpBuf, packName, authorName) {
  try {
    const { default: Webpmux } = await import('node-webpmux')
    const img = new Webpmux.Image()
    await img.load(webpBuf)
    const exifJson = {
      'sticker-pack-id': `shadow-${Date.now()}`,
      'sticker-pack-name': packName,
      'sticker-pack-publisher': authorName,
      'android-app-store-link': '',
      'ios-app-store-link': ''
    }
    const exifStr = JSON.stringify(exifJson)
    const exifBuf = Buffer.alloc(exifStr.length + 22)
    exifBuf.writeUInt32BE(exifStr.length + 18, 0)
    exifBuf.write('\x49\x49\x2A\x00\x08\x00\x00\x00\x01\x00\x41\x57\x07\x00', 4, 'binary')
    exifBuf.writeUInt32LE(exifStr.length, 18)
    exifBuf.write(exifStr, 22, 'utf8')
    img.exif = exifBuf
    return await img.save(null)
  } catch {
    return webpBuf
  }
}

async function imageToSticker(buf) {
  const webp = await sharp(buf)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer()
  return embedWebpMetadata(webp, BOT_PACK, BOT_AUTH)
}

async function videoToSticker(buf) {
  const inFile  = tmpFile('mp4')
  const outFile = tmpFile('webp')
  try {
    fs.writeFileSync(inFile, buf)
    execFileSync(FFMPEG, [
      '-y', '-i', inFile,
      '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15',
      '-vcodec', 'libwebp', '-lossless', '0', '-compression_level', '6',
      '-q:v', '50', '-loop', '0', '-preset', 'picture', '-an', '-t', '3',
      outFile
    ], { timeout: 25000 })
    const webp = fs.readFileSync(outFile)
    return embedWebpMetadata(webp, BOT_PACK, BOT_AUTH)
  } finally {
    for (const f of [inFile, outFile]) try { fs.unlinkSync(f) } catch {}
  }
}

async function stickerToImage(buf) {
  return sharp(buf).png().toBuffer()
}

let handler = async (m, { conn, usedPrefix, command }) => {
  const isReverse = /^(صوره|صورة|فك_ملصق|فك-ملصق|unsticker|toimage)$/i.test(command)

  if (isReverse) {
    // Sticker → image
    const quoted = m.quoted || m
    const mime   = (quoted.msg || quoted)?.mimetype || ''
    if (!mime.includes('webp')) throw '❌ الرجاء الرد على ملصق (sticker)'
    await typingDelay(conn, m.chat, 800)
    const buf = await quoted.download()
    const png = await stickerToImage(buf)
    await conn.sendMessage(m.chat, { image: png, caption: '🖼️ تم تحويل الملصق لصورة' }, { quoted: m })
    return
  }

  // Image / video → sticker
  const quoted = m.quoted || m
  const mime   = (quoted.msg || quoted)?.mimetype || ''
  const isImg  = /image\/(jpeg|jpg|png|gif|webp)/.test(mime)
  const isVid  = /video\//.test(mime) || mime === 'image/gif'
  const isStk  = mime.includes('webp')

  if (!isImg && !isVid && !isStk) {
    throw `╭────『 📌 الملصق 』────
│
│ *الاستخدام:*
│ — رد على صورة + ${usedPrefix}ملصق
│   ⟵ تحويل صورة لملصق ثابت
│
│ — رد على فيديو (≤3 ثواني) + ${usedPrefix}ملصق
│   ⟵ تحويل فيديو لملصق متحرك
│
│ — رد على ملصق + ${usedPrefix}صوره
│   ⟵ تحويل ملصق لصورة
│
╰──────────────────`.trim()
  }

  if (isVid) {
    await recordingDelay(conn, m.chat, 1200)
    const buf = await quoted.download()
    let webp
    try {
      webp = await videoToSticker(buf)
    } catch (e) {
      console.error('[STICKER VIDEO ERR]', e?.message)
      throw '❌ فشل تحويل الفيديو — تأكد أنه لا يتجاوز 3 ثواني وبصيغة mp4'
    }
    await conn.sendMessage(m.chat, { sticker: webp }, { quoted: m })
  } else {
    await typingDelay(conn, m.chat, 800)
    const buf = await quoted.download()
    let webp
    try {
      webp = await imageToSticker(buf)
    } catch (e) {
      console.error('[STICKER IMG ERR]', e?.message)
      throw '❌ فشل تحويل الصورة — تأكد من صيغة الصورة'
    }
    await conn.sendMessage(m.chat, { sticker: webp }, { quoted: m })
  }
}

handler.help  = ['ملصق', 'صوره']
handler.tags  = ['tools']
handler.command = /^(ملصق|ملصقات|sticker|stickerر|صوره|صورة|فك_ملصق|فك-ملصق|unsticker|toimage)$/i
handler.exp   = 5
handler.limit = false
export default handler
