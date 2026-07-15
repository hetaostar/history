import { describe, expect, it } from 'vitest'
import { KEY_EVENTS } from '../data/chinaHistoryRiver'
import * as textbookData from '../data/textbooks'
import { createTextbookPeople } from '../data/textbooks/createTextbookPeople'
import {
  TEXTBOOK_LESSONS,
  TEXTBOOK_PEOPLE,
  TEXTBOOK_UNITS,
  TEXTBOOKS,
} from '../data/textbooks'
import {
  findLessonMembershipsByEventId,
  findLessonsByEventId,
  findLessonsByPersonId,
  getAllTextbookEvents,
  getAllTextbookPeople,
  getTextbookById,
  getTextbookEventById,
  getTextbookEventYearRange,
  getTextbookEvents,
  getTextbookLessons,
  getTextbookPersonById,
  getTextbookPeople,
  getTextbookUnits,
} from './textbookSelectors'

const GRADE_7_UP_TITLES = [
  '中国境内早期人类的代表——北京人',
  '原始农耕生活',
  '远古的传说',
  '夏商周的更替',
  '青铜器与甲骨文',
  '动荡的春秋时期',
  '战国时期的社会变化',
  '百家争鸣',
  '秦统一中国',
  '秦末农民大起义',
  '西汉建立和“文景之治”',
  '汉武帝巩固大一统王朝',
  '东汉的兴衰',
  '沟通中外文明的“丝绸之路”',
  '两汉的科技和文化',
  '三国鼎立',
  '西晋的短暂统一和北方各族的内迁',
  '东晋南朝时期江南地区的开发',
  '北魏政治和北方民族大交融',
  '魏晋南北朝的科技与文化',
  '活动课：让我们共同来感受历史',
] as const

const GRADE_7_DOWN_TITLES = [
  '隋朝的统一与灭亡',
  '从“贞观之治”到“开元盛世”',
  '盛唐气象',
  '唐朝的中外文化交流',
  '安史之乱与唐朝衰亡',
  '北宋的政治',
  '辽、西夏与北宋的并立',
  '金与南宋的对峙',
  '宋代经济的发展',
  '蒙古族的兴起与元朝的建立',
  '元朝的统治',
  '宋元时期的都市和文化',
  '宋元时期的科技与中外交通',
  '明朝的统治',
  '明朝的对外关系',
  '明朝的科技、建筑与文学',
  '明朝的灭亡',
  '统一多民族国家的巩固和发展',
  '清朝前期社会经济的发展',
  '清朝君主专制的强化',
  '清朝前期的文学艺术',
  '活动课：中国传统节日的起源',
] as const

function expectUniqueIds(items: readonly { readonly id: string }[]) {
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length)
}

function getLesson(lessonId: string) {
  const lesson = TEXTBOOK_LESSONS.find((item) => item.id === lessonId)
  expect(lesson).toBeDefined()
  return lesson!
}

