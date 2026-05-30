import { describe, it, expect } from 'vitest'
import { isAdminRole, isStaff, isMember, hasPlanAccess, ROLE } from './roles'

describe('roles', () => {
  it('isAdminRole', () => {
    expect(isAdminRole({ role: 'admin' })).toBe(true)
    expect(isAdminRole({ role: 'trainer' })).toBe(false)
    expect(isAdminRole({ role: 'member' })).toBe(false)
    expect(isAdminRole(null)).toBe(false)
  })

  it('isStaff = admin o trainer', () => {
    expect(isStaff({ role: ROLE.ADMIN })).toBe(true)
    expect(isStaff({ role: ROLE.TRAINER })).toBe(true)
    expect(isStaff({ role: ROLE.MEMBER })).toBe(false)
    expect(isStaff(null)).toBe(false)
  })

  it('isMember = cualquier profile', () => {
    expect(isMember({ role: 'member' })).toBe(true)
    expect(isMember(null)).toBe(false)
    expect(isMember(undefined)).toBe(false)
  })

  describe('hasPlanAccess', () => {
    it('sin membership (legacy) = acceso', () => {
      expect(hasPlanAccess(null)).toBe(true)
      expect(hasPlanAccess(undefined)).toBe(true)
    })
    it('active/grace = acceso', () => {
      expect(hasPlanAccess({ status: 'active' })).toBe(true)
      expect(hasPlanAccess({ status: 'grace' })).toBe(true)
    })
    it('blocked = sin acceso', () => {
      expect(hasPlanAccess({ status: 'blocked' })).toBe(false)
    })
  })
})
