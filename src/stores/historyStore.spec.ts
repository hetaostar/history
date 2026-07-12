import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from './historyStore'

const eventInput = {
  timeLabel: '1911年',
  title: '辛亥革命',
  hint: '革命',
  summary: '推翻清朝统治。',
  detail: '辛亥革命爆发。',
  keywords: ['近代史'],
  personIds: [] as string[],
}

describe('historyStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('creates flat events without a timeline', () => {
    const store = useHistoryStore()
    const event = store.createEvent(eventInput)

    expect(event).not.toHaveProperty('timelineId')
    expect(store.events).toHaveLength(1)
  })

  it('returns every event sorted by its time label', () => {
    const store = useHistoryStore()
    store.createEvent(eventInput)
    store.createEvent({
      ...eventInput,
      timeLabel: '前221年',
      title: '秦统一六国',
    })
    store.createEvent({
      ...eventInput,
      timeLabel: '1840年',
      title: '鸦片战争',
    })

    expect(store.sortedEvents.map((event) => event.title)).toEqual([
      '秦统一六国',
      '鸦片战争',
      '辛亥革命',
    ])
  })

  it('searches only people, events and cards', () => {
    const store = useHistoryStore()
    store.createEvent(eventInput)
    store.createCard({
      front: '辛亥革命发生在哪一年？',
      back: '1911年',
      keywords: ['辛亥革命'],
      personIds: [],
      eventIds: [],
    })

    const result = store.search('辛亥')

    expect(result).not.toHaveProperty('timelines')
    expect(result.events).toHaveLength(1)
    expect(result.cards).toHaveLength(1)
  })

  it('removes a deleted event from cards and study records', () => {
    const store = useHistoryStore()
    const event = store.createEvent(eventInput)
    const card = store.createCard({
      front: '辛亥革命',
      back: '1911年',
      keywords: [],
      personIds: [],
      eventIds: [event.id],
    })
    store.recordStudy('event', event.id, 'remembered')

    store.deleteEvent(event.id)

    expect(store.events).toEqual([])
    expect(store.cards.find((item) => item.id === card.id)?.eventIds).toEqual([])
    expect(store.studyRecords).toEqual([])
  })

  it('removes a deleted person from related events', () => {
    const store = useHistoryStore()
    const person = store.createPerson({
      name: '孙中山',
      lifeTime: '1866-1925',
      summary: '革命家。',
      biography: '领导革命。',
      achievements: '推动共和。',
      keywords: ['近代史'],
    })
    store.createEvent({ ...eventInput, personIds: [person.id] })

    store.deletePerson(person.id)

    expect(store.events[0].personIds).toEqual([])
  })

  it('loads v1 local data and immediately persists the v2 migration', () => {
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify({
        version: 1,
        timelines: [],
        events: [{ id: 'event-1', ...eventInput, createdAt: '', updatedAt: '' }],
        people: [],
        cards: [],
        studyRecords: [],
      }),
    )

    const store = useHistoryStore()
    expect(store.version).toBe(2)
    expect(store.events[0]).not.toHaveProperty('timelineId')

    const persisted = JSON.parse(
      localStorage.getItem('history-memorization:data') ?? '{}',
    )
    expect(persisted.version).toBe(2)
    expect(persisted).not.toHaveProperty('timelines')
  })

  it('resets corrupted local data with a clear error', () => {
    localStorage.setItem('history-memorization:data', '{not valid json')

    const store = useHistoryStore()

    expect(store.version).toBe(2)
    expect(store.events).toEqual([])
    expect(store.lastError).toBe('本地数据损坏，已重置为空数据。')
  })

  it('reports local save failures without mentioning removed export', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage full')
    })
    const store = useHistoryStore()

    expect(() => store.createEvent(eventInput)).not.toThrow()
    expect(store.lastError).toBe('本地保存失败，请重试。')
  })
})
