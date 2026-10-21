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
import { exportToUserCsv, type ParsedCsvResult } from '../utils/csvHandler'
import {
  supabasePullAll,
  supabaseInsertTransaction,
  supabaseUpdateTransaction,
  supabaseDeleteTransaction,
  supabaseUpsertAssets,
  supabaseUpsertCategories,
  supabaseDeleteCategory,
  supabaseUpsertBudget,
} from '../lib/supabase'

interface AppState {
  categories: Category[]
  assets: Asset[]
  transactions: Transaction[]
  budgets: Budget[]
  currentYearMonth: string
  activeTab: TabType
  isInputModalOpen: boolean
  isCsvModalOpen: boolean
  isCloudConnected: boolean
  editingTransaction: Transaction | null

  // Tab & Modal Navigation
  setActiveTab: (tab: TabType) => void
  setCurrentYearMonth: (ym: string) => void
  openInputModal: (tx?: Transaction | null) => void
  closeInputModal: () => void
  openCsvModal: () => void
  closeCsvModal: () => void

  // Transactions (Direct Cloud Sync)
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

  // Auto Cloud Sync & Local Fallback
  syncFromCloud: () => Promise<boolean>
  exportDataJSON: () => string
  importDataJSON: (jsonStr: string) => boolean
  resetToDefaults: () => void
}

const STORAGE_KEYS = {
  CATEGORIES: 'pwa_categories_v5',
  ASSETS: 'pwa_assets_v5',
  TRANSACTIONS: 'pwa_transactions_v5',
  BUDGETS: 'pwa_budgets_v5',
}

function loadInitialData() {
  let categories: Category[] = []
  let assets: Asset[] = []
  let transactions: Transaction[] = []
  let budgets: Budget[] = []

  // 1. Categories (25 기본 카테고리)
  const savedCat = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
  if (savedCat) {
    try {
      categories = JSON.parse(savedCat)
    } catch {
      // fallback
    }
  }
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
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories))
  }

  // 2. Assets (신용카드, 은행, 현금 0원 시작)
  const savedAssets = localStorage.getItem(STORAGE_KEYS.ASSETS)
  if (savedAssets) {
    try {
      assets = JSON.parse(savedAssets)
    } catch {
      // fallback
    }
  }
  if (!assets || assets.length === 0) {
    assets = DEFAULT_ASSETS.map((a) => ({
      ...a,
      id: generateUUID(),
      balance: 0,
    }))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets))
  }

  // 3. Transactions (샘플 없이 깨끗한 빈 상태로 시작)
  const savedTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
  if (savedTx) {
    try {
      transactions = JSON.parse(savedTx)
    } catch {
      // fallback
    }
  } else {
    transactions = []
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]))
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
    budgets = [{ year_month: getCurrentYearMonth(), amount: 1500000 }]
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
  currentYearMonth: getCurrentYearMonth(), // 항상 이번달 10월로 시작
  activeTab: 'daily',
  isInputModalOpen: false,
  isCsvModalOpen: false,
  isCloudConnected: true,
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

  // 1. 트랜잭션 추가: 즉시 Supabase 클라우드로 자동 전송
  addTransaction: (txData) => {
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

    // 로컬 즉시 반영
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTxList))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))

    set({ transactions: nextTxList, assets: nextAssets, isInputModalOpen: false, editingTransaction: null })

    // Supabase 자동 직접 저장
    supabaseInsertTransaction(newTx)
    supabaseUpsertAssets(nextAssets)
  },

  // 2. 트랜잭션 수정: 즉시 Supabase 클라우드로 자동 반영
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

    supabaseUpdateTransaction(updatedTx)
    supabaseUpsertAssets(nextAssets)
  },

  // 3. 트랜잭션 삭제: 즉시 Supabase 클라우드에서 삭제
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

    supabaseDeleteTransaction(id)
    supabaseUpsertAssets(nextAssets)
  },

  // 카테고리 관리
  addCategory: (cat) => {
    const newCat: Category = {
      ...cat,
      id: generateUUID(),
    }
    const nextCats = [...get().categories, newCat]
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(nextCats))
    set({ categories: nextCats })
    supabaseUpsertCategories(nextCats)
  },

  updateCategory: (cat) => {
    const nextCats = get().categories.map((c) => (c.id === cat.id ? cat : c))
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(nextCats))
    set({ categories: nextCats })
    supabaseUpsertCategories(nextCats)
  },

  deleteCategory: (id) => {
    const nextCats = get().categories.filter((c) => c.id !== id)
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(nextCats))
    set({ categories: nextCats })
    supabaseDeleteCategory(id)
  },

  reorderCategories: (cats) => {
    const ordered = cats.map((c, idx) => ({ ...c, sort_order: idx + 1 }))
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(ordered))
    set({ categories: ordered })
    supabaseUpsertCategories(ordered)
  },

  // 자산 관리
  addAsset: (asset) => {
    const newAsset: Asset = {
      ...asset,
      id: generateUUID(),
    }
    const nextAssets = [...get().assets, newAsset]
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))
    set({ assets: nextAssets })
    supabaseUpsertAssets(nextAssets)
  },

  updateAsset: (asset) => {
    const nextAssets = get().assets.map((a) => (a.id === asset.id ? asset : a))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))
    set({ assets: nextAssets })
    supabaseUpsertAssets(nextAssets)
  },

  deleteAsset: (id) => {
    const nextAssets = get().assets.filter((a) => a.id !== id)
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(nextAssets))
    set({ assets: nextAssets })
    supabaseUpsertAssets(nextAssets)
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
    supabaseUpsertBudget({ year_month: yearMonth, amount })
  },

  importParsedCsv: (result: ParsedCsvResult) => {
    let currentCategories = [...get().categories]
    let currentAssets = [...get().assets]
    let currentTransactions = [...get().transactions]

    const categoryMapping = new Map<string, string>()
    if (result.newCategories.length > 0) {
      result.newCategories.forEach((nc) => {
        const newId = generateUUID()
        currentCategories.push({ ...nc, id: newId })
        categoryMapping.set(nc.name, newId)
      })
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(currentCategories))
      supabaseUpsertCategories(currentCategories)
    }

    const newTxs: Transaction[] = []
    result.transactions.forEach((t) => {
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
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(combinedTxs))
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(currentAssets))

    set({
      categories: currentCategories,
      assets: currentAssets,
      transactions: combinedTxs,
      isCsvModalOpen: false,
    })

    // Supabase에 대량 자동 저장
    newTxs.forEach((tx) => supabaseInsertTransaction(tx))
    supabaseUpsertAssets(currentAssets)
  },

  exportCSV: () => {
    return exportToUserCsv(get().transactions, get().categories, get().assets)
  },

  // 앱 실행 시 Supabase에서 최신 데이터를 자동으로 가져오기
  syncFromCloud: async () => {
    const data = await supabasePullAll()
    if (!data) return false

    const updates: Partial<AppState> = { isCloudConnected: true }

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
