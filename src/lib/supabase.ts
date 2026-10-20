import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseConfig, Transaction, Category, Asset, Budget } from '../types'

let cachedClient: SupabaseClient | null = null
let currentConfig: SupabaseConfig | null = null

export function getSupabaseConfig(): SupabaseConfig {
  const saved = localStorage.getItem('pwa_supabase_config')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // fallback
    }
  }
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    is_connected: false,
  }
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem('pwa_supabase_config', JSON.stringify(config))
  cachedClient = null // force recreate
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

export async function syncPullFromSupabase() {
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

export async function syncPushToSupabase(data: {
  categories?: Category[]
  assets?: Asset[]
  transactions?: Transaction[]
  budgets?: Budget[]
}) {
  const sb = getSupabase()
  if (!sb) return

  try {
    if (data.categories && data.categories.length > 0) {
      await sb.from('categories').upsert(data.categories)
    }
    if (data.assets && data.assets.length > 0) {
      await sb.from('assets').upsert(data.assets)
    }
    if (data.transactions && data.transactions.length > 0) {
      await sb.from('transactions').upsert(data.transactions)
    }
    if (data.budgets && data.budgets.length > 0) {
      await sb.from('budgets').upsert(data.budgets)
    }
  } catch (err) {
    console.error('Error pushing to Supabase:', err)
  }
}
