import { describe, test, expect } from 'vitest'
import { parseAdminEmails } from './auth'

describe('parseAdminEmails', () => {
  test('single email', () => {
    const s = parseAdminEmails('a@b.com')
    expect(s.has('a@b.com')).toBe(true)
    expect(s.size).toBe(1)
  })

  test('multiple comma-separated emails', () => {
    const s = parseAdminEmails('a@b.com,c@d.com')
    expect(s.has('a@b.com')).toBe(true)
    expect(s.has('c@d.com')).toBe(true)
    expect(s.size).toBe(2)
  })

  test('trims whitespace around commas', () => {
    const s = parseAdminEmails('a@b.com , c@d.com')
    expect(s.has('a@b.com')).toBe(true)
    expect(s.has('c@d.com')).toBe(true)
  })

  test('empty string → empty set', () => {
    expect(parseAdminEmails('').size).toBe(0)
  })

  test('undefined → empty set', () => {
    expect(parseAdminEmails(undefined).size).toBe(0)
  })

  test('unknown email not in set', () => {
    const s = parseAdminEmails('a@b.com')
    expect(s.has('other@x.com')).toBe(false)
  })

  // BUG REGRESSION: before fix, "a@b.com,c@d.com" was compared as one string
  test('regression: second admin email is recognized (was broken before fix)', () => {
    const s = parseAdminEmails('felipearana17@gmail.com,bandurriastrailrunning@gmail.com')
    expect(s.has('bandurriastrailrunning@gmail.com')).toBe(true)
  })

  test('regression: full env string is NOT treated as one email', () => {
    const envStr = 'felipearana17@gmail.com,bandurriastrailrunning@gmail.com'
    const s = parseAdminEmails(envStr)
    expect(s.has(envStr)).toBe(false)
  })
})
