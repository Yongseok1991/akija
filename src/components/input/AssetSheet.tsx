import React, { useState } from 'react'
import { X, Wallet, Landmark, CreditCard } from 'lucide-react'
import type { Asset, AssetType } from '../../types'
import { formatKRW } from '../../utils/formatters'

interface AssetSheetProps {
  isOpen: boolean
  onClose: () => void
  assets: Asset[]
  selectedAssetId?: string
  onSelectAsset: (asset: Asset) => void
  title?: string
}

export const AssetSheet: React.FC<AssetSheetProps> = ({
  isOpen,
  onClose,
  assets,
  selectedAssetId,
  onSelectAsset,
  title = '결제 수단 (자산) 선택',
}) => {
  const [activeTab, setActiveTab] = useState<AssetType>('card')

  if (!isOpen) return null

  const tabs: { key: AssetType; label: string; icon: React.ReactNode }[] = [
    { key: 'card', label: '신용카드', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'bank', label: '은행/계좌', icon: <Landmark className="w-4 h-4" /> },
    { key: 'cash', label: '현금', icon: <Wallet className="w-4 h-4" /> },
  ]

  const filteredAssets = assets.filter((a) => a.type === activeTab)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative z-10 bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-2" />

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">자산을 터치하면 바로 선택됩니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-segment Tab */}
        <div className="p-3 bg-slate-950/50">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/50">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Asset List */}
        <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2.5">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              등록된 {activeTab === 'card' ? '카드' : activeTab === 'bank' ? '은행' : '현금'} 자산이 없습니다.
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isSelected = asset.id === selectedAssetId
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelectAsset(asset)
                    onClose()
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'bg-slate-800/90 border-slate-750 text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{asset.icon}</span>
                    <div className="text-left">
                      <div className="font-semibold text-sm text-slate-100">{asset.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {asset.type === 'card' ? '신용카드' : asset.type === 'bank' ? '계좌' : '현금'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">
                      {asset.type === 'card' ? '이번달 누적' : '현재 잔액'}
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        asset.type === 'card' ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatKRW(asset.balance)}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
