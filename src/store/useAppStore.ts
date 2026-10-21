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
  USER_INITIAL_CSV,
} from '../lib/constants'
import { getCurrentYearMonth } from '../utils/dateUtils'
import { parseUserCsvText, exportToUserCsv, type ParsedCsvResult } from '../utils/csvHandler'
import { syncPullFromSupabase, syncPushToSupabase } from '../lib/supabase'

interface AppState {
  categories: Category[]
  assets: Asset[]
  transactions: Transaction[]
  budgets: Budget[]
  currentYearMonth: string
  activeTab: TabType
  isInputModalOpen: boolean
  isCsvModalOpen: boolean
  editingTransaction: Transaction | null

  // Tab & Modal Navigation
  setActiveTab: (tab: TabType) => void
  setCurrentYearMonth: (ym: string) => void
  openInputModal: (tx?: Transaction | null) => void
  closeInputModal: () => void
  openCsvModal: () => void
  closeCsvModal: () => void

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => void
  updateTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void

  // Categories
  addCategory: (cat: Omit<Category, 'id'>) => void
  updateCategory: (cat: Category) => void
  deleteCategory: (id: string) => void
  reorderCategories: (cats: Category[]) => void

  // Assets
  addAsset: (asset: Omit<Asset, 'id'>) => void
  updateAsset: (asset: Asset) => void
  deleteAsset: (id: string) => void

  // Budgets
  setBudget: (yearMonth: string, amount: number) => void

  // CSV Import / Export
  importParsedCsv: (result: ParsedCsvResult) => void
  exportCSV: () => string

  // Sync & Storage
  syncFromCloud: () => Promise<boolean>
  exportDataJSON: () => string
  importDataJSON: (jsonStr: string) => boolean
  resetToDefaults: () => void
}

const STORAGE_KEYS = {
  CATEGORIES: 'pwa_categories_v2',
  ASSETS: 'pwa_assets_v2',
  TRANSACTIONS: 'pwa_transactions_v2',
  BUDGETS: 'pwa_budgets_v2',
}

function loadInitialData() {
  let categories: Category[] = []
  let assets: Asset[] = []
  let transactions: Transaction[] = []
  let budgets: Budget[] = []

  // 1. Categories
  const savedCat = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
  if (savedCat) {
    try {
      categories = JSON.parse(savedCat)
    } catch {
      // fallback
    }
  }
  if (!categories || categories.length === 0) {
    const expenseCats: Category[] = DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
      ...c,
      id: `cat-exp-${i + 1}`,
    }))
    const incomeCats: Category[] = DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
      ...c,
      id: `cat-inc-${i + 1}`,
    }))
    categories = [...expenseCats, ...incomeCats]
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories))
  }

  // 2. Assets
  const savedAssets = localStorage.getItem(STORAGE_KEYS.ASSETS)
  if (savedAssets) {
    try {
      assets = JSON.parse(savedAssets)
    } catch {
      // fallback
    }
  }
  if (!assets || assets.length === 0) {
    assets = DEFAULT_ASSETS.map((a, i) => ({
      ...a,
      id: `asset-${i + 1}`,
    }))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets))
  }

  // 3. Transactions (Seed with user's actual 2026-09 CSV dataset!)
  const savedTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
  if (savedTx) {
    try {
      transactions = JSON.parse(savedTx)
    } catch {
      // fallback
    }
  }
  if (!transactions || transactions.length === 0) {
    try {
      const parsed = parseUserCsvText(USER_INITIAL_CSV, categories, assets)
      transactions = parsed.transactions.map((t, idx) => ({
        ...t,
        id: `tx-user-init-${idx + 1}`,
        created_at: new Date().toISOString(),
      }))

      // 자산 잔액 업데이트
      // 10월 최근 내역도 함께 시딩하여 이번 달(10월) 진입 시 바로 표시
      const currentYM = getCurrentYearMonth()
      const octTxs: Transaction[] = [
        {
          id: 'tx-oct-1',
          date: `${currentYM}-21`,
          amount: 8500,
          type: 'expense',
          category_id: categories.find((c) => c.name === '식비')?.id || categories[0]?.id,
          asset_id: assets[0]?.id,
          memo: '점심 제육덮밥',
          created_at: new Date().toISOString(),
        },
        {
          id: 'tx-oct-2',
          date: `${currentYM}-21`,
          amount: 2500,
          type: 'expense',
          category_id: categories.find((c) => c.name === '카페/커피')?.id || categories[1]?.id,
          asset_id: assets[0]?.id,
          memo: '아이스 아메리카노',
          created_at: new Date().toISOString(),
        },
        {
          id: 'tx-oct-3',
          date: `${currentYM}-20`,
          amount: 7600,
          type: 'expense',
          category_id: categories.find((c) => c.name === '집술')?.id || categories[3]?.id,
          asset_id: assets[0]?.id,
          memo: '생마차 4캔',
          created_at: new Date().toISOString(),
        },
        {
          id: 'tx-oct-4',
          date: `${currentYM}-15`,
          amount: 14200,
          type: 'expense',
          category_id: categories.find((c) => c.name === '마트/편의점')?.id || categories[2]?.id,
          asset_id: assets[0]?.id,
          memo: '물, 제로콜라, 닭가슴살',
          created_at: new Date().toISOString(),
        },
        {
          id: 'tx-oct-5',
          date: `${currentYM}-10`,
          amount: 3200000,
          type: 'income',
          category_id: categories.find((c) => c.name === '급여')?.id || categories[25]?.id,
          asset_id: assets.find((a) => a.type === 'bank')?.id || assets[1]?.id,
          memo: '10월 급여',
          created_at: new Date().toISOString(),
        },
      ]

      transactions = [...octTxs, ...transactions]

      transactions.forEach((tx) => {
        assets = adjustAssetBalance(assets, tx.type, tx.amount, tx.asset_id, tx.to_asset_id)
      })

      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions))
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets))
    } catch (e) {
      console.error('Failed to parse initial user CSV seed:', e)
    }
  }

  // 4. Budgets
  const savedBudgets = localStorage.getItem(STORAGE_KEYS.BUDGETS)
  if (savedBudgets) {
    try {
      budgets = JSON.parse(savedBudgets)
    } catch {
      // fallback
    }
  }
  if (!budgets || budgets.length === 0) {
    budgets = [
      { year_month: '2026-09', amount: 1500000 },
      { year_month: getCurrentYearMonth(), amount: 1500000 },
    ]
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets))
  }

  return { categories, assets, transactions, budgets }
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

