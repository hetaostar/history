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
      title: '秦统一六国',
      hint: '统一',
      summary: '秦完成统一。',
      detail: '秦统一。',
      keywords: [],
      personIds: [],
    })

    expect(
      store.eventsByTimeline(timeline.id).map((event) => event.title),
    ).toEqual(['秦统一六国', '鸦片战争', '辛亥革命'])
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

  it('creates cards with a memorization hint', () => {
    const store = useHistoryStore()

    const card = store.createCard({
      front: '商鞅变法的主要内容是什么？',
      back: '废井田、重农抑商、奖励军功。',
      hint: '秦国变法',
      keywords: ['商鞅'],
      personIds: [],
      eventIds: [],
    })

    expect(card.hint).toBe('秦国变法')
    expect(store.cards[0].hint).toBe('秦国变法')
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
    const setItemSpy = vi
      .spyOn(localStorage, 'setItem')
      .mockImplementation(() => {
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
    setItemSpy.mockRestore()
  })

  it('exportSnapshot excludes lastError and includes version', () => {
    const store = useHistoryStore()
    store.createTimeline({
      name: '中国古代史',
      description: '',
      tags: [],
    })
    store.lastError = 'something wrong'

    const snapshot = store.exportSnapshot()

    expect(snapshot.version).toBe(1)
    expect(snapshot.timelines).toHaveLength(1)
    expect(snapshot).not.toHaveProperty('lastError')
    expect(JSON.stringify(snapshot)).not.toContain('lastError')
    expect(JSON.stringify(snapshot)).not.toContain('something wrong')
  })

  it('persists data with version field', () => {
    const store = useHistoryStore()
    store.createTimeline({
      name: '中国古代史',
      description: '',
      tags: [],
    })

    const raw = localStorage.getItem('history-memorization:data')
    const parsed = JSON.parse(raw ?? '{}')

    expect(parsed.version).toBe(1)
    expect(parsed.timelines).toHaveLength(1)
  })

  it('loads legacy data without version field and migrates to v1', () => {
    const legacyData = {
      timelines: [],
      events: [],
      people: [],
      cards: [],
      studyRecords: [],
    }
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify(legacyData),
    )

    const store = useHistoryStore()

    expect(store.version).toBe(1)
    expect(store.lastError).toBe('')
  })

  it('sets lastError when local data is corrupted', () => {
    localStorage.setItem('history-memorization:data', '{not valid json')

    const store = useHistoryStore()

    expect(store.version).toBe(1)
    expect(store.timelines).toEqual([])
    expect(store.lastError).toBe('本地数据损坏，已重置为空数据。')
  })

  it('creates events without sortValue input and sorts by time label', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '排序测试',
      description: '',
      tags: [],
    })

    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1911年',
      title: '辛亥革命',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })
    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '前221年',
      title: '秦统一六国',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })

    expect(
      store.eventsByTimeline(timeline.id).map((event) => event.title),
    ).toEqual(['秦统一六国', '辛亥革命'])
    expect(store.events[0]).not.toHaveProperty('sortValue')
  })

  it('strips legacy sortValue field when loading old data', () => {
    const legacyData = {
      version: 1,
      timelines: [],
      events: [
        {
          id: 'event-1',
          timelineId: 'timeline-1',
          timeLabel: '前221年',
          sortValue: -221,
          title: '秦统一六国',
          hint: '秦',
          summary: '秦完成统一。',
          detail: '秦灭六国。',
          keywords: ['秦'],
          personIds: [],
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      ],
      people: [],
      cards: [],
      studyRecords: [],
    }
    localStorage.setItem(
      'history-memorization:data',
      JSON.stringify(legacyData),
    )

    const store = useHistoryStore()

    expect(store.events).toHaveLength(1)
    expect(store.events[0]).not.toHaveProperty('sortValue')
    expect(store.events[0].title).toBe('秦统一六国')
  })

  it('removes leaked format-key prefixes before saving events', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '格式前缀清理',
      description: '',
      tags: [],
    })

    const event = store.createEvent({
      timelineId: timeline.id,
      timeLabel: 'date_format.bc前202年',
      title: 'ate_format.bc汉朝建立',
      hint: 'year_format.bc刘邦称帝',
      summary: 'date_format.ad统一天下',
      detail: '',
      keywords: ['date_format.bc汉朝'],
      personIds: [],
    })

    expect(event.timeLabel).toBe('前202年')
    expect(event.title).toBe('汉朝建立')
    expect(event.hint).toBe('刘邦称帝')
    expect(event.summary).toBe('统一天下')
    expect(event.keywords).toEqual(['汉朝'])

    store.updateEvent(event.id, {
      timelineId: timeline.id,
      timeLabel: 'date_format.ad202年',
      title: 'date_format.ad文景之治',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })

    expect(store.events[0].timeLabel).toBe('202年')
    expect(store.events[0].title).toBe('文景之治')
  })

  it('removes leaked format-key prefixes before saving visible entity fields', () => {
    const store = useHistoryStore()

    const timeline = store.createTimeline({
      name: 'date_format.bc中国古代史',
      description: 'date_format.ad朝代更迭',
      tags: ['date_format.bc高考'],
    })
    const person = store.createPerson({
      name: 'date_format.bc刘邦',
      lifeTime: 'date_format.bc前256年-前195年',
      summary: 'date_format.ad汉高祖',
      biography: 'date_format.bc建立汉朝。',
      achievements: 'date_format.ad休养生息。',
      keywords: ['date_format.bc西汉'],
    })
    const card = store.createCard({
      front: 'date_format.bc汉朝何时建立？',
      back: 'date_format.bc前202年',
      hint: 'date_format.ad刘邦',
      keywords: ['date_format.bc汉朝'],
      personIds: [person.id],
      eventIds: [],
    })

    expect(timeline.name).toBe('中国古代史')
    expect(timeline.description).toBe('朝代更迭')
    expect(timeline.tags).toEqual(['高考'])
    expect(person.name).toBe('刘邦')
    expect(person.lifeTime).toBe('前256年-前195年')
    expect(person.summary).toBe('汉高祖')
    expect(person.biography).toBe('建立汉朝。')
    expect(person.achievements).toBe('休养生息。')
    expect(person.keywords).toEqual(['西汉'])
    expect(card.front).toBe('汉朝何时建立？')
    expect(card.back).toBe('前202年')
    expect(card.hint).toBe('刘邦')
    expect(card.keywords).toEqual(['汉朝'])

    store.updateTimeline(timeline.id, {
      name: 'date_format.ad世界史',
      description: '',
      tags: [],
    })
    store.updatePerson(person.id, {
      name: 'date_format.ad汉高祖',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })
    store.updateCard(card.id, {
      front: 'date_format.ad文景之治是什么？',
      back: 'date_format.ad休养生息政策',
      keywords: [],
      personIds: [],
      eventIds: [],
    })

    expect(store.timelines[0].name).toBe('世界史')
    expect(store.people[0].name).toBe('汉高祖')
    expect(store.cards[0].front).toBe('文景之治是什么？')
    expect(store.cards[0].back).toBe('休养生息政策')
  })

  it('sorts events with mixed BCE, year-suffixed, and fuzzy time labels', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '混合时间格式',
      description: '',
      tags: [],
    })

    const labels = [
      '10月革命', // 兜底 MAX
      '1911年10月', // 行首数字+年（1911）
      '1840年', // 行首数字+年
      '公元前221年', // BCE（值 -221）
      '前221年', // BCE（值 -221）
      '', // 兜底 MAX
      '民国19年', // 兜底 MAX（不是 3-4 位数字）
    ]
    labels.forEach((label, index) => {
      store.createEvent({
        timelineId: timeline.id,
        timeLabel: label,
        title: `事件${index}`,
        hint: '',
        summary: '',
        detail: '',
        keywords: [],
        personIds: [],
      })
    })

    const sorted = store
      .eventsByTimeline(timeline.id)
      .map((event) => event.timeLabel)

    // 前 4 个按数值升序：两个 -221（按插入顺序，公元前221年 在 前221年 之前）、1840、1911
    expect(sorted.slice(0, 4)).toEqual([
      '公元前221年',
      '前221年',
      '1840年',
      '1911年10月',
    ])
    // 后 3 个都是兜底 MAX_SAFE_INTEGER，顺序不固定（值相同），用集合比较
    expect(sorted.slice(4).sort()).toEqual(['', '10月革命', '民国19年'].sort())
  })
})
