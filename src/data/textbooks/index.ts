import { TEXTBOOKS } from './catalog'
import { GRADE_7_DOWN_LESSONS, GRADE_7_DOWN_UNITS } from './grade7Down'
import { GRADE_7_DOWN_PEOPLE } from './grade7DownPeople'
import { GRADE_7_UP_LESSONS, GRADE_7_UP_UNITS } from './grade7Up'
import { GRADE_7_UP_PEOPLE } from './grade7UpPeople'

export { TEXTBOOKS } from './catalog'
export { GRADE_7_DOWN_LESSONS, GRADE_7_DOWN_UNITS } from './grade7Down'
export { GRADE_7_DOWN_PEOPLE } from './grade7DownPeople'
export { GRADE_7_UP_LESSONS, GRADE_7_UP_UNITS } from './grade7Up'
export { GRADE_7_UP_PEOPLE } from './grade7UpPeople'

export const TEXTBOOK_UNITS = [
  ...GRADE_7_UP_UNITS,
  ...GRADE_7_DOWN_UNITS,
] as const

export const TEXTBOOK_LESSONS = [
  ...GRADE_7_UP_LESSONS,
  ...GRADE_7_DOWN_LESSONS,
] as const

export const TEXTBOOK_PEOPLE = [
  ...GRADE_7_UP_PEOPLE,
  ...GRADE_7_DOWN_PEOPLE,
] as const

export const TEXTBOOK_CATALOG = {
  textbooks: TEXTBOOKS,
  units: TEXTBOOK_UNITS,
  lessons: TEXTBOOK_LESSONS,
  people: TEXTBOOK_PEOPLE,
} as const
