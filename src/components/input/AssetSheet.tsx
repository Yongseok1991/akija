import React, { useState, useEffect } from 'react'
import { X, Wallet, CreditCard, Check } from 'lucide-react'
import type { Asset } from '../../types'
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
  title = '결제 수단 선택',
}) => {
  const currentAsset = assets.find((a) => a.id === selectedAssetId)
  const [activeTab, setActiveTab] = useState<'card' | 'cash'>(
    currentAsset?.type === 'cash' ? 'cash' : 'card'
  )

  useEffect(() => {
    if (isOpen) {
      const ast = assets.find((a) => a.id === selectedAssetId)
      if (ast?.type === 'cash') setActiveTab('cash')
      else setActiveTab('card')
    }
  }, [isOpen, selectedAssetId, assets])

  if (!isOpen) return null

  const tabs: { key: 'card' | 'cash'; label: string; icon: React.ReactNode }[] = [
    { key: 'card', label: '신용/체크카드', icon: <CreditCard className="w-4 h-4" /> },
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
      <div className="relative z-10 bg-[#121418] border-t border-slate-800 rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 mb-2" />

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">결제 수단을 터치하면 바로 선택됩니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-segment Tab (신용/체크카드 | 현금) */}
        <div className="p-3 bg-[#0d0f12]">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#1a1d24] rounded-2xl border border-slate-800">
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
              등록된 {activeTab === 'card' ? '신용/체크카드' : '현금'}가 없습니다.
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
                      : 'bg-[#1a1d24] border-slate-800/80 text-slate-200 hover:bg-[#222630]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{asset.icon}</span>
                    <div className="text-left">
                      <div className="font-semibold text-sm text-slate-100">{asset.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {asset.type === 'card' ? '신용/체크카드' : '현금'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {asset.type === 'card' ? (
                      isSelected ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                          <Check className="w-3.5 h-3.5" />
                          선택됨
                        </span>
                      ) : null
                    ) : (
                      <>
                        <div className="text-xs text-slate-400">현재 잔액</div>
                        <div className="text-sm font-bold text-emerald-400">
                          {formatKRW(asset.balance)}
                        </div>
                      </>
                    )}
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
