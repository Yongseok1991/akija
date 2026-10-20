import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Calendar,
  ChevronDown,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Repeat,
  Camera,
  Image as ImageIcon,
} from 'lucide-react'
import type { TransactionType, Category, Asset } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { CustomNumpad } from './CustomNumpad'
import { CategorySheet } from './CategorySheet'
import { AssetSheet } from './AssetSheet'
import { QuickMemoTags } from './QuickMemoTags'
import { evaluateExpression } from '../../utils/formatters'
import { getTodayString } from '../../utils/dateUtils'
import { compressImage } from '../../utils/imageCompressor'

export const FastInputModal: React.FC = () => {
  const {
    isInputModalOpen,
    editingTransaction,
    closeInputModal,
    addTransaction,
    updateTransaction,
    categories,
    assets,
  } = useAppStore()

  // Input states
  const [type, setType] = useState<TransactionType>('expense')
  const [expression, setExpression] = useState<string>('')
  const [date, setDate] = useState<string>(getTodayString())
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [toAsset, setToAsset] = useState<Asset | null>(null) // For transfers
  const [memo, setMemo] = useState<string>('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Bottom sheet triggers
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false)
  const [isAssetSheetOpen, setIsAssetSheetOpen] = useState(false)
  const [isToAssetSheetOpen, setIsToAssetSheetOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  // Initialize or reset on open
  useEffect(() => {
    if (isInputModalOpen) {
      if (editingTransaction) {
        // Edit mode
        setType(editingTransaction.type)
        setExpression(String(editingTransaction.amount))
        setDate(editingTransaction.date)
        setMemo(editingTransaction.memo || '')
        setImageUrl(editingTransaction.image_url || null)
        setImageSizeKb(null)

        const cat = categories.find((c) => c.id === editingTransaction.category_id) || null
        setSelectedCategory(cat)

        const ast = assets.find((a) => a.id === editingTransaction.asset_id) || assets[0] || null
        setSelectedAsset(ast)

        const toAst = editingTransaction.to_asset_id
          ? assets.find((a) => a.id === editingTransaction.to_asset_id) || null
          : null
        setToAsset(toAst)
      } else {
        // Smart Default mode: 오늘 날짜, 지출
        setType('expense')
        setExpression('')
        setDate(getTodayString())
        setMemo('')
        setImageUrl(null)
        setImageSizeKb(null)

        const defaultCat = categories.find((c) => c.type === 'expense') || categories[0] || null
        setSelectedCategory(defaultCat)

        const defaultAsset = assets.find((a) => a.type === 'card') || assets[0] || null
        setSelectedAsset(defaultAsset)

        const defaultToAsset = assets.find((a) => a.type === 'bank') || assets[1] || null
        setToAsset(defaultToAsset)
      }
    }
  }, [isInputModalOpen, editingTransaction, categories, assets])

  if (!isInputModalOpen) return null

  // Type change handler
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    if (newType === 'expense') {
      const cat = categories.find((c) => c.type === 'expense') || null
      setSelectedCategory(cat)
      if (selectedAsset?.type !== 'card') {
        const card = assets.find((a) => a.type === 'card')
        if (card) setSelectedAsset(card)
      }
    } else if (newType === 'income') {
      const cat = categories.find((c) => c.type === 'income') || null
      setSelectedCategory(cat)
      if (selectedAsset?.type === 'card') {
        const bank = assets.find((a) => a.type === 'bank')
        if (bank) setSelectedAsset(bank)
      }
    }
  }

  // Handle Photo selection and ultra-lightweight compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressing(true)
    try {
      const result = await compressImage(file, 800, 0.65)
      setImageUrl(result.dataUrl)
      setImageSizeKb(Math.round(result.compressedSize / 1024))
    } catch (err) {
      console.error('Image compression failed:', err)
      alert('이미지 압축 중 오류가 발생했습니다.')
    } finally {
      setIsCompressing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Numpad key handlers
  const handleNumber = (digit: string) => {
    if (expression === '0') {
      setExpression(digit)
    } else {
      setExpression((prev) => prev + digit)
    }
  }

  const handleOperator = (op: string) => {
    if (!expression) return
    const lastChar = expression.slice(-1)
    if (['+', '-', '*', '/'].includes(lastChar)) {
      setExpression((prev) => prev.slice(0, -1) + op)
    } else {
      setExpression((prev) => prev.slice(0, -1) + op)
    }
  }

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setExpression('')
  }

  const computedAmount = evaluateExpression(expression)

  // Submit transaction
  const handleSubmit = () => {
    const finalAmount = computedAmount > 0 ? computedAmount : 0
    if (finalAmount <= 0) {
      alert('0원보다 큰 금액을 입력해 주세요.')
      return
    }

    if (!selectedAsset) {
      alert('결제 수단(자산)을 선택해 주세요.')
      return
    }

    if (type === 'transfer' && !toAsset) {
      alert('입금 받을 자산을 선택해 주세요.')
      return
    }

    if (type === 'transfer' && selectedAsset.id === toAsset?.id) {
      alert('출금 자산과 입금 자산이 동일합니다. 다른 자산을 선택해 주세요.')
      return
    }

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        type,
        amount: finalAmount,
        date,
        category_id: type !== 'transfer' ? selectedCategory?.id : undefined,
        asset_id: selectedAsset.id,
        to_asset_id: type === 'transfer' ? toAsset?.id : undefined,
        memo,
        image_url: imageUrl || undefined,
      })
    } else {
      addTransaction({
        type,
        amount: finalAmount,
        date,
        category_id: type !== 'transfer' ? selectedCategory?.id : undefined,
        asset_id: selectedAsset.id,
        to_asset_id: type === 'transfer' ? toAsset?.id : undefined,
        memo,
        image_url: imageUrl || undefined,
      })
    }
  }

  const todayStr = getTodayString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Background Dim */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={closeInputModal}
      />

      {/* Hidden File Input for Camera/Gallery */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* Main Bottom Sheet Modal */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[96vh] pb-safe">
        {/* Top Handle & Close */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto" />
          <button
            type="button"
            onClick={closeInputModal}
            className="absolute right-4 top-3 p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Transaction Type 3-Tab (지출, 수입, 이체) */}
        <div className="px-5 pt-1 pb-2">
          <div className="grid grid-cols-3 p-1 bg-slate-800/90 rounded-2xl border border-slate-750">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>지출</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>수입</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                type === 'transfer'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>이체</span>
            </button>
          </div>
        </div>

        {/* 2. Amount Live Display (Zero OS Keyboard Read-Only Display) */}
        <div className="px-6 py-2.5 text-center bg-slate-950/40 border-y border-slate-800/60">
          <div className="text-xs text-slate-400 font-mono tracking-wider min-h-[1.2rem]">
            {expression && /[+\-]/.test(expression) ? (
              <span className="text-blue-400 font-semibold">{expression} =</span>
            ) : (
              <span>금액을 입력하세요</span>
            )}
          </div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-slate-100 flex items-center justify-center gap-1 mt-0.5">
            <span
              className={
                type === 'expense'
                  ? 'text-rose-400'
                  : type === 'income'
                  ? 'text-emerald-400'
                  : 'text-blue-400'
              }
            >
              {type === 'expense' ? '-' : type === 'income' ? '+' : ''}
            </span>
            <span>{computedAmount > 0 ? new Intl.NumberFormat('ko-KR').format(computedAmount) : '0'}</span>
            <span className="text-lg font-normal text-slate-400 ml-1">원</span>
          </div>
        </div>

        {/* 3. Fast Selector Row (날짜, 카테고리, 결제수단, 사진) */}
        <div className="px-5 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            {/* Quick Date Picker */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  date === todayStr ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterdayStr)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  date === yesterdayStr ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                어제
              </button>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="px-2 py-1.5 text-slate-400 hover:text-slate-200"
                title="날짜 선택"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Date Picker Native fallback inline without keyboard */}
            {isDatePickerOpen && (
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setIsDatePickerOpen(false)
                }}
                className="text-xs bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-slate-200 focus:outline-none"
              />
            )}

            {/* Category Button */}
            {type !== 'transfer' && (
              <button
                type="button"
                onClick={() => setIsCategorySheetOpen(true)}
                className="flex-1 flex items-center justify-between px-3 py-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs active:scale-95 transition-all truncate"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-base">{selectedCategory?.icon || '🏷️'}</span>
                  <span className="font-semibold text-slate-200 truncate">
                    {selectedCategory?.name || '분류'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>
            )}

            {/* Asset Button */}
            {type !== 'transfer' ? (
              <button
                type="button"
                onClick={() => setIsAssetSheetOpen(true)}
                className="flex-1 flex items-center justify-between px-3 py-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs active:scale-95 transition-all truncate"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-base">{selectedAsset?.icon || '💳'}</span>
                  <span className="font-semibold text-slate-200 truncate">
                    {selectedAsset?.name || '결제수단'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>
            ) : (
              // Transfer
              <div className="flex-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsAssetSheetOpen(true)}
                  className="flex-1 flex items-center justify-between px-2.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs truncate"
                >
                  <span className="truncate">{selectedAsset?.name || '출금'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <button
                  type="button"
                  onClick={() => setIsToAssetSheetOpen(true)}
                  className="flex-1 flex items-center justify-between px-2.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs truncate"
                >
                  <span className="truncate">{toAsset?.name || '입금'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              </div>
            )}

            {/* Photo Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                imageUrl
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
              title="영수증/소비 사진 첨부"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Photo Preview Thumbnail (if attached) */}
          {imageUrl && (
            <div className="flex items-center justify-between p-2 bg-slate-800/60 border border-slate-700/60 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700 relative shrink-0">
                  <img src={imageUrl} alt="첨부 사진" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>영수증 사진 첨부됨</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">
                    초경량 압축 완료 {imageSizeKb ? `(${imageSizeKb}KB)` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageUrl(null)
                  setImageSizeKb(null)
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50"
                title="사진 삭제"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Memo Chips */}
          <QuickMemoTags currentMemo={memo} onSelectMemo={(m) => setMemo(m)} />
        </div>

        {/* 4. Custom Virtual Numpad */}
        <div className="px-3 pb-2 pt-1 bg-slate-950/70 border-t border-slate-800/80">
          <CustomNumpad
            onNumber={handleNumber}
            onOperator={handleOperator}
            onBackspace={handleBackspace}
            onClear={handleClear}
            onSubmit={handleSubmit}
            submitLabel={editingTransaction ? '수정완료' : '입력완료'}
          />
        </div>
      </div>

      {/* Category Bottom Sheet */}
      <CategorySheet
        isOpen={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
        categories={categories}
        selectedCategoryId={selectedCategory?.id}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        type={type === 'income' ? 'income' : 'expense'}
      />

      {/* Asset Bottom Sheet (Source) */}
      <AssetSheet
        isOpen={isAssetSheetOpen}
        onClose={() => setIsAssetSheetOpen(false)}
        assets={assets}
        selectedAssetId={selectedAsset?.id}
        onSelectAsset={(ast) => setSelectedAsset(ast)}
        title={type === 'transfer' ? '출금 자산 선택' : '결제 수단 선택'}
      />

      {/* To Asset Bottom Sheet (Destination for Transfer) */}
      <AssetSheet
        isOpen={isToAssetSheetOpen}
        onClose={() => setIsToAssetSheetOpen(false)}
        assets={assets.filter((a) => a.id !== selectedAsset?.id)}
        selectedAssetId={toAsset?.id}
        onSelectAsset={(ast) => setToAsset(ast)}
        title="입금 자산 선택"
      />
    </div>
  )
}
