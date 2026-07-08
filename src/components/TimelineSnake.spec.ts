import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TimelineSnake from './TimelineSnake.vue'
import type { IHistoryEvent } from '@/domain/historyTypes'

function createEvent(id: string, year: number): IHistoryEvent {
  return {
    id,
    timelineId: 'timeline-1',
    timeLabel: `${year}年`,
    title: `事件 ${id}`,
    hint: `提示 ${id}`,
    summary: `简介 ${id}`,
    detail: `详情 ${id}`,
    keywords: [],
    personIds: [],
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  }
}

describe('TimelineSnake', () => {
  it('renders event nodes and emits selected event', async () => {
    const events = [createEvent('a', 1), createEvent('b', 2)]
    const wrapper = mount(TimelineSnake, {
      props: { events },
    })

    expect(wrapper.text()).toContain('事件 a')
    expect(wrapper.text()).toContain('简介 b')

    await wrapper.findAll('[data-test^="event-node-"]')[0].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([events[0]])
  })

  it('shows study result on matching event nodes', () => {
    const events = [createEvent('a', 1), createEvent('b', 2)]
    const wrapper = mount(TimelineSnake, {
      props: {
        events,
        studyResults: {
          a: 'remembered',
          b: 'forgotten',
        },
      },
    })

    expect(wrapper.text()).toContain('已背过')
    expect(wrapper.text()).toContain('未背过')
  })

  it('emits edit when clicking the edit button', async () => {
    const events = [createEvent('a', 1)]
    const wrapper = mount(TimelineSnake, {
      props: { events },
    })

    await wrapper.get('[data-test="edit-event"]').trigger('click')
    expect(wrapper.emitted('edit')?.[0]).toEqual([events[0]])
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
