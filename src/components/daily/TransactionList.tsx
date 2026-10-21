import React, { useState } from 'react'
import { Trash2, Image as ImageIcon } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'
import { formatGroupDate, formatKoreanTime } from '../../utils/dateUtils'
import type { Transaction } from '../../types'
import { ImageLightboxModal } from '../common/ImageLightboxModal'

export const TransactionList: React.FC = () => {
  const {
    transactions,
    categories,
    assets,
    currentYearMonth,
    searchQuery,
    filterType,
    openInputModal,
    deleteTransaction,
  } = useAppStore()

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [lightboxTitle, setLightboxTitle] = useState<string>('')

  // 1. Filter current month transactions
  let filtered = transactions.filter((t) => t.date.startsWith(currentYearMonth))

  // 2. Filter by type (지출/수입)
  if (filterType === 'expense') {
    filtered = filtered.filter((t) => t.type === 'expense')
  } else if (filterType === 'income') {
    filtered = filtered.filter((t) => t.type === 'income')
  }

  // 3. Search query filter (memo, merchant, category)
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    filtered = filtered.filter((t) => {
      const cat = categories.find((c) => c.id === t.category_id)
      const ast = assets.find((a) => a.id === t.asset_id)
      const memoMatch = (t.memo || '').toLowerCase().includes(q)
      const catMatch = (cat?.name || '').toLowerCase().includes(q)
      const astMatch = (ast?.name || '').toLowerCase().includes(q)
      return memoMatch || catMatch || astMatch
    })
  }

  // Sort by date descending, then created_at descending
  filtered.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date)
    }
    return b.created_at.localeCompare(a.created_at)
  })

  // Group by date
  const groupedByDate: { [date: string]: Transaction[] } = {}
  filtered.forEach((tx) => {
    if (!groupedByDate[tx.date]) {
      groupedByDate[tx.date] = []
    }
    groupedByDate[tx.date].push(tx)
  })

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="text-4xl mb-3">📝</div>
        <div className="text-base font-bold text-slate-300">
          {searchQuery ? `'${searchQuery}' 검색 결과가 없습니다` : '해당 내역이 없습니다'}
        </div>
        <div className="text-xs text-slate-400 mt-1.5">
          상단의 <span className="text-white font-bold">+</span> 버튼으로 새로운 지출을 등록해 보세요!
        </div>
      </div>
    )
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('이 내역을 삭제하시겠습니까?')) {
      deleteTransaction(id)
    }
  }

  const handleOpenLightbox = (e: React.MouseEvent, imgUrl: string, title: string) => {
    e.stopPropagation()
    setLightboxImage(imgUrl)
    setLightboxTitle(title)
  }

  return (
    <>
      <div className="divide-y divide-slate-800/40">
        {sortedDates.map((dateStr) => {
          const dayTxs = groupedByDate[dateStr]
          const dayExpense = dayTxs
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0)
          const dayIncome = dayTxs
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0)

          return (
            <div key={dateStr} className="pt-4 pb-2">
              {/* Clean Date Header Row (Matching FinTech App Screenshot) */}
              <div className="flex items-center justify-between pb-2 px-1 text-xs">
                <span className="font-semibold text-slate-400">
                  {formatGroupDate(dateStr)}
                </span>
                <span className="font-bold text-slate-300">
                  {dayExpense > 0 && `-${formatKRW(dayExpense)}`}
                  {dayIncome > 0 && !dayExpense && `+${formatKRW(dayIncome)}`}
                  {dayIncome > 0 && dayExpense > 0 && (
                    <span className="text-emerald-400 ml-1.5 font-medium">
                      (+{formatKRW(dayIncome)})
                    </span>
                  )}
                </span>
              </div>

              {/* Seamless Transaction Items List */}
              <div className="space-y-0.5">
                {dayTxs.map((tx) => {
                  const category = categories.find((c) => c.id === tx.category_id)
                  const asset = assets.find((a) => a.id === tx.asset_id)

                  const isExpense = tx.type === 'expense'
                  const isIncome = tx.type === 'income'

                  const mainTitle = tx.memo || category?.name || '미분류'
                  const categoryName = category?.name || '기타'
                  const assetName = asset?.name || '신용/체크카드'

                  return (
                    <div
                      key={tx.id}
                      onClick={() => openInputModal(tx)}
                      className="flex items-center justify-between py-3 px-1 hover:bg-slate-800/30 active:bg-slate-800/50 rounded-2xl transition-colors cursor-pointer group"
                    >
                      {/* Left: Circular Icon & Texts */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-2">
                        {tx.image_url ? (
                          <div
                            onClick={(e) => handleOpenLightbox(e, tx.image_url!, mainTitle)}
                            className="w-11 h-11 rounded-full overflow-hidden border border-blue-500/50 relative shrink-0 active:scale-95 transition-transform"
                            title="사진 확대 보기"
                          >
                            <img
                              src={tx.image_url}
                              alt="영수증"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon className="w-3.5 h-3.5 text-white drop-shadow" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-slate-850 border border-slate-750 flex items-center justify-center text-xl shrink-0 shadow-sm">
                            {category?.icon || '🛒'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[15px] text-slate-100 truncate tracking-tight flex items-center gap-1.5">
                            <span className="truncate">{mainTitle}</span>
                            {tx.image_url && (
                              <span className="text-[10px] bg-blue-600/30 text-blue-300 px-1.5 py-0.2 rounded font-medium shrink-0">
                                사진
                              </span>
                            )}
                          </div>

                          {/* Subtitle: "카테고리 | 결제수단 | 한국시간" */}
                          <div className="text-[12px] text-slate-400 mt-0.5 truncate flex items-center gap-1.5 font-normal">
                            <span>{categoryName}</span>
                            <span className="text-slate-600 font-light">|</span>
                            <span>{assetName}</span>
                            {tx.created_at && (
                              <>
                                <span className="text-slate-600 font-light">|</span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {formatKoreanTime(tx.created_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Subtle Delete Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div
                            className={`font-bold text-[15px] tracking-tight ${
                              isExpense
                                ? 'text-slate-100'
                                : isIncome
                                ? 'text-emerald-400 font-extrabold'
                                : 'text-blue-400'
                            }`}
                          >
                            {isExpense ? '-' : isIncome ? '+' : ''}
                            {formatKRW(tx.amount)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, tx.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          isOpen={!!lightboxImage}
          imageUrl={lightboxImage}
          title={lightboxTitle}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  )
}
