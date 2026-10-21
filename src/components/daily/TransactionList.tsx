import React, { useState } from 'react'
import { Trash2, Repeat, Image as ImageIcon } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'
import { formatKoreanDate } from '../../utils/dateUtils'
import type { Transaction } from '../../types'
import { ImageLightboxModal } from '../common/ImageLightboxModal'

export const TransactionList: React.FC = () => {
  const {
    transactions,
    categories,
    assets,
    currentYearMonth,
    openInputModal,
    deleteTransaction,
  } = useAppStore()

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [lightboxTitle, setLightboxTitle] = useState<string>('')

  // Filter current month transactions and sort by date descending, then created_at descending
  const monthTransactions = transactions
    .filter((t) => t.date.startsWith(currentYearMonth))
    .sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date)
      }
      return b.created_at.localeCompare(a.created_at)
    })

  // Group by date
  const groupedByDate: { [date: string]: Transaction[] } = {}
  monthTransactions.forEach((tx) => {
    if (!groupedByDate[tx.date]) {
      groupedByDate[tx.date] = []
    }
    groupedByDate[tx.date].push(tx)
  })

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  if (monthTransactions.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-800/40 border border-slate-800 rounded-3xl">
        <div className="text-4xl mb-3">📝</div>
        <div className="text-base font-semibold text-slate-300">이번 달 내역이 없습니다</div>
        <div className="text-xs text-slate-400 mt-1">
          상단의 <span className="text-emerald-400 font-bold">엑셀</span> 버튼으로 기존 내역을 불러오거나, 하단 <span className="text-blue-400 font-bold">+</span>로 새 지출을 기록하세요!
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
      <div className="space-y-4">
        {sortedDates.map((dateStr) => {
          const dayTxs = groupedByDate[dateStr]
          const dayExpense = dayTxs
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0)
          const dayIncome = dayTxs
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0)

          return (
            <div
              key={dateStr}
              className="bg-slate-850/80 border border-slate-800/90 rounded-3xl overflow-hidden shadow-sm"
            >
              {/* Date Group Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/60 border-b border-slate-800/70 text-xs">
                <span className="font-bold text-slate-300">{formatKoreanDate(dateStr)}</span>
                <div className="flex items-center gap-2">
                  {dayIncome > 0 && (
                    <span className="text-emerald-400 font-semibold">+{formatKRW(dayIncome)}</span>
                  )}
                  {dayExpense > 0 && (
                    <span className="text-rose-400 font-semibold">-{formatKRW(dayExpense)}</span>
                  )}
                </div>
              </div>

              {/* Transactions for this Day */}
              <div className="divide-y divide-slate-800/60">
                {dayTxs.map((tx) => {
                  const category = categories.find((c) => c.id === tx.category_id)
                  const asset = assets.find((a) => a.id === tx.asset_id)
                  const toAsset = tx.to_asset_id
                    ? assets.find((a) => a.id === tx.to_asset_id)
                    : null

                  const isExpense = tx.type === 'expense'
                  const isIncome = tx.type === 'income'
                  const isTransfer = tx.type === 'transfer'

                  const mainTitle = tx.memo || (isTransfer ? '자산 이체' : category?.name || '미분류')
                  const subDetails = tx.memo
                    ? `${category?.name || '미분류'} · ${asset?.name || '카드'}`
                    : (isTransfer ? `${asset?.name} → ${toAsset?.name}` : asset?.name || '카드')

                  return (
                    <div
                      key={tx.id}
                      onClick={() => openInputModal(tx)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 active:bg-slate-800 transition-colors cursor-pointer group"
                    >
                      {/* Left: Icon / Thumbnail & Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        {tx.image_url ? (
                          <div
                            onClick={(e) => handleOpenLightbox(e, tx.image_url!, mainTitle)}
                            className="w-10 h-10 rounded-2xl overflow-hidden border border-blue-500/50 relative shrink-0 active:scale-95 transition-transform"
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
                          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-xl shrink-0">
                            {isTransfer ? (
                              <Repeat className="w-5 h-5 text-blue-400" />
                            ) : (
                              category?.icon || '🛒'
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-slate-100 truncate flex items-center gap-1.5">
                            <span className="truncate">{mainTitle}</span>
                            {tx.image_url && (
                              <span className="text-[10px] bg-blue-600/30 text-blue-300 px-1.5 py-0.2 rounded font-medium shrink-0">
                                사진
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                            <span className="truncate">{subDetails}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div
                            className={`font-black text-sm tracking-tight ${
                              isExpense
                                ? 'text-rose-400'
                                : isIncome
                                ? 'text-emerald-400'
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
                          className="p-1.5 text-slate-400 hover:text-rose-400 active:scale-95 transition-all opacity-70 group-hover:opacity-100"
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
      <ImageLightboxModal
        isOpen={Boolean(lightboxImage)}
        imageUrl={lightboxImage}
        title={lightboxTitle}
        onClose={() => setLightboxImage(null)}
      />
    </>
  )
}
