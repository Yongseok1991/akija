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
    'h-14 sm:h-16 flex items-center justify-center text-xl font-semibold rounded-2xl active:scale-95 transition-all select-none shadow-sm'
  const numBtn = `${btnBase} bg-slate-800 text-slate-100 active:bg-slate-700 hover:bg-slate-750`
  const opBtn = `${btnBase} bg-blue-950/70 text-blue-400 border border-blue-800/40 active:bg-blue-900/60 font-bold`
  const utilBtn = `${btnBase} bg-slate-800/80 text-slate-300 active:bg-slate-700`
  const submitBtn = `${btnBase} bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold shadow-blue-500/20 shadow-md`

  return (
    <div className="grid grid-cols-4 gap-2 px-1 pb-2">
      {/* Row 1 */}
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
        onClick={() => handleKeyClick(() => onOperator('+'))}
        className={opBtn}
      >
        +
      </button>

      {/* Row 2 */}
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
      >
        -
      </button>

      {/* Row 3 */}
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
        onClick={() => handleKeyClick(onBackspace)}
        className={utilBtn}
        aria-label="지우기"
      >
        <Delete className="w-6 h-6 text-slate-300" />
      </button>

      {/* Row 4 */}
      <button
        type="button"
        onClick={() => handleKeyClick(onClear)}
        className={`${utilBtn} text-rose-400 font-bold`}
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
        className={`${numBtn} text-lg`}
      >
        00
      </button>
      <button
        type="button"
        onClick={() => handleKeyClick(onSubmit)}
        className={submitBtn}
      >
        <div className="flex items-center gap-1">
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{submitLabel}</span>
        </div>
      </button>
    </div>
  )
}
