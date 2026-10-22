import React, { useState } from 'react'
import {
  generateCalendarMatrix,
  formatKoreanDate,
  getTodayString,
} from '../../utils/dateUtils'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'
import { Plus, Repeat, Sparkles, CheckCircle2 } from 'lucide-react'

export const CalendarView: React.FC = () => {
  const { currentYearMonth, transactions, categories, assets, openInputModal } = useAppStore()
  const todayStr = getTodayString()
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  const calendarMatrix = generateCalendarMatrix(currentYearMonth)

  // Compute daily totals for the calendar
  const dailyTotals: { [date: string]: { expense: number; income: number } } = {}
  transactions.forEach((tx) => {
    if (!dailyTotals[tx.date]) {
      dailyTotals[tx.date] = { expense: 0, income: 0 }
    }
    if (tx.type === 'expense') {
      dailyTotals[tx.date].expense += tx.amount
    } else if (tx.type === 'income') {
      dailyTotals[tx.date].income += tx.amount
    }
  })

  // Zero-spending calculation (무지출 카운팅)
  const currentMonthDays = calendarMatrix.filter((c) => c.isCurrentMonth)
  const elapsedDays = currentMonthDays.filter((c) => c.dateStr <= todayStr)
  const targetDaysCount = elapsedDays.length

  const zeroSpendDays = elapsedDays.filter((c) => {
    const exp = dailyTotals[c.dateStr]?.expense || 0
    return exp === 0
  })

  const zeroSpendDaysCount = zeroSpendDays.length
  const zeroSpendRate = targetDaysCount > 0 ? Math.round((zeroSpendDaysCount / targetDaysCount) * 100) : 0

  // Selected date transactions
  const selectedDayTransactions = transactions.filter((t) => t.date === selectedDate)
  const selectedDayExpense = selectedDayTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const selectedDayIncome = selectedDayTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const isSelectedDateZeroSpend =
    selectedDate <= todayStr &&
    selectedDayExpense === 0

  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const [, curMonthNum] = currentYearMonth.split('-')

  return (
    <div className="space-y-4">
      {/* 1. Zero-Spending Challenge Summary Card (무지출 달성 현황 카운팅) */}
      <div className="bg-[#121418] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shadow-sm">
            🌱
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span>{parseInt(curMonthNum)}월 무지출 챌린지</span>
              {targetDaysCount > 0 && (
                <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
                  달성률 {zeroSpendRate}%
                </span>
              )}
            </div>
            <div className="text-base font-extrabold text-white mt-0.5 flex items-baseline gap-1.5">
              <span className="text-emerald-400 font-black text-lg">총 {zeroSpendDaysCount}일 달성</span>
              {targetDaysCount > 0 && (
                <span className="text-xs text-slate-500 font-normal">
                  / 경과 {targetDaysCount}일 중
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-slate-400 font-medium">지출 0원인 날</div>
          <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-end gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{zeroSpendDaysCount > 0 ? `${zeroSpendDaysCount}일 절약 성공!` : '오늘 무지출 도전!'}</span>
          </div>
        </div>
      </div>

      {/* 2. Calendar Grid Card */}
      <div className="bg-[#121418] border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-lg">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 mb-2 text-center">
          {weekdays.map((day, idx) => (
            <div
              key={day}
              className={`text-xs font-bold py-1 ${
                idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days 7x6 Matrix */}
        <div className="grid grid-cols-7 gap-1">
          {calendarMatrix.map((cell) => {
            const totals = dailyTotals[cell.dateStr] || { expense: 0, income: 0 }
            const isSelected = selectedDate === cell.dateStr
            const isPastOrToday = cell.dateStr <= todayStr
            const isZeroSpend = cell.isCurrentMonth && isPastOrToday && totals.expense === 0

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => setSelectedDate(cell.dateStr)}
                className={`min-h-[62px] sm:min-h-[68px] p-1.5 flex flex-col justify-between rounded-2xl border text-left transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 shadow-sm'
                    : isZeroSpend
                    ? 'bg-emerald-950/20 border-emerald-500/25 hover:bg-emerald-950/40 hover:border-emerald-500/40'
                    : cell.isCurrentMonth
                    ? 'bg-[#16181f] border-slate-800/80 hover:bg-[#1f2430]'
                    : 'bg-[#121418]/40 border-transparent opacity-30 hover:opacity-60'
                }`}
              >
                {/* Day number & Indicators */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-semibold ${
                      cell.isToday
                        ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm'
                        : isSelected
                        ? 'text-blue-300 font-bold'
                        : cell.isCurrentMonth
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Tiny zero-spend sprout icon badge */}
                  {isZeroSpend && (
                    <span
                      className="text-[10px] leading-none shrink-0"
                      title="지출 없는 날 (무지출)"
                    >
                      🌱
                    </span>
                  )}
                </div>

                {/* Daily sums (Income, Expense, or Zero-Spend Badge) */}
                <div className="w-full space-y-0.5 overflow-hidden">
                  {totals.income > 0 && (
                    <div className="text-[9px] font-bold text-emerald-400 truncate leading-none">
                      +{totals.income >= 10000 ? Math.round(totals.income / 10000) + '만' : totals.income}
                    </div>
                  )}

                  {totals.expense > 0 ? (
                    <div className="text-[9px] font-bold text-rose-400 truncate leading-none">
                      -{totals.expense >= 10000 ? Math.round(totals.expense / 10000) + '만' : totals.expense}
                    </div>
                  ) : isZeroSpend ? (
                    <div className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 leading-none">
                      <span>무지출</span>
                    </div>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Selected Day Details Section */}
      <div className="bg-[#121418] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm">{formatKoreanDate(selectedDate)}</h3>
            <div className="flex items-center gap-2 text-xs mt-1">
              {selectedDayIncome > 0 && (
                <span className="text-emerald-400 font-semibold">
                  수입 +{formatKRW(selectedDayIncome)}
                </span>
              )}
              {selectedDayExpense > 0 && (
                <span className="text-rose-400 font-semibold">
                  지출 -{formatKRW(selectedDayExpense)}
                </span>
              )}
              {selectedDayIncome === 0 && selectedDayExpense === 0 && (
                <span className="text-slate-500">기록된 거래 없음</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              openInputModal({ date: selectedDate } as any)
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>이 날짜에 추가</span>
          </button>
        </div>

        {/* Zero-Spending Celebration Alert on Selected Day */}
        {isSelectedDateZeroSpend && (
          <div className="flex items-center gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 font-semibold animate-in fade-in duration-150">
            <span className="text-lg shrink-0">🌱</span>
            <div className="flex-1">
              <span className="font-bold text-emerald-200">지출 없는 날 (무지출 데이)</span>
              <p className="text-[11px] text-emerald-400/80 font-normal mt-0.5">
                이 날은 불필요한 소비 없이 알뜰하게 아낀 날입니다!
              </p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
        )}

        {/* Selected Day Transactions List */}
        {selectedDayTransactions.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            이 날짜에 등록된 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {selectedDayTransactions.map((tx) => {
              const category = categories.find((c) => c.id === tx.category_id)
              const asset = assets.find((a) => a.id === tx.asset_id)
              const toAsset = tx.to_asset_id
                ? assets.find((a) => a.id === tx.to_asset_id)
                : null
              const isExpense = tx.type === 'expense'
              const isIncome = tx.type === 'income'

              return (
                <div
                  key={tx.id}
                  onClick={() => openInputModal(tx)}
                  className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-[#1a1d24]/60 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xl shrink-0">
                      {tx.type === 'transfer' ? (
                        <Repeat className="w-4 h-4 text-blue-400" />
                      ) : (
                        category?.icon || '💰'
                      )}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {tx.type === 'transfer' ? '이체' : category?.name || '미분류'}
                        {tx.memo && <span className="text-slate-400 ml-1 font-normal">· {tx.memo}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {tx.type === 'transfer' ? `${asset?.name} → ${toAsset?.name}` : asset?.name}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`text-xs font-bold font-mono shrink-0 ml-2 ${
                      isExpense ? 'text-rose-400' : isIncome ? 'text-emerald-400' : 'text-blue-400'
                    }`}
                  >
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatKRW(tx.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
