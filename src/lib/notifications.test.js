import { describe, it, expect } from 'vitest'
import { unreadCount, KIND_ICON } from './notifications'

describe('notifications helpers', () => {
  it('unreadCount cuenta sólo los no leídos', () => {
    const list = [
      { id: 1, isRead: false },
      { id: 2, isRead: true },
      { id: 3, isRead: false },
    ]
    expect(unreadCount(list)).toBe(2)
    expect(unreadCount([])).toBe(0)
    expect(unreadCount([{ isRead: true }])).toBe(0)
  })

  it('KIND_ICON tiene íconos para los tipos principales', () => {
    expect(KIND_ICON.payment).toBeTruthy()
    expect(KIND_ICON.plan).toBeTruthy()
    expect(KIND_ICON.info).toBeTruthy()
  })
})
