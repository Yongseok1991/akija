import * as XLSX from 'xlsx'
import type { Transaction, Category, Asset } from '../types'

export interface ParsedExcelResult {
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
 * 엑셀 시트 2D 배열을 파싱하여 가계부 데이터로 변환
 */
export function parseExcelRows(
  rows: any[][],
  existingCategories: Category[],
  existingAssets: Asset[]
): ParsedExcelResult {
  if (!rows || rows.length < 2) {
    throw new Error('유효한 엑셀 데이터가 없습니다. (최소 2행 이상 필요)')
  }

  // 헤더 검사 및 컬럼 인덱스 탐색
  const header = rows[0].map((h) => String(h || '').trim())
  const dateIdx = header.findIndex((h) => h === '날짜' || h.toLowerCase().includes('date'))
  const assetIdx = header.findIndex((h) => h === '자산' || h.toLowerCase().includes('asset'))
  const catIdx = header.findIndex(
    (h) => h === '분류' || h === '대분류' || h.toLowerCase().includes('category')
  )
  const memoIdx = header.findIndex((h) => h === '내용' || h === '항목' || h === '적요')
  const extraMemoIdx = header.findIndex((h) => h === '메모')
  const krwIdx = header.findIndex(
    (h) => h === 'KRW' || h === '금액' || h.toLowerCase().includes('amount')
  )
  const typeIdx = header.findIndex(
    (h) => h.includes('수입/지출') || h === '타입' || h === '구분' || h.toLowerCase().includes('type')
  )

  const transactions: Omit<Transaction, 'id' | 'created_at'>[] = []
  const newCategoriesMap = new Map<string, Omit<Category, 'id'>>()

  let expenseCount = 0
  let incomeCount = 0
  let totalExpenseAmount = 0
  let totalIncomeAmount = 0
  const dates: string[] = []

  // 데이터 행 파싱
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    if (!cols || cols.length === 0) continue

    const rawDate = String(dateIdx >= 0 ? cols[dateIdx] : cols[0] || '').trim()
    const rawAsset = String(assetIdx >= 0 ? cols[assetIdx] : cols[1] || '').trim() || '카드'
    const rawCat = String(catIdx >= 0 ? cols[catIdx] : cols[2] || '').trim() || '기타'
    const content = String(memoIdx >= 0 ? cols[memoIdx] : cols[4] || '').trim()
    const extraMemo = extraMemoIdx >= 0 ? String(cols[extraMemoIdx] || '').trim() : ''
    const rawAmountStr = String(krwIdx >= 0 ? cols[krwIdx] : cols[5] || '').replace(/[^0-9.]/g, '')
    const rawType = String(typeIdx >= 0 ? cols[typeIdx] : cols[6] || '').trim() || '지출'

    const amount = parseFloat(rawAmountStr || '0')
    if (isNaN(amount) || amount <= 0) continue

    // 날짜 정규화 (YYYY-MM-DD)
    let dateStr = ''
    const dateMatch = rawDate.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
    if (dateMatch) {
      dateStr = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    } else {
      // 엑셀 날짜 시리얼 번호인 경우
      const numDate = parseFloat(rawDate)
      if (!isNaN(numDate) && numDate > 20000 && numDate < 80000) {
        try {
          const parsed = XLSX.SSF.parse_date_code(numDate)
          dateStr = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
        } catch {
          dateStr = new Date().toISOString().slice(0, 10)
        }
      } else {
        dateStr = new Date().toISOString().slice(0, 10)
      }
    }
    dates.push(dateStr)

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
      if ((rawAsset.includes('은행') || rawAsset.includes('통장') || rawAsset.includes('계좌')) && a.type === 'bank') {
        return true
      }
      return a.name.includes(rawAsset)
    })
    if (!asset) {
      asset = existingAssets[0]
    }

    // 카테고리 매핑 (이모지 포함 문자열 유연 처리)
    let category = existingCategories.find((c) => {
      const cleanRawCat = rawCat.replace(/[\s]/g, '')
      const cleanCatName = c.name.replace(/[\s]/g, '')
      return (
        cleanRawCat.includes(cleanCatName) ||
        cleanCatName.includes(cleanRawCat) ||
        (c.icon && rawCat.includes(c.icon))
      )
    })

    let categoryId = ''
    if (category) {
      categoryId = category.id
    } else {
      const cleanName = rawCat.replace(/[^\w\s가-힣]/g, '').trim() || '기타'
      let existingNew = newCategoriesMap.get(cleanName)
      if (!existingNew) {
        existingNew = {
          name: cleanName,
          icon: '📌',
          type,
          sort_order: existingCategories.length + newCategoriesMap.size + 1,
        }
        newCategoriesMap.set(cleanName, existingNew)
      }
      categoryId = cleanName
    }

    const finalMemo = [content, extraMemo].filter(Boolean).join(' - ') || '가계부 내역'

    transactions.push({
      amount,
      type,
      category_id: categoryId,
      asset_id: asset?.id || '',
      date: dateStr,
      memo: finalMemo,
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
 * .xlsx / .xls 파일(ArrayBuffer) 파싱
 */
export function parseExcelFileBuffer(
  buffer: ArrayBuffer,
  existingCategories: Category[],
  existingAssets: Asset[]
): ParsedExcelResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    throw new Error('엑셀 시트를 찾을 수 없습니다.')
  }
  const sheet = wb.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  })

  return parseExcelRows(rows, existingCategories, existingAssets)
}

