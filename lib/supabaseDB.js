import { createClient } from '@supabase/supabase-js'

const TABLE_NAME = 'bot_data'
const ROW_ID = 1

export class SupabaseDB {
  constructor(url, key) {
    this.client = createClient(url, key)
    this.data = {}
  }

  async read() {
    try {
      const { data, error } = await this.client
        .from(TABLE_NAME)
        .select('data')
        .eq('id', ROW_ID)
        .single()

      if (error && error.code === 'PGRST116') {
        // Row doesn't exist yet, create it
        const { error: insertError } = await this.client
          .from(TABLE_NAME)
          .insert({ id: ROW_ID, data: {} })
        if (insertError) {
          console.error('[SUPABASE] Error creating initial row:', insertError.message)
        }
        this.data = {}
      } else if (error) {
        console.error('[SUPABASE] Read error:', error.message)
        this.data = {}
      } else {
        this.data = data?.data || {}
      }
    } catch (e) {
      console.error('[SUPABASE] Read exception:', e.message)
      this.data = {}
    }
    return this.data
  }

  async write(data) {
    const payload = data !== undefined ? data : this.data
    try {
      const { error } = await this.client
        .from(TABLE_NAME)
        .upsert({ id: ROW_ID, data: payload }, { onConflict: 'id' })
      if (error) {
        console.error('[SUPABASE] Write error:', error.message)
      }
    } catch (e) {
      console.error('[SUPABASE] Write exception:', e.message)
    }
  }
}
