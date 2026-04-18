import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, text, command, usedPrefix, args }) => {
  if (!text) {
    throw `📌 مثال:\n${usedPrefix}اغنيه صوت shape of you\n${usedPrefix}اغنيه فيديو shape of you\n${usedPrefix}فيديو shape of you`
  }

  const first = (args?.[0] || '').toLowerCase()
  const wantsVideo = /^(فيديو|video|mp4|v)$/i.test(command) || /^(فيديو|video|mp4|v)$/i.test(first)
  const wantsAudio = /^(اغنيه|اغنية|song|audio|mp3|a)$/i.test(command) && !wantsVideo
  const query = /^(صوت|audio|mp3|a|فيديو|video|mp4|v)$/i.test(first) ? args.slice(1).join(' ') : text
  if (!query) throw `📌 اكتب اسم المقطع بعد نوع الإرسال.`

  await conn.reply(m.chat, '🔎 Searching...', m)

  try {
    const search = await yts(query)
    const video = search?.videos?.[0]

    if (!video?.url) {
      throw new Error('No results found')
    }

    await conn.reply(m.chat, '⏳ Downloading...', m)

    const apis = [
      `https://api.nekorinn.my.id/downloader/youtube?url=${encodeURIComponent(video.url)}`,
      `https://api.akuari.my.id/downloader/youtube?link=${encodeURIComponent(video.url)}`
    ]

    let json = null

    for (const api of apis) {
      try {
        const res = await fetch(api, { timeout: 20000 })

        if (!res.ok) continue

        const text = await res.text()

        try {
          json = JSON.parse(text)
        } catch {
          continue
        }

        if (findMediaUrl(json, wantsVideo ? 'video' : 'audio')) break
      } catch (e) {
        console.log('[API ERROR]', api, e?.message || e)
      }
    }

    const audioUrl = findMediaUrl(json, 'audio')
    const videoUrl = findMediaUrl(json, 'video')

    if (wantsAudio) {
      if (!audioUrl) throw new Error('No audio found')

      await conn.sendMessage(
        m.chat,
        {
          audio: { url: audioUrl },
          mimetype: 'audio/mpeg',
          fileName: `${safe(video.title)}.mp3`
        },
        { quoted: m }
      )
      return
    }

    if (wantsVideo) {
      const sendUrl = videoUrl || video.url

      if (!sendUrl) throw new Error('No video found')

      await conn.sendMessage(
        m.chat,
        {
          video: { url: sendUrl },
          caption: `🎬 ${video.title}`
        },
        { quoted: m }
      )
      return
    }
  } catch (err) {
    console.error('[DOWNLOADER ERROR]', err)
    throw '❌ Failed to download, try again later'
  }
}

handler.command = /^(اغنيه|اغنية|song|audio|mp3|فيديو|video|mp4)$/i
handler.tags = ['downloader']
handler.help = ['اغنيه', 'فيديو']

export default handler

function safe(text) {
  return String(text || 'file')
    .replace(/[\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}

function findMediaUrl(obj, type) {
  const urls = []
  const visit = value => {
    if (!value) return
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value)) urls.push(value)
      return
    }
    if (Array.isArray(value)) return value.forEach(visit)
    if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        const k = key.toLowerCase()
        if (typeof val === 'string' && /^https?:\/\//i.test(val)) {
          if (type === 'audio' && /(audio|mp3|m4a|music|song|url|download)/i.test(k)) urls.unshift(val)
          else if (type === 'video' && /(video|mp4|url|download)/i.test(k)) urls.unshift(val)
          else urls.push(val)
        } else visit(val)
      }
    }
  }
  visit(obj)
  const preferred = urls.find(url => type === 'audio' ? /\.(mp3|m4a|aac|ogg)(\?|$)/i.test(url) : /\.(mp4|webm|mov)(\?|$)/i.test(url))
  return preferred || urls[0]
}