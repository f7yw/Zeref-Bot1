import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!text) {
    throw `📌 Example:\n${usedPrefix + command} shape of you`
  }

  await conn.reply(m.chat, '🔎 Searching...', m)

  try {
    const search = await yts(text)
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

        const hasAudio =
          json?.result?.audio ||
          json?.result?.url ||
          json?.audio ||
          json?.url

        if (hasAudio) break
      } catch (e) {
        console.log('[API ERROR]', api, e?.message || e)
      }
    }

    const audioUrl =
      json?.result?.audio ||
      json?.result?.url ||
      json?.audio ||
      json?.url ||
      json?.download

    const videoUrl =
      json?.result?.video ||
      json?.result?.videoUrl ||
      json?.video ||
      json?.videoUrl

    if (command === 'اغنيه') {
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

    if (command === 'فيديو') {
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

handler.command = /^(اغنيه|فيديو)$/i
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