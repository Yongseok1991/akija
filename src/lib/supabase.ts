import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseConfig, Transaction, Category, Asset, Budget } from '../types'

let cachedClient: SupabaseClient | null = null
let currentConfig: SupabaseConfig | null = null

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUUID(id?: string | null): boolean {
  if (!id) return false
  return UUID_REGEX.test(id)
}

export function formatSupabaseError(error: any): string {
  if (!error) return '알 수 없는 오류'
  if (
    error.code === '42501' ||
    (typeof error.message === 'string' && error.message.includes('row-level security'))
  ) {
    return 'Supabase RLS(Row Level Security) 차단 오류:\nSupabase 대시보드 -> SQL Editor에서 RLS를 비활성화(DISABLE ROW LEVEL SECURITY)해야 저장할 수 있습니다.\n\nALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.assets DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;\nALTER TABLE public.budgets DISABLE ROW LEVEL SECURITY;'
  }
  return error.message || error.details || JSON.stringify(error)
}

export function sanitizeTxForDB(
  tx: Transaction,
  validCategoryIds?: Set<string>,
  validAssetIds?: Set<string>,
  userId?: string | null
): any {
  const catId = isValidUUID(tx.category_id) ? tx.category_id : null
  const assetId = isValidUUID(tx.asset_id) ? tx.asset_id : null
  const toAssetId = isValidUUID(tx.to_asset_id) ? tx.to_asset_id : null

  return {
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount) || 0,
    date: tx.date,
    category_id: catId && (!validCategoryIds || validCategoryIds.has(catId)) ? catId : null,
    asset_id: assetId && (!validAssetIds || validAssetIds.has(assetId)) ? assetId : null,
    to_asset_id: toAssetId && (!validAssetIds || validAssetIds.has(toAssetId)) ? toAssetId : null,
    memo: tx.memo || '',
    image_url: tx.image_url || null,
    created_at: tx.created_at || new Date().toISOString(),
    ...(tx.user_id || userId ? { user_id: tx.user_id || userId } : {}),
  }
}

export function sanitizeCategoryForDB(c: Category, userId?: string | null): any {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon || '📌',
    type: c.type || 'expense',
    sort_order: Number(c.sort_order) || 0,
    ...(c.user_id || userId ? { user_id: c.user_id || userId } : {}),
  }
}

export function sanitizeAssetForDB(a: Asset, userId?: string | null): any {
  return {
    id: a.id,
    name: a.name,
    type: a.type || 'card',
    balance: Number(a.balance) || 0,
    icon: a.icon || '💳',
    sort_order: Number(a.sort_order) || 0,
    ...(a.user_id || userId ? { user_id: a.user_id || userId } : {}),
  }
}

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

export async function claimUnassignedDataForUser(userId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb || !userId) return
  try {
    await Promise.all([
      sb.from('transactions').update({ user_id: userId }).is('user_id', null),
      sb.from('categories').update({ user_id: userId }).is('user_id', null),
      sb.from('assets').update({ user_id: userId }).is('user_id', null),
      sb.from('budgets').update({ user_id: userId }).is('user_id', null),
    ])
  } catch (err) {
    console.error('Failed to claim unassigned data for user:', err)
  }
}

export async function supabaseInsertTransaction(
  tx: Transaction,
  validCategoryIds?: Set<string>,
  validAssetIds?: Set<string>,
  userId?: string | null
): Promise<{ success: boolean; error?: any }> {
  const sb = getSupabase()
  if (!sb) return { success: false, error: new Error('Supabase client not initialized') }

  const payload = sanitizeTxForDB(tx, validCategoryIds, validAssetIds, userId)
  const { error } = await sb.from('transactions').insert([payload])
  if (error) {
    console.error('Supabase auto insert tx failed:', error)
    return { success: false, error }
  }
  return { success: true }
}

export async function supabaseInsertTransactionsBatch(
  txs: Transaction[],
  validCategoryIds?: Set<string>,
  validAssetIds?: Set<string>,
  userId?: string | null
): Promise<{ success: boolean; error?: any; count: number }> {
  const sb = getSupabase()
  if (!sb) return { success: false, error: new Error('Supabase client not initialized'), count: 0 }
  if (txs.length === 0) return { success: true, count: 0 }

  const sanitized = txs.map((t) => sanitizeTxForDB(t, validCategoryIds, validAssetIds, userId))
  const batchSize = 100
  for (let i = 0; i < sanitized.length; i += batchSize) {
    const chunk = sanitized.slice(i, i + batchSize)
    const { error } = await sb.from('transactions').insert(chunk)
    if (error) {
      console.error('Batch insert transactions failed at batch', i / batchSize, error)
      return { success: false, error, count: i }
    }
  }
  return { success: true, count: sanitized.length }
}