describe('教材内置数据', () => {
  it('固定提供六册教材并正确标记出版状态', () => {
    expect(TEXTBOOKS.map(({ id, revisionYear, status }) => ({
      id,
      revisionYear,
      status,
    }))).toEqual([
      { id: 'grade-7-up', revisionYear: 2024, status: 'published' },
      { id: 'grade-7-down', revisionYear: 2024, status: 'published' },
      { id: 'grade-8-up', revisionYear: 2024, status: 'coming-soon' },
      { id: 'grade-8-down', revisionYear: 2024, status: 'coming-soon' },
      { id: 'grade-9-up', revisionYear: 2024, status: 'coming-soon' },
      { id: 'grade-9-down', revisionYear: 2024, status: 'coming-soon' },
    ])
  })

  it('完整且稳定地提供七上四单元二十一课目录', () => {
    const units = getTextbookUnits('grade-7-up')
    expect(units.map((unit) => unit.order)).toEqual([1, 2, 3, 4])
    expect(units.map((unit) => unit.title)).toEqual([
      '史前时期：中国境内早期人类与文明的起源',
      '夏商周时期：早期国家与社会变革',
      '秦汉时期：统一多民族国家的建立和巩固',
      '三国两晋南北朝时期：政权分立与民族交融',
    ])
    expect(getTextbookLessons('grade-7-up').map((lesson) => lesson.title)).toEqual(
      GRADE_7_UP_TITLES,
    )
    expect(
      getTextbookLessons('grade-7-up').map((lesson) => lesson.lessonNumber),
    ).toEqual(Array.from({ length: 21 }, (_, index) => index + 1))
  })

  it('完整且稳定地提供七下三单元二十二课目录', () => {
    const units = getTextbookUnits('grade-7-down')
    expect(units.map((unit) => unit.order)).toEqual([1, 2, 3])
    expect(units.map((unit) => unit.title)).toEqual([
      '隋唐时期：繁荣与开放的时代',
      '辽宋夏金元时期：民族关系发展和社会变化',
      '明清时期：统一多民族国家的巩固与发展',
    ])
    expect(
      getTextbookLessons('grade-7-down').map((lesson) => lesson.title),
    ).toEqual(GRADE_7_DOWN_TITLES)
    expect(
      getTextbookLessons('grade-7-down').map((lesson) => lesson.lessonNumber),
    ).toEqual(Array.from({ length: 22 }, (_, index) => index + 1))
  })

  it('全部领域实体 ID 在全局范围唯一', () => {
    const allIds = [
      ...TEXTBOOKS,
      ...TEXTBOOK_UNITS,
      ...TEXTBOOK_LESSONS,
      ...TEXTBOOK_PEOPLE,
      ...KEY_EVENTS,
    ].map((entity) => entity.id)

    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('全部关联引用有效', () => {
    const textbookIds = new Set(TEXTBOOKS.map((textbook) => textbook.id))
    const unitIds = new Set(TEXTBOOK_UNITS.map((unit) => unit.id))
    const personIds = new Set(TEXTBOOK_PEOPLE.map((person) => person.id))
    const eventIds = new Set(KEY_EVENTS.map((event) => event.id))

    TEXTBOOK_UNITS.forEach((unit) => {
      expect(textbookIds.has(unit.textbookId)).toBe(true)
    })
    TEXTBOOK_LESSONS.forEach((lesson) => {
      expect(unitIds.has(lesson.unitId)).toBe(true)
      lesson.personIds.forEach((personId) => {
        expect(personIds.has(personId)).toBe(true)
      })
      lesson.eventIds.forEach((eventId) => {
        expect(eventIds.has(eventId)).toBe(true)
      })
    })
  })

  it('待出版教材不包含单元和课程', () => {
    TEXTBOOKS.filter((textbook) => textbook.status === 'coming-soon').forEach(
      (textbook) => {
        expect(getTextbookUnits(textbook.id)).toEqual([])
        expect(getTextbookLessons(textbook.id)).toEqual([])
      },
    )
  })

  it('按七上七下分别提供人物数据出口', () => {
    expect('GRADE_7_UP_PEOPLE' in textbookData).toBe(true)
    expect('GRADE_7_DOWN_PEOPLE' in textbookData).toBe(true)
    expect('GRADE_7_PEOPLE' in textbookData).toBe(false)
  })

  it('人物仅声明有效的已出版教材', () => {
    const publishedTextbookIds = new Set<string>(
      TEXTBOOKS.filter((textbook) => textbook.status === 'published').map(
        (textbook) => textbook.id,
      ),
    )

    TEXTBOOK_PEOPLE.forEach((person) => {
      expect(person.textbookIds.length).toBeGreaterThan(0)
      person.textbookIds.forEach((textbookId) => {
        expect(publishedTextbookIds.has(textbookId)).toBe(true)
      })
    })
  })

  it('人物声明分册与引用课程一致', () => {
    const unitById = new Map(TEXTBOOK_UNITS.map((unit) => [unit.id, unit]))
    const personById = new Map(
      TEXTBOOK_PEOPLE.map((person) => [person.id, person]),
    )

    TEXTBOOK_LESSONS.forEach((lesson) => {
      const textbookId = unitById.get(lesson.unitId)?.textbookId
      lesson.personIds.forEach((personId) => {
        expect(personById.get(personId)?.textbookIds).toContain(textbookId)
      })
    })

    TEXTBOOK_PEOPLE.forEach((person) => {
      person.textbookIds.forEach((textbookId) => {
        expect(
          getTextbookLessons(textbookId).some((lesson) =>
            lesson.personIds.includes(person.id),
          ),
        ).toBe(true)
      })
    })
  })

  it('人物工厂保留多个教材归属', () => {
    const [person] = createTextbookPeople(
      [
        [
          'shared-person',
          '跨册人物',
          '测试时期',
          '用于验证跨册复用。',
          'han',
        ],
      ],
      ['grade-7-up', 'grade-7-down'],
    )

    expect(person.textbookIds).toEqual(['grade-7-up', 'grade-7-down'])
    expect(person.historyPeriodId).toBe('han')
  })
})

describe('课程事件映射', () => {
  it('七上第8课完整覆盖诸子并关联孙武、屈原', () => {
    const lesson = getLesson('g7u-lesson-08')

    expect(lesson.title).toBe('百家争鸣')
    expect(lesson.personIds).toEqual([
      'g7u-confucius',
      'g7u-laozi',
      'g7u-mozi',
      'g7u-mengzi',
      'g7u-xunzi',
      'g7u-zhuangzi',
      'g7u-han-fei',
      'g7u-sun-wu',
      'g7u-qu-yuan',
    ])
    expect(lesson.eventIds).toEqual([
      'china-event-0012',
      'china-event-0013',
      'china-event-0018',
    ])
    expect(lesson.personIds).not.toContain('g7u-bian-que')
    expect(lesson.eventIds).not.toContain('china-event-0014')
  })

  it('七上第7课关联商鞅变法与都江堰主题', () => {
    const lesson = getLesson('g7u-lesson-07')

    expect(lesson.title).toBe('战国时期的社会变化')
    expect(lesson.personIds).toEqual(['g7u-shang-yang', 'g7u-li-bing'])
    expect(lesson.eventIds).toEqual([
      'china-event-0015',
      'china-event-0016',
      'china-event-0019',
      'china-event-0020',
    ])
  })

  it('七上第5课青铜器与甲骨文暂无现成人/事条目', () => {
    const lesson = getLesson('g7u-lesson-05')

    expect(lesson.title).toBe('青铜器与甲骨文')
    expect(lesson.personIds).toEqual([])
    expect(lesson.eventIds).toEqual([])
  })

  it('七上第15课人物覆盖全部主体事件并含扁鹊', () => {
    const lesson = getLesson('g7u-lesson-15')

    expect(lesson.personIds).toEqual([
      'g7u-sima-qian',
      'g7u-xu-shen',
      'g7u-cai-lun',
      'g7u-zhang-heng',
      'g7u-zhang-zhongjing',
      'g7u-hua-tuo',
      'g7u-bian-que',
    ])
    expect(lesson.eventIds).toEqual([
      'china-event-0039',
      'china-event-0045',
      'china-event-0046',
      'china-event-0047',
    ])
  })

  it('七上第20课保留四位科技文化人物并使用一致事件', () => {
    const lesson = getLesson('g7u-lesson-20')

    expect(lesson.personIds).toEqual([
      'g7u-zu-chongzhi',
      'g7u-jia-sixie',
      'g7u-wang-xizhi',
      'g7u-gu-kaizhi',
    ])
    expect(lesson.eventIds).toEqual([
      'china-event-0059',
      'china-event-0060',
      'china-event-0064',
    ])
  })

  it.each([
    ['g7u-lesson-04', 'china-event-0006', ['g7u-zhou-gong']],
    [
      'g7u-lesson-10',
      'china-event-0033',
      ['g7u-chen-sheng', 'g7u-wu-guang'],
    ],
    ['g7u-lesson-13', 'china-event-0041', ['g7u-wang-mang']],
    ['g7u-lesson-16', 'china-event-0052', ['g7u-cao-pi']],
    ['g7u-lesson-16', 'china-event-0054', ['g7u-zuge-liang']],
    ['g7u-lesson-18', 'china-event-0062', ['g7u-liu-yu']],
    ['g7d-lesson-08', 'china-event-0156', ['g7d-song-gaozong']],
    ['g7d-lesson-12', 'china-event-0137', ['g7d-su-shi']],
    ['g7d-lesson-16', 'china-event-0185', ['g7d-tang-xianzu']],
  ] as const)(
    '%s 的已知主体事件 %s 同步映射教材人物',
    (lessonId, eventId, personIds) => {
      const lesson = getLesson(lessonId)

      expect(lesson.eventIds).toContain(eventId)
      expect(lesson.personIds).toEqual(expect.arrayContaining([...personIds]))
    },
  )

  it('七上东汉与北朝课程移除不属于本课主题的事件', () => {
    expect(getLesson('g7u-lesson-13').eventIds).not.toContain(
      'china-event-0049',
    )
    expect(getLesson('g7u-lesson-19').eventIds).not.toContain(
      'china-event-0063',
    )
  })

  it('七上百家争鸣课不混入王朝政治事件', () => {
    expect(getLesson('g7u-lesson-08').eventIds).not.toEqual(
      expect.arrayContaining([
        'china-event-0003',
        'china-event-0004',
        'china-event-0007',
      ]),
    )
  })

  it('七上文景之治课不混入七国之乱', () => {
    expect(getLesson('g7u-lesson-11').eventIds).not.toContain(
      'china-event-0035',
    )
  })

  it('兰亭集序仅归入七上科技文化课', () => {
    expect(getLesson('g7u-lesson-18').eventIds).not.toContain(
      'china-event-0059',
    )
    expect(getLesson('g7u-lesson-20').eventIds).toContain('china-event-0059')
  })

  it('赵州桥仅归入七下隋朝课', () => {
    expect(getLesson('g7d-lesson-01').eventIds).toContain('china-event-0070')
    expect(getLesson('g7d-lesson-07').eventIds).not.toContain(
      'china-event-0070',
    )
  })

  it('七下科技与中外交通课不混入元军东征日本', () => {
    expect(getLesson('g7d-lesson-13').eventIds).not.toContain(
      'china-event-0143',
    )
  })

  it('统一多民族国家的巩固和发展课关联实际治理史事而非帝王登基', () => {
    const eventIds = getLesson('g7d-lesson-18').eventIds

    expect(eventIds).toEqual(
      expect.arrayContaining([
        'china-event-0267',
        'china-event-0268',
        'china-event-0269',
        'china-event-0270',
      ]),
    )
    expect(eventIds).not.toEqual(
      expect.arrayContaining(['china-event-0226', 'china-event-0228']),
    )
  })

  it('清朝君主专制课关联军机处和闭关政策', () => {
    const eventIds = getLesson('g7d-lesson-20').eventIds

    expect(eventIds).toEqual(
      expect.arrayContaining(['china-event-0271', 'china-event-0272']),
    )
    expect(eventIds).not.toEqual(
      expect.arrayContaining([
        'china-event-0191',
        'china-event-0226',
        'china-event-0227',
        'china-event-0228',
      ]),
    )
  })

  it('红楼梦仅归入七下文学艺术课', () => {
    expect(getLesson('g7d-lesson-19').eventIds).not.toContain(
      'china-event-0195',
    )
    expect(getLesson('g7d-lesson-21').eventIds).toContain('china-event-0195')
  })
})

describe('教材查询层', () => {
  it('汇总 112 个去重后并按年份及 ID 排序的教材事件', () => {
    const events = getAllTextbookEvents()

    expect(events).toHaveLength(112)
    expectUniqueIds(events)
    expect(events).toEqual(
      [...events].sort(
        (left, right) =>
          left.year - right.year || left.id.localeCompare(right.id),
      ),
    )
  })

  it('仅包含已出版教材课程引用的事件', () => {
    const publishedTextbookIds = new Set(
      TEXTBOOKS.filter((textbook) => textbook.status === 'published').map(
        (textbook) => textbook.id,
      ),
    )
    const publishedUnitIds = new Set(
      TEXTBOOK_UNITS.filter((unit) =>
        publishedTextbookIds.has(unit.textbookId),
      ).map((unit) => unit.id),
    )
    const publishedEventIds = new Set(
      TEXTBOOK_LESSONS.filter((lesson) => publishedUnitIds.has(lesson.unitId))
        .flatMap((lesson) => lesson.eventIds),
    )

    expect(new Set(getAllTextbookEvents().map((event) => event.id))).toEqual(
      publishedEventIds,
    )
  })

  it('仅按 ID 返回教材事件', () => {
    expect(getTextbookEventById('china-event-0029')).toMatchObject({
      id: 'china-event-0029',
      title: '秦始皇统一六国',
    })
    expect(getTextbookEventById('china-event-0200')).toBeUndefined()
    expect(getTextbookEventById('unknown-event')).toBeUndefined()
  })

  it('统一返回全部教材人物并按 ID 查询', () => {
    expect(getAllTextbookPeople()).toEqual(TEXTBOOK_PEOPLE)
    expect(getTextbookPersonById('g7u-confucius')).toMatchObject({
      id: 'g7u-confucius',
      name: '孔子',
    })
    expect(getTextbookPersonById('unknown-person')).toBeUndefined()
  })

  it('按 ID 查询教材并安全处理未知 ID', () => {
    expect(getTextbookById('grade-7-up')?.title).toBe('七年级上册')
    expect(getTextbookById('unknown')).toBeUndefined()
  })

  it('按册返回目录顺序的单元和课程以及所属人物', () => {
    const units = getTextbookUnits('grade-7-down')
    const lessons = getTextbookLessons('grade-7-down')
    const people = getTextbookPeople('grade-7-down')

    expect(units.map((unit) => unit.order)).toEqual([1, 2, 3])
    expect(lessons[0].lessonNumber).toBe(1)
    expect(lessons[lessons.length - 1]?.lessonNumber).toBe(22)
    expect(people.length).toBeGreaterThan(0)
    expect(people.every((person) => person.textbookIds.includes('grade-7-down'))).toBe(
      true,
    )
  })

  it('解析、去重并按年份和事件 ID 稳定排序本册事件', () => {
    const events = getTextbookEvents('grade-7-down')
    const eventIds = events.map((event) => event.id)

    expect(events.length).toBeGreaterThan(0)
    expectUniqueIds(events)
    expect(events[0]).toMatchObject({
      id: 'china-event-0067',
      year: 589,
    })
    expect(events[events.length - 1]).toMatchObject({
      id: 'china-event-0195',
      year: 1792,
    })
    expect(eventIds.indexOf('china-event-0269')).toBeLessThan(
      eventIds.indexOf('china-event-0272'),
    )
  })

  it('由人物和事件反查关联课程', () => {
    const person = getTextbookPeople('grade-7-down')[0]
    const lesson = getTextbookLessons('grade-7-down').find((item) =>
      item.personIds.includes(person.id),
    )
    const eventId = lesson?.eventIds[0]

    expect(findLessonsByPersonId(person.id, 'grade-7-down').length).toBeGreaterThan(
      0,
    )
    expect(
      findLessonsByPersonId(person.id, 'grade-7-down').every((item) =>
        item.personIds.includes(person.id),
      ),
    ).toBe(true)
    expect(eventId).toBeDefined()
    expect(findLessonsByEventId(eventId!, 'grade-7-down')).toContainEqual(lesson)
  })

  it('仅 undefined 表示人物和事件反查不限定教材', () => {
    expect(findLessonsByPersonId('g7d-li-shimin', undefined).length).toBeGreaterThan(
      0,
    )
    expect(findLessonsByEventId('china-event-0070', undefined).length).toBeGreaterThan(
      0,
    )
    expect(findLessonsByPersonId('g7d-li-shimin', '')).toEqual([])
    expect(findLessonsByEventId('china-event-0070', '')).toEqual([])
  })

  it('未知教材返回空查询结果', () => {
    expect(getTextbookUnits('unknown')).toEqual([])
    expect(getTextbookLessons('unknown')).toEqual([])
    expect(getTextbookEvents('unknown')).toEqual([])
    expect(getTextbookPeople('unknown')).toEqual([])
    expect(getTextbookEventYearRange('unknown')).toBeUndefined()
    expect(findLessonsByPersonId('g7d-li-shimin', 'unknown')).toEqual([])
    expect(findLessonsByEventId('china-event-0070', 'unknown')).toEqual([])
  })

  it('空教材 ID 返回空查询结果', () => {
    expect(getTextbookUnits('')).toEqual([])
    expect(getTextbookLessons('')).toEqual([])
    expect(getTextbookEvents('')).toEqual([])
    expect(getTextbookPeople('')).toEqual([])
    expect(getTextbookEventYearRange('')).toBeUndefined()
  })

  it('未知人物和事件没有关联课程', () => {
    expect(findLessonsByPersonId('unknown-person')).toEqual([])
    expect(findLessonsByPersonId('unknown-person', 'grade-7-up')).toEqual([])
    expect(findLessonsByEventId('unknown-event')).toEqual([])
    expect(findLessonsByEventId('unknown-event', 'grade-7-up')).toEqual([])
    expect(findLessonMembershipsByEventId('unknown-event')).toEqual([])
  })

  it('按教材分组返回事件关联课程 memberships', () => {
    const memberships = findLessonMembershipsByEventId('china-event-0012')

    expect(memberships).toHaveLength(1)
    expect(memberships[0].textbook.id).toBe('grade-7-up')
    expect(memberships[0].lessons.map((lesson) => lesson.id)).toEqual([
      'g7u-lesson-08',
    ])
    expect(memberships[0].lessons[0].lessonNumber).toBe(8)
    expect(memberships[0].lessons[0].title).toBe('百家争鸣')
  })

  it('由关联事件计算本册年份范围', () => {
    expect(getTextbookEventYearRange('grade-7-up')).toEqual({
      startYear: -2070,
      endYear: 493,
    })
    expect(getTextbookEventYearRange('grade-7-down')).toEqual({
      startYear: 589,
      endYear: 1792,
    })
    expect(getTextbookEventYearRange('grade-9-down')).toBeUndefined()
  })
})