const initialData = loadInitialData()

export const useAppStore = create<AppState>((set, get) => ({
  categories: initialData.categories,
  assets: initialData.assets,
  transactions: initialData.transactions,
  budgets: initialData.budgets,
  currentYearMonth: getCurrentYearMonth(), // 이번 달 (10월) 자동 시작
  activeTab: 'daily',
  isInputModalOpen: false,
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

  openCsvModal: () => set({ isCsvModalOpen: true }),
  closeCsvModal: () => set({ isCsvModalOpen: false }),

  addTransaction: (txData) => {
    const newTx: Transaction = {
      ...txData,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
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

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTxList))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))

    set({ transactions: nextTxList, assets: nextAssets, isInputModalOpen: false, editingTransaction: null })

    syncPushToSupabase({ transactions: [newTx], assets: nextAssets })
  },

  updateTransaction: (updatedTx) => {
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

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTxList))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))

    set({ transactions: nextTxList, assets: nextAssets, isInputModalOpen: false, editingTransaction: null })

    syncPushToSupabase({ transactions: [updatedTx], assets: nextAssets })
  },

  deleteTransaction: (id) => {
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

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTxList))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))

    set({ transactions: nextTxList, assets: nextAssets })
  },

  addCategory: (cat) => {
    const newCat: Category = {
      ...cat,
      id: 'cat-' + Date.now(),
    }
    const nextCats = [...get().categories, newCat]
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(nextCats))
    set({ categories: nextCats })
    syncPushToSupabase({ categories: nextCats })
  },

  updateCategory: (cat) => {
    const nextCats = get().categories.map((c) => (c.id === cat.id ? cat : c))
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(nextCats))
    set({ categories: nextCats })
    syncPushToSupabase({ categories: nextCats })
  },

  deleteCategory: (id) => {
    const nextCats = get().categories.filter((c) => c.id !== id)
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(nextCats))
    set({ categories: nextCats })
  },

  reorderCategories: (cats) => {
    const ordered = cats.map((c, idx) => ({ ...c, sort_order: idx + 1 }))
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(ordered))
    set({ categories: ordered })
    syncPushToSupabase({ categories: ordered })
  },

  addAsset: (asset) => {
    const newAsset: Asset = {
      ...asset,
      id: 'asset-' + Date.now(),
    }
    const nextAssets = [...get().assets, newAsset]
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))
    set({ assets: nextAssets })
    syncPushToSupabase({ assets: nextAssets })
  },

  updateAsset: (asset) => {
    const nextAssets = get().assets.map((a) => (a.id === asset.id ? asset : a))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))
    set({ assets: nextAssets })
    syncPushToSupabase({ assets: nextAssets })
  },

  deleteAsset: (id) => {
    const nextAssets = get().assets.filter((a) => a.id !== id)
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))
    set({ assets: nextAssets })
  },

  setBudget: (yearMonth, amount) => {
    const existingIndex = get().budgets.findIndex((b) => b.year_month === yearMonth)
    let nextBudgets: Budget[]
    if (existingIndex >= 0) {
      nextBudgets = get().budgets.map((b) =>
        b.year_month === yearMonth ? { ...b, amount } : b
      )
    } else {
      nextBudgets = [...get().budgets, { year_month: yearMonth, amount }]
    }
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(nextBudgets))
    set({ budgets: nextBudgets })
    syncPushToSupabase({ budgets: nextBudgets })
  },

  importParsedCsv: (result: ParsedCsvResult) => {
    let currentCategories = [...get().categories]
    let currentAssets = [...get().assets]
    let currentTransactions = [...get().transactions]

    // 1. 새 카테고리 추가
    const categoryMapping = new Map<string, string>()
    if (result.newCategories.length > 0) {
      result.newCategories.forEach((nc) => {
        const newId = 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)
        currentCategories.push({ ...nc, id: newId })
        categoryMapping.set(nc.name, newId)
      })
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(currentCategories))
    }

    // 2. 트랜잭션 추가 및 중복 건너뛰기
    const newTxs: Transaction[] = []
    result.transactions.forEach((t) => {
      // 이미 완전히 동일한 날짜, 금액, 메모가 있는지 검사
      const exists = currentTransactions.some(
        (cur) => cur.date === t.date && cur.amount === t.amount && cur.memo === t.memo
      )
      if (!exists) {
        let catId = t.category_id
        if (catId && categoryMapping.has(catId)) {
          catId = categoryMapping.get(catId)
        }

        const newTx: Transaction = {
          ...t,
          category_id: catId,
          id: 'tx-csv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
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
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(combinedTxs))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(currentAssets))

    set({
      categories: currentCategories,
      assets: currentAssets,
      transactions: combinedTxs,
      isCsvModalOpen: false,
    })

    syncPushToSupabase({
      categories: currentCategories,
      assets: currentAssets,
      transactions: newTxs,
    })
  },

  exportCSV: () => {
    return exportToUserCsv(get().transactions, get().categories, get().assets)
  },

  syncFromCloud: async () => {
    const data = await syncPullFromSupabase()
    if (!data) return false

    const updates: Partial<AppState> = {}
    if (data.categories && data.categories.length > 0) {
      updates.categories = data.categories
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories))
    }
    if (data.assets && data.assets.length > 0) {
      updates.assets = data.assets
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(data.assets))
    }
    if (data.transactions && data.transactions.length > 0) {
      updates.transactions = data.transactions
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions))
    }
    if (data.budgets && data.budgets.length > 0) {
      updates.budgets = data.budgets
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(data.budgets))
    }

    set(updates)
    return true
  },

  exportDataJSON: () => {
    const state = get()
    const exportObj = {
      categories: state.categories,
      assets: state.assets,
      transactions: state.transactions,
      budgets: state.budgets,
      version: '1.0',
      exported_at: new Date().toISOString(),
    }
    return JSON.stringify(exportObj, null, 2)
  },

  importDataJSON: (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)
      if (Array.isArray(data.categories)) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories))
        set({ categories: data.categories })
      }
      if (Array.isArray(data.assets)) {
        localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(data.assets))
        set({ assets: data.assets })
      }
      if (Array.isArray(data.transactions)) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions))
        set({ transactions: data.transactions })
      }
      if (Array.isArray(data.budgets)) {
        localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(data.budgets))
        set({ budgets: data.budgets })
      }
      return true
    } catch (e) {
      console.error('Import failed:', e)
      return false
    }
  },

  resetToDefaults: () => {
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES)
    localStorage.removeItem(STORAGE_KEYS.ASSETS)
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS)
    localStorage.removeItem(STORAGE_KEYS.BUDGETS)
    const fresh = loadInitialData()
    set({
      categories: fresh.categories,
      assets: fresh.assets,
      transactions: fresh.transactions,
      budgets: fresh.budgets,
      currentYearMonth: getCurrentYearMonth(),
    })
  },
}))
