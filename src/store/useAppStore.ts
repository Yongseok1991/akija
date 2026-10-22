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
import { getCurrentYearMonth, getKoreanNowString } from '../utils/dateUtils'
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
  supabaseInsertTransactionsBatch,
  supabaseUpdateTransaction,
  supabaseDeleteTransaction,
  supabaseUpsertAssets,
  supabaseUpsertCategories,
  supabaseDeleteCategory,
  supabaseUpsertBudget,
  formatSupabaseError,
} from '../lib/supabase'
import { authenticateWithBiometrics } from '../utils/webAuthn'

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
  user: { username: string; id?: string; email?: string } | null
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  unlockWithBiometrics: () => Promise<{ success: boolean; error?: string }>
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  searchQuery: string
  filterType: 'all' | 'expense' | 'income'
  isSearchOpen: boolean

  // Tab & Modal Navigation
  setActiveTab: (tab: TabType) => void
  setCurrentYearMonth: (ym: string) => void
  openInputModal: (tx?: Transaction | null) => void
  closeInputModal: () => void
  openExcelModal: () => void
  closeExcelModal: () => void
  openCsvModal: () => void
  closeCsvModal: () => void
  setSearchQuery: (query: string) => void
  setFilterType: (filter: 'all' | 'expense' | 'income') => void
  setIsSearchOpen: (open: boolean) => void

  // 100% Supabase Cloud CRUD Operations
  initCloudData: () => Promise<void>
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'> & { created_at?: string }) => Promise<void>
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
          return asset // 신용/체크카드는 누적 잔액을 기록하지 않음
        } else {
          return { ...asset, balance: asset.balance - amount * multiplier }
        }
      }
    } else if (type === 'income') {
      if (asset.id === assetId) {
        if (asset.type === 'card') {
          return asset
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
  searchQuery: '',
  filterType: 'all',
  isSearchOpen: false,
  user: null,

  signIn: async (usernameOrEmail, password) => {
    set({ isLoading: true })
    const sb = getSupabase()
    if (!sb) {
      set({ isLoading: false })
      return { success: false, error: '클라우드에 연결할 수 없습니다.' }
    }

    if (!password || !password.trim()) {
      set({ isLoading: false })
      return { success: false, error: '비밀번호를 입력해 주세요.' }
    }

    const email = usernameOrEmail.includes('@') ? usernameOrEmail.trim() : 'dobest0998@gmail.com'

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password: password.trim(),
    })

    if (error || !data.user) {
      set({ isLoading: false })
      return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' }
    }

    const userData = {
      username: 'yongseok',
      id: data.user.id,
      email: data.user.email,
    }
    set({ user: userData })
    await get().initCloudData()
    return { success: true }
  },

  unlockWithBiometrics: async () => {
    set({ isLoading: true })
    const bioRes = await authenticateWithBiometrics()
    if (!bioRes.success) {
      set({ isLoading: false })
      return { success: false, error: bioRes.error }
    }

    const sb = getSupabase()
    if (sb) {
      const { data: { session } } = await sb.auth.getSession()
      if (session?.user) {
        set({ user: { username: 'yongseok', id: session.user.id, email: session.user.email } })
        await get().initCloudData()
        return { success: true }
      }
    }
    set({ isLoading: false })
    return { success: false, error: '비밀번호로 먼저 1회 로그인해 주세요.' }
  },

  changePassword: async (_oldPassword, newPassword) => {
    const sb = getSupabase()
    if (!sb) return { success: false, error: '클라우드에 연결할 수 없습니다.' }
    const { error } = await sb.auth.updateUser({ password: newPassword })
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  },

  signOut: async () => {
    const sb = getSupabase()
    if (sb) {
      await sb.auth.signOut()
    }
    set({
      user: null,
      categories: [],
      assets: [],
      transactions: [],
      budgets: [],
      isCloudConnected: false,
    })
  },

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
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterType: (filter) => set({ filterType: filter }),
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),

  // 100% Supabase 전용 초기 로드 및 소유자 세션 복원
  initCloudData: async () => {
    set({ isLoading: true })
    const sb = getSupabase()
    if (!sb) {
      set({ isLoading: false, user: null, isCloudConnected: false })
      return
    }

    try {
      // 1. Supabase 공식 인증 세션 확인 (이 기기 브라우저에 저장된 세션 복원)
      const { data: { session } } = await sb.auth.getSession()

      if (session?.user) {
        const userData = {
          username: 'yongseok',
          id: session.user.id,
          email: session.user.email,
        }
        set({ user: userData })
      } else {
        set({
          categories: [],
          assets: [],
          transactions: [],
          budgets: [],
          isLoading: false,
          isCloudConnected: false,
          user: null,
        })
        return
      }

      // 2. 가계부 데이터 안전하게 로드
      const data = await supabasePullAll(session.user.id)
      let categories = data?.categories || []
      let assets = data?.assets || []
      const transactions = data?.transactions || []
      const budgets = data?.budgets || []

      // 카테고리가 없으면 기본 카테고리 시딩
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
        await supabaseUpsertCategories(categories, session.user.id)
      }

      // 자산이 없으면 기본 자산 시딩
      if (!assets || assets.length === 0) {
        assets = DEFAULT_ASSETS.map((a) => ({
          ...a,
          id: generateUUID(),
          balance: 0,
        }))
        await supabaseUpsertAssets(assets, session.user.id)
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
      created_at: txData.created_at || getKoreanNowString(),
    }

    const nextAssets = adjustAssetBalance(
      get().assets,
      newTx.type,
      newTx.amount,
      newTx.asset_id,
      newTx.to_asset_id
    )

    const validCatIds = new Set(get().categories.map((c) => c.id))
    const validAssetIds = new Set(get().assets.map((a) => a.id))
    const userId = get().user?.id || null

    // Supabase에 먼저 반영
    const [txRes, assetRes] = await Promise.all([
      supabaseInsertTransaction(newTx, validCatIds, validAssetIds, userId),
      supabaseUpsertAssets(nextAssets, userId),
    ])

    if (!txRes.success) {
      alert(`클라우드 저장 실패: ${formatSupabaseError(txRes.error)}`)
      return
    }
    if (!assetRes.success) {
      console.warn('자산 잔액 클라우드 동기화 실패:', assetRes.error)
    }

    const nextTxList = [newTx, ...get().transactions]
    set({
      transactions: nextTxList,
      assets: nextAssets,
      isInputModalOpen: false,
      editingTransaction: null,
    })
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

    const validCatIds = new Set(get().categories.map((c) => c.id))
    const validAssetIds = new Set(get().assets.map((a) => a.id))
    const userId = get().user?.id || null

    const [txRes, assetRes] = await Promise.all([
      supabaseUpdateTransaction(updatedTx, validCatIds, validAssetIds, userId),
      supabaseUpsertAssets(nextAssets, userId),
    ])

    if (!txRes.success) {
      alert(`클라우드 수정 실패: ${formatSupabaseError(txRes.error)}`)
      return
    }
    if (!assetRes.success) {
      console.warn('자산 잔액 클라우드 동기화 실패:', assetRes.error)
    }

    const nextTxList = get().transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    set({
      transactions: nextTxList,
      assets: nextAssets,
      isInputModalOpen: false,
      editingTransaction: null,
    })
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

    const [delRes, assetRes] = await Promise.all([
      supabaseDeleteTransaction(id),
      supabaseUpsertAssets(nextAssets),
    ])

    if (!delRes.success) {
      alert(`클라우드 삭제 실패: ${formatSupabaseError(delRes.error)}`)
      return
    }
    if (!assetRes.success) {
      console.warn('자산 잔액 클라우드 동기화 실패:', assetRes.error)
    }

    const nextTxList = get().transactions.filter((t) => t.id !== id)
    set({ transactions: nextTxList, assets: nextAssets })
  },

  // 카테고리 관리: Supabase 직접 반영
  addCategory: async (cat) => {
    const userId = get().user?.id || null
    const newCat: Category = {
      ...cat,
      id: generateUUID(),
      user_id: userId,
    }
    const nextCats = [...get().categories, newCat]
    const res = await supabaseUpsertCategories(nextCats, userId)
    if (!res.success) {
      alert(`카테고리 저장 실패: ${formatSupabaseError(res.error)}`)
      return
    }
    set({ categories: nextCats })
  },

  updateCategory: async (cat) => {
    const userId = get().user?.id || null
    const nextCats = get().categories.map((c) => (c.id === cat.id ? { ...cat, user_id: userId } : c))
    const res = await supabaseUpsertCategories(nextCats, userId)
    if (!res.success) {
      alert(`카테고리 수정 실패: ${formatSupabaseError(res.error)}`)
      return
    }
    set({ categories: nextCats })
  },

  deleteCategory: async (id) => {
    const res = await supabaseDeleteCategory(id)
    if (!res.success) {
      alert(`카테고리 삭제 실패: ${formatSupabaseError(res.error)}`)
      return
    }
    const nextCats = get().categories.filter((c) => c.id !== id)
    set({ categories: nextCats })
  },

  reorderCategories: async (cats) => {
    const userId = get().user?.id || null
    const ordered = cats.map((c, idx) => ({ ...c, sort_order: idx + 1, user_id: userId }))
    await supabaseUpsertCategories(ordered, userId)
    set({ categories: ordered })
  },

  // 자산 관리: Supabase 직접 반영
  addAsset: async (asset) => {
    const userId = get().user?.id || null
    const newAsset: Asset = {
      ...asset,
      id: generateUUID(),
      user_id: userId,
    }
    const nextAssets = [...get().assets, newAsset]
    const res = await supabaseUpsertAssets(nextAssets, userId)
    if (!res.success) {
      alert(`자산 저장 실패: ${formatSupabaseError(res.error)}`)
      return
    }
    set({ assets: nextAssets })
  },

  updateAsset: async (asset) => {
    const userId = get().user?.id || null
    const nextAssets = get().assets.map((a) => (a.id === asset.id ? { ...asset, user_id: userId } : a))
    const res = await supabaseUpsertAssets(nextAssets, userId)
    if (!res.success) {
      alert(`자산 수정 실패: ${formatSupabaseError(res.error)}`)
      return
    }
    set({ assets: nextAssets })
  },

  deleteAsset: async (id) => {
    const sb = getSupabase()
    if (sb) {
      const { error } = await sb.from('assets').delete().eq('id', id)
      if (error) {
        alert(`자산 삭제 실패: ${formatSupabaseError(error)}`)
        return
      }
    }
    const nextAssets = get().assets.filter((a) => a.id !== id)
    set({ assets: nextAssets })
  },

  // 예산 관리: Supabase 직접 반영
  setBudget: async (yearMonth, amount) => {
    const userId = get().user?.id || null
    const res = await supabaseUpsertBudget({ year_month: yearMonth, amount, user_id: userId }, userId)
    if (!res.success) {
      alert(`예산 저장 실패: ${formatSupabaseError(res.error)}`)
      return
    }
    const existingIndex = get().budgets.findIndex((b) => b.year_month === yearMonth)
    let nextBudgets: Budget[]
    if (existingIndex >= 0) {
      nextBudgets = get().budgets.map((b) =>
        b.year_month === yearMonth ? { ...b, amount, user_id: userId } : b
      )
    } else {
      nextBudgets = [...get().budgets, { year_month: yearMonth, amount, user_id: userId }]
    }
    set({ budgets: nextBudgets })
  },

  // 엑셀 / CSV 가져오기: 파싱 후 Supabase로 직접 일괄 전송
  importParsedExcel: async (result: ParsedExcelResult) => {
    let currentCategories = [...get().categories]
    let currentAssets = [...get().assets]
    const currentTransactions = [...get().transactions]

    // 카테고리/자산이 비어있다면 기본값으로 보강
    if (currentCategories.length === 0) {
      const expenseCats: Category[] = DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
        ...c,
        id: generateUUID(),
      }))
      const incomeCats: Category[] = DEFAULT_INCOME_CATEGORIES.map((c) => ({
        ...c,
        id: generateUUID(),
      }))
      currentCategories = [...expenseCats, ...incomeCats]
    }
    if (currentAssets.length === 0) {
      currentAssets = DEFAULT_ASSETS.map((a) => ({
        ...a,
        id: generateUUID(),
        balance: 0,
      }))
    }

    // 1. 새 카테고리 매핑 및 준비
    const categoryMapping = new Map<string, string>()
    if (result.newCategories.length > 0) {
      result.newCategories.forEach((nc) => {
        const newId = generateUUID()
        currentCategories.push({ ...nc, id: newId })
        categoryMapping.set(nc.name, newId)
      })
    }

    const userId = get().user?.id || null

    // 2. 카테고리가 Supabase에 먼저 온전히 반영되도록 업서트 (외래키 제약조건 방지)
    const catUpsertRes = await supabaseUpsertCategories(currentCategories, userId)
    if (!catUpsertRes.success) {
      throw new Error(`카테고리 클라우드 동기화 실패: ${formatSupabaseError(catUpsertRes.error)}`)
    }

    const validCatIds = new Set(currentCategories.map((c) => c.id))
    const defaultAssetId = currentAssets[0]?.id || ''

    // 3. 트랜잭션 중복 검사 및 변환
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
        if (!catId || !validCatIds.has(catId)) {
          catId = currentCategories.find((c) => c.name.includes('기타'))?.id || currentCategories[0]?.id
        }

        let assetId = t.asset_id
        if (!assetId || !currentAssets.some((a) => a.id === assetId)) {
          assetId = defaultAssetId
        }

        const newTx: Transaction = {
          ...t,
          category_id: catId,
          asset_id: assetId,
          id: generateUUID(),
          created_at: getKoreanNowString(),
          user_id: userId,
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

    if (newTxs.length === 0) {
      return
    }

    // 4. 자산 잔액 업데이트 및 외래키 존재 보장
    const assetUpsertRes = await supabaseUpsertAssets(currentAssets, userId)
    if (!assetUpsertRes.success) {
      throw new Error(`자산 클라우드 동기화 실패: ${formatSupabaseError(assetUpsertRes.error)}`)
    }

    const validAssetIds = new Set(currentAssets.map((a) => a.id))

    // 5. Supabase에 트랜잭션 일괄 배치 저장
    const txInsertRes = await supabaseInsertTransactionsBatch(newTxs, validCatIds, validAssetIds, userId)
    if (!txInsertRes.success) {
      throw new Error(`거래 내역 클라우드 저장 실패: ${formatSupabaseError(txInsertRes.error)}`)
    }

    // 6. 클라우드 DB 저장이 100% 성공했을 때만 로컬 UI 상태 갱신
    const combinedTxs = [...newTxs, ...currentTransactions]
    set({
      categories: currentCategories,
      assets: currentAssets,
      transactions: combinedTxs,
      isExcelModalOpen: false,
      isCsvModalOpen: false,
    })
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
