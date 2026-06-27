export type StudyTargetType = 'person' | 'event' | 'card'
export type StudyResult = 'remembered' | 'forgotten'

export interface ITimeline {
  id: string
  name: string
  description: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface IHistoryEvent {
  id: string
  timelineId: string
  timeLabel: string
  sortValue: number
  title: string
  hint: string
  summary: string
  detail: string
  keywords: string[]
  personIds: string[]
  createdAt: string
  updatedAt: string
}

export interface IPerson {
  id: string
  name: string
  lifeTime: string
  summary: string
  biography: string
  achievements: string
  keywords: string[]
  createdAt: string
  updatedAt: string
}

export interface IStudyCard {
  id: string
  front: string
  back: string
  hint: string
  keywords: string[]
  personIds: string[]
  eventIds: string[]
  createdAt: string
  updatedAt: string
}

export interface IStudyRecord {
  id: string
  targetType: StudyTargetType
  targetId: string
  result: StudyResult
  createdAt: string
}

export interface IHistoryData {
  timelines: ITimeline[]
  events: IHistoryEvent[]
  people: IPerson[]
  cards: IStudyCard[]
  studyRecords: IStudyRecord[]
}
