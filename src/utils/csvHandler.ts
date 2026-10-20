import type { Transaction, Category, Asset } from '../types'

export interface ParsedCsvResult {
  transactions: Omit<Transaction, 'id' | 'created_at'>[]
  newCategories: Omit<Category, 'id'>[]
  totalCount: number
  expenseCount: number
  incomeCount: number
  totalExpenseAmount: number
  totalIncomeAmount: number
  dateRange: { start: string; end: string }
}

/**
 * 사용자 가계부 11열 CSV 텍스트 파싱
 * 형식: 날짜,자산,분류,소분류,내용,KRW,수입/지출,메모,금액,화폐,자산
 */
export function parseUserCsvText(
  csvText: string,
  existingCategories: Category[],
  existingAssets: Asset[]
): ParsedCsvResult {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('유효한 CSV 데이터가 없습니다. (최소 2행 이상 필요)')
  }

  // 헤더 검사
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const dateIdx = header.findIndex((h) => h === '날짜')
  const assetIdx = header.findIndex((h) => h === '자산')
  const catIdx = header.findIndex((h) => h === '분류')
  const memoIdx = header.findIndex((h) => h === '내용')
  const krwIdx = header.findIndex((h) => h === 'KRW' || h === '금액')
  const typeIdx = header.findIndex((h) => h.includes('수입/지출') || h === '타입')

  const transactions: Omit<Transaction, 'id' | 'created_at'>[] = []
  const newCategoriesMap = new Map<string, Omit<Category, 'id'>>()

  let expenseCount = 0
  let incomeCount = 0
  let totalExpenseAmount = 0
  let totalIncomeAmount = 0
  const dates: string[] = []

  // 데이터 행 순회
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // CSV 행 쉼표 파싱 (따옴표 처리)
    const cols = parseCsvLine(line)
    if (cols.length < 5) continue

    const rawDate = (dateIdx >= 0 ? cols[dateIdx] : cols[0])?.trim()
    const rawAsset = (assetIdx >= 0 ? cols[assetIdx] : cols[1])?.trim() || '카드'
    const rawCat = (catIdx >= 0 ? cols[catIdx] : cols[2])?.trim() || '기타'
    const rawMemo = (memoIdx >= 0 ? cols[memoIdx] : cols[4])?.trim() || ''
    const rawAmountStr = (krwIdx >= 0 ? cols[krwIdx] : cols[5])?.replace(/[^0-9.]/g, '')
    const rawType = (typeIdx >= 0 ? cols[typeIdx] : cols[6])?.trim() || '지출'

    const amount = parseFloat(rawAmountStr || '0')
    if (isNaN(amount) || amount <= 0) continue

    // 날짜 포맷 검증 (YYYY-MM-DD)
    const dateMatch = rawDate.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
    let dateStr = rawDate
    if (dateMatch) {
      const y = dateMatch[1]
      const m = dateMatch[2].padStart(2, '0')
      const d = dateMatch[3].padStart(2, '0')
      dateStr = `${y}-${m}-${d}`
      dates.push(dateStr)
    }

    const isIncome = rawType.includes('수입')
    const type: 'expense' | 'income' = isIncome ? 'income' : 'expense'

    if (type === 'expense') {
      expenseCount++
      totalExpenseAmount += amount
    } else {
      incomeCount++
      totalIncomeAmount += amount
    }

    // 자산 매핑
    let asset = existingAssets.find((a) => {
      if (rawAsset.includes('카드') && a.type === 'card') return true
      if (rawAsset.includes('현금') && a.type === 'cash') return true
      if ((rawAsset.includes('은행') || rawAsset.includes('계좌')) && a.type === 'bank') return true
      return a.name.includes(rawAsset)
    })
    if (!asset) {
      asset = existingAssets[0]
    }

    // 카테고리 매핑 (이모지 포함 여부 대응)
    let category = existingCategories.find((c) => {
      const cleanRawCat = rawCat.replace(/[\s]/g, '')
      const cleanName = c.name.replace(/[\s]/g, '')
      const cleanWithIcon = `${c.icon}${c.name}`.replace(/[\s]/g, '')
      return cleanRawCat.includes(cleanName) || cleanWithIcon.includes(cleanRawCat)
    })

    let categoryId = category?.id
    if (!category && !newCategoriesMap.has(rawCat)) {
      // 신규 카테고리 생성 (이모지와 텍스트 분리)
      const emojiMatch = rawCat.match(
        /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF])\s*(.*)$/u
      )
      const icon = emojiMatch ? emojiMatch[1] : '🏷️'
      const name = emojiMatch && emojiMatch[2] ? emojiMatch[2].trim() : rawCat.trim()

      const newCat: Omit<Category, 'id'> = {
        name: name || rawCat,
        icon,
        type,
        sort_order: existingCategories.length + newCategoriesMap.size + 1,
      }
      newCategoriesMap.set(rawCat, newCat)
    }

    transactions.push({
      type,
      amount,
      date: dateStr,
      category_id: categoryId || rawCat, // store will resolve newly created IDs
      asset_id: asset.id,
      memo: rawMemo,
    })
  }

  dates.sort()

  return {
    transactions,
    newCategories: Array.from(newCategoriesMap.values()),
    totalCount: transactions.length,
    expenseCount,
    incomeCount,
    totalExpenseAmount,
    totalIncomeAmount,
    dateRange: {
      start: dates[0] || '',
      end: dates[dates.length - 1] || '',
    },
  }
}

/**
 * 현재 트랜잭션을 사용자 11열 CSV 포맷으로 내보내기
 */
export function exportToUserCsv(
  transactions: Transaction[],
  categories: Category[],
  assets: Asset[]
): string {
  const header = '날짜,자산,분류,소분류,내용,KRW,수입/지출,메모,금액,화폐,자산'
  const rows: string[] = [header]

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  for (const tx of sorted) {
    const cat = categories.find((c) => c.id === tx.category_id)
    const asset = assets.find((a) => a.id === tx.asset_id)

    const dateStr = tx.date
    const assetName = asset?.type === 'card' ? '카드' : asset?.type === 'cash' ? '현금' : '은행'
    const catDisplay = cat ? `${cat.icon} ${cat.name}` : '기타'
    const memo = tx.memo.replace(/"/g, '""')
    const krw = tx.amount
    const typeStr = tx.type === 'income' ? '수입' : '지출'

    // CSV format: 날짜,자산,분류,소분류,내용,KRW,수입/지출,메모,금액,화폐,자산
    const line = `${dateStr},${assetName},${catDisplay},,"${memo}",${krw},${typeStr},,${krw}.0,KRW,${krw}`
    rows.push(line)
  }

  // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
  return '\uFEFF' + rows.join('\r\n')
}

function parseCsvLine(text: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += char
    }
  }
  result.push(cur.trim())
  return result
}
