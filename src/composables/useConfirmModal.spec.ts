import { describe, expect, it } from 'vitest'
import { useConfirmModal } from './useConfirmModal'

describe('useConfirmModal', () => {
  it('request sets message and shows the modal', () => {
    const modal = useConfirmModal()

    modal.request('确认删除？', () => {})

    expect(modal.isVisible.value).toBe(true)
    expect(modal.message.value).toBe('确认删除？')
  })

  it('confirm runs the pending action and hides the modal', () => {
    const modal = useConfirmModal()
    let called = false
    modal.request('确认删除？', () => {
      called = true
    })

    modal.confirm()

    expect(called).toBe(true)
    expect(modal.isVisible.value).toBe(false)
  })

  it('cancel clears the pending action and hides the modal', () => {
    const modal = useConfirmModal()
    let called = false
    modal.request('确认删除？', () => {
      called = true
    })

    modal.cancel()

    expect(called).toBe(false)
    expect(modal.isVisible.value).toBe(false)
  })

  it('subsequent confirm only runs the latest pending action', () => {
    const modal = useConfirmModal()
    let firstCalled = false
    let secondCalled = false

    modal.request('第一次', () => {
      firstCalled = true
    })
    modal.request('第二次', () => {
      secondCalled = true
    })

    modal.confirm()

    expect(firstCalled).toBe(false)
    expect(secondCalled).toBe(true)
    expect(modal.message.value).toBe('第二次')
  })

  it('confirm without request is a no-op', () => {
    const modal = useConfirmModal()

    expect(() => modal.confirm()).not.toThrow()
    expect(modal.isVisible.value).toBe(false)
  })
})
