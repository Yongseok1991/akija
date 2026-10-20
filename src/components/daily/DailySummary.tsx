import React from 'react'
import { TrendingDown, TrendingUp, Target } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'

export const DailySummary: React.FC = () => {
  const { transactions, budgets, currentYearMonth } = useAppStore()

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
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-850/90 border border-slate-750 rounded-3xl p-5 shadow-lg space-y-4">
      {/* Top: Income & Expense Totals */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Expense */}
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>이번 달 총 지출</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-300 tracking-tight">
            {formatKRW(totalExpense)}
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>이번 달 총 수입</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-300 tracking-tight">
            {formatKRW(totalIncome)}
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      {budgetAmount > 0 && (
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
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

          {/* Progress bar line */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
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
  )
}
