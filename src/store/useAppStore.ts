import { create } from 'zustand'
import type {
  Category,
  Asset,
  Transaction,
  Budget,
  TabType,
  TransactionType,
} from '../types'
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_ASSETS,
} from '../lib/constants'
import { getCurrentYearMonth } from '../utils/dateUtils'
import { generateUUID } from '../utils/formatters'
import {
  exportToExcelFile,
  exportToUserCsv,
  type ParsedExcelResult,
} from '../utils/excelHandler'
import {
  getSupabase,
  supabasePullAll,
  supabaseInsertTransaction,
  supabaseUpdateTransaction,
  supabaseDeleteTransaction,
  supabaseUpsertAssets,
  supabaseUpsertCategories,
  supabaseDeleteCategory,
  supabaseUpsertBudget,
} from '../lib/supabase'

// 브라우저 로컬스토리지 잔여 가계부 캐시 완전 삭제 (Supabase 단일 소스 원칙)
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const dataKeys = [
      'pwa_categories', 'pwa_categories_v2', 'pwa_categories_v3', 'pwa_categories_v4', 'pwa_categories_v5',
      'pwa_assets', 'pwa_assets_v2', 'pwa_assets_v3', 'pwa_assets_v4', 'pwa_assets_v5',
      'pwa_transactions', 'pwa_transactions_v2', 'pwa_transactions_v3', 'pwa_transactions_v4', 'pwa_transactions_v5',
      'pwa_budgets', 'pwa_budgets_v2', 'pwa_budgets_v3', 'pwa_budgets_v4', 'pwa_budgets_v5',
    ]
    dataKeys.forEach((k) => window.localStorage.removeItem(k))
  }
} catch {
  // ignore
}

interface AppState {
  categories: Category[]
  assets: Asset[]
  transactions: Transaction[]
  budgets: Budget[]
  currentYearMonth: string
  activeTab: TabType
  isLoading: boolean
  isCloudConnected: boolean
  isInputModalOpen: boolean
  isExcelModalOpen: boolean
  isCsvModalOpen: boolean
  editingTransaction: Transaction | null

  // Tab & Modal Navigation
  setActiveTab: (tab: TabType) => void
  setCurrentYearMonth: (ym: string) => void
  openInputModal: (tx?: Transaction | null) => void
  closeInputModal: () => void
  openExcelModal: () => void
  closeExcelModal: () => void
  openCsvModal: () => void
  closeCsvModal: () => void

  // 100% Supabase Cloud CRUD Operations
  initCloudData: () => Promise<void>
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>
  updateTransaction: (tx: Transaction) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>

  // Categories
  addCategory: (cat: Omit<Category, 'id'>) => Promise<void>
  updateCategory: (cat: Category) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  reorderCategories: (cats: Category[]) => Promise<void>

  // Assets
  addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>
  updateAsset: (asset: Asset) => Promise<void>
  deleteAsset: (id: string) => Promise<void>

  // Budgets
  setBudget: (yearMonth: string, amount: number) => Promise<void>

  // Excel & CSV
  importParsedExcel: (result: ParsedExcelResult) => Promise<void>
  importParsedCsv: (result: ParsedExcelResult) => Promise<void>
  exportExcel: () => Blob
  exportCSV: () => string

  // JSON Backup & Reset
  exportDataJSON: () => string
  importDataJSON: (jsonStr: string) => Promise<boolean>
  resetToDefaults: () => Promise<void>
}

