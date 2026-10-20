import React, { useState } from 'react'
import { Landmark, CreditCard, Plus, Edit2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatKRW } from '../../utils/formatters'
import type { Asset, AssetType } from '../../types'

export const AssetOverview: React.FC = () => {
  const { assets, updateAsset, addAsset } = useAppStore()

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // New asset form state
  const [newAssetName, setNewAssetName] = useState('')
  const [newAssetType, setNewAssetType] = useState<AssetType>('bank')
  const [newAssetBalance, setNewAssetBalance] = useState('')
  const [newAssetIcon, setNewAssetIcon] = useState('🏦')

  // Calculate Asset breakdown
  const cashAndBanks = assets.filter((a) => a.type === 'cash' || a.type === 'bank')
  const totalAssets = cashAndBanks.reduce((sum, a) => sum + a.balance, 0)

  const cards = assets.filter((a) => a.type === 'card')
  const totalLiabilities = cards.reduce((sum, a) => sum + a.balance, 0)

  const netWorth = totalAssets - totalLiabilities

  // Handle balance quick update
  const handleBalanceUpdate = (asset: Asset, newBalance: number) => {
    updateAsset({ ...asset, balance: newBalance })
    setEditingAsset(null)
  }

  // Handle add asset
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAssetName.trim()) return

    addAsset({
      name: newAssetName.trim(),
      type: newAssetType,
      balance: parseFloat(newAssetBalance) || 0,
      icon: newAssetIcon || (newAssetType === 'card' ? '💳' : newAssetType === 'cash' ? '💵' : '🏦'),
      sort_order: assets.length + 1,
    })

    setNewAssetName('')
    setNewAssetBalance('')
    setIsAddModalOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* 1. Net Worth Master Card */}
      <div className="bg-gradient-to-br from-blue-900/60 via-slate-850 to-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-xs text-blue-300 font-semibold tracking-wider">나의 순자산 (Net Worth)</div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
            {formatKRW(netWorth)}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-750/80">
            <div>
              <div className="text-xs text-emerald-400 font-medium">보유 자산 (현금/예금)</div>
              <div className="text-base sm:text-lg font-bold text-emerald-300 mt-0.5">
                +{formatKRW(totalAssets)}
              </div>
            </div>
            <div>
              <div className="text-xs text-rose-400 font-medium">부채 (신용카드 결제 예정)</div>
              <div className="text-base sm:text-lg font-bold text-rose-300 mt-0.5">
                -{formatKRW(totalLiabilities)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cash & Bank Accounts */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">보유 자산 (현금 및 계좌)</h3>
          </div>
          <span className="text-xs font-bold text-emerald-400">{formatKRW(totalAssets)}</span>
        </div>

        <div className="divide-y divide-slate-800">
          {cashAndBanks.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between py-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{asset.icon}</span>
                <div>
                  <div className="font-semibold text-sm text-slate-200">{asset.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {asset.type === 'cash' ? '현금' : '보통 예금'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">{formatKRW(asset.balance)}</span>
                <button
                  type="button"
                  onClick={() => setEditingAsset(asset)}
                  className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-all"
                  title="잔액 수정"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Credit Cards (Liabilities) */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-slate-100 text-sm">부채 (신용카드 미결제 대금)</h3>
          </div>
          <span className="text-xs font-bold text-rose-400">{formatKRW(totalLiabilities)}</span>
        </div>

        <div className="divide-y divide-slate-800">
          {cards.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between py-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{asset.icon}</span>
                <div>
                  <div className="font-semibold text-sm text-slate-200">{asset.name}</div>
                  <div className="text-[11px] text-slate-400">신용카드</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-rose-300">
                  {formatKRW(asset.balance)}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingAsset(asset)}
                  className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-all"
                  title="미결제액 수정"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Asset Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full py-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-2xl text-xs font-bold text-blue-400 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>새 자산/카드 추가</span>
        </button>
      </div>

      {/* Balance Quick Edit Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <h4 className="font-bold text-slate-100 text-base mb-1">
              {editingAsset.name} 잔액 수정
            </h4>
            <p className="text-xs text-slate-400 mb-4">현재 보유액 또는 미결제액을 직접 보정합니다.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const input = (e.currentTarget.elements.namedItem('balance') as HTMLInputElement).value
                handleBalanceUpdate(editingAsset, parseFloat(input) || 0)
              }}
              className="space-y-4"
            >
              <input
                type="number"
                name="balance"
                defaultValue={editingAsset.balance}
                step="1"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-lg font-bold focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <h4 className="font-bold text-slate-100 text-base mb-3">새 자산/결제수단 추가</h4>
            <form onSubmit={handleCreateAsset} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">종류</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bank', 'card', 'cash'] as AssetType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setNewAssetType(t)
                        setNewAssetIcon(t === 'card' ? '💳' : t === 'cash' ? '💵' : '🏦')
                      }}
                      className={`py-2 text-xs font-semibold rounded-xl border ${
                        newAssetType === t
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {t === 'bank' ? '은행' : t === 'card' ? '신용카드' : '현금'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">이름</label>
                <input
                  type="text"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="예: 카카오뱅크, 현대카드"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">아이콘(이모지)</label>
                <input
                  type="text"
                  value={newAssetIcon}
                  onChange={(e) => setNewAssetIcon(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  초기 {newAssetType === 'card' ? '미결제액' : '잔액'} (원)
                </label>
                <input
                  type="number"
                  value={newAssetBalance}
                  onChange={(e) => setNewAssetBalance(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
