export type HistoricalEventType = 'war' | 'culture' | 'politics' | 'science'

export type HistoricalEventImportance = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface IDynasty {
  readonly id: string
  readonly name: string
  readonly chineseName: string
  readonly startYear: number
  readonly endYear: number
  readonly color: string
  readonly description: string
}

export interface IHistoricalEvent {
  readonly id: string
  readonly year: number
  readonly title: string
  readonly type: HistoricalEventType
  readonly description?: string
  readonly importance: HistoricalEventImportance
}

export interface IViewport {
  readonly x: number
  readonly y: number
  readonly k: number
}
