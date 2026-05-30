import { useEffect, useRef, useState } from 'react'

/**
 * Debounced auto-save.
 *
 * Watches `value` and calls `save(value)` after `delay` ms of inactivity.
 * Exposes a status machine: idle → saving → saved | error.
 *
 *   const { status, savedAt, flush } = useAutoSave(plan, savePlan, { delay: 1200, enabled: !!plan })
 *
 * - First render never triggers a save (avoids saving the just-loaded value).
 * - `flush()` saves immediately (e.g. before navigating away).
 * - `skipNext()` marks the next value change as not-dirty (e.g. after a remote load).
 */
export function useAutoSave(value, save, { delay = 1200, enabled = true } = {}) {
  const [status, setStatus]   = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [savedAt, setSavedAt] = useState(null)
  const timer   = useRef(null)
  const skip    = useRef(true)       // skip the initial value
  const latest  = useRef(value)
  const saveRef = useRef(save)

  saveRef.current = save
  latest.current  = value

  async function run() {
    setStatus('saving')
    try {
      await saveRef.current(latest.current)
      setStatus('saved')
      setSavedAt(new Date())
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    if (!enabled) return
    if (skip.current) { skip.current = false; return }
    setStatus('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(run, delay)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delay])

  return {
    status,
    savedAt,
    flush: () => { clearTimeout(timer.current); return run() },
    skipNext: () => { skip.current = true },
  }
}
