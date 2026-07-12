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

  it('搜索保留本地事件和卡片并从静态教材人物中匹配姓名', () => {
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
    expect(store.search('孔子').people).toMatchObject([
      { id: 'g7u-confucius', name: '孔子' },
    ])
  })

  it.each([
    ['前551', 'g7u-confucius'],
    ['重视教育与仁礼', 'g7u-confucius'],
  ])('静态人物搜索匹配 lifeTime 或 summary：%s', (query, personId) => {
    expect(useHistoryStore().search(query).people.map((person) => person.id)).toContain(
      personId,
    )
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

  it('不再暴露人物 state、CRUD，也不把人物写入持久化数据', () => {
    const store = useHistoryStore()
    const exposed = store as unknown as Record<string, unknown>

    expect(exposed).not.toHaveProperty('people')
    expect(exposed).not.toHaveProperty('createPerson')
    expect(exposed).not.toHaveProperty('updatePerson')
    expect(exposed).not.toHaveProperty('deletePerson')

    store.persist()
    const persisted = JSON.parse(
      localStorage.getItem('history-memorization:data') ?? '{}',
    )
    expect(persisted).not.toHaveProperty('people')
  })

  it('加载 v1 本地数据后立即持久化 v3 迁移', () => {
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify({
        version: 1,
        timelines: [],
        events: [{ id: 'event-1', ...eventInput, createdAt: '', updatedAt: '' }],
        people: [
          {
            id: 'legacy-person',
            name: '旧人物',
            lifeTime: '',
            summary: '',
            biography: '',
            achievements: '',
            keywords: [],
            createdAt: '',
            updatedAt: '',
          },
        ],
        cards: [],
        studyRecords: [],
      }),
    )

    const store = useHistoryStore()
    expect(store.version).toBe(3)
    expect(store.events[0]).not.toHaveProperty('timelineId')
    expect(store.events[0].personIds).toEqual([])

    const persisted = JSON.parse(
      localStorage.getItem('history-memorization:data') ?? '{}',
    )
    expect(persisted.version).toBe(3)
    expect(persisted).not.toHaveProperty('timelines')
    expect(persisted).not.toHaveProperty('people')
  })

  it('加载非 canonical v3 数据后立即规范化内存和本地存储', () => {
    const storedData = {
      version: 3,
      events: [
        {
          id: 'event-1',
          ...eventInput,
          personIds: ['g7u-confucius', 'missing-person'],
          createdAt: '',
          updatedAt: '',
        },
      ],
      people: [{ id: 'legacy-person' }],
      cards: [],
      studyRecords: [],
    }
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify(storedData),
    )
    const setItem = vi.spyOn(localStorage, 'setItem')

    const store = useHistoryStore()

    expect(store.events[0].personIds).toEqual(['g7u-confucius'])
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(
      JSON.parse(localStorage.getItem('history-memorization:data') ?? '{}'),
    ).toEqual({
      version: 3,
      events: [
        {
          id: 'event-1',
          ...eventInput,
          personIds: ['g7u-confucius'],
          createdAt: '',
          updatedAt: '',
        },
      ],
      cards: [],
      studyRecords: [],
    })
  })

  it('加载 canonical v3 数据时不重复写入本地存储', () => {
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify({
        version: 3,
        events: [],
        cards: [],
        studyRecords: [],
      }),
    )
    const setItem = vi.spyOn(localStorage, 'setItem')

    useHistoryStore()

    expect(setItem).not.toHaveBeenCalled()
  })

  it('resets corrupted local data with a clear error', () => {
    localStorage.setItem('history-memorization:data', '{not valid json')

    const store = useHistoryStore()

    expect(store.version).toBe(3)
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
