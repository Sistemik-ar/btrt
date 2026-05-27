import { describe, test, expect } from 'vitest'
import {
  titleCase,
  formatTime,
  parseTimeToMinutes,
  formatMinutesShort,
  parseDistance,
  formatPace,
  percentile,
} from './format'

describe('titleCase', () => {
  test('basic', () => expect(titleCase('hola mundo')).toBe('Hola Mundo'))
  test('already uppercase', () => expect(titleCase('JUAN PEREZ')).toBe('Juan Perez'))
  test('empty string', () => expect(titleCase('')).toBe(''))
  test('null/undefined → empty string', () => {
    expect(titleCase(null)).toBe('')
    expect(titleCase(undefined)).toBe('')
  })
})

describe('formatTime', () => {
  test('strips milliseconds', () => expect(formatTime('00:17:25.348')).toBe('00:17:25'))
  test('no milliseconds → unchanged', () => expect(formatTime('1:30:00')).toBe('1:30:00'))
  test('null → null', () => expect(formatTime(null)).toBe(null))
  test('dash → null', () => expect(formatTime('-')).toBe(null))
})

describe('parseTimeToMinutes', () => {
  test('HH:MM:SS format', () => expect(parseTimeToMinutes('1:30:00')).toBeCloseTo(90))
  test('MM:SS format', () => expect(parseTimeToMinutes('45:30')).toBeCloseTo(45.5))
  test('strips milliseconds first', () => expect(parseTimeToMinutes('0:17:25.348')).toBeCloseTo(17 + 25/60))
  test('null → null', () => expect(parseTimeToMinutes(null)).toBe(null))
  test('dash → null', () => expect(parseTimeToMinutes('-')).toBe(null))
})

describe('formatMinutesShort', () => {
  test('under an hour', () => expect(formatMinutesShort(45)).toBe('45 min'))
  test('over an hour', () => expect(formatMinutesShort(90)).toBe('1h 30m'))
  test('exactly 2 hours', () => expect(formatMinutesShort(120)).toBe('2h 0m'))
  test('null → em dash', () => expect(formatMinutesShort(null)).toBe('—'))
})

describe('parseDistance', () => {
  test('integer km', () => expect(parseDistance('20Km - Caballeros')).toBe(20))
  test('lowercase km', () => expect(parseDistance('21km - Masculino')).toBe(21))
  test('decimal with dot', () => expect(parseDistance('42.195km')).toBeCloseTo(42.195))
  test('decimal with comma', () => expect(parseDistance('42,195km')).toBeCloseTo(42.195))
  test('no km → null', () => expect(parseDistance('sin distancia')).toBe(null))
  test('null → null', () => expect(parseDistance(null)).toBe(null))
})

describe('formatPace', () => {
  test('5 min/km', () => expect(formatPace(5)).toBe('5:00 /km'))
  test('4:30 pace', () => expect(formatPace(4.5)).toBe('4:30 /km'))
  test('rounds seconds', () => expect(formatPace(6.25)).toBe('6:15 /km'))
  test('null → null', () => expect(formatPace(null)).toBe(null))
  test('Infinity → null', () => expect(formatPace(Infinity)).toBe(null))
})

describe('percentile', () => {
  test('1st of 100 → 1%', () => expect(percentile(1, 100)).toBe(1))
  test('50th of 100 → 50%', () => expect(percentile(50, 100)).toBe(50))
  test('last of 100 → 100%', () => expect(percentile(100, 100)).toBe(100))
  test('min 1% even for pos=0', () => expect(percentile(0, 100)).toBe(null))
  test('null pos → null', () => expect(percentile(null, 100)).toBe(null))
  test('null total → null', () => expect(percentile(1, null)).toBe(null))
  test('zero total → null', () => expect(percentile(1, 0)).toBe(null))
})
