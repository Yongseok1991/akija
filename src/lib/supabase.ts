import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseConfig, Transaction, Category, Asset, Budget } from '../types'

let cachedClient: SupabaseClient | null = null
let currentConfig: SupabaseConfig | null = null

export function getSupabaseConfig(): SupabaseConfig {
  const saved = localStorage.getItem('pwa_supabase_config')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.url && parsed.anon_key) return parsed
    } catch {
      // fallback
    }
  }
  return {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://wgcxltpiugskakyequsf.supabase.co',
    anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hJBHICYN2bmEuZ0kgHx4IA_wQDFcVbv',
    is_connected: true,
  }
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem('pwa_supabase_config', JSON.stringify(config))
  cachedClient = null
  currentConfig = null
}

export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig()
  if (!config.url || !config.anon_key) {
    return null
  }

  if (
    cachedClient &&
    currentConfig?.url === config.url &&
    currentConfig?.anon_key === config.anon_key
  ) {
    return cachedClient
  }

  try {
    cachedClient = createClient(config.url, config.anon_key)
    currentConfig = config
    return cachedClient
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err)
    return null
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
  try {
    const client = createClient(url, anonKey)
    const { error } = await client.from('categories').select('id').limit(1)
    if (error && error.code !== 'PGRST116') {
      console.warn('Supabase ping error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Supabase test connection failed:', err)
    return false
  }
}

/* ==============================================================================
   실시간 자동 클라우드 직접 반영 (Direct Auto Backend Operations)
============================================================================== */

export async function supabaseInsertTransaction(tx: Transaction) {
  const sb = getSupabase()
  if (!sb) return
  try {
    await sb.from('transactions').insert([tx])
  } catch (err) {
    console.error('Supabase auto insert tx failed:', err)
  }
}

export async function supabaseUpdateTransaction(tx: Transaction) {
  const sb = getSupabase()
  if (!sb) return
  try {
    await sb.from('transactions').update(tx).eq('id', tx.id)
  } catch (err) {
    console.error('Supabase auto update tx failed:', err)
  }
}

export async function supabaseDeleteTransaction(id: string) {
  const sb = getSupabase()
  if (!sb) return
  try {
    await sb.from('transactions').delete().eq('id', id)
  } catch (err) {
    console.error('Supabase auto delete tx failed:', err)
  }
}

export async function supabaseUpsertAssets(assets: Asset[]) {
  const sb = getSupabase()
  if (!sb || assets.length === 0) return
  try {
    await sb.from('assets').upsert(assets)
  } catch (err) {
    console.error('Supabase auto upsert assets failed:', err)
  }
}

export async function supabaseUpsertCategories(categories: Category[]) {
  const sb = getSupabase()
  if (!sb || categories.length === 0) return
  try {
    await sb.from('categories').upsert(categories)
  } catch (err) {
    console.error('Supabase auto upsert categories failed:', err)
  }
}

export async function supabaseDeleteCategory(id: string) {
  const sb = getSupabase()
  if (!sb) return
  try {
    await sb.from('categories').delete().eq('id', id)
  } catch (err) {
    console.error('Supabase auto delete category failed:', err)
  }
}

export async function supabaseUpsertBudget(budget: Budget) {
  const sb = getSupabase()
  if (!sb) return
  try {
    await sb.from('budgets').upsert([budget])
  } catch (err) {
    console.error('Supabase auto upsert budget failed:', err)
  }
}

export async function supabasePullAll() {
  const sb = getSupabase()
  if (!sb) return null

  try {
    const [catRes, assetRes, txRes, budgetRes] = await Promise.all([
      sb.from('categories').select('*').order('sort_order', { ascending: true }),
      sb.from('assets').select('*').order('sort_order', { ascending: true }),
      sb.from('transactions').select('*').order('date', { ascending: false }),
      sb.from('budgets').select('*'),
    ])

    return {
      categories: catRes.data as Category[] | null,
      assets: assetRes.data as Asset[] | null,
      transactions: txRes.data as Transaction[] | null,
      budgets: budgetRes.data as Budget[] | null,
    }
  } catch (err) {
    console.error('Error pulling from Supabase:', err)
    return null
  }
}
