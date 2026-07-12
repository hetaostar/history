import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from './historyStore'

const timestamp = '2026-06-21T00:00:00.000Z'

describe('historyStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('只持久化卡片和学习记录，不暴露事件 CRUD', () => {
    const store = useHistoryStore()

    expect(store).not.toHaveProperty('events')
    expect(store).not.toHaveProperty('createEvent')
    expect(store).not.toHaveProperty('updateEvent')
    expect(store).not.toHaveProperty('deleteEvent')
    expect(store).not.toHaveProperty('sortedEvents')
    expect(store).not.toHaveProperty('eventsByPerson')
  })

  it('搜索教材事件、教材人物和本地卡片', () => {
    const store = useHistoryStore()
    store.createCard({
      front: '秦始皇统一六国是哪一年？',
      back: '公元前221年',
      keywords: ['秦朝'],
      personIds: [],
      eventIds: ['china-event-0029'],
    })

    const result = store.search('秦始皇')

    expect(result.events).toContainEqual(
      expect.objectContaining({
        id: 'china-event-0029',
        title: '秦始皇统一六国',
      }),
    )
    expect(result.cards).toHaveLength(1)
    expect(result.people).toContainEqual(
      expect.objectContaining({ id: 'g7u-qin-shihuang' }),
    )
  })

  it('加载 v3 本地数据后立即持久化 v4 迁移结果', () => {
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify({
        version: 3,
        events: [
          {
            id: 'event-1',
            timeLabel: '1911年',
            title: '旧事件',
            hint: '',
            summary: '',
            detail: '',
            keywords: [],
            personIds: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        cards: [
          {
            id: 'card-1',
            front: '秦始皇统一六国',
            back: '公元前221年',
            hint: '',
            keywords: [],
            personIds: [],
            eventIds: ['event-1', 'china-event-0029'],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        studyRecords: [],
      }),
    )

    const store = useHistoryStore()
    const persisted = JSON.parse(
      localStorage.getItem('history-memorization:data') ?? '{}',
    )

    expect(store.version).toBe(4)
    expect(store.cards[0].eventIds).toEqual(['china-event-0029'])
    expect(persisted.version).toBe(4)
    expect(persisted).not.toHaveProperty('events')
  })

  it('加载同版本非 canonical 数据时立即规范化并回写', () => {
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify({
        version: 4,
        cards: [
          {
            id: 'card-1',
            front: '问题',
            back: '答案',
            hint: '',
            keywords: [],
            personIds: ['g7u-confucius', 'missing-person'],
            eventIds: ['china-event-0029', 'missing-event'],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        studyRecords: [],
      }),
    )
    const setItem = vi.spyOn(localStorage, 'setItem')

    const store = useHistoryStore()

    expect(store.cards[0].personIds).toEqual(['g7u-confucius'])
    expect(store.cards[0].eventIds).toEqual(['china-event-0029'])
    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('加载 canonical v4 数据时不重复写入本地存储', () => {
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify({
        version: 4,
        cards: [],
        studyRecords: [],
      }),
    )
    const setItem = vi.spyOn(localStorage, 'setItem')

    useHistoryStore()

    expect(setItem).not.toHaveBeenCalled()
  })

  it('只记录现存卡片和教材事件的学习结果', () => {
    const store = useHistoryStore()
    const card = store.createCard({
      front: '问题',
      back: '答案',
      keywords: [],
      personIds: [],
      eventIds: [],
    })

    expect(store.recordStudy('card', 'missing-card', 'remembered')).toBeUndefined()
    expect(
      store.recordStudy('event', 'missing-event', 'remembered'),
    ).toBeUndefined()
    expect(
      store.recordStudy('person', 'g7u-confucius', 'remembered'),
    ).toBeUndefined()
    expect(store.recordStudy('card', card.id, 'remembered')).toBeDefined()
    expect(
      store.recordStudy('event', 'china-event-0029', 'remembered'),
    ).toBeDefined()
    expect(store.studyRecords).toHaveLength(2)
  })

  it('本地数据损坏时重置为空数据并报告错误', () => {
    localStorage.setItem('history-memorization:data', '{not valid json')

    const store = useHistoryStore()

    expect(store.version).toBe(4)
    expect(store.cards).toEqual([])
    expect(store.lastError).toBe('本地数据损坏，已重置为空数据。')
  })

  it('本地保存失败时不抛出异常并报告错误', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage full')
    })
    const store = useHistoryStore()

    expect(() =>
      store.createCard({
        front: '问题',
        back: '答案',
        keywords: [],
        personIds: [],
        eventIds: [],
      }),
    ).not.toThrow()
    expect(store.lastError).toBe('本地保存失败，请重试。')
  })
})
