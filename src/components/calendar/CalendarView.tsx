import React, { useState } from 'react'
import {
  generateCalendarMatrix,
  formatKoreanDate,
  getTodayString,
} from '../../utils/dateUtils'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'
import { Plus, Repeat } from 'lucide-react'

export const CalendarView: React.FC = () => {
  const { currentYearMonth, transactions, categories, assets, openInputModal } = useAppStore()
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())

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

  // Selected date transactions
  const selectedDayTransactions = transactions.filter((t) => t.date === selectedDate)
  const selectedDayExpense = selectedDayTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const selectedDayIncome = selectedDayTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const weekdays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="space-y-4">
      {/* Calendar Grid Card */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-lg">
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

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => setSelectedDate(cell.dateStr)}
                className={`min-h-[58px] sm:min-h-[64px] p-1 flex flex-col justify-between rounded-xl border text-left transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 shadow-sm'
                    : cell.isCurrentMonth
                    ? 'bg-slate-800/50 border-slate-750/50 hover:bg-slate-800'
                    : 'bg-slate-900/40 border-transparent opacity-40 hover:opacity-70'
                }`}
              >
                {/* Day number & Today dot */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      cell.isToday
                        ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px]'
                        : isSelected
                        ? 'text-blue-300'
                        : cell.isCurrentMonth
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                </div>

                {/* Daily sums (Income & Expense) */}
                <div className="w-full space-y-0.5 overflow-hidden">
                  {totals.income > 0 && (
                    <div className="text-[9px] font-bold text-emerald-400 truncate leading-none">
                      +{totals.income >= 10000 ? Math.round(totals.income / 10000) + '만' : totals.income}
                    </div>
                  )}
                  {totals.expense > 0 && (
                    <div className="text-[9px] font-bold text-rose-400 truncate leading-none">
                      -{totals.expense >= 10000 ? Math.round(totals.expense / 10000) + '만' : totals.expense}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day Details Section */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm">{formatKoreanDate(selectedDate)}</h3>
            <div className="flex items-center gap-2 text-xs mt-0.5">
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
                <span className="text-slate-500">내역 없음</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              openInputModal()
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>이 날짜에 추가</span>
          </button>
        </div>

        {/* Selected Day Transactions List */}
        {selectedDayTransactions.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            이 날짜에 기록된 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
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
                  className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-slate-800/40 px-2 rounded-xl"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xl">
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
                      <div className="text-[10px] text-slate-400">
                        {tx.type === 'transfer' ? `${asset?.name} → ${toAsset?.name}` : asset?.name}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`text-xs font-bold ${
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
