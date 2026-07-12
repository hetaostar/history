import { describe, expect, it } from 'vitest'
import {
  TEXTBOOK_LESSONS,
  TEXTBOOK_PEOPLE,
  TEXTBOOK_UNITS,
  TEXTBOOKS,
} from '@/data/textbooks'
import { HISTORY_PERIODS } from './historyPeriods'
import {
  groupTextbookPeopleByHistoryPeriod,
  PERSON_HISTORY_PERIODS,
} from './personHistoryPeriods'
import type { ITextbookPeopleCatalog } from './textbookPeopleCatalog'
import { buildTextbookPeopleCatalog } from './textbookPeopleCatalog'
import type { ITextbookPerson } from './textbookTypes'

function createCatalog(
  historyPeriodId: ITextbookPerson['historyPeriodId'] = 'han',
): ITextbookPeopleCatalog {
  const sharedPerson: ITextbookPerson = {
    id: 'shared',
    name: '跨册人物',
    lifeTime: '测试时期',
    summary: '同时出现在两册。',
    textbookIds: ['book-a', 'book-b'],
    historyPeriodId,
  }

  return {
    uniquePersonCount: 2,
    groups: [
      {
        textbook: {
          id: 'book-a',
          title: '第一册',
          shortTitle: '册一',
          grade: 7,
          semester: 'up',
          edition: '测试版',
          revisionYear: 2024,
          status: 'published',
          summary: '',
          order: 1,
        },
        entries: [
          {
            person: sharedPerson,
            lessons: [
              {
                id: 'lesson-a',
                unitId: 'unit-a',
                lessonNumber: 1,
                title: '第一课',
                summary: '',
                personIds: ['shared'],
                eventIds: [],
              },
            ],
          },
          {
            person: {
              id: 'early',
              name: '早期人物',
              lifeTime: '传说时代',
              summary: '史前与传说时代人物。',
              textbookIds: ['book-a'],
              historyPeriodId: 'prehistory-legends',
            },
            lessons: [],
          },
        ],
      },
      {
        textbook: {
          id: 'book-b',
          title: '第二册',
          shortTitle: '册二',
          grade: 7,
          semester: 'down',
          edition: '测试版',
          revisionYear: 2024,
          status: 'published',
          summary: '',
          order: 2,
        },
        entries: [
          {
            person: sharedPerson,
            lessons: [
              {
                id: 'lesson-b',
                unitId: 'unit-b',
                lessonNumber: 2,
                title: '第二课',
                summary: '',
                personIds: ['shared'],
                eventIds: [],
              },
            ],
          },
        ],
      },
    ],
  }
}

describe('人物历史时期', () => {
  it('按史前与传说时代、夏至清的顺序提供导航时期', () => {
    expect(PERSON_HISTORY_PERIODS).toHaveLength(HISTORY_PERIODS.length + 1)
    expect(PERSON_HISTORY_PERIODS[0]).toMatchObject({
      id: 'prehistory-legends',
      name: '史前与传说时代',
    })
    expect(PERSON_HISTORY_PERIODS.slice(1).map((period) => period.id)).toEqual(
      HISTORY_PERIODS.map((period) => period.id),
    )
  })

  it('每位人物只分组一次并合并全部教材课程', () => {
    const groups = groupTextbookPeopleByHistoryPeriod(createCatalog())
    const earlyGroup = groups.find(
      (group) => group.period.id === 'prehistory-legends',
    )!
    const hanGroup = groups.find((group) => group.period.id === 'han')!

    expect(earlyGroup.entries.map((entry) => entry.person.id)).toEqual([
      'early',
    ])
    expect(hanGroup.entries.map((entry) => entry.person.id)).toEqual(['shared'])
    expect(
      hanGroup.entries[0].memberships.map((membership) => ({
        textbookId: membership.textbook.id,
        lessonIds: membership.lessons.map((lesson) => lesson.id),
      })),
    ).toEqual([
      { textbookId: 'book-a', lessonIds: ['lesson-a'] },
      { textbookId: 'book-b', lessonIds: ['lesson-b'] },
    ])
    expect(
      groups.flatMap((group) => group.entries.map((entry) => entry.person.id)),
    ).toHaveLength(2)
  })

  it('拒绝未知的人物时期 ID', () => {
    expect(() =>
      groupTextbookPeopleByHistoryPeriod(
        createCatalog('missing-period' as ITextbookPerson['historyPeriodId']),
      ),
    ).toThrow(new RangeError('人物 shared 的历史时期 missing-period 无效'))
  })

  it('完整归类 85 位教材人物并保持代表人物朝代准确', () => {
    const catalog = buildTextbookPeopleCatalog(
      TEXTBOOKS,
      TEXTBOOK_PEOPLE,
      TEXTBOOK_UNITS,
      TEXTBOOK_LESSONS,
    )
    const groups = groupTextbookPeopleByHistoryPeriod(catalog)
    const periodsByPersonId = new Map(
      groups.flatMap((group) =>
        group.entries.map((entry) => [entry.person.id, group.period.id]),
      ),
    )

    expect(periodsByPersonId.size).toBe(85)
    expect([...periodsByPersonId.entries()]).toEqual(
      expect.arrayContaining([
        ['g7u-yuanmou-man', 'prehistory-legends'],
        ['g7u-yu', 'xia'],
        ['g7u-tang', 'shang'],
        ['g7u-king-wu', 'western-zhou'],
        ['g7u-confucius', 'spring-autumn'],
        ['g7u-shang-yang', 'warring-states'],
        ['g7u-qin-shihuang', 'qin-chu-han'],
        ['g7u-han-wudi', 'han'],
        ['g7u-cao-pi', 'three-kingdoms'],
        ['g7u-sima-yan', 'jin-northern-southern'],
        ['g7d-yang-jian', 'sui'],
        ['g7d-li-shimin', 'tang'],
        ['g7d-zhao-kuangyin', 'song-liao-jin'],
        ['g7d-kublai', 'yuan'],
        ['g7d-zhu-yuanzhang', 'ming'],
        ['g7d-kangxi', 'qing'],
      ]),
    )
  })
})
