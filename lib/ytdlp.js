/**
 * yt-dlp wrapper for SHADOW Bot
 * Uses the system yt-dlp binary (pip-installed at .pythonlibs/bin/yt-dlp)
 */
import { execFile, execSync } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'

const execFileAsync = promisify(execFile)

/**
 * Dynamically resolve the yt-dlp binary path.
 * Checks multiple locations: Replit, Render, system bins, and PATH.
 */
function getYoutubeDlPath() {
  const paths = [
    '/home/runner/workspace/.pythonlibs/bin/yt-dlp', // Replit
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp' // Fallback to PATH
  ]

  for (const p of paths) {
    if (path.isAbsolute(p) && fs.existsSync(p)) return p
  }

  try {
    const whichPath = execSync('which yt-dlp').toString().trim()
    if (whichPath) return whichPath
  } catch (e) {}

  return 'yt-dlp'
}

const YTDLP = getYoutubeDlPath()

/**
 * Download audio from a YouTube URL.
 * Returns: { filePath, title, duration, thumbnail }
 */
export async function downloadAudio(url, { maxDuration = 600 } = {}) {
  const tmpDir = os.tmpdir()
  const outTemplate = path.join(tmpDir, `sha_audio_${Date.now()}_%(title)s.%(ext)s`)

  // First get info to check duration with retries
  let info = {}
  let infoSuccess = false
  for (let i = 0; i < 3; i++) {
    try {
      const { stdout } = await execFileAsync(YTDLP, ['--dump-json', '--no-playlist', '--flat-playlist', url], { timeout: 30000 })
      info = JSON.parse(stdout.trim().split('\n')[0])
      infoSuccess = true
      break
    } catch (e) {
      if (i === 2) {
        // If final try fails and it's a duration error, throw it
        if (e.message.includes('دقيقة')) throw e
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  if (infoSuccess && info.duration && info.duration > maxDuration) {
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
  let lastError = null
  for (let i = 0; i < 3; i++) {
    try {
      await execFileAsync(YTDLP, dlArgs, { timeout: 120000 })
      dlSuccess = true
      break
    } catch (e) {
      lastError = e
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  if (!dlSuccess) {
    throw new Error(`فشل تحميل الصوت بعد عدة محاولات. ${lastError?.message || ''}`)
  }

  // Find the downloaded file
  const files = fs.readdirSync(tmpDir)
    .filter(f => f.startsWith('sha_audio_') && f.endsWith('.mp3'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(tmpDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  if (!files.length) throw new Error('تعذر العثور على الملف المحمل')
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
 * Search YouTube and return the first result URL.
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
