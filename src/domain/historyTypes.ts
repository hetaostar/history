export type StudyTargetType = 'person' | 'event' | 'card'
export type StudyResult = 'remembered' | 'forgotten'

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
  version: number
  cards: IStudyCard[]
  studyRecords: IStudyRecord[]
}
