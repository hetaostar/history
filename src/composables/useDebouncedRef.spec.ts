import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedRef } from './useDebouncedRef'

describe('useDebouncedRef', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes both value and debounced with the initial value', () => {
    const { value, debounced } = useDebouncedRef('hello', 200)

    expect(value.value).toBe('hello')
    expect(debounced.value).toBe('hello')
  })

  it('does not update debounced immediately after value changes', async () => {
    const { value, debounced } = useDebouncedRef('', 200)

    value.value = 'world'
    await nextTick()

    expect(debounced.value).toBe('')
  })

  it('updates debounced after the delay elapses', async () => {
    const { value, debounced } = useDebouncedRef('', 200)

    value.value = 'world'
    await nextTick()
    vi.advanceTimersByTime(200)

    expect(debounced.value).toBe('world')
  })

  it('only applies the last value after consecutive changes', async () => {
    const { value, debounced } = useDebouncedRef('', 200)

    value.value = 'a'
    value.value = 'b'
    value.value = 'c'
    await nextTick()
    vi.advanceTimersByTime(200)

    expect(debounced.value).toBe('c')
  })

  it('resets the timer on each change so debounced only updates after a quiet period', async () => {
    const { value, debounced } = useDebouncedRef('', 200)

    value.value = 'a'
    await nextTick()
    vi.advanceTimersByTime(150)
    value.value = 'b'
    await nextTick()
    vi.advanceTimersByTime(150)

    expect(debounced.value).toBe('')

    vi.advanceTimersByTime(50)

    expect(debounced.value).toBe('b')
  })
})
