import type { Category, Asset } from '../types'

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '식비', icon: '🍜', type: 'expense', sort_order: 1 },
  { name: '카페/커피', icon: '🥤', type: 'expense', sort_order: 2 },
  { name: '마트/편의점', icon: '🛒', type: 'expense', sort_order: 3 },
  { name: '집술', icon: '🍺', type: 'expense', sort_order: 4 },
  { name: '술', icon: '🥃', type: 'expense', sort_order: 5 },
  { name: '교통/차량', icon: '🚗', type: 'expense', sort_order: 6 },
  { name: '주거/통신', icon: '🏠', type: 'expense', sort_order: 7 },
  { name: '생활용품', icon: '🪑', type: 'expense', sort_order: 8 },
  { name: '패션/미용', icon: '👕', type: 'expense', sort_order: 9 },
  { name: '헤어', icon: '👦🏻', type: 'expense', sort_order: 10 },
  { name: '화장품', icon: '💄', type: 'expense', sort_order: 11 },
  { name: '건강', icon: '💊', type: 'expense', sort_order: 12 },
  { name: '병원', icon: '🏥', type: 'expense', sort_order: 13 },
  { name: '운동', icon: '🚴🏻', type: 'expense', sort_order: 14 },
  { name: '문화생활', icon: '🎬', type: 'expense', sort_order: 15 },
  { name: '게임', icon: '🎮', type: 'expense', sort_order: 16 },
  { name: 'ott구독', icon: '🖥️', type: 'expense', sort_order: 17 },
  { name: '교육', icon: '📚', type: 'expense', sort_order: 18 },
  { name: '자격증시험', icon: '📝', type: 'expense', sort_order: 19 },
  { name: '경조사/회비', icon: '💌', type: 'expense', sort_order: 20 },
  { name: '부모님', icon: '🎁', type: 'expense', sort_order: 21 },
  { name: '보험', icon: '🧑‍💼', type: 'expense', sort_order: 22 },
  { name: '여행', icon: '🏖️', type: 'expense', sort_order: 23 },
  { name: '대회접수비', icon: '🏃', type: 'expense', sort_order: 24 },
  { name: '기타', icon: '💬', type: 'expense', sort_order: 25 },
]

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '급여', icon: '💰', type: 'income', sort_order: 1 },
  { name: '부수입', icon: '💵', type: 'income', sort_order: 2 },
  { name: '용돈', icon: '🧧', type: 'income', sort_order: 3 },
  { name: '금융소득', icon: '📈', type: 'income', sort_order: 4 },
  { name: '기타수입', icon: '🪙', type: 'income', sort_order: 5 },
]

export const DEFAULT_ASSETS: Omit<Asset, 'id'>[] = [
  { name: '메인 신용카드', type: 'card', balance: 0, icon: '💳', sort_order: 1 },
  { name: '주거래 은행', type: 'bank', balance: 0, icon: '🏦', sort_order: 2 },
  { name: '지갑 현금', type: 'cash', balance: 0, icon: '💵', sort_order: 3 },
]

export const QUICK_MEMO_TAGS = [
  '생마차 4캔', '물', '담배', '막걸리', '커피', '필라이트', '와퍼주니어',
  '점심', '장보기', '식비', '지하철', '소주', '쿠팡', '택시'
]
