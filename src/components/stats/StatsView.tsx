import React, { useState } from 'react'
import {
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Search,
  X,
  CreditCard,
  Wallet,
  Calendar,
  Flame,
  Scale,
  ChevronDown,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'
import { getAdjacentYearMonth } from '../../utils/dateUtils'

export const StatsView: React.FC = () => {
  const { currentYearMonth, setCurrentYearMonth, transactions, categories, assets, openInputModal } = useAppStore()

  // Tab: 'expense' (지출 분석) | 'income' (수입 분석)
  const [analysisType, setAnalysisType] = useState<'expense' | 'income'>('expense')
  const [statsSearchQuery, setStatsSearchQuery] = useState('')
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null)

  // 1. Current Month Transactions
  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentYearMonth))

  // Expense & Income totals for current month
  const currentExpenseTxs = currentMonthTxs.filter((t) => t.type === 'expense')
  const currentIncomeTxs = currentMonthTxs.filter((t) => t.type === 'income')

  const totalExpense = currentExpenseTxs.reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = currentIncomeTxs.reduce((sum, t) => sum + t.amount, 0)
  const netSavings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

  // 2. Previous Month Comparison
  const prevYearMonth = getAdjacentYearMonth(currentYearMonth, -1)
  const prevMonthTxs = transactions.filter((t) => t.date.startsWith(prevYearMonth))
  const prevTotalExpense = prevMonthTxs
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const prevTotalIncome = prevMonthTxs
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const activeTotal = analysisType === 'expense' ? totalExpense : totalIncome
  const prevActiveTotal = analysisType === 'expense' ? prevTotalExpense : prevTotalIncome
  const diffAmount = activeTotal - prevActiveTotal
  const diffPercent = prevActiveTotal > 0 ? Math.round((diffAmount / prevActiveTotal) * 100) : 0

  // 3. Active Target Transactions (Filtered by search query)
  let activeTxs = analysisType === 'expense' ? currentExpenseTxs : currentIncomeTxs
  if (statsSearchQuery.trim()) {
    const q = statsSearchQuery.trim().toLowerCase()
    activeTxs = activeTxs.filter((t) => {
      const cat = categories.find((c) => c.id === t.category_id)
      const memoMatch = (t.memo || '').toLowerCase().includes(q)
      const catMatch = (cat?.name || '').toLowerCase().includes(q)
      return memoMatch || catMatch
    })
  }

  // 4. Category Breakdown & Ranking
  const categoryMap: { [catId: string]: { amount: number; count: number; txs: typeof activeTxs } } = {}
  activeTxs.forEach((tx) => {
    const cid = tx.category_id || 'unknown'
    if (!categoryMap[cid]) {
      categoryMap[cid] = { amount: 0, count: 0, txs: [] }
    }
    categoryMap[cid].amount += tx.amount
    categoryMap[cid].count += 1
    categoryMap[cid].txs.push(tx)
  })

  const filteredTotal = activeTxs.reduce((sum, t) => sum + t.amount, 0)

  const categoryRanking = Object.entries(categoryMap)
    .map(([catId, meta]) => {
      const cat = categories.find((c) => c.id === catId)
      const percent = filteredTotal > 0 ? (meta.amount / filteredTotal) * 100 : 0
      const sortedTxs = [...meta.txs].sort((a, b) => b.date.localeCompare(a.date))
      return {
        id: catId,
        name: cat?.name || '기타/미분류',
        icon: cat?.icon || (analysisType === 'expense' ? '🛒' : '🪙'),
        amount: meta.amount,
        count: meta.count,
        percent,
        transactions: sortedTxs,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // 5. Insights: Days count, Daily average, Single biggest transaction
  const [, curMonthNum] = currentYearMonth.split('-')
  const now = new Date()
  const isCurrentMonthNow =
    now.getFullYear() === parseInt(currentYearMonth.split('-')[0]) &&
    now.getMonth() + 1 === parseInt(curMonthNum)
  const daysInMonthSoFar = isCurrentMonthNow
    ? Math.max(now.getDate(), 1)
    : new Date(parseInt(currentYearMonth.split('-')[0]), parseInt(curMonthNum), 0).getDate()

  const dailyAverage = Math.round(activeTotal / daysInMonthSoFar)

  // Single biggest transaction
  const sortedByAmount = [...activeTxs].sort((a, b) => b.amount - a.amount)
  const biggestTx = sortedByAmount[0] || null
  const biggestCat = biggestTx ? categories.find((c) => c.id === biggestTx.category_id) : null

  // 6. Payment method breakdown for current month (Card vs Cash)
  const cardTxs = currentExpenseTxs.filter((t) => {
    const a = assets.find((ast) => ast.id === t.asset_id)
    return a?.type === 'card'
  })
  const cashTxs = currentExpenseTxs.filter((t) => {
    const a = assets.find((ast) => ast.id === t.asset_id)
    return a?.type === 'cash'
  })
  const cardTotal = cardTxs.reduce((s, t) => s + t.amount, 0)
  const cashTotal = cashTxs.reduce((s, t) => s + t.amount, 0)
  const cardPercent = totalExpense > 0 ? Math.round((cardTotal / totalExpense) * 100) : 0
  const cashPercent = totalExpense > 0 ? 100 - cardPercent : 0

  // 7. Six-Month Trend Data (Progress bar style)
  const sixMonths: {
    yearMonth: string
    label: string
    expense: number
    income: number
  }[] = []
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
      label: `${parseInt(m)}월`,
      expense: exp,
      income: inc,
    })
  }

  const maxTrendValue = Math.max(
    ...sixMonths.map((m) => (analysisType === 'expense' ? m.expense : m.income)),
    1
  )

  // Colors for ranking bars
  const RANK_COLORS = [
    '#3b82f6', // blue
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange
    '#64748b', // slate
  ]

  return (
    <div className="space-y-4 pb-4 animate-in fade-in duration-200">
      {/* 1. Analysis Type Switcher (지출 분석 vs 수입 분석) */}
      <div className="bg-[#121418] border border-slate-800 p-1 rounded-2xl grid grid-cols-2 gap-1 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setAnalysisType('expense')
            setStatsSearchQuery('')
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            analysisType === 'expense'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>지출 분석</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAnalysisType('income')
            setStatsSearchQuery('')
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            analysisType === 'income'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>수입 분석</span>
        </button>
      </div>

      {/* 2. Monthly Financial Balance Summary (수입 vs 지출 수지 대조) */}
      <div className="bg-[#121418] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-slate-300">
              {parseInt(curMonthNum)}월 재정 수지 균형
            </h3>
          </div>
          <span
            className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
              netSavings >= 0
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}
          >
            {netSavings >= 0 ? `잉여 +${formatKRW(netSavings)}` : `초과 -${formatKRW(Math.abs(netSavings))}`}
          </span>
        </div>

        {/* Dual Bars: 수입 vs 지출 */}
        <div className="space-y-2 pt-1">
          {/* Income Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                총 수입
              </span>
              <span className="font-bold text-emerald-400">+{formatKRW(totalIncome)}</span>
            </div>
            <div className="w-full h-2.5 bg-[#1a1d24] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    totalIncome > 0 && Math.max(totalIncome, totalExpense) > 0
                      ? (totalIncome / Math.max(totalIncome, totalExpense)) * 100
                      : 0,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Expense Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                총 지출
              </span>
              <span className="font-bold text-rose-300">-{formatKRW(totalExpense)}</span>
            </div>
            <div className="w-full h-2.5 bg-[#1a1d24] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    totalExpense > 0 && Math.max(totalIncome, totalExpense) > 0
                      ? (totalExpense / Math.max(totalIncome, totalExpense)) * 100
                      : 0,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {totalIncome > 0 && (
          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>수입 대비 지출 비율</span>
            <span className="font-bold text-slate-200">
              {Math.round((totalExpense / totalIncome) * 100)}% 사용 (저축 여력 {savingsRate}%)
            </span>
          </div>
        )}
      </div>

      {/* 3. Month-over-Month Comparison Card */}
      <div className="bg-[#121418] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">
              {analysisType === 'expense' ? '전월 대비 지출 추이' : '전월 대비 수입 추이'}
            </div>
            <div className="text-2xl font-black text-white tracking-tight mt-0.5">
              {analysisType === 'expense' ? `-${formatKRW(activeTotal)}` : `+${formatKRW(activeTotal)}`}
            </div>
          </div>

          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-bold border ${
              diffAmount > 0
                ? analysisType === 'expense'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : diffAmount < 0
                ? analysisType === 'expense'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
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

        <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-2.5 flex items-center justify-between">
          <span>지난달 ({parseInt(prevYearMonth.split('-')[1])}월) {analysisType === 'expense' ? '지출' : '수입'}</span>
          <span className="font-semibold text-slate-200">
            {formatKRW(prevActiveTotal)} (
            {diffAmount > 0 ? '+' : ''}
            {formatKRW(diffAmount)})
          </span>
        </div>
      </div>

      {/* 4. Rich Insight Mini Grid (핵심 소비 분석 지표) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Daily Average */}
        <div className="bg-[#121418] border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>일평균 {analysisType === 'expense' ? '지출' : '수입'}</span>
          </div>
          <div className="text-base font-extrabold text-white">
            {formatKRW(dailyAverage)}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {daysInMonthSoFar}일 기준 계산
          </div>
        </div>

        {/* Top Spending / Income Category */}
        <div className="bg-[#121418] border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>최다 {analysisType === 'expense' ? '지출' : '수입'}</span>
          </div>
          <div className="text-base font-extrabold text-white truncate">
            {categoryRanking[0]?.name || '-'}
          </div>
          <div className="text-[10px] text-amber-400 font-bold truncate">
            {categoryRanking[0] ? `${Math.round(categoryRanking[0].percent)}% (${formatKRW(categoryRanking[0].amount)})` : '-'}
          </div>
        </div>
      </div>

      {/* Single Biggest Expense Alert (단일 최대 거래) */}
      {biggestTx && (
        <div className="bg-[#121418] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-lg shrink-0">
              {biggestCat?.icon || '💥'}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">
                이달의 최대 단일 {analysisType === 'expense' ? '지출' : '수입'}
              </div>
              <div className="text-xs font-bold text-white truncate">
                {biggestTx.memo || biggestCat?.name || '내역'} ({biggestTx.date})
              </div>
            </div>
          </div>
          <span className="text-sm font-extrabold text-rose-300 shrink-0 pl-2">
            {analysisType === 'expense' ? '-' : '+'}{formatKRW(biggestTx.amount)}
          </span>
        </div>
      )}

      {/* Payment Method Breakdown (신용/체크카드 vs 현금 비중) */}
      {analysisType === 'expense' && totalExpense > 0 && (
        <div className="bg-[#121418] border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">결제 수단별 지출 비중</span>
            <span className="text-[11px] text-slate-400">
              카드 {cardPercent}% · 현금 {cashPercent}%
            </span>
          </div>

          <div className="w-full h-2 bg-[#1a1d24] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${cardPercent}%` }}
              title={`신용/체크카드 ${cardPercent}%`}
            />
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${cashPercent}%` }}
              title={`현금 ${cashPercent}%`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="flex items-center gap-2 bg-[#1a1d24] p-2 rounded-xl border border-slate-800">
              <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">신용/체크카드</div>
                <div className="font-bold text-slate-200 text-xs truncate">
                  {formatKRW(cardTotal)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#1a1d24] p-2 rounded-xl border border-slate-800">
              <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">현금</div>
                <div className="font-bold text-slate-200 text-xs truncate">
                  {formatKRW(cashTotal)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Category Ranking List with Search Box */}
      <div className="bg-[#121418] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-sm">
              카테고리별 {analysisType === 'expense' ? '지출' : '수입'} 순위
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {categoryRanking.length}개 분류
          </span>
        </div>

        {/* In-Stats Search Bar */}
        <div className="relative flex items-center bg-[#1a1d24] border border-slate-800 rounded-xl px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            value={statsSearchQuery}
            onChange={(e) => setStatsSearchQuery(e.target.value)}
            placeholder="카테고리 또는 메모 검색..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {statsSearchQuery && (
            <button
              type="button"
              onClick={() => setStatsSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {categoryRanking.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            {statsSearchQuery ? '검색된 내역이 없습니다.' : '기록된 내역이 없습니다.'}
          </div>
        ) : (
          <div className="space-y-3.5 pt-1">
            {categoryRanking.map((item, idx) => {
              const color = RANK_COLORS[idx % RANK_COLORS.length]
              const rankNumber = idx + 1
              const isExpanded = expandedCatId === item.id

              return (
                <div
                  key={item.id}
                  className={`p-2.5 -mx-1 rounded-2xl border transition-all ${
                    isExpanded
                      ? 'bg-[#16181f] border-slate-800 shadow-md'
                      : 'border-transparent hover:bg-[#16181f]/60 hover:border-slate-850'
                  }`}
                >
                  {/* Category Summary Header (Clickable to Toggle Transaction List) */}
                  <div
                    onClick={() => setExpandedCatId(isExpanded ? null : item.id)}
                    className="space-y-1.5 cursor-pointer select-none"
                    title="터치하여 이번 달 상세 가계부 내역 보기"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Rank Number Badge */}
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            rankNumber === 1
                              ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
                              : rankNumber === 2
                              ? 'bg-slate-300 text-slate-950'
                              : rankNumber === 3
                              ? 'bg-amber-700 text-amber-100'
                              : 'bg-slate-800 text-slate-400 font-normal'
                          }`}
                        >
                          {rankNumber}
                        </span>

                        <span className="text-lg shrink-0">{item.icon}</span>

                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-slate-200 text-xs truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-[#121418] px-1.5 py-0.5 rounded-full border border-slate-800 shrink-0">
                            {item.count}건
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-blue-400' : 'text-slate-500'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-white text-xs">
                          {formatKRW(item.amount)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium ml-2 font-mono">
                          {item.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Rounded Progress Bar */}
                    <div className="w-full h-2 bg-[#1a1d24] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded Transaction List (해당 월 카테고리 내역) */}
                  {isExpanded && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5 font-medium">
                        <span className="text-blue-400 font-semibold flex items-center gap-1">
                          <span>{parseInt(curMonthNum)}월 {item.name} 상세 내역</span>
                          <span className="text-slate-500 font-normal">({item.transactions.length}건)</span>
                        </span>
                        <span className="text-[10px] text-slate-500">터치 시 바로 수정/삭제</span>
                      </div>

                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                        {item.transactions.map((tx) => {
                          const asset = assets.find((a) => a.id === tx.asset_id)
                          const [, m, d] = tx.date.split('-')

                          return (
                            <div
                              key={tx.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                openInputModal(tx)
                              }}
                              className="flex items-center justify-between p-2.5 bg-[#121418] hover:bg-[#1c202a] active:scale-[0.99] border border-slate-800/90 rounded-xl transition-all cursor-pointer group/tx"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-[10px] font-mono text-slate-400 bg-[#1a1d24] px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                                  {m}.{d}
                                </span>
                                <div className="truncate">
                                  <div className="text-xs font-semibold text-slate-200 truncate group-hover/tx:text-white">
                                    {tx.memo || item.name}
                                  </div>
                                  {asset && (
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <span>{asset.icon}</span>
                                      <span>{asset.name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {tx.image_url && (
                                  <span className="text-xs text-blue-400" title="영수증 사진 첨부됨">
                                    📷
                                  </span>
                                )}
                                <span
                                  className={`text-xs font-bold font-mono ${
                                    tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {tx.type === 'expense' ? '-' : '+'}{formatKRW(tx.amount)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 6. Recent 6-Month Trend (Progress Pill Bar Style) */}
      <div className="bg-[#121418] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">
            최근 6개월 {analysisType === 'expense' ? '지출' : '수입'} 추이
          </h3>
          <span className="text-xs text-slate-400 font-medium">막대를 터치하면 해당 월로 이동</span>
        </div>

        {/* Vertical Progress Pill Track Bars */}
        <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-1">
          {sixMonths.map((m) => {
            const val = analysisType === 'expense' ? m.expense : m.income
            const heightPercent =
              maxTrendValue > 0 ? Math.max(Math.round((val / maxTrendValue) * 100), 6) : 6
            const isSelected = m.yearMonth === currentYearMonth

            return (
              <div
                key={m.yearMonth}
                onClick={() => setCurrentYearMonth(m.yearMonth)}
                className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
                title={`${m.yearMonth}로 이동`}
              >
                {/* Amount tooltip above bar */}
                <div
                  className={`text-[10px] font-semibold mb-1.5 truncate leading-none transition-all ${
                    isSelected ? 'text-blue-400 font-bold scale-105' : 'text-slate-400'
                  }`}
                >
                  {val > 0 ? (val >= 10000 ? `${Math.round(val / 10000)}만` : val) : '-'}
                </div>

                {/* Modern Pill Progress Track */}
                <div className="w-full max-w-[26px] bg-[#1a1d24] rounded-full h-full flex items-end overflow-hidden p-1 border border-slate-800/80 group-hover:border-slate-700 transition-all">
                  <div
                    className={`w-full rounded-full transition-all duration-500 ${
                      isSelected
                        ? analysisType === 'expense'
                          ? 'bg-gradient-to-t from-blue-600 to-indigo-400 shadow-md shadow-blue-500/30'
                          : 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-500/30'
                        : 'bg-slate-700 group-hover:bg-slate-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Month label */}
                <div
                  className={`text-xs mt-2 font-medium transition-colors ${
                    isSelected
                      ? 'text-blue-400 font-bold'
                      : 'text-slate-400 group-hover:text-slate-200'
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
