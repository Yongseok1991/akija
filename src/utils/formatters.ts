export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

export function formatSignedKRW(amount: number, type: 'expense' | 'income' | 'transfer'): string {
  const formatted = new Intl.NumberFormat('ko-KR').format(Math.abs(amount)) + '원'
  if (type === 'income') return `+${formatted}`
  if (type === 'expense') return `-${formatted}`
  return formatted
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 사칙연산 수식 문자열(예: "5000+3500-1200")을 안전하게 계산
 */
export function evaluateExpression(expr: string): number {
  if (!expr) return 0
  const sanitized = expr.replace(/[+\-*/.]+$/, '').trim()
  if (!sanitized) return 0

  if (!/^[0-9+\-*/.\s]+$/.test(sanitized)) {
    return 0
  }

  try {
    const tokens: (number | string)[] = []
    let numBuffer = ''

    for (let i = 0; i < sanitized.length; i++) {
      const char = sanitized[i]
      if ((char >= '0' && char <= '9') || char === '.') {
        numBuffer += char
      } else if (['+', '-', '*', '/'].includes(char)) {
        if (numBuffer) {
          tokens.push(parseFloat(numBuffer))
          numBuffer = ''
        } else if (char === '-' && (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string')) {
          numBuffer = '-'
          continue
        }
        tokens.push(char)
      }
    }
    if (numBuffer) {
      tokens.push(parseFloat(numBuffer))
    }

    if (tokens.length === 0) return 0

    const intermediate: (number | string)[] = []
    let i = 0
    while (i < tokens.length) {
      const token = tokens[i]
      if (token === '*' || token === '/') {
        const prev = intermediate.pop() as number
        const next = tokens[i + 1] as number
        if (token === '*') {
          intermediate.push(prev * next)
        } else {
          intermediate.push(next !== 0 ? prev / next : 0)
        }
        i += 2
      } else {
        intermediate.push(token)
      }
    }

    let result = intermediate[0] as number
    let j = 1
    while (j < intermediate.length) {
      const op = intermediate[j] as string
      const nextNum = intermediate[j + 1] as number
      if (op === '+') {
        result += nextNum
      } else if (op === '-') {
        result -= nextNum
      }
      j += 2
    }

    return Math.round(result)
  } catch {
    return 0
  }
}
