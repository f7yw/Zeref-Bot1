/**
 * yt-dlp wrapper for SHADOW Bot
 * Uses the system yt-dlp binary with dynamic path resolution and retry logic.
 */
import { execFile, execSync } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import axios from 'axios'

const execFileAsync = promisify(execFile)

/**
 * Dynamically resolve the yt-dlp binary path.
 * Checks multiple locations: Replit, Render, system bins, and PATH.
 */
function getYoutubeDlPath() {
  const paths = [
    '/home/runner/workspace/.pythonlibs/bin/yt-dlp', // Replit
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp'
  ]

  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }

  try {
    const whichPath = execSync('which yt-dlp').toString().trim()
    if (whichPath) return whichPath
  } catch (e) {}

  return 'yt-dlp' // Fallback to PATH
}

const YTDLP = getYoutubeDlPath()

/**
 * Download audio from a YouTube URL using Cobalt API as fallback.
 * Returns: { filePath, title } on success, or null if all APIs fail.
 */
async function downloadAudioFallback(url) {
  const cobaltApis = [
    'https://cobalt.lucasvt.com',
    'https://api.cobalt.tools',
    'https://cobalt.sh',
    'https://cobalt.instafree.xyz'
  ]
  const tmpDir = os.tmpdir()

  for (const api of cobaltApis) {
    try {
      console.log(`Trying Cobalt API: ${api}`)
      const response = await axios.post(
        `${api}/api/json`,
        { url, downloadMode: 'audio', audioFormat: 'mp3', audioBitrate: '128' },
        {
          headers: { 
            'Accept': 'application/json', 
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
          },
          timeout: 20000 // 20 seconds for POST request
        }
      ).catch(e => e.response || { data: { status: 'error', text: e.message } })

      const data = response.data
      if (['success', 'redirect', 'stream'].includes(data.status) && data.url) {
        console.log(`Cobalt API success: ${api}`)
        const fallbackTitle = data.title || 'صوت محمل من Cobalt'
        const filePath = path.join(tmpDir, `sha_fallback_${Date.now()}.mp3`)

        const audioResponse = await axios({
          method: 'get',
          url: data.url,
          responseType: 'stream',
          timeout: 90000 // 90 seconds for download stream
        })

        const writer = fs.createWriteStream(filePath)
        audioResponse.data.pipe(writer)

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve)
          writer.on('error', reject)
        })

        return { filePath, title: fallbackTitle }
      } else if (data.status === 'error') {
        console.error(`Cobalt API error from ${api}: ${data.text || 'Unknown error'}`)
      }
    } catch (e) {
      console.error(`Error with Cobalt API ${api}:`, e.message)
    }
  }
  return null
}

/**
 * Download audio from a YouTube URL.
 * Returns: { filePath, title, duration, thumbnail, webpage_url, views, uploader }
 */
export async function downloadAudio(url, { maxDuration = 600 } = {}) {
  const tmpDir = os.tmpdir()
  const outTemplate = path.join(tmpDir, `sha_audio_${Date.now()}_%(title)s.%(ext)s`)

  // First get info to check duration with retries
  let info = {}
  let infoSuccess = false
  let lastInfoError = null

  for (let i = 0; i < 3; i++) {
    try {
      const { stdout } = await execFileAsync(YTDLP, ['--dump-json', '--no-playlist', '--flat-playlist', url], { timeout: 30000 })
      info = JSON.parse(stdout.trim().split('\n')[0])
      infoSuccess = true
      break
    } catch (e) {
      lastInfoError = e
      if (e.message.includes('دقيقة')) throw e
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  if (!infoSuccess) {
    // If the URL contains 'watch' or 'youtu.be', do NOT throw — instead log a warning and continue (the fallback will handle it).
    if (url.includes('watch') || url.includes('youtu.be')) {
      console.warn(`تحذير: فشل الحصول على معلومات الفيديو من yt-dlp، سأحاول التحميل مباشرة أو عبر المصادر الاحتياطية. ${lastInfoError?.message || ''}`)
    } else {
      // If the URL does NOT contain 'watch' or 'youtu.be', throw the error immediately.
      throw new Error(`فشل الحصول على معلومات الفيديو بعد 3 محاولات. ${lastInfoError?.message || ''}`)
    }
  }

  if (info.duration && info.duration > maxDuration) {
    throw new Error(`مدة الفيديو (${Math.round(info.duration / 60)} دقيقة) تتجاوز الحد المسموح ${Math.round(maxDuration / 60)} دقيقة`)
  }

  // Download audio with retries
  const dlArgs = [
    '-x', '--audio-format', 'mp3', '--audio-quality', '5',
    '--no-playlist', '--no-warnings',
    '-o', outTemplate,
    url
  ]

  let dlSuccess = false
  let lastDlError = null
  for (let i = 0; i < 3; i++) {
    try {
      await execFileAsync(YTDLP, dlArgs, { timeout: 120000 })
      dlSuccess = true
      break
    } catch (e) {
      lastDlError = e
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  if (!dlSuccess) {
    console.log('yt-dlp failed, trying fallback APIs...')
    const fallback = await downloadAudioFallback(url)
    if (fallback) {
      return {
        filePath: fallback.filePath,
        title: info.title || fallback.title || 'صوت محمل',
        duration: info.duration || 0,
        thumbnail: info.thumbnail || null,
        webpage_url: info.webpage_url || url,
        views: info.view_count ? Number(info.view_count).toLocaleString('en') : '—',
        uploader: info.uploader || '—'
      }
    }
    throw new Error(`فشل تحميل الصوت من جميع المصادر. ${lastDlError?.message || ''}`)
  }

  // Find the downloaded file
  const files = fs.readdirSync(tmpDir)
    .filter(f => f.startsWith('sha_audio_') && f.endsWith('.mp3'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(tmpDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  if (!files.length) throw new Error('تعذر العثور على الملف المحمل في المجلد المؤقت')
  const filePath = path.join(tmpDir, files[0].name)

  return {
    filePath,
    title: info.title || files[0].name.replace(/^sha_audio_\d+_/, '').replace(/\.mp3$/, ''),
    duration: info.duration || 0,
    thumbnail: info.thumbnail || null,
    webpage_url: info.webpage_url || url,
    views: info.view_count ? Number(info.view_count).toLocaleString('en') : '—',
    uploader: info.uploader || '—'
  }
}

/**
 * Search YouTube and return results.
 */
export async function searchYouTube(query, limit = 1) {
  const args = [
    `ytsearch${limit}:${query}`,
    '--dump-json', '--flat-playlist',
    '--no-playlist', '--no-warnings'
  ]
  try {
    const { stdout } = await execFileAsync(YTDLP, args, { timeout: 30000 })
    return stdout.trim().split('\n').map(l => {
      try { return JSON.parse(l) } catch { return null }
    }).filter(Boolean)
  } catch { return [] }
}
