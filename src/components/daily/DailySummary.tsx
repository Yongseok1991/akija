import React, { useState } from 'react'
import { TrendingDown, TrendingUp, Target, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'

export const DailySummary: React.FC = () => {
  const { transactions, budgets, currentYearMonth } = useAppStore()
  const [isExpanded, setIsExpanded] = useState(false)

  // Filter current month transactions
  const monthTxs = transactions.filter((t) => t.date.startsWith(currentYearMonth))

  const totalExpense = monthTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalIncome = monthTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const currentBudgetObj = budgets.find((b) => b.year_month === currentYearMonth)
  const budgetAmount = currentBudgetObj?.amount || 0

  const budgetUsagePercent = budgetAmount > 0 ? Math.round((totalExpense / budgetAmount) * 100) : 0
  const remainingBudget = budgetAmount > 0 ? budgetAmount - totalExpense : null

  return (
    <div className="space-y-2">
      {/* 1. Sleek Compact Capsule Banner (Matching Modern Screenshot Style) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-slate-850/90 border border-slate-750/80 hover:border-slate-700 rounded-2xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-sm group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-center gap-2 text-xs truncate">
            <span className="font-semibold text-slate-300">이번달 지출</span>
            <span className="font-extrabold text-white">-{formatKRW(totalExpense)}</span>
            {totalIncome > 0 && (
              <span className="text-[11px] text-emerald-400 font-semibold hidden sm:inline">
                (수입 +{formatKRW(totalIncome)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
          {budgetAmount > 0 ? (
            <span
              className={`font-bold ${
                budgetUsagePercent > 100
                  ? 'text-rose-400'
                  : budgetUsagePercent > 80
                  ? 'text-amber-400'
                  : 'text-blue-400'
              }`}
            >
              예산 {budgetUsagePercent}%
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">{monthTxs.length}건 기록</span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
          )}
        </div>
      </div>

      {/* 2. Detailed Breakdown (Only shown when expanded) */}
      {isExpanded && (
        <div className="bg-slate-850/80 border border-slate-750/70 rounded-2xl p-4 shadow-lg space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Total Expense */}
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mb-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>총 지출</span>
              </div>
              <div className="text-base sm:text-lg font-black text-rose-300 tracking-tight">
                -{formatKRW(totalExpense)}
              </div>
            </div>

            {/* Total Income */}
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>총 수입</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-300 tracking-tight">
                +{formatKRW(totalIncome)}
              </div>
            </div>
          </div>

          {/* Budget Progress Bar */}
          {budgetAmount > 0 && (
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>월 예산 ({formatKRW(budgetAmount)})</span>
                </div>
                <span
                  className={`font-bold ${
                    budgetUsagePercent > 100
                      ? 'text-rose-400'
                      : budgetUsagePercent > 80
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}
                >
                  {budgetUsagePercent}% 사용
                </span>
              </div>

              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    budgetUsagePercent > 100
                      ? 'bg-rose-500'
                      : budgetUsagePercent > 80
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>남은 예산</span>
                <span
                  className={`font-semibold ${
                    (remainingBudget ?? 0) < 0 ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {(remainingBudget ?? 0) < 0 ? '예산 초과 ' : ''}
                  {formatKRW(Math.abs(remainingBudget ?? 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
