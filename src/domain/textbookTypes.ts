export type TextbookStatus = 'published' | 'coming-soon'

export interface ITextbook {
  readonly id: string
  readonly title: string
  readonly shortTitle: string
  readonly grade: 7 | 8 | 9
  readonly semester: 'up' | 'down'
  readonly edition: string
  readonly revisionYear: number
  readonly status: TextbookStatus
  readonly summary: string
  readonly order: number
}

export interface ITextbookUnit {
  readonly id: string
  readonly textbookId: string
  readonly title: string
  readonly summary: string
  readonly order: number
}

export interface ITextbookLesson {
  readonly id: string
  readonly unitId: string
  readonly lessonNumber: number
  readonly title: string
  readonly summary: string
  readonly personIds: readonly string[]
  readonly eventIds: readonly string[]
}

export interface ITextbookPerson {
  readonly id: string
  readonly name: string
  readonly lifeTime: string
  readonly summary: string
  readonly textbookIds: readonly string[]
}

export interface ITextbookEventYearRange {
  readonly startYear: number
  readonly endYear: number
}
