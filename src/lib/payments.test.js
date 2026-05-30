import { describe, it, expect } from 'vitest'
import { currentPeriod, periodLabel, PAY_STATE } from './payments'

describe('payments helpers', () => {
  it('currentPeriod formatea YYYY-MM con cero a la izquierda', () => {
    expect(currentPeriod(new Date('2026-06-15T12:00:00'))).toBe('2026-06')
    expect(currentPeriod(new Date('2026-01-03T12:00:00'))).toBe('2026-01')
    expect(currentPeriod(new Date('2026-12-31T12:00:00'))).toBe('2026-12')
  })

  it('periodLabel devuelve mes y año en español', () => {
    const label = periodLabel('2026-06')
    expect(label.toLowerCase()).toContain('junio')
    expect(label).toContain('2026')
  })

  it('PAY_STATE cubre los 4 estados con label + cls', () => {
    for (const k of ['pending', 'validating', 'approved', 'rejected']) {
      expect(PAY_STATE[k]).toBeDefined()
      expect(PAY_STATE[k].label).toBeTruthy()
      expect(PAY_STATE[k].cls).toBeTruthy()
    }
  })
})
