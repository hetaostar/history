import { formatHistoricalYear } from './chinaRiverLayout'
import {
  HISTORY_PERIODS,
  type IHistoryPeriod,
} from './historyPeriods'
import type {
  ITextbookPeopleCatalog,
  ITextbookPeopleGroup,
} from './textbookPeopleCatalog'
import type {
  ITextbookLesson,
  ITextbookPerson,
} from './textbookTypes'

export interface IPersonHistoryPeriod extends IHistoryPeriod {
  readonly rangeLabel: string
}

export interface IPersonTextbookMembership {
  readonly textbook: ITextbookPeopleGroup['textbook']
  readonly lessons: readonly ITextbookLesson[]
}

export interface IPersonHistoryPeriodEntry {
  readonly person: ITextbookPerson
  readonly memberships: readonly IPersonTextbookMembership[]
}

export interface IPersonHistoryPeriodGroup {
  readonly period: IPersonHistoryPeriod
  readonly entries: readonly IPersonHistoryPeriodEntry[]
}

const PREHISTORY_PERIOD = {
  id: 'prehistory-legends',
  name: '史前与传说时代',
  startYear: -1700000,
  endYear: -2070,
  rangeLabel: '距今约170万年—约公元前21世纪',
} as const satisfies IPersonHistoryPeriod

export const PERSON_HISTORY_PERIODS: readonly IPersonHistoryPeriod[] = [
  PREHISTORY_PERIOD,
  ...HISTORY_PERIODS.map((period) => ({
    ...period,
    rangeLabel: `${formatHistoricalYear(period.startYear)}—${formatHistoricalYear(
      period.endYear,
    )}`,
  })),
]

export function groupTextbookPeopleByHistoryPeriod(
  catalog: ITextbookPeopleCatalog,
): readonly IPersonHistoryPeriodGroup[] {
  const periodIds = new Set(PERSON_HISTORY_PERIODS.map((period) => period.id))
  const entriesByPersonId = new Map<
    string,
    {
      person: ITextbookPerson
      memberships: IPersonTextbookMembership[]
    }
  >()

  catalog.groups.forEach((group) => {
    group.entries.forEach((entry) => {
      if (!periodIds.has(entry.person.historyPeriodId)) {
        throw new RangeError(
          `人物 ${entry.person.id} 的历史时期 ${entry.person.historyPeriodId} 无效`,
        )
      }

      const existingEntry = entriesByPersonId.get(entry.person.id)
      const membership = {
        textbook: group.textbook,
        lessons: entry.lessons,
      }
      if (existingEntry) {
        existingEntry.memberships.push(membership)
        return
      }

      entriesByPersonId.set(entry.person.id, {
        person: entry.person,
        memberships: [membership],
      })
    })
  })

  return PERSON_HISTORY_PERIODS.map((period) => ({
    period,
    entries: [...entriesByPersonId.values()].filter(
      (entry) => entry.person.historyPeriodId === period.id,
    ),
  }))
}
