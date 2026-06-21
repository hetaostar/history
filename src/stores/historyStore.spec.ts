import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from './historyStore'

describe('historyStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('creates a timeline and an event without requiring people', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '中国古代史',
      description: '先秦到明清',
      tags: ['中国史'],
    })

    const event = store.createEvent({
      timelineId: timeline.id,
      timeLabel: '前221年',
      sortValue: -221,
      title: '秦统一六国',
      hint: '秦、统一、中央集权',
      summary: '秦完成统一，建立中央集权国家。',
      detail: '秦王嬴政灭六国，建立统一多民族国家。',
      keywords: ['秦', '统一'],
      personIds: [],
    })

    expect(event.personIds).toEqual([])
    expect(store.eventsByTimeline(timeline.id)).toHaveLength(1)
  })

  it('sorts timeline events by time label automatically', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '中国近代史',
      description: '近代历史',
      tags: [],
    })

    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1911年',
      sortValue: 1,
      title: '辛亥革命',
      hint: '革命',
      summary: '推翻清朝统治。',
      detail: '辛亥革命爆发。',
      keywords: [],
      personIds: [],
    })
    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1840年',
      sortValue: 999,
      title: '鸦片战争',
      hint: '战争',
      summary: '中国近代史开端。',
      detail: '鸦片战争爆发。',
      keywords: [],
      personIds: [],
    })
    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '前221年',
      sortValue: 9999,
      title: '秦统一六国',
      hint: '统一',
      summary: '秦完成统一。',
      detail: '秦统一。',
      keywords: [],
      personIds: [],
    })

    expect(store.eventsByTimeline(timeline.id).map((event) => event.title)).toEqual([
      '秦统一六国',
      '鸦片战争',
      '辛亥革命',
    ])
  })

  it('searches people, events, timelines and cards', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '世界近代史',
      description: '近代世界发展',
      tags: [],
    })
    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1789年',
      sortValue: 1789,
      title: '法国大革命',
      hint: '法国',
      summary: '法国大革命爆发。',
      detail: '法国大革命冲击欧洲封建秩序。',
      keywords: ['革命'],
      personIds: [],
    })
    store.createCard({
      front: '法国大革命爆发于哪一年？',
      back: '1789年',
      keywords: ['法国'],
      personIds: [],
      eventIds: [],
    })

    const result = store.search('法国')
    expect(result.events).toHaveLength(1)
    expect(result.cards).toHaveLength(1)
  })

  it('updates a timeline name', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '中国古代史',
      description: '先秦到明清',
      tags: ['中国史'],
    })

    store.updateTimeline(timeline.id, {
      name: '中国近代史',
      description: timeline.description,
      tags: timeline.tags,
    })

    expect(store.timelines[0].name).toBe('中国近代史')
  })

  it('deletes a timeline and its events', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '中国古代史',
      description: '先秦到明清',
      tags: ['中国史'],
    })
    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '前221年',
      sortValue: -221,
      title: '秦统一六国',
      hint: '秦',
      summary: '秦完成统一。',
      detail: '秦灭六国。',
      keywords: ['秦'],
      personIds: [],
    })

    store.deleteTimeline(timeline.id)

    expect(store.timelines).toHaveLength(0)
    expect(store.events).toHaveLength(0)
  })

  it('removes a deleted person from event personIds', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '世界近代史',
      description: '近代世界发展',
      tags: [],
    })
    const person = store.createPerson({
      name: '拿破仑',
      lifeTime: '1769-1821',
      summary: '法国军事家。',
      biography: '拿破仑推动法国政治变化。',
      achievements: '建立法兰西第一帝国。',
      keywords: ['法国'],
    })
    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1804年',
      sortValue: 1804,
      title: '拿破仑称帝',
      hint: '法国',
      summary: '拿破仑成为皇帝。',
      detail: '拿破仑建立法兰西第一帝国。',
      keywords: ['拿破仑'],
      personIds: [person.id],
    })

    store.deletePerson(person.id)

    expect(store.events[0].personIds).toEqual([])
  })

  it('deletes study records for a deleted card', () => {
    const store = useHistoryStore()
    const card = store.createCard({
      front: '法国大革命爆发于哪一年？',
      back: '1789年',
      keywords: ['法国'],
      personIds: [],
      eventIds: [],
    })
    store.recordStudy('card', card.id, 'remembered')

    store.deleteCard(card.id)

    expect(store.cards).toHaveLength(0)
    expect(store.studyRecords).toHaveLength(0)
  })

  it('sets lastError without throwing when createTimeline cannot save', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage full')
    })
    const store = useHistoryStore()

    expect(() =>
      store.createTimeline({
        name: '中国古代史',
        description: '先秦到明清',
        tags: ['中国史'],
      }),
    ).not.toThrow()
    expect(store.lastError).toBe('本地保存失败，请重试或先导出当前数据。')
  })
})
