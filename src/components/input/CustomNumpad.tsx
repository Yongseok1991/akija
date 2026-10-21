import React from 'react'
import { Delete, Check } from 'lucide-react'

interface CustomNumpadProps {
  onNumber: (digit: string) => void
  onOperator: (op: string) => void
  onBackspace: () => void
  onClear: () => void
  onSubmit: () => void
  submitLabel?: string
}

export const CustomNumpad: React.FC<CustomNumpadProps> = ({
  onNumber,
  onOperator,
  onBackspace,
  onClear,
  onSubmit,
  submitLabel = '완료',
}) => {
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8)
      } catch {
        // ignore
      }
    }
  }

  const handleKeyClick = (action: () => void) => {
    triggerHaptic()
    action()
  }

  const btnBase =
    'h-12 xs:h-13 sm:h-14 flex items-center justify-center text-xl font-bold rounded-2xl active:scale-95 transition-all select-none shadow-sm touch-manipulation'
  const numBtn = `${btnBase} bg-slate-800 text-slate-100 hover:bg-slate-750 active:bg-slate-700 border border-slate-750`
  const opBtn = `${btnBase} bg-slate-800/90 text-blue-400 border border-blue-900/40 hover:bg-slate-750 active:bg-blue-600/30 text-2xl font-black`
  const utilBtn = `${btnBase} bg-slate-800/90 text-slate-300 hover:bg-slate-750 active:bg-slate-700 border border-slate-750`
  const submitBtn = `${btnBase} bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold shadow-blue-500/25 shadow-md text-sm sm:text-base`

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 px-1 pb-1">
      {/* Row 1: 1 2 3 + (모바일 표준 키패드 순서) */}
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('1'))}
        className={numBtn}
      >
        1
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('2'))}
        className={numBtn}
      >
        2
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('3'))}
        className={numBtn}
      >
        3
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onOperator('+'))}
        className={opBtn}
        aria-label="더하기"
      >
        +
      </button>

      {/* Row 2: 4 5 6 - */}
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('4'))}
        className={numBtn}
      >
        4
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('5'))}
        className={numBtn}
      >
        5
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('6'))}
        className={numBtn}
      >
        6
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onOperator('-'))}
        className={opBtn}
        aria-label="빼기"
      >
        -
      </button>

      {/* Row 3: 7 8 9 ⌫ */}
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('7'))}
        className={numBtn}
      >
        7
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('8'))}
        className={numBtn}
      >
        8
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('9'))}
        className={numBtn}
      >
        9
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(onBackspace)}
        className={utilBtn}
        aria-label="지우기"
      >
        <Delete className="w-5 h-5 text-slate-300" />
      </button>

      {/* Row 4: C 0 00 완료 */}
      <button
        type="button"
        onClick={() => handleKeyClick(onClear)}
        className={`${utilBtn} text-rose-400 font-extrabold text-base`}
        aria-label="초기화"
      >
        C
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('0'))}
        className={numBtn}
      >
        0
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(() => onNumber('00'))}
        className={`${numBtn} text-base sm:text-lg`}
      >
        00
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(onSubmit)}
        className={submitBtn}
      >
        <div className="flex items-center justify-center gap-1">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{submitLabel}</span>
        </div>
      </button>
    </div>
  )
}