function adjustAssetBalance(
  assets: Asset[],
  type: TransactionType,
  amount: number,
  assetId: string,
  toAssetId?: string,
  isRevert = false
): Asset[] {
  const multiplier = isRevert ? -1 : 1

  return assets.map((asset) => {
    if (type === 'expense') {
      if (asset.id === assetId) {
        if (asset.type === 'card') {
          return { ...asset, balance: asset.balance + amount * multiplier }
        } else {
          return { ...asset, balance: asset.balance - amount * multiplier }
        }
      }
    } else if (type === 'income') {
      if (asset.id === assetId) {
        if (asset.type === 'card') {
          return { ...asset, balance: asset.balance - amount * multiplier }
        } else {
          return { ...asset, balance: asset.balance + amount * multiplier }
        }
      }
    } else if (type === 'transfer') {
      if (asset.id === assetId) {
        return { ...asset, balance: asset.balance - amount * multiplier }
      }
      if (asset.id === toAssetId) {
        return { ...asset, balance: asset.balance + amount * multiplier }
      }
    }
    return asset
  })
}

export const useAppStore = create<AppState>((set, get) => ({
  categories: [],
  assets: [],
  transactions: [],
  budgets: [],
  currentYearMonth: getCurrentYearMonth(),
  activeTab: 'daily',
  isLoading: true,
  isCloudConnected: false,
  isInputModalOpen: false,
  isExcelModalOpen: false,
  isCsvModalOpen: false,
  editingTransaction: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setCurrentYearMonth: (ym) => set({ currentYearMonth: ym }),

  openInputModal: (tx = null) => {
    set({ isInputModalOpen: true, editingTransaction: tx || null })
  },

  closeInputModal: () => {
    set({ isInputModalOpen: false, editingTransaction: null })
  },

  openExcelModal: () => set({ isExcelModalOpen: true, isCsvModalOpen: true }),
  closeExcelModal: () => set({ isExcelModalOpen: false, isCsvModalOpen: false }),
  openCsvModal: () => set({ isExcelModalOpen: true, isCsvModalOpen: true }),
  closeCsvModal: () => set({ isExcelModalOpen: false, isCsvModalOpen: false }),

  // 100% Supabase 전용 초기 로드 및 시딩
  initCloudData: async () => {
    set({ isLoading: true })
    const sb = getSupabase()
    if (!sb) {
      set({ isLoading: false })
      return
    }

    try {
      const data = await supabasePullAll()
      let categories = data?.categories || []
      let assets = data?.assets || []
      const transactions = data?.transactions || []
      const budgets = data?.budgets || []

      // 1. 카테고리가 Supabase에 없으면 25 기본 카테고리 즉시 시딩
      if (!categories || categories.length === 0) {
        const expenseCats: Category[] = DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
          ...c,
          id: generateUUID(),
        }))
        const incomeCats: Category[] = DEFAULT_INCOME_CATEGORIES.map((c) => ({
          ...c,
          id: generateUUID(),
        }))
        categories = [...expenseCats, ...incomeCats]
        await supabaseUpsertCategories(categories)
      }

      // 2. 자산이 Supabase에 없으면 기본 자산(카드/은행/현금 0원) 즉시 시딩
      if (!assets || assets.length === 0) {
        assets = DEFAULT_ASSETS.map((a) => ({
          ...a,
          id: generateUUID(),
          balance: 0,
        }))
        await supabaseUpsertAssets(assets)
      }

      set({
        categories,
        assets,
        transactions,
        budgets,
        isLoading: false,
        isCloudConnected: true,
      })
    } catch (err) {
      console.error('Supabase init failed:', err)
      set({ isLoading: false, isCloudConnected: false })
    }
  },

  // 1. 트랜잭션 추가: Supabase 직접 저장
  addTransaction: async (txData) => {
    const newTx: Transaction = {
      ...txData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }

    const nextTxList = [newTx, ...get().transactions]
    const nextAssets = adjustAssetBalance(
      get().assets,
      newTx.type,
      newTx.amount,
      newTx.asset_id,
      newTx.to_asset_id
    )

    set({ transactions: nextTxList, assets: nextAssets, isInputModalOpen: false, editingTransaction: null })

    await Promise.all([
      supabaseInsertTransaction(newTx),
      supabaseUpsertAssets(nextAssets),
    ])
  },

  // 2. 트랜잭션 수정: Supabase 직접 갱신
  updateTransaction: async (updatedTx) => {
    const oldTx = get().transactions.find((t) => t.id === updatedTx.id)
    let nextAssets = get().assets

    if (oldTx) {
      nextAssets = adjustAssetBalance(
        nextAssets,
        oldTx.type,
        oldTx.amount,
        oldTx.asset_id,
        oldTx.to_asset_id,
        true
      )
    }

    nextAssets = adjustAssetBalance(
      nextAssets,
      updatedTx.type,
      updatedTx.amount,
      updatedTx.asset_id,
      updatedTx.to_asset_id,
      false
    )

    const nextTxList = get().transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t))

    set({ transactions: nextTxList, assets: nextAssets, isInputModalOpen: false, editingTransaction: null })

    await Promise.all([
      supabaseUpdateTransaction(updatedTx),
      supabaseUpsertAssets(nextAssets),
    ])
  },

  // 3. 트랜잭션 삭제: Supabase 직접 삭제
  deleteTransaction: async (id) => {
    const oldTx = get().transactions.find((t) => t.id === id)
    if (!oldTx) return

    const nextAssets = adjustAssetBalance(
      get().assets,
      oldTx.type,
      oldTx.amount,
      oldTx.asset_id,
      oldTx.to_asset_id,
      true
    )

    const nextTxList = get().transactions.filter((t) => t.id !== id)

    set({ transactions: nextTxList, assets: nextAssets })

    await Promise.all([
      supabaseDeleteTransaction(id),
      supabaseUpsertAssets(nextAssets),
    ])
  },

  // 카테고리 관리: Supabase 직접 반영
  addCategory: async (cat) => {
    const newCat: Category = {
      ...cat,
      id: generateUUID(),
    }
    const nextCats = [...get().categories, newCat]
    set({ categories: nextCats })
    await supabaseUpsertCategories(nextCats)
  },

  updateCategory: async (cat) => {
    const nextCats = get().categories.map((c) => (c.id === cat.id ? cat : c))
    set({ categories: nextCats })
    await supabaseUpsertCategories(nextCats)
  },

  deleteCategory: async (id) => {
    const nextCats = get().categories.filter((c) => c.id !== id)
    set({ categories: nextCats })
    await supabaseDeleteCategory(id)
  },

  reorderCategories: async (cats) => {
    const ordered = cats.map((c, idx) => ({ ...c, sort_order: idx + 1 }))
    set({ categories: ordered })
    await supabaseUpsertCategories(ordered)
  },

  // 자산 관리: Supabase 직접 반영
  addAsset: async (asset) => {
    const newAsset: Asset = {
      ...asset,
      id: generateUUID(),
    }
    const nextAssets = [...get().assets, newAsset]
    set({ assets: nextAssets })
    await supabaseUpsertAssets(nextAssets)
  },

  updateAsset: async (asset) => {
    const nextAssets = get().assets.map((a) => (a.id === asset.id ? asset : a))
    set({ assets: nextAssets })
    await supabaseUpsertAssets(nextAssets)
  },

  deleteAsset: async (id) => {
    const sb = getSupabase()
    const nextAssets = get().assets.filter((a) => a.id !== id)
    set({ assets: nextAssets })
    if (sb) {
      await sb.from('assets').delete().eq('id', id)
    }
  },

  // 예산 관리: Supabase 직접 반영
  setBudget: async (yearMonth, amount) => {
    const existingIndex = get().budgets.findIndex((b) => b.year_month === yearMonth)
    let nextBudgets: Budget[]
    if (existingIndex >= 0) {
      nextBudgets = get().budgets.map((b) =>
        b.year_month === yearMonth ? { ...b, amount } : b
      )
    } else {
      nextBudgets = [...get().budgets, { year_month: yearMonth, amount }]
    }
    set({ budgets: nextBudgets })
    await supabaseUpsertBudget({ year_month: yearMonth, amount })
  },

  // 엑셀 / CSV 가져오기: 파싱 후 Supabase로 직접 일괄 전송
  importParsedExcel: async (result: ParsedExcelResult) => {
    let currentCategories = [...get().categories]
    let currentAssets = [...get().assets]
    const currentTransactions = [...get().transactions]

    const categoryMapping = new Map<string, string>()
    if (result.newCategories.length > 0) {
      result.newCategories.forEach((nc) => {
        const newId = generateUUID()
        currentCategories.push({ ...nc, id: newId })
        categoryMapping.set(nc.name, newId)
      })
      await supabaseUpsertCategories(currentCategories)
    }

    const newTxs: Transaction[] = []
    result.transactions.forEach((t) => {
      const exists = currentTransactions.some(
        (cur) => cur.date === t.date && cur.amount === t.amount && cur.memo === t.memo
      )
      if (!exists) {
        let catId = t.category_id
        if (catId && categoryMapping.has(catId)) {
          catId = categoryMapping.get(catId)!
        }

        const newTx: Transaction = {
          ...t,
          category_id: catId,
          id: generateUUID(),
          created_at: new Date().toISOString(),
        }
        newTxs.push(newTx)

        currentAssets = adjustAssetBalance(
          currentAssets,
          newTx.type,
          newTx.amount,
          newTx.asset_id,
          newTx.to_asset_id
        )
      }
    })

    const combinedTxs = [...newTxs, ...currentTransactions]
    set({
      categories: currentCategories,
      assets: currentAssets,
      transactions: combinedTxs,
      isExcelModalOpen: false,
      isCsvModalOpen: false,
    })

    // Supabase에 직접 일괄 저장 (100개 단위 배치)
    const sb = getSupabase()
    if (sb && newTxs.length > 0) {
      const batchSize = 100
      for (let i = 0; i < newTxs.length; i += batchSize) {
        const chunk = newTxs.slice(i, i + batchSize)
        await sb.from('transactions').insert(chunk)
      }
      await supabaseUpsertAssets(currentAssets)
    }
  },

  importParsedCsv: async (result: ParsedExcelResult) => {
    return get().importParsedExcel(result)
  },

  exportExcel: () => {
    return exportToExcelFile(get().transactions, get().categories, get().assets)
  },

  exportCSV: () => {
    return exportToUserCsv(get().transactions, get().categories, get().assets)
  },

  exportDataJSON: () => {
    const state = get()
    const exportObj = {
      categories: state.categories,
      assets: state.assets,
      transactions: state.transactions,
      budgets: state.budgets,
      version: '2.0',
      exported_at: new Date().toISOString(),
    }
    return JSON.stringify(exportObj, null, 2)
  },

  importDataJSON: async (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr)
      const sb = getSupabase()
      if (data.categories && Array.isArray(data.categories)) {
        if (sb) await supabaseUpsertCategories(data.categories)
        set({ categories: data.categories })
      }
      if (data.assets && Array.isArray(data.assets)) {
        if (sb) await supabaseUpsertAssets(data.assets)
        set({ assets: data.assets })
      }
      if (data.transactions && Array.isArray(data.transactions)) {
        if (sb && data.transactions.length > 0) {
          await sb.from('transactions').upsert(data.transactions)
        }
        set({ transactions: data.transactions })
      }
      if (data.budgets && Array.isArray(data.budgets)) {
        if (sb) {
          for (const b of data.budgets) {
            await supabaseUpsertBudget(b)
          }
        }
        set({ budgets: data.budgets })
      }
      return true
    } catch (e) {
      console.error('Import failed:', e)
      return false
    }
  },

  // Supabase 내역 완전 삭제 및 0원 리셋
  resetToDefaults: async () => {
    const sb = getSupabase()
    if (sb) {
      await sb.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await sb.from('assets').update({ balance: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')
    }

    const cleanAssets = get().assets.map((a) => ({ ...a, balance: 0 }))
    set({
      transactions: [],
      assets: cleanAssets,
      currentYearMonth: getCurrentYearMonth(),
    })
  },
}))