/**
 * 텍스트 또는 CSV 파싱 (엑셀이 아닌 텍스트 붙여넣기 지원용)
 */
export function parseTextOrCsv(
  text: string,
  existingCategories: Category[],
  existingAssets: Asset[]
): ParsedExcelResult {
  const wb = XLSX.read(text, { type: 'string' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    throw new Error('유효한 텍스트 데이터가 없습니다.')
  }
  const sheet = wb.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  })

  return parseExcelRows(rows, existingCategories, existingAssets)
}

/**
 * 현재 가계부 데이터를 Microsoft Excel (.xlsx) 바이너리 Blob으로 내보내기
 */
export function exportToExcelFile(
  transactions: Transaction[],
  categories: Category[],
  assets: Asset[]
): Blob {
  const header = [
    '날짜',
    '자산',
    '분류',
    '소분류',
    '내용',
    'KRW',
    '수입/지출',
    '메모',
    '금액',
    '화폐',
    '자산',
  ]
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  const rows: any[][] = [header]

  for (const tx of sorted) {
    const cat = categories.find((c) => c.id === tx.category_id)
    const asset = assets.find((a) => a.id === tx.asset_id)

    const dateStr = tx.date.replace(/-/g, '/')
    const assetName = asset?.type === 'card' ? '카드' : asset?.type === 'cash' ? '현금' : '은행'
    const catDisplay = cat ? `${cat.icon} ${cat.name}` : '기타'
    const memo = tx.memo || ''
    const krw = tx.amount
    const typeStr = tx.type === 'income' ? '수입' : '지출'

    rows.push([
      dateStr,
      assetName,
      catDisplay,
      '',
      memo,
      krw,
      typeStr,
      '',
      `${krw}.0`,
      'KRW',
      krw,
    ])
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // 가독성을 위한 열 너비(wch) 지정
  ws['!cols'] = [
    { wch: 13 }, // 날짜
    { wch: 8 },  // 자산
    { wch: 18 }, // 분류
    { wch: 8 },  // 소분류
    { wch: 28 }, // 내용
    { wch: 10 }, // KRW
    { wch: 9 },  // 수입/지출
    { wch: 10 }, // 메모
    { wch: 10 }, // 금액
    { wch: 6 },  // 화폐
    { wch: 10 }, // 자산
  ]

  XLSX.utils.book_append_sheet(wb, ws, '편한가계부')
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * 레거시 CSV 텍스트 내보내기 (호환성 유지)
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
    const memo = (tx.memo || '').replace(/"/g, '""')
    const krw = tx.amount
    const typeStr = tx.type === 'income' ? '수입' : '지출'

    const line = `${dateStr},${assetName},${catDisplay},,"${memo}",${krw},${typeStr},,${krw}.0,KRW,${krw}`
    rows.push(line)
  }

  return '\uFEFF' + rows.join('\r\n')
}
