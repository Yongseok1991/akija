export type TransactionType = 'expense' | 'income' | 'transfer'

export type AssetType = 'cash' | 'bank' | 'card'

export interface Category {
  id: string
  name: string
  icon: string
  type: 'expense' | 'income'
  sort_order: number
  user_id?: string | null
}

export interface Asset {
  id: string
  name: string
  type: AssetType
  balance: number
  icon: string
  sort_order: number
  user_id?: string | null
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: string // YYYY-MM-DD
  category_id?: string
  asset_id: string // 출금/지출 자산
  to_asset_id?: string // 이체 시 입금 자산
  memo: string
  image_url?: string // 압축된 사진 데이터 (WebP base64 또는 URL)
  created_at: string
  user_id?: string | null
}

export interface Budget {
  year_month: string // 'YYYY-MM'
  amount: number
  user_id?: string | null
}

export interface SupabaseConfig {
  url: string
  anon_key: string
  is_connected?: boolean
}

export type TabType = 'daily' | 'calendar' | 'stats' | 'assets' | 'settings'
