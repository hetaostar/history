import { describe, expect, it } from 'vitest'
import { createSnakeRows } from './timelineLayout'

describe('createSnakeRows', () => {
  it('chunks events and reverses every second row', () => {
    const rows = createSnakeRows(['a', 'b', 'c', 'd', 'e'], 3)

    expect(rows).toEqual([
      { direction: 'ltr', items: ['a', 'b', 'c'] },
      { direction: 'rtl', items: ['e', 'd'] },
    ])
  })
})
