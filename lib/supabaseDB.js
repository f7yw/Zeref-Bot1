import { createClient } from '@supabase/supabase-js'
import _fs, { existsSync, readFileSync } from 'fs'
const { promises: fs } = _fs
import { resolve } from 'path'

const TABLE_NAME = 'bot_data'
const ROW_ID = 1
const FALLBACK_FILE = resolve('database.supabase.json')

export class SupabaseDB {
  constructor(url, key) {
    this.client = createClient(url, key)
    this.data = {}
    this._tableReady = null
    this._errorLogged = false
  }

  _localRead() {
    try {
      return existsSync(FALLBACK_FILE) ? JSON.parse(readFileSync(FALLBACK_FILE, 'utf-8')) : {}
    } catch { return {} }
  }

  async _localWrite(data) {
    try {
      await fs.writeFile(FALLBACK_FILE, JSON.stringify(data))
    } catch (e) {
      console.error('[SUPABASE] Local fallback write error:', e.message)
    }
  }

  async _checkTable() {
    if (this._tableReady === true) return true
    const { error } = await this.client.from(TABLE_NAME).select('id').limit(1)
    if (!error) {
      this._tableReady = true
      return true
    }
    return false
  }

  async read() {
    const ready = await this._checkTable()

    if (!ready) {
      if (!this._errorLogged) {
        console.error('[SUPABASE] Table "bot_data" not found. Using local fallback. Run supabase_setup.sql in your Supabase SQL Editor to enable cloud storage.')
        this._errorLogged = true
      }
      this.data = this._localRead()
      return this.data
    }

    try {
      const { data, error } = await this.client
        .from(TABLE_NAME)
        .select('data')
        .eq('id', ROW_ID)
        .single()

      if (error && error.code === 'PGRST116') {
        await this.client.from(TABLE_NAME).insert({ id: ROW_ID, data: {} })
        this.data = {}
      } else if (error) {
        console.error('[SUPABASE] Read error:', error.message)
        this.data = this._localRead()
      } else {
        this.data = data?.data || {}
      }
    } catch (e) {
      console.error('[SUPABASE] Read exception:', e.message)
      this.data = this._localRead()
    }
    return this.data
  }

  async write(data) {
    const payload = data !== undefined ? data : this.data

    const ready = await this._checkTable()
    if (!ready) {
      await this._localWrite(payload)
      return
    }

    try {
      const { error } = await this.client
        .from(TABLE_NAME)
        .upsert({ id: ROW_ID, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      if (error) {
        console.error('[SUPABASE] Write error:', error.message)
        await this._localWrite(payload)
      }
    } catch (e) {
      console.error('[SUPABASE] Write exception:', e.message)
      await this._localWrite(payload)
    }
  }
}