export async function supabaseUpdateTransaction(
  tx: Transaction,
  validCategoryIds?: Set<string>,
  validAssetIds?: Set<string>,
  userId?: string | null
): Promise<{ success: boolean; error?: any }> {
  const sb = getSupabase()
  if (!sb) return { success: false, error: new Error('Supabase client not initialized') }

  const payload = sanitizeTxForDB(tx, validCategoryIds, validAssetIds, userId)
  const { error } = await sb.from('transactions').update(payload).eq('id', tx.id)
  if (error) {
    console.error('Supabase auto update tx failed:', error)
    return { success: false, error }
  }
  return { success: true }
}

export async function supabaseDeleteTransaction(id: string): Promise<{ success: boolean; error?: any }> {
  const sb = getSupabase()
  if (!sb) return { success: false, error: new Error('Supabase client not initialized') }

  const { error } = await sb.from('transactions').delete().eq('id', id)
  if (error) {
    console.error('Supabase auto delete tx failed:', error)
    return { success: false, error }
  }
  return { success: true }
}

export async function supabaseUpsertAssets(assets: Asset[], userId?: string | null): Promise<{ success: boolean; error?: any }> {
  const sb = getSupabase()
  if (!sb || assets.length === 0) return { success: false, error: new Error('Empty assets or no client') }

  const sanitized = assets.map((a) => sanitizeAssetForDB(a, userId))
  const { error } = await sb.from('assets').upsert(sanitized)
  if (error) {
    console.error('Supabase auto upsert assets failed:', error)
    return { success: false, error }
  }
  return { success: true }
}

export async function supabaseUpsertCategories(categories: Category[], userId?: string | null): Promise<{ success: boolean; error?: any }> {
  const sb = getSupabase()
  if (!sb || categories.length === 0) return { success: false, error: new Error('Empty categories or no client') }

  const sanitized = categories.map((c) => sanitizeCategoryForDB(c, userId))
  const { error } = await sb.from('categories').upsert(sanitized)
  if (error) {
    console.error('Supabase auto upsert categories failed:', error)
    return { success: false, error }
  }
  return { success: true }
}

export async function supabaseDeleteCategory(id: string): Promise<{ success: boolean; error?: any }> {
  const sb = getSupabase()
  if (!sb) return { success: false, error: new Error('Supabase client not initialized') }

  const { error } = await sb.from('categories').delete().eq('id', id)
  if (error) {
    console.error('Supabase auto delete category failed:', error)
    return { success: false, error }
  }
  return { success: true }
}

export async function supabaseUpsertBudget(budget: Budget, userId?: string | null): Promise<{ success: boolean; error?: any }> {
  const sb = getSupabase()
  if (!sb) return { success: false, error: new Error('Supabase client not initialized') }

  const payload: any = {
    year_month: budget.year_month,
    amount: Number(budget.amount) || 0,
    ...(budget.user_id || userId ? { user_id: budget.user_id || userId } : {}),
  }
  const { error } = await sb.from('budgets').upsert([payload])
  if (error) {
    console.error('Supabase auto upsert budget failed:', error)
    return { success: false, error }
  }
  return { success: true }
}

export async function supabasePullAll(userId?: string | null) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    let catQ = sb.from('categories').select('*').order('sort_order', { ascending: true })
    let assetQ = sb.from('assets').select('*').order('sort_order', { ascending: true })
    let txQ = sb.from('transactions').select('*').order('date', { ascending: false })
    let budgetQ = sb.from('budgets').select('*')

    if (userId) {
      catQ = catQ.eq('user_id', userId)
      assetQ = assetQ.eq('user_id', userId)
      txQ = txQ.eq('user_id', userId)
      budgetQ = budgetQ.eq('user_id', userId)
    }

    const [catRes, assetRes, txRes, budgetRes] = await Promise.all([
      catQ,
      assetQ,
      txQ,
      budgetQ,
    ])

    if (catRes.error) console.warn('Supabase fetch categories notice:', catRes.error)
    if (assetRes.error) console.warn('Supabase fetch assets notice:', assetRes.error)
    if (txRes.error) console.warn('Supabase fetch transactions notice:', txRes.error)
    if (budgetRes.error) console.warn('Supabase fetch budgets notice:', budgetRes.error)

    return {
      categories: (catRes.data as Category[] | null) || [],
      assets: (assetRes.data as Asset[] | null) || [],
      transactions: (txRes.data as Transaction[] | null) || [],
      budgets: (budgetRes.data as Budget[] | null) || [],
    }
  } catch (err) {
    console.error('Error pulling from Supabase:', err)
    return null
  }
}
