import { describe, expect, it } from 'vitest'
import type {
  ITextbook,
  ITextbookLesson,
  ITextbookPerson,
  ITextbookUnit,
} from './textbookTypes'
import { buildTextbookPeopleCatalog } from './textbookPeopleCatalog'

const textbooks: readonly ITextbook[] = [
  {
    id: 'book-b',
    title: '第二册',
    shortTitle: '册二',
    grade: 7,
    semester: 'down',
    edition: '测试版',
    revisionYear: 2024,
    status: 'published',
    summary: '第二册',
    order: 2,
  },
  {
    id: 'book-c',
    title: '待出版',
    shortTitle: '待出版',
    grade: 8,
    semester: 'up',
    edition: '测试版',
    revisionYear: 2024,
    status: 'coming-soon',
    summary: '待出版',
    order: 3,
  },
  {
    id: 'book-a',
    title: '第一册',
    shortTitle: '册一',
    grade: 7,
    semester: 'up',
    edition: '测试版',
    revisionYear: 2024,
    status: 'published',
    summary: '第一册',
    order: 1,
  },
]

const units: readonly ITextbookUnit[] = [
  {
    id: 'unit-a',
    textbookId: 'book-a',
    title: '第一单元',
    summary: '',
    order: 1,
  },
  {
    id: 'unit-b',
    textbookId: 'book-b',
    title: '第二单元',
    summary: '',
    order: 1,
  },
  {
    id: 'unit-c',
    textbookId: 'book-c',
    title: '待出版单元',
    summary: '',
    order: 1,
  },
]

const people: readonly ITextbookPerson[] = [
  {
    id: 'shared',
    name: '跨册人物',
    lifeTime: '测试时期',
    summary: '同时出现在两册。',
    textbookIds: ['book-a', 'book-b'],
    historyPeriodId: 'han',
  },
  {
    id: 'book-a-only',
    name: '第一册人物',
    lifeTime: '测试时期',
    summary: '只在第一册。',
    textbookIds: ['book-a'],
    historyPeriodId: 'han',
  },
  {
    id: 'unpublished-only',
    name: '待出版人物',
    lifeTime: '测试时期',
    summary: '只在待出版册。',
    textbookIds: ['book-c'],
    historyPeriodId: 'han',
  },
]

const lessons: readonly ITextbookLesson[] = [
  {
    id: 'lesson-a-2',
    unitId: 'unit-a',
    lessonNumber: 2,
    title: '第一册第二课',
    summary: '',
    personIds: ['shared'],
    eventIds: [],
  },
  {
    id: 'lesson-b-1',
    unitId: 'unit-b',
    lessonNumber: 1,
    title: '第二册第一课',
    summary: '',
    personIds: ['shared'],
    eventIds: [],
  },
  {
    id: 'lesson-a-1',
    unitId: 'unit-a',
    lessonNumber: 1,
    title: '第一册第一课',
    summary: '',
    personIds: ['shared', 'book-a-only'],
    eventIds: [],
  },
  {
    id: 'lesson-c-1',
    unitId: 'unit-c',
    lessonNumber: 1,
    title: '待出版课程',
    summary: '',
    personIds: ['unpublished-only'],
    eventIds: [],
  },
]

describe('buildTextbookPeopleCatalog', () => {
  it('只构建 published 册次并按教材顺序分组', () => {
    const catalog = buildTextbookPeopleCatalog(
      textbooks,
      people,
      units,
      lessons,
    )

    expect(catalog.groups.map((group) => group.textbook.id)).toEqual([
      'book-a',
      'book-b',
    ])
    expect(catalog.groups[0].entries.map((entry) => entry.person.id)).toEqual([
      'shared',
      'book-a-only',
    ])
  })

  it('跨册人物在每册重复展示但唯一人数按 ID 去重', () => {
    const catalog = buildTextbookPeopleCatalog(
      textbooks,
      people,
      units,
      lessons,
    )

    expect(
      catalog.groups.flatMap((group) =>
        group.entries.map((entry) => entry.person.id),
      ),
    ).toEqual(['shared', 'book-a-only', 'shared'])
    expect(catalog.uniquePersonCount).toBe(2)
  })

  it('为每册人物隔离并按课号排序关联课程', () => {
    const catalog = buildTextbookPeopleCatalog(
      textbooks,
      people,
      units,
      lessons,
    )
    const firstBookShared = catalog.groups[0].entries[0]
    const secondBookShared = catalog.groups[1].entries[0]

    expect(firstBookShared.lessons.map((lesson) => lesson.id)).toEqual([
      'lesson-a-1',
      'lesson-a-2',
    ])
    expect(secondBookShared.lessons.map((lesson) => lesson.id)).toEqual([
      'lesson-b-1',
    ])
  })
})
