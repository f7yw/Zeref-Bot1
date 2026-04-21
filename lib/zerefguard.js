/**
 * lib/zerefguard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ZerefGuard — نظام حماية وسلامة الكود (Code Integrity Protection)
 *
 * يحمي ملفات النواة (lib/* و plugins/* الحرجة) من التعديل غير المصرّح به:
 *   • يحسب بصمة SHA-256 لكل ملف.
 *   • يوقّع البصمات بـ HMAC-SHA-256 باستخدام مفتاح مشتقّ من رقم المالك + REPL_ID + secret.
 *   • يخزّن البيان (manifest) في .zerefguard/manifest.sig
 *   • عند الإقلاع: يتحقّق من البصمات؛ إن اختلف ملف → ينبّه المالك ويُسجّل تنبيه.
 *
 * الأوامر (مطور فقط):
 *   • .guard          → عرض حالة الحماية
 *   • .guard_seal     → تختيم بصمات النسخة الحالية (يصبح المرجع)
 *   • .guard_check    → فحص فوري ومقارنة مع المرجع
 *   • .guard_unseal   → إلغاء التختيم (يحتاج تأكيد)
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const ROOT = process.cwd()
const STORE_DIR = path.join(ROOT, '.zerefguard')
const STORE_FILE = path.join(STORE_DIR, 'manifest.sig')

// الملفات المحميّة افتراضياً
const PROTECTED_PATTERNS = [
  'lib/simple.js',
  'lib/jadibot.js',
  'lib/notify.js',
  'lib/zerefguard.js',
  'plugins/menu.js',
  'plugins/offensive-words.js',
  'plugins/private-welcome.js',
  'plugins/group-invite.js',
  'plugins/schedule.js',
  'plugins/student-mediator.js',
  'main.js',
  'index.js',
]

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function deriveKey() {
  const ownerNum = (global.owner || []).map(o => Array.isArray(o) ? o[0] : o).filter(Boolean).join(',')
  const repl = process.env.REPL_ID || process.env.REPLIT_DB_URL || 'local'
  const extra = process.env.ZEREFGUARD_SECRET || 'zeref-default-keep-it-strong'
  return crypto.createHash('sha256').update(`${ownerNum}::${repl}::${extra}`).digest()
}

function hmac(payload) {
  return crypto.createHmac('sha256', deriveKey()).update(payload).digest('hex')
}

function readFileSafe(rel) {
  try {
    const p = path.join(ROOT, rel)
    if (!fs.existsSync(p)) return null
    return fs.readFileSync(p)
  } catch { return null }
}

export function buildManifest() {
  const files = {}
  for (const rel of PROTECTED_PATTERNS) {
    const buf = readFileSafe(rel)
    if (!buf) continue
    files[rel] = sha256(buf)
  }
  return { version: 1, ts: Date.now(), files }
}

export function sealManifest() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })
  const manifest = buildManifest()
  const payload = JSON.stringify(manifest)
  const sig = hmac(payload)
  fs.writeFileSync(STORE_FILE, JSON.stringify({ manifest, sig }, null, 2))
  return manifest
}

export function loadManifest() {
  try {
    if (!fs.existsSync(STORE_FILE)) return null
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'))
    const expected = hmac(JSON.stringify(raw.manifest))
    if (expected !== raw.sig) return { tampered: true, reason: 'signature mismatch' }
    return raw.manifest
  } catch (e) {
    return { tampered: true, reason: e.message }
  }
}

export function checkIntegrity() {
  const stored = loadManifest()
  if (!stored) return { sealed: false, ok: false, changes: [], message: 'لم يُختم بعد' }
  if (stored.tampered) return { sealed: true, ok: false, tampered: true, changes: [], message: `بيان مفسد: ${stored.reason}` }

  const current = buildManifest()
  const changes = []
  for (const rel of Object.keys(stored.files)) {
    if (!current.files[rel]) changes.push({ file: rel, type: 'missing' })
    else if (current.files[rel] !== stored.files[rel]) changes.push({ file: rel, type: 'modified' })
  }
  for (const rel of Object.keys(current.files)) {
    if (!stored.files[rel]) changes.push({ file: rel, type: 'added' })
  }
  return {
    sealed: true,
    ok: changes.length === 0,
    changes,
    sealedAt: stored.ts,
    fileCount: Object.keys(stored.files).length,
  }
}

export function unsealManifest() {
  try { if (fs.existsSync(STORE_FILE)) fs.unlinkSync(STORE_FILE) } catch {}
  return true
}

/**
 * يُستدعى من main.js عند الإقلاع.
 * إن وُجد بيان مختوم وتغيّر شيء → يخطر المالك.
 */
export async function bootCheck(conn) {
  try {
    const r = checkIntegrity()
    if (!r.sealed) return r
    if (r.ok) {
      console.log(`[ZerefGuard] ✅ سلامة الكود مؤكدة (${r.fileCount} ملف)`)
      return r
    }
    const lines = r.changes.map(c => `  • ${c.type}: ${c.file}`).join('\n')
    const msg = `🛡️ *ZerefGuard — تنبيه سلامة*\n\nرُصدت ${r.changes.length} تغييرات في ملفات النواة:\n\n${lines}\n\n_ختم البيان مجدداً بـ:_ *.guard_seal*`
    console.warn('[ZerefGuard] ⚠️ INTEGRITY ALERT\n' + lines)
    if (conn) {
      try {
        const owners = (global.owner || []).map(o => Array.isArray(o) ? o[0] : o).filter(Boolean)
        for (const ow of owners) {
          const jid = String(ow).replace(/\D/g, '') + '@s.whatsapp.net'
          await conn.sendMessage(jid, { text: msg }).catch(() => {})
        }
      } catch {}
    }
    return r
  } catch (e) {
    console.error('[ZerefGuard] boot check failed:', e.message)
    return { ok: false, error: e.message }
  }
}

export default { buildManifest, sealManifest, loadManifest, checkIntegrity, unsealManifest, bootCheck }
