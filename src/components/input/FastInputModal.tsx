import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Calendar,
  ChevronDown,
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
  const datePickerRef = useRef<HTMLInputElement | null>(null)

  // Bottom sheet triggers
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false)
  const [isAssetSheetOpen, setIsAssetSheetOpen] = useState(false)
  const [isToAssetSheetOpen, setIsToAssetSheetOpen] = useState(false)

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
  }, [isInputModalOpen, editingTransaction])

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
    setExpression((prev) => {
      if (!prev || prev === '0') {
        if (digit === '00' || digit === '0') return '0'
        return digit
      }
      return prev + digit
    })
  }

  const handleOperator = (op: string) => {
    setExpression((prev) => {
      if (!prev) return ''
      const lastChar = prev.slice(-1)
      if (['+', '-', '*', '/'].includes(lastChar)) {
        return prev.slice(0, -1) + op
      }
      return prev + op
    })
  }

  const handleBackspace = () => {
    setExpression((prev) => {
      if (!prev || prev.length <= 1) return ''
      return prev.slice(0, -1)
    })
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

  const formatDateLabel = (d: string) => {
    const today = getTodayString()
    if (d === today) {
      const parts = d.split('-')
      return `오늘 (${parseInt(parts[1])}/${parseInt(parts[2])})`
    }
    const yest = new Date()
    yest.setDate(yest.getDate() - 1)
    const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`
    if (d === yestStr) {
      const parts = d.split('-')
      return `어제 (${parseInt(parts[1])}/${parseInt(parts[2])})`
    }
    const parts = d.split('-')
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`
  }

  const QUICK_MEMO_SUGGESTIONS = [
    '점심',
    '저녁',
    '커피',
    '마트',
    '편의점',
    '술',
    '배달',
    '생활용품',
    '주유',
    '쇼핑',
  ]

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

      {/* Hidden Native Date Input */}
      <input
        type="date"
        ref={datePickerRef}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="sr-only absolute"
      />

      {/* Main Bottom Sheet Modal */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-800 rounded-t-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden pb-safe pointer-events-auto animate-in slide-in-from-bottom-6 duration-200">
        {/* Top Handle & Close */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-xs font-bold text-slate-400">
            {editingTransaction ? '가계부 내역 수정' : type === 'income' ? '수입 등록' : type === 'transfer' ? '이체 등록' : '지출 등록'}
          </span>
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
          <button
            type="button"
            onClick={closeInputModal}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Transaction Type 3-Tab (지출, 수입, 이체) */}
        <div className="px-4 py-1">
          <div className="grid grid-cols-3 p-1 bg-slate-800/90 rounded-2xl border border-slate-750">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs transition-all ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>지출</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs transition-all ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>수입</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs transition-all ${
                type === 'transfer'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>이체</span>
            </button>
          </div>
        </div>

        {/* 2. Amount Live Display (Zero OS Keyboard Read-Only Display) */}
        <div className="px-4 py-2 text-center bg-slate-950/40 border-y border-slate-800/60 select-none">
          <div className="text-[11px] text-slate-400 font-mono tracking-wider min-h-[1rem]">
            {expression ? (
              <span className="text-blue-400 font-semibold">{expression} {/[+\-]/.test(expression) ? '=' : ''}</span>
            ) : (
              <span>금액을 아래 키패드로 입력하세요</span>
            )}
          </div>
          <div className="text-3xl font-black tracking-tight text-slate-100 flex items-center justify-center gap-1 mt-0.5">
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
            <span className="text-base font-normal text-slate-400 ml-1">원</span>
          </div>
        </div>

        {/* 3. Fast Selector Grid (날짜, 카테고리, 결제수단 3분할 그리드) */}
        <div className="px-4 py-2 space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {/* Quick Date Picker */}
            <button
              type="button"
              onClick={() => {
                try {
                  (datePickerRef.current as any)?.showPicker?.() || datePickerRef.current?.click()
                } catch {
                  datePickerRef.current?.click()
                }
              }}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 active:scale-95 transition-all truncate"
              title="날짜 선택"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{formatDateLabel(date)}</span>
              <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
            </button>

            {/* Category Button */}
            {type !== 'transfer' ? (
              <button
                type="button"
                onClick={() => setIsCategorySheetOpen(true)}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 active:scale-95 transition-all truncate"
              >
                <span className="text-sm shrink-0">{selectedCategory?.icon || '🏷️'}</span>
                <span className="truncate">{selectedCategory?.name || '분류'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAssetSheetOpen(true)}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 active:scale-95 transition-all truncate"
              >
                <span className="truncate">{selectedAsset?.name || '출금'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
              </button>
            )}

            {/* Asset Button */}
            {type !== 'transfer' ? (
              <button
                type="button"
                onClick={() => setIsAssetSheetOpen(true)}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 active:scale-95 transition-all truncate"
              >
                <span className="text-sm shrink-0">{selectedAsset?.icon || '💳'}</span>
                <span className="truncate">{selectedAsset?.name || '자산'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsToAssetSheetOpen(true)}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 active:scale-95 transition-all truncate"
              >
                <span className="truncate">{toAsset?.name || '입금'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
              </button>
            )}
          </div>

          {/* Memo Input Row with Camera Button */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="내용 / 메모 입력 (선택)"
              className="flex-1 min-w-0 bg-transparent text-slate-100 text-xs focus:outline-none placeholder:text-slate-500 font-medium"
            />
            {memo && (
              <button
                type="button"
                onClick={() => setMemo('')}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                imageUrl
                  ? 'bg-blue-600/30 border-blue-500 text-blue-400'
                  : 'bg-slate-750/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="영수증 사진 첨부"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Memo Tags Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_MEMO_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setMemo(memo ? `${memo} ${tag}` : tag)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60 hover:border-slate-600 whitespace-nowrap active:scale-95 transition-all shrink-0"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Photo Preview Thumbnail (if attached) */}
          {imageUrl && (
            <div className="flex items-center justify-between p-2 bg-slate-800/60 border border-slate-700/60 rounded-xl animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 relative shrink-0">
                  <img src={imageUrl} alt="첨부 사진" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-blue-400" />
                    <span>영수증 사진 첨부됨</span>
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    초경량 압축 {imageSizeKb ? `(${imageSizeKb}KB)` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageUrl(null)
                  setImageSizeKb(null)
                }}
                className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50"
                title="사진 삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 4. Custom Virtual Numpad */}
        <div className="px-3 pb-2 pt-1 bg-slate-950/80 border-t border-slate-800/80">
          <CustomNumpad
            onNumber={handleNumber}
            onOperator={handleOperator}
            onBackspace={handleBackspace}
            onClear={handleClear}
            onSubmit={handleSubmit}
            submitLabel={editingTransaction ? '수정' : '완료'}
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
