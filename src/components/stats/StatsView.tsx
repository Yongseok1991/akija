import React from 'react'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'
import { getAdjacentYearMonth } from '../../utils/dateUtils'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export const StatsView: React.FC = () => {
  const { currentYearMonth, transactions, categories } = useAppStore()

  // 1. Current Month Expenses
  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentYearMonth))
  const currentExpenseTxs = currentMonthTxs.filter((t) => t.type === 'expense')
  const currentTotalExpense = currentExpenseTxs.reduce((sum, t) => sum + t.amount, 0)

  // 2. Previous Month Expenses & Comparison
  const prevYearMonth = getAdjacentYearMonth(currentYearMonth, -1)
  const prevMonthTxs = transactions.filter((t) => t.date.startsWith(prevYearMonth))
  const prevTotalExpense = prevMonthTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  let diffPercent = 0
  let diffAmount = currentTotalExpense - prevTotalExpense
  if (prevTotalExpense > 0) {
    diffPercent = Math.round(((currentTotalExpense - prevTotalExpense) / prevTotalExpense) * 100)
  }

  // 3. Category Breakdown for current month
  const categoryMap: { [catId: string]: number } = {}
  currentExpenseTxs.forEach((tx) => {
    const cid = tx.category_id || 'unknown'
    categoryMap[cid] = (categoryMap[cid] || 0) + tx.amount
  })

  const categoryRanking = Object.entries(categoryMap)
    .map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId)
      const percent = currentTotalExpense > 0 ? (amount / currentTotalExpense) * 100 : 0
      return {
        id: catId,
        name: cat?.name || '기타/미분류',
        icon: cat?.icon || '📌',
        amount,
        percent,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // 4. Six-Month Trend Data (last 6 months including current)
  const sixMonths: { yearMonth: string; label: string; expense: number; income: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const ym = getAdjacentYearMonth(currentYearMonth, -i)
    const [, m] = ym.split('-')
    const exp = transactions
      .filter((t) => t.date.startsWith(ym) && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const inc = transactions
      .filter((t) => t.date.startsWith(ym) && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)

    sixMonths.push({
      yearMonth: ym,
      label: `${m}월`,
      expense: exp,
      income: inc,
    })
  }

  const maxTrendExpense = Math.max(...sixMonths.map((m) => m.expense), 1)

  // Palette for donut chart
  const DONUT_COLORS = [
    '#3b82f6', // blue
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange
    '#64748b', // slate
  ]

  // Donut chart SVG path calculations
  let accumulatedAngle = 0
  const donutSlices = categoryRanking.map((item, idx) => {
    const sliceAngle = (item.percent / 100) * 360
    const startAngle = accumulatedAngle
    accumulatedAngle += sliceAngle
    const endAngle = accumulatedAngle
    const color = DONUT_COLORS[idx % DONUT_COLORS.length]

    // Convert polar to cartesian
    const radius = 40
    const cx = 50
    const cy = 50
    const startRad = ((startAngle - 90) * Math.PI) / 180
    const endRad = ((endAngle - 90) * Math.PI) / 180

    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)

    const largeArc = sliceAngle > 180 ? 1 : 0
    const pathData =
      sliceAngle >= 359.9
        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`

    return { ...item, pathData, color }
  })

  return (
    <div className="space-y-4">
      {/* 1. Month-over-Month Comparison Card */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">전월 대비 지출 비교</div>
            <div className="text-2xl font-black text-slate-100 tracking-tight mt-1">
              {formatKRW(currentTotalExpense)}
            </div>
          </div>

          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-bold border ${
              diffAmount > 0
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                : diffAmount < 0
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {diffAmount > 0 ? (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>+{Math.abs(diffPercent)}% 증가</span>
              </>
            ) : diffAmount < 0 ? (
              <>
                <ArrowDownRight className="w-4 h-4" />
                <span>-{Math.abs(diffPercent)}% 감소</span>
              </>
            ) : (
              <>
                <Minus className="w-4 h-4" />
                <span>전월 동일</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
          지난달 ({prevYearMonth.split('-')[1]}월) 지출: {formatKRW(prevTotalExpense)} (
          {diffAmount > 0 ? '+' : ''}
          {formatKRW(diffAmount)})
        </div>
      </div>

      {/* 2. Category Donut Chart & Ranking */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <h3 className="font-bold text-slate-100 text-sm">카테고리별 지출 비중</h3>

        {categoryRanking.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            이번 달 지출 내역이 없습니다.
          </div>
        ) : (
          <>
            {/* SVG Donut Chart */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="14"
                  />
                  {donutSlices.map((slice, i) => (
                    <path
                      key={slice.id + i}
                      d={slice.pathData}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400">최대 지출</span>
                  <span className="text-xs font-bold text-slate-100 truncate max-w-[90px] text-center">
                    {categoryRanking[0]?.name}
                  </span>
                  <span className="text-[10px] text-blue-400 font-bold">
                    {Math.round(categoryRanking[0]?.percent)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Ranking List */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {categoryRanking.map((item, idx) => {
                const color = DONUT_COLORS[idx % DONUT_COLORS.length]
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.icon}</span>
                        <span className="font-semibold text-slate-200">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.percent.toFixed(1)}%
                        </span>
                      </div>
                      <span className="font-bold text-slate-100">{formatKRW(item.amount)}</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 3. 6-Month Trend Bar Chart */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <h3 className="font-bold text-slate-100 text-sm">최근 6개월 지출 추이</h3>

        <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-1">
          {sixMonths.map((m) => {
            const heightPercent =
              maxTrendExpense > 0 ? Math.max(Math.round((m.expense / maxTrendExpense) * 100), 4) : 4
            const isSelected = m.yearMonth === currentYearMonth

            return (
              <div
                key={m.yearMonth}
                className="flex-1 flex flex-col items-center justify-end h-full group"
              >
                {/* Amount tooltip above bar */}
                <div className="text-[9px] text-slate-400 font-mono mb-1 truncate leading-none">
                  {m.expense > 0 ? (
                    m.expense >= 10000 ? `${Math.round(m.expense / 10000)}만` : m.expense
                  ) : (
                    '-'
                  )}
                </div>

                {/* Bar */}
                <div className="w-full max-w-[28px] bg-slate-800 rounded-t-lg h-full flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isSelected
                        ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-md shadow-blue-500/20'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Month label */}
                <div
                  className={`text-[11px] mt-2 font-medium ${
                    isSelected ? 'text-blue-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  {m.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
