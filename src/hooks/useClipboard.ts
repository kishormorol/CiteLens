/**
 * useClipboard — copy text to clipboard with visual feedback state.
 *
 * Returns { copied, copy } where `copied` is true for 2 seconds after copying.
 * Gracefully degrades when the Clipboard API is unavailable.
 */

import { useState, useCallback, useRef } from 'react'

export function useClipboard(timeoutMs = 2000) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers / non-HTTPS contexts
        const el = document.createElement('textarea')
        el.value = text
        el.style.position = 'fixed'
        el.style.left = '-9999px'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }

      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), timeoutMs)
      return true
    } catch {
      return false
    }
  }, [timeoutMs])

  return { copied, copy }
}
